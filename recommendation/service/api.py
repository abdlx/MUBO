from contextlib import asynccontextmanager
from datetime import datetime, timezone
from uuid import UUID, uuid4
import json
import logging

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
import redis

from .config import API_KEY, MODEL_VERSION, REDIS_URL
from .db import connect, migrate
from .ranking import rank, diversify, shuffle

log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app):
    migrate()
    yield


app = FastAPI(title='Mubo recommendations', lifespan=lifespan)


class Event(BaseModel):
    event_id: UUID = Field(default_factory=uuid4)
    user_id: str = Field(min_length=1, max_length=100)
    session_id: str = Field(min_length=1, max_length=100)
    event_type: str = Field(min_length=2, max_length=80)
    track_id: str | None = None
    source: str | None = None
    surface: str | None = None
    listened_seconds: float | None = None
    completion_ratio: float | None = None
    recommendation_id: UUID | None = None
    model_version: str | None = None
    context: dict = Field(default_factory=dict)
    occurred_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CatalogTrack(BaseModel):
    id: str
    title: str
    artist: str
    artist_ids: list[str] = Field(default_factory=list)
    album: str
    album_id: str
    genres: list[str] = Field(default_factory=list)
    duration: float | None = None
    release_year: int | None = None


class Request(BaseModel):
    user_id: str
    seed_ids: list[str] = Field(default_factory=list)
    source_ids: list[str] = Field(default_factory=list)
    exclude_ids: list[str] = Field(default_factory=list)
    session_id: str = 'none'
    seed: str = 'default'
    limit: int = Field(default=20, ge=1, le=100)
    kind: str = 'track'
    source_id: str | None = None


def authorized(key):
    if key != API_KEY:
        raise HTTPException(status_code=401, detail='Invalid service key')


def cached(key):
    try:
        return redis.from_url(REDIS_URL, socket_connect_timeout=0.1).get(key)
    except redis.RedisError:
        return None


def set_cache(key, value):
    try:
        redis.from_url(REDIS_URL, socket_connect_timeout=0.1).setex(key, 30, json.dumps(value, default=str))
    except redis.RedisError:
        pass


def catalog_and_taste(conn, user_id):
    saved = cached('catalog:v1')
    tracks = json.loads(saved) if saved else conn.execute('SELECT * FROM tracks ORDER BY id').fetchall()
    if not saved:
        set_cache('catalog:v1', tracks)
    affinity = {row['track_id']: row for row in conn.execute('SELECT * FROM track_affinity WHERE user_id=%s', (user_id,))}
    return tracks, affinity


def record_impressions(conn, user_id, surface, items):
    result = []
    for item in items:
        identity = uuid4()
        conn.execute('INSERT INTO impressions(id,user_id,track_id,surface,model_version,explanation,features) VALUES (%s,%s,%s,%s,%s,%s,%s)',
                     (identity, user_id, item.track['id'], surface, MODEL_VERSION, item.explanation, json.dumps(item.features)))
        result.append({'trackId': item.track['id'], 'recommendationId': str(identity),
                       'modelVersion': MODEL_VERSION, 'explanation': item.explanation,
                       'features': item.features, 'score': round(item.score, 4)})
    return result


@app.get('/health')
def health():
    with connect() as conn:
        conn.execute('SELECT 1')
    return {'status': 'ok', 'modelVersion': MODEL_VERSION}


@app.post('/catalog')
def sync_catalog(items: list[CatalogTrack], x_service_key: str | None = Header(default=None)):
    authorized(x_service_key)
    with connect() as conn:
        for item in items:
            conn.execute('''INSERT INTO tracks(id,title,artist,artist_ids,album,album_id,genres,duration,release_year)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT(id) DO UPDATE SET
                title=EXCLUDED.title,artist=EXCLUDED.artist,artist_ids=EXCLUDED.artist_ids,
                album=EXCLUDED.album,album_id=EXCLUDED.album_id,genres=EXCLUDED.genres,
                duration=EXCLUDED.duration,release_year=EXCLUDED.release_year,updated_at=now()''',
                (item.id,item.title,item.artist,item.artist_ids,item.album,item.album_id,item.genres,item.duration,item.release_year))
        conn.execute('DELETE FROM tracks WHERE id <> ALL(%s)', ([item.id for item in items],))
    try:
        redis.from_url(REDIS_URL, socket_connect_timeout=0.1).delete('catalog:v1')
    except redis.RedisError:
        pass
    return {'count': len(items)}


@app.post('/events')
def events(items: list[Event], x_service_key: str | None = Header(default=None)):
    authorized(x_service_key)
    if len(items) > 100:
        raise HTTPException(400, 'Event batch too large')
    with connect() as conn:
        for item in items:
            if item.recommendation_id:
                owner = conn.execute('SELECT user_id,track_id FROM impressions WHERE id=%s', (item.recommendation_id,)).fetchone()
                if not owner or owner['user_id'] != item.user_id or owner['track_id'] != item.track_id:
                    raise HTTPException(400, 'Unknown recommendation impression')
            conn.execute('''INSERT INTO events(event_id,user_id,session_id,event_type,track_id,source,surface,
              listened_seconds,completion_ratio,recommendation_id,model_version,context,occurred_at)
              VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT(event_id) DO NOTHING''',
              (item.event_id,item.user_id,item.session_id,item.event_type,item.track_id,item.source,item.surface,
               item.listened_seconds,item.completion_ratio,item.recommendation_id,item.model_version,json.dumps(item.context),item.occurred_at))
    return {'accepted': len(items)}


@app.post('/recommendations/{surface}')
def recommend(surface: str, request: Request, x_service_key: str | None = Header(default=None)):
    authorized(x_service_key)
    if surface not in {'home','quick-picks','mixes','shuffle','smart-shuffle','autoplay','radio'}:
        raise HTTPException(404, 'Unknown surface')
    with connect() as conn:
        tracks, affinity = catalog_and_taste(conn, request.user_id)
        track_map = {item['id']: item for item in tracks}
        seeds = [track_map[item] for item in request.seed_ids if item in track_map]
        native = [track_map[item] for item in request.source_ids if item in track_map]
        excluded = set(request.exclude_ids)
        if surface == 'shuffle':
            recent = {id for id, data in affinity.items() if data['last_played'] and
                      (datetime.now(timezone.utc)-data['last_played']).total_seconds() < 86400}
            return {'trackIds': shuffle(native or tracks, recent, request.seed), 'seed': request.seed, 'modelVersion': MODEL_VERSION}
        if surface == 'radio' and request.source_id and request.source_id not in track_map:
            raise HTTPException(404, 'Unknown radio seed')
        if surface == 'radio' and request.source_id:
            seed_track = track_map[request.source_id]
            if request.kind == 'artist':
                seeds = [item for item in tracks if item['artist'] == seed_track['artist']][:6]
            elif request.kind == 'album':
                seeds = [item for item in tracks if item['album_id'] == seed_track['album_id']][:6]
            elif request.kind == 'playlist':
                seeds = native[:12] or [seed_track]
            else:
                seeds = [seed_track]
        candidates = diversify(rank(tracks, affinity, seeds or native[:3],
                                     excluded | ({item['id'] for item in native} if surface=='smart-shuffle' else set()),
                                     request.seed), request.limit)
        result = record_impressions(conn, request.user_id, surface, candidates)
        if surface == 'smart-shuffle':
            feedback = conn.execute('''SELECT e.event_type, count(*) AS count FROM events e
                JOIN impressions i ON i.id=e.recommendation_id WHERE e.user_id=%s
                AND i.surface='smart-shuffle' AND e.occurred_at > now()-interval '30 days'
                AND e.event_type IN ('PLAY_COMPLETED','PLAY_SKIPPED','PLAY_EARLY_SKIPPED','TRACK_LIKED')
                GROUP BY e.event_type''', (request.user_id,)).fetchall()
            counts = {item['event_type']: item['count'] for item in feedback}
            positive = counts.get('PLAY_COMPLETED',0) + counts.get('TRACK_LIKED',0)
            negative = counts.get('PLAY_SKIPPED',0) + counts.get('PLAY_EARLY_SKIPPED',0)
            interval = 4 if positive >= negative + 3 else 8 if negative >= positive + 2 else 6
            return {'items':result,'insertionInterval':interval,'modelVersion':MODEL_VERSION}
        if surface == 'home':
            recent = sorted((item for item in tracks if affinity.get(item['id'],{}).get('last_played')),
                            key=lambda item: affinity[item['id']]['last_played'], reverse=True)
            modules = []
            if recent:
                modules.append({'id':'jump-back-in','title':'Jump Back In','layout':'cards',
                                'items':[{'trackId':item['id']} for item in recent[:6]]})
            if result:
                modules.append({'id':'quick-picks','title':'Quick Picks','layout':'compact','items':result[:6]})
                if len(result)>6:
                    modules.append({'id':'discover','title':'Made For You','layout':'cards','items':result[6:12]})
            # Module order follows listening context; a fresh session favors discovery.
            if not recent:
                modules.reverse()
            return {'modules':modules,'modelVersion':MODEL_VERSION}
        return {'items':result,'modelVersion':MODEL_VERSION}


@app.post('/taste-profile')
def taste_profile(request: Request, x_service_key: str | None = Header(default=None)):
    authorized(x_service_key)
    with connect() as conn:
        tracks, affinity = catalog_and_taste(conn, request.user_id)
        favorites = sorted(tracks, key=lambda item: affinity.get(item['id'],{}).get('score',0), reverse=True)
        return {'topTracks':[{'trackId':item['id'],'score':affinity.get(item['id'],{}).get('score',0)} for item in favorites[:20]],'modelVersion':MODEL_VERSION}


@app.post('/debug/track')
def debug_track(request: Request, x_service_key: str | None = Header(default=None)):
    authorized(x_service_key)
    with connect() as conn:
        tracks, affinity = catalog_and_taste(conn, request.user_id)
        selected = rank(tracks, affinity, seed=request.seed)
        return {'candidates':[{'trackId':item.track['id'],'score':round(item.score,4),
                                'features':item.features,'explanation':item.explanation}
                               for item in selected[:request.limit]],'modelVersion':MODEL_VERSION}

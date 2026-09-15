"""Idempotent, single-writer incremental projection from append-only events."""
from datetime import datetime, timezone
from math import exp, log
import time
from .config import EVENT_WEIGHTS, HALF_LIFE_DAYS
from .db import connect, migrate


def project_once():
    with connect() as conn:
        # A transactional lock serializes projections across worker replicas.
        conn.execute('SELECT pg_advisory_xact_lock(714289)')
        cursor = conn.execute("SELECT last_sequence FROM processing_state WHERE name='taste' FOR UPDATE").fetchone()['last_sequence']
        events = conn.execute('SELECT e.*, t.artist_ids, t.album_id FROM events e LEFT JOIN tracks t ON t.id=e.track_id WHERE e.sequence > %s ORDER BY e.sequence LIMIT 500', (cursor,)).fetchall()
        for event in events:
            cursor = event['sequence']
            weight = EVENT_WEIGHTS.get(event['event_type'])
            if weight is None or not event['track_id']:
                continue
            occurred = event['occurred_at']
            age = max(0, (datetime.now(timezone.utc) - occurred).total_seconds() / 86400)
            delta = weight * exp(-log(2) * age / HALF_LIFE_DAYS)
            ratio = event['completion_ratio']
            if event['event_type'] == 'PLAY_COMPLETED' and ratio is not None:
                delta *= max(0.5, min(1.5, ratio))
            conn.execute('''INSERT INTO track_affinity(user_id, track_id, score, plays, skips, last_played)
              VALUES (%s,%s,%s,%s,%s,%s) ON CONFLICT(user_id,track_id) DO UPDATE SET
              score=track_affinity.score + EXCLUDED.score, plays=track_affinity.plays + EXCLUDED.plays,
              skips=track_affinity.skips + EXCLUDED.skips,
              last_played=COALESCE(EXCLUDED.last_played,track_affinity.last_played), updated_at=now()''',
              (event['user_id'], event['track_id'], delta, int(event['event_type']=='PLAY_STARTED'),
               int(event['event_type'] in ('PLAY_SKIPPED','PLAY_EARLY_SKIPPED')),
               occurred if event['event_type']=='PLAY_STARTED' else None))
            for artist_id in event['artist_ids'] or []:
                conn.execute('''INSERT INTO artist_affinity(user_id,artist_id,score) VALUES (%s,%s,%s)
                  ON CONFLICT(user_id,artist_id) DO UPDATE SET score=artist_affinity.score+EXCLUDED.score,updated_at=now()''',
                  (event['user_id'], artist_id, delta))
            if event['album_id']:
                conn.execute('''INSERT INTO album_affinity(user_id,album_id,score) VALUES (%s,%s,%s)
                  ON CONFLICT(user_id,album_id) DO UPDATE SET score=album_affinity.score+EXCLUDED.score,updated_at=now()''',
                  (event['user_id'], event['album_id'], delta))
        conn.execute("UPDATE processing_state SET last_sequence=%s WHERE name='taste'", (cursor,))
        return len(events)


if __name__ == '__main__':
    migrate()
    while True:
        try:
            if not project_once():
                time.sleep(2)
        except Exception as error:
            print(f'projection retry: {error}', flush=True)
            time.sleep(5)

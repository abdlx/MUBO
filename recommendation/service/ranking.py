"""Inspectable metadata-first recommendation pipeline; no dependency on embeddings."""
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timezone
from hashlib import sha256
import random


@dataclass(frozen=True)
class Candidate:
    track: dict
    score: float
    features: dict
    explanation: str


def similarity(a: dict, b: dict) -> float:
    genres_a = set(a.get('genres') or [])
    genres_b = set(b.get('genres') or [])
    common = len(genres_a & genres_b) / max(1, len(genres_a | genres_b))
    return (0.5 if a.get('artist') == b.get('artist') else 0) + (0.25 if a.get('album_id') == b.get('album_id') else 0) + 0.25 * common


def rank(tracks: list[dict], affinity: dict[str, dict], seeds: list[dict] | None = None,
         excluded: set[str] | None = None, seed: str = '', exploration: float = 0.12) -> list[Candidate]:
    seeds = seeds or []
    excluded = excluded or set()
    artist_scores = Counter()
    genre_scores = Counter()
    for track in tracks:
        weight = max(0, affinity.get(track['id'], {}).get('score', 0))
        artist_scores[track['artist']] += weight
        for genre in track.get('genres') or []:
            genre_scores[genre] += weight
    rng = random.Random(int(sha256(seed.encode()).hexdigest()[:16], 16))
    result = []
    for track in tracks:
        if track['id'] in excluded:
            continue
        item_affinity = affinity.get(track['id'], {})
        last_played = item_affinity.get('last_played')
        days = max(0, (datetime.now(timezone.utc) - last_played).total_seconds() / 86400) if last_played else 999
        recency_penalty = max(0, 1 - days / 14)
        seed_score = max((similarity(track, item) for item in seeds), default=0)
        genre_score = sum(genre_scores[g] for g in track.get('genres') or []) / max(1, sum(genre_scores.values()))
        artist_score = artist_scores[track['artist']] / max(1, sum(artist_scores.values()))
        features = {
            'track_affinity': round(item_affinity.get('score', 0), 3),
            'artist_affinity': round(artist_score, 3), 'genre_affinity': round(genre_score, 3),
            'seed_similarity': round(seed_score, 3), 'recency_penalty': round(recency_penalty, 3),
            'exploration': round(rng.random(), 3),
        }
        score = (0.35 * max(-3, min(5, features['track_affinity'])) + 1.2 * artist_score +
                 1.0 * genre_score + 2 * seed_score - 1.5 * recency_penalty -
                 0.4 * item_affinity.get('skips', 0) + exploration * features['exploration'])
        explanation = ('Similar to your current music' if seed_score > 0 else
                       'Because you listen to this artist' if artist_score > 0 else
                       'A fresh pick from your library')
        result.append(Candidate(track, score, features, explanation))
    return sorted(result, key=lambda item: (-item.score, item.track['id']))


def diversify(items: list[Candidate], limit: int = 20) -> list[Candidate]:
    """Greedy sequence: space artists/albums and keep a bounded discovery lane."""
    remaining = items[:]
    selected = []
    while remaining and len(selected) < limit:
        recent = selected[-3:]
        chosen = max(remaining, key=lambda item: item.score -
                     1.2 * sum(item.track['artist'] == prev.track['artist'] for prev in recent) -
                     0.7 * sum(item.track['album_id'] == prev.track['album_id'] for prev in recent))
        selected.append(chosen)
        remaining.remove(chosen)
    return selected


def shuffle(tracks: list[dict], recent_ids: set[str], seed: str) -> list[str]:
    rng = random.Random(int(sha256(seed.encode()).hexdigest()[:16], 16))
    remaining = tracks[:]
    ordered = []
    while remaining:
        recent = ordered[-3:]
        chosen = max(remaining, key=lambda item: rng.random() -
                     0.9 * (item['id'] in recent_ids) -
                     0.8 * sum(item['artist'] == prev['artist'] for prev in recent) -
                     0.5 * sum(item['album_id'] == prev['album_id'] for prev in recent))
        ordered.append(chosen)
        remaining.remove(chosen)
    return [item['id'] for item in ordered]

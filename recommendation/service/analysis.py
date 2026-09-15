"""Metadata-based analysis; optional decoded-audio embeddings can replace this worker."""
import time
from .db import connect, migrate


def analyze_once():
    with connect() as conn:
        tracks = conn.execute('''SELECT t.id,t.genres FROM tracks t LEFT JOIN track_analysis a ON a.track_id=t.id
                                 WHERE a.track_id IS NULL LIMIT 100''').fetchall()
        for track in tracks:
            genres = ' '.join(track['genres'] or []).lower()
            mood = 'calm' if any(word in genres for word in ('ambient','chill','classical','jazz')) else 'energetic' if any(word in genres for word in ('rock','dance','electronic')) else 'unknown'
            energy = 0.3 if mood == 'calm' else 0.8 if mood == 'energetic' else None
            conn.execute('INSERT INTO track_analysis(track_id,energy,mood) VALUES (%s,%s,%s) ON CONFLICT DO NOTHING',
                         (track['id'], energy, mood))
        return len(tracks)


if __name__ == '__main__':
    migrate()
    while True:
        try:
            if not analyze_once():
                time.sleep(20)
        except Exception as error:
            print(f'analysis retry: {error}', flush=True)
            time.sleep(5)

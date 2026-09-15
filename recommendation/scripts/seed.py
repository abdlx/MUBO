"""Synthetic listeners: repeat-focused nights, morning pop, mixed discovery."""
from datetime import datetime, timedelta, timezone
from uuid import uuid4
from service.db import connect, migrate


def seed():
    migrate()
    with connect() as conn:
        tracks = conn.execute('SELECT id,genres FROM tracks ORDER BY id').fetchall()
        if not tracks:
            print('Open Home first to sync your library, then run this script.')
            return
        thirds = max(1, len(tracks) // 3)
        personas = [
            ('repeat-night', lambda row: any(word in genre.lower() for genre in row['genres'] or [] for word in ('phonk','dark','electronic')),
             tracks[:thirds], 12, 23),
            ('pop-morning', lambda row: any('pop' in genre.lower() for genre in row['genres'] or []),
             tracks[thirds:thirds * 2] or tracks[-thirds:], 8, 8),
            ('mixed-discovery', lambda row: True, tracks[::max(1,len(tracks)//8)], 2, 15),
        ]
        for user, selector, fallback, count, hour in personas:
            chosen = [item for item in tracks if selector(item)] if user != 'mixed-discovery' else fallback
            chosen = chosen or fallback
            for index, item in enumerate(chosen[:8]):
                for repeat in range(count):
                    when = (datetime.now(timezone.utc) - timedelta(days=repeat)).replace(hour=hour, minute=(index*5)%60)
                    types = ['PLAY_STARTED','PLAY_COMPLETED']
                    if user == 'pop-morning' and repeat % 2 == 0:
                        types.append('TRACK_SAVED')
                    if user == 'mixed-discovery' and index % 3 == 0:
                        types.append('TRACK_LIKED')
                    for event_type in types:
                        conn.execute('''INSERT INTO events(event_id,user_id,session_id,event_type,track_id,
                           completion_ratio,occurred_at) VALUES (%s,%s,%s,%s,%s,%s,%s)''',
                           (uuid4(),user,f'{user}-{repeat}',event_type,item['id'],1 if event_type=='PLAY_COMPLETED' else None,when))
        print('Seeded three synthetic listeners; allow the worker to project events.')


if __name__ == '__main__':
    seed()

from pathlib import Path
import psycopg
from psycopg.rows import dict_row
from .config import DATABASE_URL


def connect():
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


def migrate():
    with connect() as conn:
        for file in sorted((Path(__file__).parent.parent / 'migrations').glob('*.sql')):
            conn.execute(file.read_text(encoding='utf-8'))

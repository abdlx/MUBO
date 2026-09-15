import os

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://mubo:mubo@postgres:5432/mubo')
REDIS_URL = os.getenv('REDIS_URL', 'redis://redis:6379/0')
API_KEY = os.getenv('RECOMMENDATION_API_KEY', 'local-development-key')
MODEL_VERSION = 'heuristic-1'
HALF_LIFE_DAYS = 30
EVENT_WEIGHTS = {
    'PLAY_STARTED': 0.2, 'PLAY_COMPLETED': 2.0, 'PLAY_SKIPPED': -1.0,
    'PLAY_EARLY_SKIPPED': -2.0, 'TRACK_REPLAYED': 1.2, 'TRACK_LIKED': 3.0,
    'TRACK_SAVED': 2.5, 'TRACK_UNSAVED': -1.5, 'TRACK_UNLIKED': -2.0,
}

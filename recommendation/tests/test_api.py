import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
from service.api import app


class Rows:
    def __init__(self, records):
        self.records = records

    def fetchall(self):
        return self.records

    def fetchone(self):
        return self.records[0] if self.records else None

    def __iter__(self):
        return iter(self.records)


class FakeConnection:
    def __init__(self):
        self.tracks = [{'id':'one','title':'One','artist':'A','album_id':'album-a','album':'First',
                        'genres':['rock'],'artist_ids':['a']},
                       {'id':'two','title':'Two','artist':'B','album_id':'album-b','album':'Second',
                        'genres':['rock'],'artist_ids':['b']}]
        self.insertions = 0

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def execute(self, query, _parameters=None):
        if 'SELECT * FROM tracks' in query:
            return Rows(self.tracks)
        if 'SELECT * FROM track_affinity' in query:
            return Rows([])
        if 'SELECT user_id,track_id FROM impressions' in query:
            return Rows([])
        if 'INSERT INTO events' in query or 'INSERT INTO impressions' in query:
            self.insertions += 1
        return Rows([])


class APIContractTests(unittest.TestCase):
    def setUp(self):
        self.conn = FakeConnection()
        self.patches = [patch('service.api.connect', return_value=self.conn),
                        patch('service.api.cached', return_value=None),
                        patch('service.api.set_cache')]
        for item in self.patches:
            item.start()
        self.client = TestClient(app)
        self.headers = {'X-Service-Key':'local-development-key'}

    def tearDown(self):
        self.client.close()
        for item in reversed(self.patches):
            item.stop()

    def test_service_key_and_surface_validation(self):
        request = {'user_id':'synthetic','seed':'same'}
        self.assertEqual(self.client.post('/recommendations/shuffle',json=request).status_code,401)
        self.assertEqual(self.client.post('/recommendations/unknown',json=request,headers=self.headers).status_code,404)
        response = self.client.post('/recommendations/shuffle',json=request,headers=self.headers)
        self.assertEqual(response.status_code,200)
        self.assertEqual(response.json()['trackIds'],
                         self.client.post('/recommendations/shuffle',json=request,headers=self.headers).json()['trackIds'])

    def test_home_records_impressions(self):
        response = self.client.post('/recommendations/home',json={'user_id':'synthetic','limit':2},headers=self.headers)
        self.assertEqual(response.status_code,200)
        self.assertTrue(response.json()['modules'])
        self.assertEqual(self.conn.insertions,2)

    def test_feedback_cannot_use_another_impression(self):
        payload = [{'user_id':'synthetic','session_id':'one','track_id':'one','event_type':'PLAY_COMPLETED',
                    'recommendation_id':'6039e2c8-e8e9-45be-a2c4-d8180d50d0d8'}]
        response = self.client.post('/events',json=payload,headers=self.headers)
        self.assertEqual(response.status_code,400)
        self.assertEqual(self.conn.insertions,0)


if __name__ == '__main__':
    unittest.main()

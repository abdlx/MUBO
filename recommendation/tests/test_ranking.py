import unittest
from service.ranking import rank, diversify, shuffle, similarity


def track(identity, artist, album, genres):
    return {'id': identity, 'artist': artist, 'album_id': album, 'genres': genres}


class RankingTests(unittest.TestCase):
    def setUp(self):
        self.tracks = [track('a','A','one',['rock']),track('b','A','one',['rock']),
                       track('c','B','two',['rock']),track('d','C','three',['ambient']),
                       track('e','D','four',['ambient'])]

    def test_shuffle_seed_reproducible_and_complete(self):
        first = shuffle(self.tracks, {'a'}, 'session-42')
        self.assertEqual(first, shuffle(self.tracks, {'a'}, 'session-42'))
        self.assertEqual(set(first), {item['id'] for item in self.tracks})
        self.assertNotEqual(first[0], 'a')

    def test_seed_similarity_and_exclusion(self):
        selected = rank(self.tracks, {}, [self.tracks[0]], {'a'}, 'test')
        self.assertEqual(selected[0].track['id'], 'b')
        self.assertNotIn('a', [item.track['id'] for item in selected])
        self.assertGreater(similarity(self.tracks[0], self.tracks[1]), similarity(self.tracks[0],self.tracks[-1]))

    def test_diversity_spreads_artists(self):
        ranked = rank(self.tracks, {'a':{'score':5},'b':{'score':5},'c':{'score':4}}, seed='fixed')
        sequence = diversify(ranked)
        self.assertEqual(len(sequence), 5)
        self.assertNotEqual(sequence[0].track['artist'], sequence[1].track['artist'])

    def test_distinct_listener_histories_change_picks(self):
        night = diversify(rank(self.tracks, {'a':{'score':8,'plays':12}}, seed='same'))
        morning = diversify(rank(self.tracks, {'d':{'score':8,'plays':8}}, seed='same'))
        self.assertEqual(night[0].track['id'], 'a')
        self.assertEqual(morning[0].track['id'], 'd')
        self.assertNotEqual([item.track['id'] for item in night[:3]],
                            [item.track['id'] for item in morning[:3]])


if __name__ == '__main__':
    unittest.main()

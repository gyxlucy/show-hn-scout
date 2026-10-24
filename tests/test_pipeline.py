import contextlib
import io
import json
import socket
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from hn_scout import collect as module
from hn_scout.review import record_label, latest_labels, link


def listing(ids, more=None):
    rows = ''.join(f'<tr class="athing" id="{i}"><td><span class="titleline"><a href="https://example.org/{i}">Show HN: Project {i}</a></span></td></tr>' for i in ids)
    return '<html><table>' + rows + '</table>' + (f'<a class="morelink" href="{more}">More</a>' if more else '') + '</html>'


class CollectionTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.patches = [patch.object(module, 'ROOT', self.root), patch.object(module, 'DATA', self.root / 'data'), patch.object(module.time, 'sleep')]
        for p in self.patches:
            p.start()

    def tearDown(self):
        for p in self.patches:
            p.stop()
        self.tmp.cleanup()

    def run_collection(self, show, show_pages=12):
        def fake_fetch(url, raw_dir, retries=1):
            if url == module.HN + 'shownew':
                body = listing([101, 102])
            elif url.startswith(module.HN + 'show'):
                if isinstance(show, Exception):
                    return {'status': 'error', 'url': url, 'error': str(show)}
                body = show
            else:
                sid = int(url.rsplit('/', 1)[1].split('.')[0])
                body = json.dumps({'id': sid, 'title': f'Show HN: {sid}', 'time': 1700000000, 'url': f'https://example.org/{sid}'})
            return {'status': 'ok', 'url': url, 'body': body}
        with patch.object(module, 'fetch', side_effect=fake_fetch), contextlib.redirect_stdout(io.StringIO()):
            module.collect(1, show_pages)
        return {r['id']: r for r in module.candidates()}

    def test_complete_listing_and_historical_membership(self):
        first = self.run_collection(listing([101]))
        self.assertEqual(first[101]['current_show'], 'present')
        self.assertEqual(first[102]['current_show'], 'absent')
        first_seen = first[101]['first_seen']
        second = self.run_collection(listing([999]))
        self.assertEqual(second[101]['current_show'], 'absent')
        self.assertTrue(second[101]['observed_ever_show'])
        self.assertEqual(second[101]['first_seen'], first_seen)
        self.assertEqual(second[101]['history_before_first_seen'], 'unknown')
        db = module.open_db()
        self.assertEqual(db.execute('SELECT COUNT(*) FROM stories').fetchone()[0], 2)

    def test_page_limit_is_unknown_not_absent(self):
        rows = self.run_collection(listing([101], 'show?p=2'), show_pages=1)
        self.assertEqual(rows[101]['current_show'], 'present')
        self.assertEqual(rows[102]['current_show'], 'unknown')

    def test_network_error_is_unknown_and_manifest_survives(self):
        rows = self.run_collection(OSError('timeout'))
        self.assertEqual(rows[101]['current_show'], 'unknown')
        manifests = list((self.root / 'data' / 'raw').glob('*/manifest.json'))
        self.assertEqual(len(manifests), 1)
        self.assertTrue(json.loads(manifests[0].read_text())['errors'])

    def test_unrecognized_response_is_unknown(self):
        rows = self.run_collection('<html>Too many requests</html>')
        self.assertEqual(rows[101]['current_show'], 'unknown')

    def test_pagination_loop_does_not_claim_complete(self):
        rows = self.run_collection(listing([101], 'show'))
        self.assertEqual(rows[102]['current_show'], 'unknown')


class FeedbackTests(unittest.TestCase):
    def test_correction_preserves_history_and_unknown_is_not_rejection(self):
        with tempfile.TemporaryDirectory() as tmp:
            cases, feedback = Path(tmp)/'cases.json', Path(tmp)/'feedback.jsonl'
            cases.write_text(json.dumps([{'id': 101, 'case_id': '01'}]))
            record_label('01', 'unsure', '需要看演示', path=feedback, cases_path=cases)
            record_label('101', 'push', '看完演示值得推', path=feedback, cases_path=cases)
            self.assertEqual(len(feedback.read_text().splitlines()), 2)
            self.assertEqual(latest_labels(feedback)['01']['decision'], 'push')
            self.assertEqual(latest_labels(feedback)['01']['originality'], 'unclear')
            with self.assertRaises(ValueError):
                record_label('missing', 'push', 'x', path=feedback, cases_path=cases)

    def test_review_card_answers_are_parsed_and_untouched_cards_are_skipped(self):
        from hn_scout.review import parse_review_labels
        with tempfile.TemporaryDirectory() as tmp:
            (Path(tmp)/'batch-01.md').write_text(
                '## 01 · A\n\n**你的判断：**  不值得推 **原因：** 太小众\n\n'
                '## 02 · B\n\n**你的判断：** 值得推 　**原因：**\n\n'
                '## 03 · C\n\n**你的判断：** 值得推 / 不值得推 / 信息不足　　**原因：**\n', encoding='utf-8')
            self.assertEqual(parse_review_labels(Path(tmp)), {'01': ('pass', '太小众'), '02': ('push', '')})

    def test_links_cannot_inject_markup_or_script_scheme(self):
        with self.assertRaises(ValueError):
            link('source', 'javascript:alert(1)')
        rendered = link('<img src=x>', 'https://example.com/a)b')
        self.assertNotIn('<img', rendered)
        self.assertIn('%29', rendered)

    def test_nonpublic_targets_remain_blocked_in_proxy_mode(self):
        for address in ['127.0.0.1', '10.0.0.1', '169.254.169.254', '::1']:
            with self.subTest(address=address), patch.dict('os.environ', {'HN_SCOUT_PROXY_DNS': '1'}), patch.object(socket, 'getaddrinfo', return_value=[(0,0,0,'',(address,443))]):
                with self.assertRaises(ValueError):
                    module.public_url('https://example.com')


if __name__ == '__main__':
    unittest.main()

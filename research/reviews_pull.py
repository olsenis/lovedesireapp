import json, os, sys, time, urllib.request, urllib.error
sys.stdout.reconfigure(encoding='utf-8')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'reviews')
os.makedirs(OUT, exist_ok=True)

APPS = {
    # tier A
    'paired': 1469609343, 'cozy_couples': 6463766369, 'couple_joy': 1624758651, 'agape': 1507907556,
    'lasting': 1225049619, 'couples_games_chouic': 933524873, 'between': 458035189, 'sumone': 1469506430,
    'love_nudge': 495326842, 'candle': 6743355635, 'evergreen': 1573360122, 'couple_game': 1391022038,
    # tier B
    'nice_intimacy': 1107291612, 'spicer': 1335558932, 'intimately_us': 1498275746, 'coral': 1448861466,
    'sexify': 1586192979, 'desire_couples_game': 923073855, 'lovbirdz': 6444805675, 'flamme': 1583601044,
    'koopla': 6504552646, 'lovewick': 1516199115, 'lovify': 1645893544, 'deepq': 6451279804,
    # tier C
    'pikant': 6748163373, 'cherished': 6776436008, 'in_the_mood': 6744419061, 'cuddle': 1534480657,
    'sparkd': 6759468642, 'intimately_smazenka': 6737746708,
}
STOREFRONTS = ['us', 'gb', 'ca', 'au']
SORTS = ['mostRecent', 'mostHelpful']

def fetch(url, tries=3):
    for i in range(tries):
        try:
            with urllib.request.urlopen(url, timeout=30) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code in (403, 429):
                time.sleep(5 * (i + 1)); continue
            return None
        except Exception:
            time.sleep(2)
    return None

for name, app_id in APPS.items():
    path = os.path.join(OUT, f'{name}.json')
    if os.path.exists(path):
        print(name, 'cached'); continue
    seen = {}
    for cc in STOREFRONTS:
        for sort in SORTS:
            for page in range(1, 11):
                d = fetch(f'https://itunes.apple.com/{cc}/rss/customerreviews/id={app_id}/sortBy={sort}/page={page}/json')
                time.sleep(0.6)
                if not d: break
                entries = d.get('feed', {}).get('entry', [])
                if isinstance(entries, dict): entries = [entries]
                if not entries: break
                new = 0
                for e in entries:
                    rid = e.get('id', {}).get('label')
                    if not rid or rid in seen: continue
                    seen[rid] = {
                        'id': rid, 'cc': cc,
                        'rating': int(e['im:rating']['label']),
                        'title': e['title']['label'],
                        'body': e['content']['label'],
                        'version': e.get('im:version', {}).get('label'),
                        'date': e.get('updated', {}).get('label', '')[:10],
                    }
                    new += 1
                if new == 0 and page > 1: break
    rows = sorted(seen.values(), key=lambda r: r['date'], reverse=True)
    json.dump(rows, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    from collections import Counter
    c = Counter(r['rating'] for r in rows)
    print(f'{name:22} {len(rows):5}  ' + ' '.join(f'{k}★{c[k]}' for k in range(1, 6)), flush=True)
print('done')

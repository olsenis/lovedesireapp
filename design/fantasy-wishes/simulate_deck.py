# Fantasy Wishes deck simulator and review-list generator.
# Source of truth: constants/content.ts (text, category, level on every preset).
# Run: python design/fantasy-wishes/simulate_deck.py
# Writes FANTASY_WISHES_LEVELS.md (repo root), design/fantasy-wishes/levels.json
# and design/fantasy-wishes/deck_order.json (the order, for comparing with the
# TypeScript orderFWDeck in services/fantasyWishesService.ts).
import io, os, re, json, sys
sys.stdout.reconfigure(encoding='utf-8')
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.chdir(ROOT)

src = io.open('constants/content.ts', encoding='utf-8').read()
a = src.index('export const FANTASY_WISHES_PRESETS')
body = src[a:src.index('\n];', a)]
rx = re.compile(r"""\{ text: ("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'), category: '(\w+)', level: (\d) \}""")
cards = []
for m in rx.finditer(body):
    raw = m.group(1)
    text = json.loads(raw) if raw[0] == '"' else raw[1:-1].replace("\\'", "'")
    cards.append({'i': len(cards), 't': text, 'c': m.group(2), 'l': int(m.group(3))})
assert len(cards) == body.count("{ text:"), ('a preset line did not parse', len(cards), body.count("{ text:"))
assert len({c['t'] for c in cards}) == len(cards), 'duplicate preset text'

ORDER = ['sensual', 'roleplay', 'explicit', 'bdsm']
LABEL = {'sensual': 'Sensual', 'roleplay': 'Roleplay', 'explicit': 'Explicit', 'bdsm': 'BDSM'}
# Must equal LEVEL_SPAN in services/fantasyWishesService.ts.
SPAN = {1: (0.00, 0.60), 2: (0.08, 0.90), 3: (0.50, 1.00)}

def deck(on=ORDER):
    scored = []
    for cat in ORDER:
        if cat not in on:
            continue
        for lv in (1, 2, 3):
            pile = [c for c in cards if c['c'] == cat and c['l'] == lv]
            lo, hi = SPAN[lv]
            for r, c in enumerate(pile):
                scored.append((lo + (r + 0.5) / len(pile) * (hi - lo), ORDER.index(cat), c['i'], c))
    return [c for _, _, _, c in sorted(scored, key=lambda t: t[:3])]

d = deck()
json.dump({c['t']: c['l'] for c in cards}, io.open('design/fantasy-wishes/levels.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
json.dump([c['t'] for c in d], io.open('design/fantasy-wishes/deck_order.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

tot = [sum(1 for c in cards if c['l'] == lv) for lv in (1, 2, 3)]
md = ['> Generated from `constants/content.ts` by `design/fantasy-wishes/simulate_deck.py`. LIVE since Sep 19 2026: this is the order the app deals. To move a card, change its `level` in `constants/content.ts` and run the script again.', '',
      f'# Fantasy Wishes: stig spilanna ({len(cards)})', '',
      '**Stig 1** = milt eða gefið í skyn, má vera fyrsta spil hjá hvaða pari sem er. **Stig 2** = greinilega kynferðislegt og sértækt. **Stig 3** = ákaft eða á jaðrinum (anal, sársauki, mikil valdaskipti, neitun, upptökur).', '',
      'Röðin í stokknum er stígandi: stig 1 dreifist yfir fyrstu 60% stokksins, stig 2 frá 8% til 90%, stig 3 frá 50% til enda. Flokkarnir blandast sjálfkrafa. Röðin er sú sama hjá báðum, og stigið sést aldrei á spilinu.', '',
      '## Fjöldi', '', '| Flokkur | Stig 1 | Stig 2 | Stig 3 | Alls |', '|---|---|---|---|---|']
for cat in ORDER:
    n = [sum(1 for c in cards if c['c'] == cat and c['l'] == lv) for lv in (1, 2, 3)]
    md.append(f"| {LABEL[cat]} | {n[0]} | {n[1]} | {n[2]} | {sum(n)} |")
md += [f"| **Alls** | **{tot[0]}** | **{tot[1]}** | **{tot[2]}** | **{sum(tot)}** |", '',
       '## Fyrstu 40 spilin sem nýtt par sér', '']
md += [f"{n}. {LABEL[c['c']]} · stig {c['l']} · {c['t']}" for n, c in enumerate(d[:40], 1)]
for lv in (1, 2, 3):
    md += ['', f"## Stig {lv}", '']
    for cat in ORDER:
        rows = [c for c in cards if c['c'] == cat and c['l'] == lv]
        if rows:
            md += [f"### {LABEL[cat]} ({len(rows)})", ''] + [f"- {c['t']}" for c in rows] + ['']
io.open('FANTASY_WISHES_LEVELS.md', 'w', encoding='utf-8', newline='\n').write('\n'.join(md) + '\n')

first = lambda seq, lv: next((i for i, c in enumerate(seq, 1) if c['l'] == lv), None)
run = best = 1
for x, y in zip(d, d[1:]):
    run = run + 1 if x['c'] == y['c'] else 1
    best = max(best, run)
print(len(cards), 'presets, levels', tot, '| first L2 at', first(d, 2), '| first L3 at', first(d, 3), '| longest run of one category', best)
for label, on in (('BDSM off', ORDER[:3]), ('only Explicit', ['explicit'])):
    dd = deck(on)
    print(' ', label, len(dd), 'cards | first L2 at', first(dd, 2), '| first L3 at', first(dd, 3))

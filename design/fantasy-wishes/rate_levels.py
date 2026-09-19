import io, os, json, sys
sys.stdout.reconfigure(encoding='utf-8')
os.chdir(r'G:\forrit\Desire')
S = r'C:\Users\olsen\AppData\Local\Temp\claude\g--forrit-Desire\603355fa-7cf0-44cc-acfb-61ee52092674\scratchpad'
cards = json.load(io.open(S + r'\fw_all.json', encoding='utf-8'))

# Rated by reading every card (Sep 19 2026). Default per category, then the
# exceptions by index in authoring order.
#   1 gentle or suggestive, fine as a first card for any couple
#   2 clearly sexual and specific
#   3 intense or edgy (anal, pain, heavy power exchange, denial, filming)
DEFAULT = {'sensual': 1, 'roleplay': 1, 'explicit': 2, 'bdsm': 3}
OVERRIDE = {
  2: [6, 210, 212, 216, 218, 220, 221, 297,                                   # sensual
      14, 223, 224, 225, 230, 231, 236, 240, 242, 244, 245, 319, 333, 337, 338,  # roleplay
      173, 174, 175, 176, 177, 178, 179, 182, 183, 192, 269, 270, 271, 275, 276,
      278, 279, 280, 281, 284, 285, 286, 289, 389, 392],                      # bdsm
  1: [24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 39, 42, 43, 44, 45, 48, 53, 55,
      64, 65, 69, 73, 74, 77, 79, 81, 82, 83, 84, 85, 93, 104, 108, 125, 127, 132, 138, 156,
      158, 166, 169, 170, 171, 172, 209, 260, 263, 360, 361, 364, 366, 373,   # explicit
      266, 267, 268, 272, 273, 274, 277, 282, 283],                           # bdsm (watching, dressing up)
  3: [239,                                                                    # roleplay
      56, 60, 70, 72, 87, 88, 90, 97, 98, 102, 107, 109, 112, 129, 135, 137, 139, 146, 151,
      197, 198, 199, 201, 204, 207, 254, 255, 264, 265, 345, 351, 370],       # explicit
}
level = {c['i']: DEFAULT[c['c']] for c in cards}
seen = set()
for lv, idxs in OVERRIDE.items():
    for i in idxs:
        assert i not in seen, ('rated twice', i)
        seen.add(i)
        level[i] = lv
for c in cards:
    c['l'] = level[c['i']]
    assert not (c['c'] == 'sensual' and c['l'] == 3)

ORDER = ['sensual', 'roleplay', 'explicit', 'bdsm']
LABEL = {'sensual': 'Sensual', 'roleplay': 'Roleplay', 'explicit': 'Explicit', 'bdsm': 'BDSM'}
# A RAMP, not strict waves. Strict waves put the first level-2 card at position
# 159 of 394, which only moves the "too long and too mild" problem. Each level
# is spread over its own stretch of the deck and the stretches overlap:
#   level 1: 0% .. 60%   level 2: 8% .. 90%   level 3: 50% .. 100%
# Every (category, level) pile is spread evenly over its level's stretch, so
# categories mix by themselves. Deterministic, same on both phones.
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

os.makedirs('design/fantasy-wishes', exist_ok=True)
json.dump({c['t']: c['l'] for c in cards}, io.open('design/fantasy-wishes/levels.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

md = ['> Review copy, Sep 19 2026. The ratings are in `design/fantasy-wishes/levels.json`; nothing in the app uses them yet. To move a card, tell Claude its number and the level it should have.', '',
      '# Fantasy Wishes: stig spilanna (394)', '',
      '**Stig 1** = milt eða gefið í skyn, má vera fyrsta spil hjá hvaða pari sem er. **Stig 2** = greinilega kynferðislegt og sértækt. **Stig 3** = ákaft eða á jaðrinum (anal, sársauki, mikil valdaskipti, neitun, upptökur).', '',
      'Röðin í stokknum er stígandi, ekki strangar bylgjur: stig 1 dreifist yfir fyrstu 60% stokksins, stig 2 frá 8% til 90%, stig 3 frá 50% til enda. Fyrstu um 20 spilin eru því öll mild, svo fer stig 2 að blandast inn, og stig 3 birtist fyrst eftir miðjan stokk. Flokkarnir blandast sjálfkrafa. Röðin er sú sama hjá báðum.', '',
      '## Fjöldi', '', '| Flokkur | Stig 1 | Stig 2 | Stig 3 | Alls |', '|---|---|---|---|---|']
for cat in ORDER:
    n = [sum(1 for c in cards if c['c'] == cat and c['l'] == lv) for lv in (1, 2, 3)]
    md.append(f"| {LABEL[cat]} | {n[0]} | {n[1]} | {n[2]} | {sum(n)} |")
tot = [sum(1 for c in cards if c['l'] == lv) for lv in (1, 2, 3)]
md += [f"| **Alls** | **{tot[0]}** | **{tot[1]}** | **{tot[2]}** | **{sum(tot)}** |", '',
       '## Fyrstu 40 spilin sem nýtt par sér', '', 'Númerið fremst er númer spilsins (notaðu það þegar þú vilt færa spil).', '']
for n, c in enumerate(deck()[:40], 1):
    md.append(f"{n}. `#{c['i']}` {LABEL[c['c']]} · stig {c['l']} · {c['t']}")
for lv in (1, 2, 3):
    md += ['', f"## Stig {lv}", '']
    for cat in ORDER:
        rows = [c for c in cards if c['c'] == cat and c['l'] == lv]
        if not rows:
            continue
        md += [f"### {LABEL[cat]} ({len(rows)})", '']
        md += [f"- `#{c['i']}` {c['t']}" for c in rows]
        md.append('')
io.open('FANTASY_WISHES_LEVELS.md', 'w', encoding='utf-8', newline='\n').write('\n'.join(md) + '\n')

print('levels', tot)
d = deck()
print('first level-2 card at position', next(i for i, c in enumerate(d, 1) if c['l'] == 2), '| first level-3 at', next(i for i, c in enumerate(d, 1) if c['l'] == 3))
run = best = 1
for a, b in zip(d, d[1:]):
    run = run + 1 if a['c'] == b['c'] else 1
    best = max(best, run)
print('longest run of one category in the whole deck:', best)
for label, on in (('BDSM off', ['sensual', 'roleplay', 'explicit']), ('only Explicit', ['explicit'])):
    dd = deck(on)
    print(label, len(dd), 'cards | first L2 at', next(i for i, c in enumerate(dd, 1) if c['l'] == 2), '| first L3 at', next((i for i, c in enumerate(dd, 1) if c['l'] == 3), None))

# Applies design/fantasy-wishes/levels.json to constants/content.ts (Step B,
# Sep 19 2026): every preset gets `level: n`, two cards are removed and one is
# reworded. Idempotent: a line that already has a level is left alone.
import io, os, re, json, sys
sys.stdout.reconfigure(encoding='utf-8')
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.chdir(ROOT)
levels = json.load(io.open('design/fantasy-wishes/levels.json', encoding='utf-8'))

REMOVE = {
    "Group fantasy, discussed and described together verbally, no real third party",
    "Degradation play with agreed words, negotiated clearly in advance",
}
REWORD = {
    "Consensual humiliation play with agreed words and boundaries, and full debrief after":
        "Consensual humiliation or degradation play with agreed words and limits, and a full debrief after",
}

p = 'constants/content.ts'
src = io.open(p, encoding='utf-8').read()
a = src.index('export const FANTASY_WISHES_PRESETS')
b = src.index('\n];', a)
body = src[a:b]
rx = re.compile(r"""^(\s*)\{ text: ("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'), category: '(\w+)'( , level: \d|, level: \d)? \},?[ \t]*$""", re.M)
out, n_lv, removed, reworded = [], 0, 0, 0
for line in body.split('\n'):
    m = rx.match(line)
    if not m:
        out.append(line)
        continue
    raw = m.group(2)
    text = json.loads(raw) if raw[0] == '"' else raw[1:-1].replace("\\'", "'")
    if text in REMOVE:
        removed += 1
        continue
    lv = levels.get(text)
    assert lv in (1, 2, 3), ('no level for', text)
    if text in REWORD:
        text = REWORD[text]
        reworded += 1
    out.append(f"{m.group(1)}{{ text: {json.dumps(text, ensure_ascii=False)}, category: '{m.group(3)}', level: {lv} }},")
    n_lv += 1
src = src[:a] + '\n'.join(out) + src[b:]

old_type = "export interface FantasyWishesItem {\n  text: string;\n  category?: FantasyWishesCategory;\n}"
assert src.count(old_type) == 1
src = src.replace(old_type, """export interface FantasyWishesItem {
  text: string;
  category?: FantasyWishesCategory;
  // Intensity, 1 to 3 (Sep 19 2026). Drives the deck order, never shown:
  //   1 gentle or suggestive, fine as a first card for any couple
  //   2 clearly sexual and specific
  //   3 intense or edgy (anal, pain, heavy power exchange, denial, filming)
  // A new preset MUST carry both category and level.
  level?: 1 | 2 | 3;
}""")
io.open(p, 'w', encoding='utf-8', newline='\n').write(src)
print('levelled', n_lv, 'removed', removed, 'reworded', reworded)

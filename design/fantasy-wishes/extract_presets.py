import io, os, re, json, sys
sys.stdout.reconfigure(encoding='utf-8')
os.chdir(r'G:\forrit\Desire')
src = io.open('constants/content.ts', encoding='utf-8').read()
a = src.index('export const FANTASY_WISHES_PRESETS')
b = src.index('\n];', a)
body = src[a:b]
rx = re.compile(r"""\{ text: ("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'), category: '(\w+)'""")
out = []
for m in rx.finditer(body):
    raw = m.group(1)
    text = json.loads(raw) if raw[0] == '"' else raw[1:-1].replace("\\'", "'")
    out.append({'i': len(out), 'c': m.group(2), 't': text})
S = r'C:\Users\olsen\AppData\Local\Temp\claude\g--forrit-Desire\603355fa-7cf0-44cc-acfb-61ee52092674\scratchpad'
json.dump(out, io.open(S + r'\fw_all.json', 'w', encoding='utf-8'), ensure_ascii=False)
code = {'sensual': 'S', 'roleplay': 'R', 'explicit': 'E', 'bdsm': 'B'}
io.open(S + r'\fw_all.txt', 'w', encoding='utf-8', newline='\n').write('\n'.join(f"{o['i']} {code[o['c']]} {o['t']}" for o in out))
print(len(out))

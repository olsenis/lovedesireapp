# Builds the position scratch-card illustrations from one shared template.
# Run: python design/scratch-cards/build_positions.py
# TEXT IS NOT HERE. Names and description lines live in positions.json next to
# this file, so copy can change without touching a drawing. This file holds only
# the drawings (SCENES, keyed by the same id). Output per position:
#   positions/<group>/<id>.svg          art only, what the app would bundle
#   positions/<group>/<id>.preview.svg  the whole card with the text, to look at
# Style (approved Sep 17 2026): two abstract figures made of thick round-capped
# strokes and a circle for the head. No faces, no genitals, no skin. Two app
# colours only. The text carries the meaning, the drawing carries the mood.
import io, os, json, html

HERE = os.path.dirname(os.path.abspath(__file__))
ROSE, BURGUNDY = '#E88FA8', '#880E4F'

def figure(colour, head, limbs):
    paths = "\n".join(f'      <path d="{d}"/>' for d in limbs)
    return (f'    <g fill="none" stroke="{colour}" stroke-width="17" stroke-linecap="round" stroke-linejoin="round">\n'
            f'{paths}\n    </g>\n'
            f'    <circle cx="{head[0]}" cy="{head[1]}" r="19" fill="{colour}"/>')

def limbs(colour, paths):
    body = "\n".join(f'      <path d="{d}"/>' for d in paths)
    return (f'    <g fill="none" stroke="{colour}" stroke-width="17" stroke-linecap="round" stroke-linejoin="round">\n'
            f'{body}\n    </g>')

def art(name, scene):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="36 78 328 250" width="328" height="250" role="img" aria-label="{name}">
{scene}
</svg>
'''

def card(name, lines, scene, sender='EVA'):
    name = html.escape(name); lines = [html.escape(l) for l in lines]
    text = "\n".join(
        f'  <text x="200" y="{412 + i * 22}" text-anchor="middle" font-family="Lato, Segoe UI, Arial, sans-serif" font-size="15" fill="#6B4652">{l}</text>'
        for i, l in enumerate(lines))
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 520" width="400" height="520" role="img" aria-label="Scratch card: {name}">
  <rect x="12" y="12" width="376" height="496" rx="28" fill="#FFF8F0" stroke="#F0D5DC" stroke-width="2"/>
  <text x="200" y="58" text-anchor="middle" font-family="Lato, Segoe UI, Arial, sans-serif" font-size="11" font-weight="700" letter-spacing="2.4" fill="#9E7B84">FROM {sender} · POSITION</text>
  <rect x="36" y="78" width="328" height="250" rx="22" fill="#FFFFFF" stroke="#F0D5DC" stroke-width="1.5"/>
  <g>
{scene}
  </g>
  <text x="200" y="378" text-anchor="middle" font-family="'Cormorant Garamond', Georgia, serif" font-size="36" font-weight="600" fill="{BURGUNDY}">{name}</text>
{text}
  <rect x="110" y="456" width="180" height="40" rx="20" fill="{BURGUNDY}"/>
  <text x="200" y="481" text-anchor="middle" font-family="Lato, Segoe UI, Arial, sans-serif" font-size="14" font-weight="700" fill="#FFF8F0">Redeem</text>
</svg>
'''

GROUND = '    <path d="M64 298 Q200 308 336 298" fill="none" stroke="#F4A7B9" stroke-width="2" stroke-linecap="round" opacity="0.8"/>'
PILLOW_TOP = '    <rect x="62" y="152" width="92" height="58" rx="20" fill="#FCE4EC"/>'
PILLOW_SIDE = '    <rect x="58" y="262" width="78" height="30" rx="15" fill="#FCE4EC"/>'

SCENES = {
  'spooning': "\n".join([
     PILLOW_TOP,
     '    <path d="M70 284 Q200 298 330 284" fill="none" stroke="#F4A7B9" stroke-width="2" stroke-linecap="round" opacity="0.8"/>',
     # seen from above
     figure(ROSE, (118, 172), ['M140 184 Q188 204 236 196', 'M236 196 L286 156 L332 186', 'M152 180 Q176 146 210 150']),
     figure(BURGUNDY, (106, 216), ['M128 230 Q182 250 236 240', 'M236 240 L290 200 L340 230', 'M146 226 Q186 210 222 174']),
   ]),
  'on-top': "\n".join([
     PILLOW_SIDE, GROUND,
     # seen from the side. Lying figure first, the one on top drawn over it.
     figure(BURGUNDY, (96, 262), ['M120 270 L218 272', 'M218 272 L270 224 L300 284', 'M138 262 Q176 232 204 214']),
     figure(ROSE, (192, 118), ['M198 148 Q206 196 214 236', 'M214 236 L262 270 L204 288', 'M196 156 Q166 204 150 246']),
   ]),
  'from-behind': "\n".join([
     GROUND,
     figure(ROSE, (92, 178), ['M116 190 Q162 204 206 182', 'M118 194 L112 286', 'M206 182 L188 284 L246 290']),
     figure(BURGUNDY, (236, 94), ['M238 124 Q242 160 236 198', 'M236 198 L244 282 L312 288', 'M236 132 Q216 156 204 176']),
   ]),
  'missionary': "\n".join([
     PILLOW_SIDE, GROUND,
     # side view. Lower figure, then the upper one, then the lower one's legs and arm wrapping over.
     figure(ROSE, (96, 266), ['M120 274 L216 276']),
     figure(BURGUNDY, (122, 204), ['M144 214 Q188 228 228 252', 'M228 252 L288 280 L340 290', 'M148 222 L152 288']),
     limbs(ROSE, ['M216 276 L262 218 L222 196', 'M134 266 Q146 232 178 218']),
   ]),
  'lotus': "\n".join([
     GROUND,
     # side view, both sitting up, one in the other's lap.
     figure(BURGUNDY, (176, 150), ['M168 284 Q156 232 172 182', 'M168 284 L256 288 L300 268']),
     figure(ROSE, (224, 140), ['M226 262 Q242 214 226 170', 'M226 262 L160 258 L118 286']),
     limbs(BURGUNDY, ['M174 196 Q214 214 242 206']),
     limbs(ROSE, ['M224 180 Q198 170 166 186']),
   ]),
  'standing': "\n".join([
     GROUND,
     # side view, face to face, one leg lifted around the other's hip.
     figure(BURGUNDY, (168, 112), ['M170 142 L176 208', 'M176 208 L166 296', 'M176 208 L192 296']),
     figure(ROSE, (218, 120), ['M218 150 L216 212', 'M216 212 L224 296']),
     limbs(ROSE, ['M216 212 L154 208 L142 258', 'M218 160 Q194 146 168 148']),
     limbs(BURGUNDY, ['M170 154 Q140 178 150 206']),
   ]),
}

DATA = json.load(io.open(os.path.join(HERE, 'positions.json'), encoding='utf-8'))
for pos in DATA['positions']:
    pid, scene = pos['id'], SCENES.get(pos['id'])
    if scene is None:
        print('NO DRAWING YET:', pid); continue
    for l in pos['lines']:
        if len(l) > 48: print(f'  warning, {pid}: line is {len(l)} characters, may overflow: {l}')
    d = os.path.join(HERE, 'positions', pos['group'])
    os.makedirs(d, exist_ok=True)
    io.open(os.path.join(d, pid + '.svg'), 'w', encoding='utf-8', newline=chr(10)).write(art(pos['name'], scene))
    io.open(os.path.join(d, pid + '.preview.svg'), 'w', encoding='utf-8', newline=chr(10)).write(card(pos['name'], pos['lines'], scene, DATA.get('sender', 'EVA')))
    # every finished card also lands in one flat folder, for flipping through them all
    allp = os.path.join(HERE, 'all-cards'); os.makedirs(allp, exist_ok=True)
    io.open(os.path.join(allp, pid + '.svg'), 'w', encoding='utf-8', newline=chr(10)).write(card(pos['name'], pos['lines'], scene, DATA.get('sender', 'EVA')))
    print(os.path.join('positions', pos['group'], pid + '.svg'), '+ preview')

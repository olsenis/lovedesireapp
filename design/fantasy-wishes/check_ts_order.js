// Proves the app's orderFWDeck (TypeScript) deals the same order as the Python
// simulator. Run AFTER simulate_deck.py:  node design/fantasy-wishes/check_ts_order.js
// It transpiles only the pure ordering code out of the service (no Firebase).
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const root = path.join(__dirname, '..', '..');

const svc = fs.readFileSync(path.join(root, 'services/fantasyWishesService.ts'), 'utf8');
const a = svc.indexOf('const LEVEL_SPAN');
const b = svc.indexOf('// For Home and Our Story');
if (a < 0 || b < 0) throw new Error('could not find orderFWDeck in the service');
const js = ts.transpileModule(svc.slice(a, b).replace('export function', 'function'), { compilerOptions: { target: 'ES2020' } }).outputText;

const content = fs.readFileSync(path.join(root, 'constants/content.ts'), 'utf8');
const s = content.indexOf('export const FANTASY_WISHES_PRESETS');
const body = content.slice(s, content.indexOf('\n];', s));
const rx = /\{ text: ("(?:\\.|[^"\\])*"), category: '(\w+)', level: (\d) \}/g;
const items = [];
let m;
while ((m = rx.exec(body))) items.push({ id: 'p' + items.length, text: JSON.parse(m[1]), category: m[2], level: +m[3], createdAt: items.length, votes: {} });

const FW_CATEGORY_ORDER = ['sensual', 'roleplay', 'explicit', 'bdsm'];
const orderFWDeck = new Function('FW_CATEGORY_ORDER', js + '\nreturn orderFWDeck;')(FW_CATEGORY_ORDER);

const tsOrder = orderFWDeck(items).map((i) => i.text);
const pyOrder = JSON.parse(fs.readFileSync(path.join(__dirname, 'deck_order.json'), 'utf8'));
let diff = -1;
for (let i = 0; i < Math.max(tsOrder.length, pyOrder.length); i++) if (tsOrder[i] !== pyOrder[i]) { diff = i; break; }
console.log('presets', items.length, '| ts order', tsOrder.length, '| simulator', pyOrder.length, '|', diff === -1 ? 'IDENTICAL' : 'FIRST DIFFERENCE at ' + (diff + 1));
if (diff !== -1) { console.log(' ts :', tsOrder[diff]); console.log(' sim:', pyOrder[diff]); process.exit(1); }

// A couple-written wish (no level) must come last.
const withCustom = orderFWDeck([...items, { id: 'c1', text: 'ours', createdAt: 1, votes: {} }]);
console.log('couple-written wish is last:', withCustom[withCustom.length - 1].id === 'c1');

// Reads every <HelpModal …/> in app/ and components/ and writes HINTS.md at the
// repo root: the hint cards as a person reads them, with where each one lives
// and whether it keeps to the length budget (CLAUDE.md, "Help system").
//
//   node design/hints/extract_hints.js
//
// The hints themselves stay in the screens (they use the partner's name and
// live values). HINTS.md is GENERATED: edit the screen, then run this again.
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..', '..');
const MAX_TIPS = 4, MAX_TIP = 84, MAX_TOTAL = 400;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (p.endsWith('.tsx')) out.push(p);
  }
  return out;
}

// A string, template or personalise(...) call as the text a person would read.
// Live values become readable stand-ins: the partner is "Ola".
function textOf(node, src) {
  if (!node) return '';
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isTemplateExpression(node)) {
    let s = node.head.text;
    for (const span of node.templateSpans) s += standIn(span.expression.getText(src)) + span.literal.text;
    return s;
  }
  if (ts.isJsxExpression(node)) return textOf(node.expression, src);
  if (ts.isCallExpression(node) && node.expression.getText(src) === 'personalise') return textOf(node.arguments[0], src);
  if (ts.isConditionalExpression(node)) return textOf(node.whenTrue, src);
  if (ts.isParenthesizedExpression(node)) return textOf(node.expression, src);
  return `{${node.getText(src)}}`;
}
function standIn(expr) {
  if (/partner/i.test(expr)) return 'Ola';
  if (/APP_NAME/.test(expr)) return 'Love Desire';
  return `{${expr}}`;
}
const fill = (s) => s.replace(/\{Partner\}/g, 'Ola').replace(/\{partner\}/g, 'Ola');

const cards = [];
for (const file of [...walk(path.join(ROOT, 'app')), ...walk(path.join(ROOT, 'components'))]) {
  const code = fs.readFileSync(file, 'utf8');
  if (!code.includes('<HelpModal')) continue;
  const src = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const keyMatch = code.match(/useHelp\('([^']+)'\)/);
  (function visit(n) {
    if ((ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) && n.tagName.getText(src) === 'HelpModal') {
      const card = { file: path.relative(ROOT, file).replace(/\\/g, '/'), key: keyMatch ? keyMatch[1] : '?', title: '', description: '', tips: [] };
      card.line = src.getLineAndCharacterOfPosition(n.getStart(src)).line + 1;
      for (const a of n.attributes.properties) {
        if (!ts.isJsxAttribute(a) || !a.initializer) continue;
        const name = a.name.getText(src);
        if (name === 'title') card.title = fill(textOf(a.initializer, src));
        if (name === 'description') card.description = fill(textOf(a.initializer, src));
        if (name === 'tips') {
          const arr = a.initializer.expression;
          if (arr && ts.isArrayLiteralExpression(arr)) {
            card.tips = arr.elements.map((e) => fill(textOf(e, src)));
            // A tip that differs by a condition (Premium or not): keep the other wording too.
            card.alts = arr.elements.map((e) => (ts.isConditionalExpression(e)
              ? { when: e.condition.getText(src), text: fill(textOf(e.whenFalse, src)) } : null));
          }
        }
      }
      cards.push(card);
    }
    ts.forEachChild(n, visit);
  })(src);
}
cards.sort((a, b) => a.title.localeCompare(b.title));

const today = new Date().toISOString().slice(0, 10);
let md = `# Hints\n\nEvery first-visit "How it works" card in the app, as a person reads it (the partner shown as "Ola").\n\n`;
md += `**GENERATED, do not edit here.** The text lives in each screen's \`<HelpModal>\`; change it there and run \`node design/hints/extract_hints.js\`. Generated ${today}, ${cards.length} cards.\n\n`;
md += `Length budget: at most ${MAX_TIPS} tips, each under about ${MAX_TIP} characters, description plus tips under about ${MAX_TOTAL}. Writing rules are in CLAUDE.md under "Help system".\n\n`;
md += `| Card | Key | Where | Tips | Characters | Budget |\n|---|---|---|---|---|---|\n`;
const problems = [];
for (const c of cards) {
  const total = c.description.length + c.tips.reduce((n, t) => n + t.length, 0);
  const long = [...c.tips, ...(c.alts || []).filter(Boolean).map((a) => a.text)].filter((t) => t.length > MAX_TIP);
  const bad = [];
  if (c.tips.length > MAX_TIPS) bad.push(`${c.tips.length} tips`);
  if (long.length) bad.push(`${long.length} long tip${long.length > 1 ? 's' : ''}`);
  if (total > MAX_TOTAL) bad.push(`${total} chars`);
  c.total = total; c.bad = bad;
  if (bad.length) problems.push(`${c.title}: ${bad.join(', ')}`);
  md += `| ${c.title} | \`${c.key}\` | [${c.file}:${c.line}](${encodeURI(c.file)}#L${c.line}) | ${c.tips.length} | ${total} | ${bad.length ? '⚠️ ' + bad.join(', ') : 'ok'} |\n`;
}
md += `\n`;
for (const c of cards) {
  md += `## ${c.title}\n\n\`${c.key}\` · [${c.file}:${c.line}](${encodeURI(c.file)}#L${c.line})\n\n> ${c.description}\n\n`;
  c.tips.forEach((t, i) => {
    const alt = c.alts && c.alts[i];
    md += `- ${t}${t.length > MAX_TIP ? `  _(${t.length} characters)_` : ''}${alt ? `  _(when ${alt.when})_` : ''}\n`;
    if (alt) md += `  - otherwise: ${alt.text}${alt.text.length > MAX_TIP ? `  _(${alt.text.length} characters)_` : ''}\n`;
  });
  md += `\n`;
}
fs.writeFileSync(path.join(ROOT, 'HINTS.md'), md, 'utf8');
console.log(`${cards.length} cards -> HINTS.md`);
console.log(problems.length ? 'over budget:\n  ' + problems.join('\n  ') : 'all inside the budget');

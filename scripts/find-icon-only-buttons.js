// Finds TouchableOpacity blocks whose visible Text content is short/icon-only
// AND doesn't already have accessibilityLabel.
//
// Output: file:line — opening tag preview + the inner Text content
// User can then manually add accessibilityLabel where it matters.

const fs = require('fs');
const path = require('path');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      walk(p, out);
    } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
      out.push(p);
    }
  }
  return out;
}

function findTouchableBlocks(content) {
  const blocks = [];
  let i = 0;
  while (i < content.length) {
    if (
      content.startsWith('<TouchableOpacity', i) &&
      !/[A-Za-z0-9]/.test(content[i + 17] || '')
    ) {
      const startLine = content.substring(0, i).split('\n').length;
      // Walk to end of opening tag
      let j = i + 17;
      let depth = 0;
      let inStr = null;
      while (j < content.length) {
        const ch = content[j];
        const prev = content[j - 1];
        if (inStr) {
          if (ch === inStr && prev !== '\\') inStr = null;
        } else if (ch === '"' || ch === "'" || ch === '`') {
          inStr = ch;
        } else if (ch === '{' || ch === '(' || ch === '[') depth++;
        else if (ch === '}' || ch === ')' || ch === ']') depth--;
        else if (ch === '>' && depth === 0) break;
        j++;
      }
      const openTagEnd = j + 1;
      const openTag = content.slice(i, openTagEnd);

      // Self-closing?
      if (content[j - 1] === '/') {
        i = openTagEnd;
        continue;
      }

      // Find matching </TouchableOpacity>
      const closeIdx = content.indexOf('</TouchableOpacity>', openTagEnd);
      if (closeIdx === -1) break;
      const body = content.slice(openTagEnd, closeIdx);

      blocks.push({ line: startLine, openTag, body });
      i = closeIdx + 19;
    } else {
      i++;
    }
  }
  return blocks;
}

function extractTextContent(body) {
  // Find all <Text ...>CONTENT</Text> blocks and collect CONTENT
  const texts = [];
  const re = /<Text[^>]*>([\s\S]*?)<\/Text>/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    // Strip JSX expressions (just keep raw text/emojis for length check)
    const raw = m[1].trim();
    texts.push(raw);
  }
  return texts;
}

const files = [...walk('app'), ...walk('components')];
const candidates = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const blocks = findTouchableBlocks(content);
  for (const b of blocks) {
    if (b.openTag.includes('accessibilityLabel')) continue;
    const texts = extractTextContent(b.body);
    const totalLen = texts.reduce((sum, t) => sum + t.length, 0);
    // Heuristic: icon-only if total text content is <= 15 chars OR contains mostly symbols
    const looksIconOnly = texts.length > 0 && totalLen <= 15;
    if (looksIconOnly) {
      const onPress = b.openTag.match(/onPress=\{([^}]+(?:\([^)]*\))?[^}]*)\}/);
      candidates.push({
        file: file.replace(/\\/g, '/'),
        line: b.line,
        texts: texts.join(' | '),
        onPressHint: onPress ? onPress[1].slice(0, 60).replace(/\s+/g, ' ') : '',
      });
    }
  }
}

console.log(`Found ${candidates.length} icon-only buttons without accessibilityLabel:\n`);
for (const c of candidates) {
  console.log(`${c.file}:${c.line}`);
  console.log(`  text: "${c.texts}"`);
  if (c.onPressHint) console.log(`  onPress: ${c.onPressHint}`);
  console.log();
}

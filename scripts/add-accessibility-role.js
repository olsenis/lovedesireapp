// Walks TSX files and adds accessibilityRole="button" to any <TouchableOpacity ...>
// that doesn't already have one. Handles nested braces/parens correctly
// (unlike a naive regex that breaks on => arrows inside onPress).

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

function processFile(content) {
  let result = '';
  let i = 0;
  let added = 0;

  while (i < content.length) {
    const isTagStart =
      content.startsWith('<TouchableOpacity', i) &&
      !/[A-Za-z0-9]/.test(content[i + 17] || '');

    if (!isTagStart) {
      result += content[i];
      i++;
      continue;
    }

    // Walk forward tracking brace/paren/bracket depth and string state
    let j = i + 17;
    let depth = 0;
    let inString = null; // null | "'" | '"' | '`'

    while (j < content.length) {
      const ch = content[j];
      const prev = content[j - 1];

      if (inString) {
        if (ch === inString && prev !== '\\') inString = null;
      } else {
        if (ch === '"' || ch === "'" || ch === '`') {
          inString = ch;
        } else if (ch === '{' || ch === '(' || ch === '[') {
          depth++;
        } else if (ch === '}' || ch === ')' || ch === ']') {
          depth--;
        } else if (ch === '>' && depth === 0) {
          const isSelfClose = content[j - 1] === '/';
          const tagEnd = isSelfClose ? j - 1 : j;
          const attrs = content.slice(i + 17, tagEnd);

          if (attrs.includes('accessibilityRole')) {
            result += content.slice(i, j + 1);
          } else {
            const insertion = ' accessibilityRole="button"';
            result += content.slice(i, tagEnd) + insertion + content.slice(tagEnd, j + 1);
            added++;
          }
          i = j + 1;
          break;
        }
      }
      j++;
    }

    if (j >= content.length) {
      // Malformed tag — bail out and append remainder
      result += content.slice(i);
      break;
    }
  }

  return { content: result, added };
}

const dryRun = process.argv.includes('--dry');
const testOnly = process.argv.includes('--test');

const files = testOnly
  ? ['app/(tabs)/discover.tsx']
  : [...walk('app'), ...walk('components')];

let totalAdded = 0;
let filesChanged = 0;

for (const file of files) {
  const original = fs.readFileSync(file, 'utf8');
  const { content: newContent, added } = processFile(original);

  if (added > 0) {
    if (!dryRun) fs.writeFileSync(file, newContent);
    filesChanged++;
    totalAdded += added;
    console.log(`${file.padEnd(50)} +${added}`);
  }
}

console.log(`\nFiles ${dryRun ? 'would change' : 'changed'}: ${filesChanged}`);
console.log(`Total roles added: ${totalAdded}`);

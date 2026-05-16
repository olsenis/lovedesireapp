// Targeted accessibilityLabel additions for known icon-only buttons.
// Each entry: file → list of [needle, replacement]

const fs = require('fs');

const edits = [
  ['app/countdown.tsx', [
    [/<TouchableOpacity[^>]*onPress=\{\(\) => profile\?\.coupleId && deleteImportantDate[^}]+\}[^>]*accessibilityRole="button">/,
     m => m.replace('accessibilityRole="button"', 'accessibilityRole="button" accessibilityLabel="Delete date"')],
  ]],
  ['app/daily-wishes.tsx', [
    [/<TouchableOpacity[^>]*onPress=\{\(\) => setShowMatches\(false\)\}[^>]*accessibilityRole="button">/,
     m => m.replace('accessibilityRole="button"', 'accessibilityRole="button" accessibilityLabel="Close matches"')],
  ]],
  ['app/intimacy-tracker.tsx', [
    [/<TouchableOpacity[^>]*onPress=\{\(\) => setSelectedEntry\(null\)\}[^>]*accessibilityRole="button">/,
     m => m.replace('accessibilityRole="button"', 'accessibilityRole="button" accessibilityLabel="Close"')],
    [/<TouchableOpacity[^>]*onPress=\{\(\) => \{ reset\(\); onClose\(\); \}\}[^>]*accessibilityRole="button">/,
     m => m.replace('accessibilityRole="button"', 'accessibilityRole="button" accessibilityLabel="Close"')],
    [/<TouchableOpacity[^>]*onPress=\{\(\) => row\.setCount\(Math\.max\(1, row\.count - 1\)\)\}[^>]*accessibilityRole="button">/,
     m => m.replace('accessibilityRole="button"', 'accessibilityRole="button" accessibilityLabel="Decrease"')],
    [/<TouchableOpacity[^>]*onPress=\{\(\) => row\.setCount\(Math\.min\(9, row\.count \+ 1\)\)\}[^>]*accessibilityRole="button">/,
     m => m.replace('accessibilityRole="button"', 'accessibilityRole="button" accessibilityLabel="Increase"')],
  ]],
  ['app/moments.tsx', [
    [/<TouchableOpacity[^>]*onPress=\{\(\) => setViewingMoment\(null\)\}[^>]*accessibilityRole="button">/,
     m => m.replace('accessibilityRole="button"', 'accessibilityRole="button" accessibilityLabel="Close moment"')],
  ]],
  ['app/reminders.tsx', [
    [/<TouchableOpacity[^>]*onPress=\{\(\) => \{ if \(coupleId\) \{ deleteReminder[^}]+\}[^}]+\}\}[^>]*accessibilityRole="button">/,
     m => m.replace('accessibilityRole="button"', 'accessibilityRole="button" accessibilityLabel="Delete reminder"')],
  ]],
  ['app/upgrade.tsx', [
    [/<TouchableOpacity[^>]*onPress=\{\(\) => router\.back\(\)\}[^>]*accessibilityRole="button">/,
     m => m.replace('accessibilityRole="button"', 'accessibilityRole="button" accessibilityLabel="Close"')],
  ]],
];

let totalApplied = 0;
for (const [file, replacements] of edits) {
  let content = fs.readFileSync(file, 'utf8');
  let applied = 0;
  for (const [regex, fn] of replacements) {
    const before = content;
    content = content.replace(regex, fn);
    if (content !== before) applied++;
  }
  if (applied > 0) {
    fs.writeFileSync(file, content);
    console.log(`${file} +${applied}`);
    totalApplied += applied;
  } else {
    console.log(`${file} — no matches`);
  }
}
console.log(`\nTotal labels added: ${totalApplied}`);

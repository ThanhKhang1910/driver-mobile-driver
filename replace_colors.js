const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'src');
const replacements = [
  { old: /#38A169/gi, new: '#3399FF' }, // Green -> Blue
  { old: /#C6F6D5/gi, new: '#EBF8FF' }, // Light Green -> Light Blue
  { old: /#F0FFF4/gi, new: '#EFF6FF' }  // Very Light Green -> Very Light Blue
];

function walkSync(dir, callback) {
  fs.readdirSync(dir).forEach(file => {
    const filepath = path.join(dir, file);
    const stat = fs.statSync(filepath);
    if (stat.isDirectory()) {
      walkSync(filepath, callback);
    } else if (stat.isFile() && (filepath.endsWith('.ts') || filepath.endsWith('.tsx'))) {
      callback(filepath);
    }
  });
}

walkSync(targetDir, (filepath) => {
  let content = fs.readFileSync(filepath, 'utf8');
  let original = content;
  replacements.forEach(r => {
    content = content.replace(r.old, r.new);
  });
  if (content !== original) {
    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`Updated ${filepath}`);
  }
});

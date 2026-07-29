const fs = require('fs');
const path = require('path');

const files = ['index.html', 'index.css', 'index.js', 'invoice-utils.js'];
files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    let lineNum = 1;
    content.split('\n').forEach(line => {
      if (line.includes('1001')) {
        console.log(`${file}:${lineNum}: ${line.trim()}`);
      }
      lineNum++;
    });
  }
});

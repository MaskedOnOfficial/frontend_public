const fs = require('fs');
const path = 'd:/websites and web apps/maskOn/frontend/src/pages/discover.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace garbled box-drawing horizontal: U+00E2 U+201D U+20AC -> simple dash
content = content.replace(/\u00E2\u201D\u20AC/g, '-');

// Replace garbled double-box-drawing: U+2550 U+0090 -> simple equals
content = content.replace(/\u2550\u0090/g, '=');

fs.writeFileSync(path, content, 'utf8');

// Verify
const after = fs.readFileSync(path, 'utf8');
const remaining = (after.match(/[\u00E2\u2550]/g) || []).length;
console.log('Remaining garbled chars:', remaining);

// Show fixed lines
const lines = after.split('\n');
[14, 82, 139, 208, 300, 398, 468, 510, 512].forEach(i => {
  console.log(`Line ${i+1}: ${lines[i].trim()}`);
});

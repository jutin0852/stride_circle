const fs = require('node:fs');
const path = require('node:path');
const folder = path.join(__dirname, '../assets/branding');
const source = fs.readFileSync(path.join(folder, 'waka-dark.svg'), 'utf8');
const light = source.replaceAll('#111F29', '#13B5E8').replaceAll('#42C2E6', '#FFFFFF').replace('WAKA dark app icon', 'WAKA light app icon');
fs.writeFileSync(path.join(folder, 'waka-light.svg'), light);
// Android draws this over the blue adaptive-icon background. Extra padding
// keeps the full mark inside circular and rounded launcher masks.
const foreground = light.replace(/<rect\b[^>]*\/>/, '').replace('<g transform=', '<g transform="translate(102.4 102.4) scale(0.8)"><g transform=').replace('</svg>', '</g></svg>');
fs.writeFileSync(path.join(folder, 'waka-adaptive-foreground.svg'), foreground);

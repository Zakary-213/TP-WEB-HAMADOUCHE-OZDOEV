const fs = require('fs');
const path = require('path');

const outputPath = path.join(__dirname, '..', 'frontend', 'runtime-config.js');
const apiBaseUrl = process.env.API_BASE_URL || '';

const content = `window.__APP_CONFIG__ = {\n  API_BASE_URL: ${JSON.stringify(apiBaseUrl)}\n};\n`;

fs.writeFileSync(outputPath, content, 'utf8');
console.log(`Generated ${outputPath}`);

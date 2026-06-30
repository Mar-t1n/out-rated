const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const token = process.env.TMDB_ACCESS_TOKEN || '';
const outputPath = path.join(__dirname, 'config.js');

fs.writeFileSync(
    outputPath,
    `globalThis.__TMDB_ACCESS_TOKEN__ = ${JSON.stringify(token)};\n`,
    'utf8'
);

console.log('Generated scripts/config.js from .env');
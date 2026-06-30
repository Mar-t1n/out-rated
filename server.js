const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const PORT = process.env.PORT || 3000;
const TMDB_ACCESS_TOKEN = process.env.TMDB_ACCESS_TOKEN;
const ROOT_DIR = __dirname;

function sendJson(res, statusCode, payload) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify(payload));
}

function getContentType(filePath) {
    if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
    if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
    if (filePath.endsWith('.js')) return 'application/javascript; charset=utf-8';
    if (filePath.endsWith('.png')) return 'image/png';
    if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) return 'image/jpeg';
    if (filePath.endsWith('.svg')) return 'image/svg+xml';
    if (filePath.endsWith('.ico')) return 'image/x-icon';
    return 'application/octet-stream';
}

async function fetchTMDB(pathname) {
    if (!TMDB_ACCESS_TOKEN) {
        throw new Error('Missing TMDB_ACCESS_TOKEN in .env');
    }

    return new Promise((resolve, reject) => {
        const request = https.request(
            `https://api.themoviedb.org/3${pathname}`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`,
                    accept: 'application/json'
                }
            },
            (response) => {
                let body = '';

                response.setEncoding('utf8');
                response.on('data', (chunk) => {
                    body += chunk;
                });

                response.on('end', () => {
                    if (response.statusCode < 200 || response.statusCode >= 300) {
                        reject(new Error(`TMDB request failed with status ${response.statusCode}`));
                        return;
                    }

                    try {
                        resolve(JSON.parse(body));
                    } catch (error) {
                        reject(error);
                    }
                });
            }
        );

        request.on('error', reject);
        request.end();
    });
}

async function getRandomMovie() {
    for (let attempt = 0; attempt < 8; attempt += 1) {
        const randomPage = Math.floor(Math.random() * 500) + 1;
        const data = await fetchTMDB(`/discover/movie?include_adult=false&include_video=false&language=en-US&page=${randomPage}&sort_by=popularity.desc`);
        const pool = (data.results || []).filter((movie) => movie.vote_average > 0 && movie.title);

        if (pool.length > 0) {
            return pool[Math.floor(Math.random() * pool.length)];
        }
    }

    throw new Error('Unable to find a valid movie from TMDB.');
}

async function handleApiRequest(req, res, url) {
    if (req.method !== 'GET') {
        sendJson(res, 405, { error: 'Method not allowed' });
        return;
    }

    if (url.pathname === '/api/random-movie') {
        try {
            const movie = await getRandomMovie();
            sendJson(res, 200, movie);
        } catch (error) {
            sendJson(res, 500, { error: error.message });
        }
        return;
    }

    const movieMatch = url.pathname.match(/^\/api\/movie\/(\d+)$/);
    if (movieMatch) {
        try {
            const movie = await fetchTMDB(`/movie/${movieMatch[1]}?language=en-US`);
            sendJson(res, 200, movie);
        } catch (error) {
            sendJson(res, 500, { error: error.message });
        }
        return;
    }

    sendJson(res, 404, { error: 'Not found' });
}

function serveStaticFile(req, res, url) {
    const requestPath = url.pathname === '/' ? '/index.html' : url.pathname;
    const safePath = path.normalize(path.join(ROOT_DIR, requestPath));

    if (!safePath.startsWith(ROOT_DIR)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    fs.readFile(safePath, (error, fileContents) => {
        if (error) {
            res.writeHead(404);
            res.end('Not found');
            return;
        }

        res.writeHead(200, {
            'Content-Type': getContentType(safePath)
        });
        res.end(fileContents);
    });
}

const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname.startsWith('/api/')) {
        handleApiRequest(req, res, url);
        return;
    }

    serveStaticFile(req, res, url);
});

server.listen(PORT, () => {
    console.log(`Out-Rated running at http://localhost:${PORT}`);
});
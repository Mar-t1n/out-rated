const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_ACCESS_TOKEN = globalThis.__TMDB_ACCESS_TOKEN__ || '';

async function fetchTMDB(path) {
    if (!TMDB_ACCESS_TOKEN) {
        throw new Error('Missing TMDB access token. Run npm run generate-config after setting TMDB_ACCESS_TOKEN in .env.');
    }

    const response = await fetch(`${TMDB_BASE_URL}${path}`, {
        headers: {
            Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`,
            accept: 'application/json'
        }
    });

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error('TMDB authentication failed. Check the token in .env and regenerate the config file.');
        }

        throw new Error(`TMDB request failed with status ${response.status}`);
    }

    return response.json();
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

async function getMovie(movieId) {
    return fetchTMDB(`/movie/${movieId}?language=en-US`);
}


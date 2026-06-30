const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = 'PASTE_YOUR_TMDB_API_KEY_HERE';
const TMDB_ACCESS_TOKEN = 'PASTE_YOUR_TMDB_BEARER_TOKEN_HERE';

async function fetchTMDB(path) {
    if (TMDB_API_KEY === 'PASTE_YOUR_TMDB_API_KEY_HERE' && TMDB_ACCESS_TOKEN === 'PASTE_YOUR_TMDB_BEARER_TOKEN_HERE') {
        throw new Error('Add either a TMDB API key or a TMDB bearer token in scripts/API.js.');
    }

    const useApiKey = TMDB_API_KEY !== 'PASTE_YOUR_TMDB_API_KEY_HERE';
    const requestUrl = useApiKey
        ? `${TMDB_BASE_URL}${path}${path.includes('?') ? '&' : '?'}api_key=${encodeURIComponent(TMDB_API_KEY)}`
        : `${TMDB_BASE_URL}${path}`;

    const response = await fetch(requestUrl, {
        headers: useApiKey
            ? {
                accept: 'application/json'
            }
            : {
                Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`,
                accept: 'application/json'
            }
    });

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error('TMDB authentication failed. If you pasted the regular API key, use TMDB_API_KEY. If you pasted the v4 token, use TMDB_ACCESS_TOKEN.');
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


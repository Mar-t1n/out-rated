const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_ACCESS_TOKEN = globalThis.__TMDB_ACCESS_TOKEN__ || '';
const MOVIE_CACHE_KEY = 'out-rated-movie-cache';
const DISCOVER_POOL_KEY = 'out-rated-discover-pool';

function loadJSON(key, fallback) {
    try {
        const rawValue = localStorage.getItem(key);
        return rawValue ? JSON.parse(rawValue) : fallback;
    } catch {
        return fallback;
    }
}

function saveJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function getCache() {
    return loadJSON(MOVIE_CACHE_KEY, {});
}

function setCache(cache) {
    saveJSON(MOVIE_CACHE_KEY, cache);
}

function getPool() {
    return loadJSON(DISCOVER_POOL_KEY, []);
}

function setPool(pool) {
    saveJSON(DISCOVER_POOL_KEY, pool);
}

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
    const pool = getPool();

    if (pool.length > 0) {
        const randomIndex = Math.floor(Math.random() * pool.length);
        const [movie] = pool.splice(randomIndex, 1);
        setPool(pool);
        return movie;
    }

    for (let attempt = 0; attempt < 8; attempt += 1) {
        const randomPage = Math.floor(Math.random() * 500) + 1;
        const data = await fetchTMDB(`/discover/movie?include_adult=false&include_video=false&language=en-US&page=${randomPage}&sort_by=popularity.desc`);
        const pool = (data.results || []).filter((movie) => movie.vote_average > 0 && movie.title);

        if (pool.length > 0) {
            const dedupedMovies = pool.filter((movie) => movie.id && !getPool().some((cachedMovie) => cachedMovie.id === movie.id));
            const existingPool = getPool();
            existingPool.push(...dedupedMovies);
            setPool(existingPool);

            if (existingPool.length > 0) {
                const randomIndex = Math.floor(Math.random() * existingPool.length);
                const [movie] = existingPool.splice(randomIndex, 1);
                setPool(existingPool);
                return movie;
            }
        }
    }

    throw new Error('Unable to find a valid movie from TMDB.');
}

async function getMovie(movieId) {
    const cache = getCache();

    if (cache[movieId]) {
        return cache[movieId];
    }

    const movie = await fetchTMDB(`/movie/${movieId}?language=en-US`);
    cache[movieId] = movie;
    setCache(cache);

    return movie;
}


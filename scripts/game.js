const playButton = document.getElementById('play-button');
const homeScreen = document.querySelector('.home-screen');
const gameScreen = document.querySelector('.game-screen');

let currentChampion = null;
let currentChallenger = null;
let score = 0;
let gameActive = false;

function toYear(releaseDate) {
    return releaseDate ? releaseDate.slice(0, 4) : 'N/A';
}

function posterUrl(movie) {
    if (!movie.poster_path) {
        return 'https://via.placeholder.com/300x450?text=No+Poster';
    }

    return `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
}

function movieCardMarkup(movie, side) {
    return `
        <button class="movie-card" data-side="${side}" type="button">
            <img class="movie-poster" src="${posterUrl(movie)}" alt="${movie.title}">
            <div class="movie-meta">
                <h2>${movie.title}</h2>
                <p>${toYear(movie.release_date)}</p>
            </div>
        </button>
    `;
}

function renderRound() {
    const gameScreenHtml = `
        <div class="game-layout">
            <div class="game-topbar">
                <div class="scoreboard">Score: <span id="score-value">${score}</span></div>
                <div class="instructions">Guess which movie has the higher TMDB rating.</div>
            </div>
            <div id="message" class="message"></div>
            <div class="comparison-area">
                ${movieCardMarkup(currentChampion, 'left')}
                <div class="vs-badge">VS</div>
                ${movieCardMarkup(currentChallenger, 'right')}
            </div>
            <div class="game-footer">
                <button id="restart-button" class="menu-button secondary" type="button">Restart</button>
            </div>
        </div>
    `;

    gameScreen.innerHTML = gameScreenHtml;

    const leftButton = gameScreen.querySelector('[data-side="left"]');
    const rightButton = gameScreen.querySelector('[data-side="right"]');
    const restartButton = document.getElementById('restart-button');

    leftButton.addEventListener('click', () => handleGuess('left'));
    rightButton.addEventListener('click', () => handleGuess('right'));
    restartButton.addEventListener('click', startGame);
}

function updateMessage(text, isError = false) {
    const messageElement = document.getElementById('message');
    if (messageElement) {
        messageElement.textContent = text;
        messageElement.dataset.state = isError ? 'error' : 'success';
    }
}

function updateScore() {
    const scoreValue = document.getElementById('score-value');
    if (scoreValue) {
        scoreValue.textContent = score;
    }
}

async function pickNewChallenger(excludedMovieId) {
    for (let attempt = 0; attempt < 10; attempt += 1) {
        const candidate = await getRandomMovie();
        if (candidate.id !== excludedMovieId && candidate.vote_average !== currentChampion.vote_average) {
            return candidate;
        }
    }

    throw new Error('Could not find a distinct challenger.');
}

async function startGame() {
    try {
        gameActive = true;
        score = 0;
        currentChampion = await getRandomMovie();
        currentChallenger = await pickNewChallenger(currentChampion.id);

        if (typeof viewGameScreen === 'function') {
            viewGameScreen(homeScreen, gameScreen);
        } else {
            homeScreen.style.display = 'none';
            gameScreen.style.display = 'block';
        }

        renderRound();
        updateMessage('Choose the movie with the higher rating.');
    } catch (error) {
        gameActive = false;
        console.error(error);
        if (typeof viewGameScreen === 'function') {
            viewGameScreen(homeScreen, gameScreen);
        } else {
            homeScreen.style.display = 'none';
            gameScreen.style.display = 'block';
        }
        gameScreen.innerHTML = `
            <div class="game-layout">
                <div class="message" data-state="error">${error.message}</div>
                <div class="game-footer">
                    <button id="restart-button" class="menu-button secondary" type="button">Try Again</button>
                </div>
            </div>
        `;

        document.getElementById('restart-button').addEventListener('click', startGame);
    }
}

async function advanceRound() {
    currentChampion = currentChallenger;
    currentChallenger = await pickNewChallenger(currentChampion.id);
    renderRound();
    updateMessage('Correct! The winner stays on.');
}

async function handleGuess(side) {
    if (!gameActive) {
        return;
    }

    const championWins = currentChampion.vote_average >= currentChallenger.vote_average;
    const guessedChampion = side === 'left';
    const guessIsCorrect = guessedChampion === championWins;

    if (!guessIsCorrect) {
        gameActive = false;
        const winningMovie = championWins ? currentChampion : currentChallenger;
        const losingMovie = championWins ? currentChallenger : currentChampion;

        gameScreen.innerHTML = `
            <div class="game-layout">
                <div class="message" data-state="error">
                    Game over. ${winningMovie.title} had the higher rating (${winningMovie.vote_average.toFixed(1)}) over ${losingMovie.title} (${losingMovie.vote_average.toFixed(1)}).
                </div>
                <div class="game-footer">
                    <div class="final-score">Final score: ${score}</div>
                    <button id="restart-button" class="menu-button secondary" type="button">Play Again</button>
                </div>
            </div>
        `;

        document.getElementById('restart-button').addEventListener('click', startGame);
        return;
    }

    score += 1;
    updateScore();
    await advanceRound();
}

playButton.addEventListener('click', startGame);
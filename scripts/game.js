const playButton = document.getElementById('play-button');
const homeScreen = document.querySelector('.home-screen');
const gameScreen = document.querySelector('.game-screen');

let currentChampion = null;
let currentChallenger = null;
let score = 0;
let gameActive = false;
let isTransitioning = false; // Throttles clicks during animations

function toYear(releaseDate) {
    return releaseDate ? releaseDate.slice(0, 4) : 'N/A';
}

function posterUrl(movie) {
    if (!movie.poster_path) {
        return 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=300&q=80'; // Sleeker default placeholder
    }
    return `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
}

function movieCardMarkup(movie, side) {
    const cardClass = side === 'left' ? 'left-card' : 'right-card';
    return `
        <div class="movie-card-container ${cardClass}" id="card-container-${side}">
            <button class="movie-card" data-side="${side}" type="button" aria-label="Guess ${movie.title}">
                <div class="poster-wrapper">
                    <img class="movie-poster" src="${posterUrl(movie)}" alt="${movie.title} Poster">
                </div>
                <!-- Neon circular rating reveal overlay -->
                <div class="rating-reveal" id="rating-reveal-${side}">
                    <span class="reveal-score" id="reveal-score-${side}">${movie.vote_average.toFixed(1)}</span>
                    <span class="reveal-label">RATING</span>
                </div>
                <div class="movie-meta">
                    <h2>${movie.title}</h2>
                    <p>${toYear(movie.release_date)}</p>
                </div>
            </button>
        </div>
    `;
}

function renderRound() {
    const gameScreenHtml = `
        <div class="game-layout">
            <div class="game-topbar">
                <div class="game-score-display">
                    <button id="back-home-btn" class="back-home-btn" aria-label="Back to Home Screen">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                    </button>
                    <div class="scoreboard" id="scoreboard-el">Score: <span id="score-value">${score}</span></div>
                </div>
                <div class="instructions">Select the higher rated movie.</div>
            </div>
            
            <div class="comparison-area">
                ${movieCardMarkup(currentChampion, 'left')}
                <div class="vs-badge-container">
                    <div class="vs-badge">VS</div>
                </div>
                ${movieCardMarkup(currentChallenger, 'right')}
            </div>
            
            <div class="game-footer">
                <button id="restart-button" class="menu-button secondary-btn" type="button">Restart Battle</button>
            </div>
        </div>
    `;

    gameScreen.innerHTML = gameScreenHtml;

    // Attach listeners
    const leftCard = gameScreen.querySelector('[data-side="left"]');
    const rightCard = gameScreen.querySelector('[data-side="right"]');
    const restartButton = document.getElementById('restart-button');
    const backHomeBtn = document.getElementById('back-home-btn');

    if (leftCard) leftCard.addEventListener('click', () => handleGuess('left'));
    if (rightCard) rightCard.addEventListener('click', () => handleGuess('right'));
    if (restartButton) restartButton.addEventListener('click', startGame);
    if (backHomeBtn) {
        backHomeBtn.addEventListener('click', () => {
            gameActive = false;
            // Update home high score screen in case it changed
            const homeHighScoreVal = document.getElementById('home-highscore');
            if (homeHighScoreVal) {
                homeHighScoreVal.textContent = localStorage.getItem('out-rated-highscore') || '0';
            }
            if (typeof viewHomeScreen === 'function') {
                viewHomeScreen(homeScreen, gameScreen);
            } else {
                homeScreen.style.display = 'flex';
                gameScreen.style.display = 'none';
            }
        });
    }
}

function updateScore() {
    const scoreValue = document.getElementById('score-value');
    const scoreboardEl = document.getElementById('scoreboard-el');
    if (scoreValue && scoreboardEl) {
        scoreValue.textContent = score;
        
        // Simple pop micro-animation on score increase
        scoreboardEl.classList.add('pop');
        setTimeout(() => {
            scoreboardEl.classList.remove('pop');
        }, 200);
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
    if (isTransitioning) return;
    
    try {
        gameActive = true;
        score = 0;
        currentChampion = await getRandomMovie();
        currentChallenger = await pickNewChallenger(currentChampion.id);

        if (typeof viewGameScreen === 'function') {
            viewGameScreen(homeScreen, gameScreen);
        } else {
            homeScreen.style.display = 'none';
            gameScreen.style.display = 'flex';
        }

        renderRound();
    } catch (error) {
        gameActive = false;
        console.error(error);
        if (typeof viewGameScreen === 'function') {
            viewGameScreen(homeScreen, gameScreen);
        } else {
            homeScreen.style.display = 'none';
            gameScreen.style.display = 'flex';
        }
        
        gameScreen.innerHTML = `
            <div class="game-layout">
                <div class="game-topbar" style="justify-content: center;">
                    <div class="instructions" style="color: var(--error-color);">Error loading movies. Please try again.</div>
                </div>
                <div class="game-footer">
                    <button id="restart-button" class="menu-button primary-btn" type="button">Try Again</button>
                </div>
            </div>
        `;

        document.getElementById('restart-button').addEventListener('click', startGame);
    }
}

async function advanceRound() {
    try {
        currentChampion = currentChallenger;
        currentChallenger = await pickNewChallenger(currentChampion.id);
        renderRound();
        isTransitioning = false;
    } catch (error) {
        console.error(error);
        setTimeout(startGame, 1500);
    }
}

async function handleGuess(side) {
    if (!gameActive || isTransitioning) {
        return;
    }

    isTransitioning = true;

    const championWins = currentChampion.vote_average >= currentChallenger.vote_average;
    const guessedChampion = side === 'left';
    const guessIsCorrect = guessedChampion === championWins;

    // Grab references to cards and rating details
    const leftCardBtn = gameScreen.querySelector('[data-side="left"]');
    const rightCardBtn = gameScreen.querySelector('[data-side="right"]');
    const leftReveal = document.getElementById('rating-reveal-left');
    const rightReveal = document.getElementById('rating-reveal-right');
    const leftScoreSpan = document.getElementById('reveal-score-left');
    const rightScoreSpan = document.getElementById('reveal-score-right');

    // Reveal ratings
    leftReveal.classList.add('revealed');
    rightReveal.classList.add('revealed');

    if (championWins) {
        leftReveal.classList.add('correct-reveal');
        leftScoreSpan.classList.add('success-text');
        rightReveal.classList.add('incorrect-reveal');
        rightScoreSpan.classList.add('error-text');
        
        leftCardBtn.classList.add('correct-card');
        rightCardBtn.classList.add('incorrect-card');
    } else {
        rightReveal.classList.add('correct-reveal');
        rightScoreSpan.classList.add('success-text');
        leftReveal.classList.add('incorrect-reveal');
        leftScoreSpan.classList.add('error-text');
        
        rightCardBtn.classList.add('correct-card');
        leftCardBtn.classList.add('incorrect-card');
    }

    if (!guessIsCorrect) {
        gameActive = false;
        
        const winningMovie = championWins ? currentChampion : currentChallenger;
        const losingMovie = championWins ? currentChallenger : currentChampion;

        // Show Game Over UI after a short delay
        setTimeout(() => {
            showGameOverScreen(winningMovie, losingMovie);
            isTransitioning = false;
        }, 1800);

        return;
    }

    score += 1;
    updateScore();

    // Slide out old cards, then advance round
    setTimeout(() => {
        const leftCardContainer = document.getElementById('card-container-left');
        const rightCardContainer = document.getElementById('card-container-right');
        if (leftCardContainer && rightCardContainer) {
            leftCardContainer.classList.add('slide-out');
            rightCardContainer.classList.add('slide-out');
        }
        
        // Wait for slide-out animation to complete, then render new round
        setTimeout(advanceRound, 450);
    }, 1500);
}

function showGameOverScreen(winningMovie, losingMovie) {
    const savedHighScore = parseInt(localStorage.getItem('out-rated-highscore') || '0', 10);
    let isNewHighScore = false;

    if (score > savedHighScore) {
        localStorage.setItem('out-rated-highscore', score.toString());
        isNewHighScore = true;
    }

    const gameOverHtml = `
        <div class="game-over-layout">
            <div class="game-over-header">
                <h1 class="game-over-title">Game Over</h1>
            </div>
            
            ${isNewHighScore ? `
                <div class="stat-card" style="border-color: var(--accent-color); box-shadow: var(--glow-btn); width: 100%; margin-top: -1rem; text-align: center;">
                    <span class="stat-label" style="color: var(--accent-color); font-weight: 800;">NEW RECORD</span>
                    <span class="stat-value" style="font-size: 2.5rem; text-shadow: 0 0 15px rgba(255, 0, 127, 0.4);">🔥 ${score} 🔥</span>
                </div>
            ` : ''}

            <div class="game-over-stats">
                <div class="stat-card">
                    <span class="stat-label">FINAL SCORE</span>
                    <span class="stat-value">${score}</span>
                </div>
                <div class="stat-card">
                    <span class="stat-label">HIGH SCORE</span>
                    <span class="stat-value">${isNewHighScore ? score : savedHighScore}</span>
                </div>
            </div>

            <div class="menu-button-container" style="max-width: 100%;">
                <button id="retry-game-btn" class="menu-button primary-btn" style="flex: 1;" type="button">
                    <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    <span>Play Again</span>
                </button>
                <button id="menu-home-btn" class="menu-button secondary-btn" style="flex: 1;" type="button">
                    <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                    <span>Main Menu</span>
                </button>
            </div>
        </div>
    `;

    gameScreen.innerHTML = gameOverHtml;

    document.getElementById('retry-game-btn').addEventListener('click', startGame);
    document.getElementById('menu-home-btn').addEventListener('click', () => {
        // Refresh high score on home screen
        const homeHighScoreVal = document.getElementById('home-highscore');
        if (homeHighScoreVal) {
            homeHighScoreVal.textContent = localStorage.getItem('out-rated-highscore') || '0';
        }
        if (typeof viewHomeScreen === 'function') {
            viewHomeScreen(homeScreen, gameScreen);
        } else {
            homeScreen.style.display = 'flex';
            gameScreen.style.display = 'none';
        }
    });
}

// Bind to play button on home screen
if (playButton) {
    playButton.addEventListener('click', startGame);
}
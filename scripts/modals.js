document.addEventListener('DOMContentLoaded', () => {
    // Modal Selectors
    const settingsBtn = document.getElementById('settings-button');
    const creditsBtn = document.getElementById('credits-button');
    const settingsModal = document.getElementById('modal-settings');
    const creditsModal = document.getElementById('modal-credits');
    
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const closeCreditsBtn = document.getElementById('close-credits-btn');
    const settingsBackdrop = document.getElementById('settings-backdrop-id');
    const creditsBackdrop = document.getElementById('credits-backdrop-id');
    
    // Theme Selectors
    const themeOptions = document.querySelectorAll('.theme-option');
    
    // High Score Reset Selector
    const resetHighScoreBtn = document.getElementById('reset-highscore-btn');
    const homeHighScoreVal = document.getElementById('home-highscore');

    // Load saved theme
    const savedTheme = localStorage.getItem('out-rated-theme') || 'cyber-neon';
    setTheme(savedTheme);

    // Load saved high score for home screen
    if (homeHighScoreVal) {
        const savedHighScore = localStorage.getItem('out-rated-highscore') || '0';
        homeHighScoreVal.textContent = savedHighScore;
    }

    // Modal open functions
    function openModal(modal) {
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
    }

    function closeModal(modal) {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
    }

    // Modal event listeners
    if (settingsBtn && settingsModal) {
        settingsBtn.addEventListener('click', () => openModal(settingsModal));
    }
    if (creditsBtn && creditsModal) {
        creditsBtn.addEventListener('click', () => openModal(creditsModal));
    }

    if (closeSettingsBtn && settingsModal) {
        closeSettingsBtn.addEventListener('click', () => closeModal(settingsModal));
    }
    if (settingsBackdrop && settingsModal) {
        settingsBackdrop.addEventListener('click', () => closeModal(settingsModal));
    }

    if (closeCreditsBtn && creditsModal) {
        closeCreditsBtn.addEventListener('click', () => closeModal(creditsModal));
    }
    if (creditsBackdrop && creditsModal) {
        creditsBackdrop.addEventListener('click', () => closeModal(creditsModal));
    }

    // Theme switching logic
    themeOptions.forEach(option => {
        option.addEventListener('click', () => {
            const themeName = option.getAttribute('data-theme-name');
            setTheme(themeName);
        });
    });

    function setTheme(themeName) {
        document.documentElement.setAttribute('data-theme', themeName);
        localStorage.setItem('out-rated-theme', themeName);

        // Update active class on buttons
        themeOptions.forEach(opt => {
            if (opt.getAttribute('data-theme-name') === themeName) {
                opt.classList.add('active');
            } else {
                opt.classList.remove('active');
            }
        });
    }

    // Reset high score logic
    if (resetHighScoreBtn) {
        resetHighScoreBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to reset your high score? This cannot be undone.')) {
                localStorage.setItem('out-rated-highscore', '0');
                if (homeHighScoreVal) {
                    homeHighScoreVal.textContent = '0';
                }
                const gameHighScoreVal = document.getElementById('highscore-value');
                if (gameHighScoreVal) {
                    gameHighScoreVal.textContent = '0';
                }
                alert('High score has been reset.');
            }
        });
    }
});

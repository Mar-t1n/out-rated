function viewGameScreen(hs, gs) {
    hs.classList.remove('active');
    setTimeout(() => {
        hs.style.display = 'none';
        gs.style.display = 'flex';
        // Force browser layout reflow before adding class for transition
        gs.offsetHeight;
        gs.classList.add('active');
    }, 350);
}

function viewHomeScreen(hs, gs) {
    gs.classList.remove('active');
    setTimeout(() => {
        gs.style.display = 'none';
        hs.style.display = 'flex';
        // Force browser layout reflow before adding class for transition
        hs.offsetHeight;
        hs.classList.add('active');
    }, 350);
}

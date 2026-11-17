document.querySelectorAll('.menu-icon-btn').forEach(button => {
    const navbar = button.closest('.navbar');
    if (!navbar) return;

    button.addEventListener('click', () => {
        const isOpen = navbar.classList.toggle('nav-open');
        button.setAttribute('aria-expanded', String(isOpen));
    });

    navbar.querySelectorAll('.navright a').forEach(link => {
        link.addEventListener('click', () => {
            if (!navbar.classList.contains('nav-open')) return;
            navbar.classList.remove('nav-open');
            button.setAttribute('aria-expanded', 'false');
        });
    });

    navbar.addEventListener('keydown', event => {
        if (event.key !== 'Escape' || !navbar.classList.contains('nav-open')) return;
        navbar.classList.remove('nav-open');
        button.setAttribute('aria-expanded', 'false');
        button.focus();
    });
});

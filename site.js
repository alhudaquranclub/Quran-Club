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

if (document.documentElement.classList.contains('intro-loading')) {
    window.setTimeout(() => {
        document.documentElement.classList.add('intro-loader-dismissed');
        window.setTimeout(() => {
            document.documentElement.classList.remove('intro-loading', 'intro-loader-dismissed');
        }, 1000);
    }, 1800);
}

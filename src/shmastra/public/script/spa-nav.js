(function () {
    const SPA_PATTERN = /\/(agents|workflows)\//;

    document.addEventListener('click', (e) => {
        const a = e.composedPath().find((el) => el instanceof HTMLAnchorElement);
        if (!a) return;
        const href = a.getAttribute('href');
        if (!href || !SPA_PATTERN.test(href)) return;

        e.preventDefault();
        history.replaceState(null, '', href);
        window.dispatchEvent(new PopStateEvent('popstate'));
    });
})();

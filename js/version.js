/**
 * Version - Loads version from version.json and injects it into the UI
 */
(function () {
    fetch('version.json')
        .then(res => res.json())
        .then(data => {
            window.APP_VERSION = data.version || '0.0.0';

            // Inject into About modal version badge
            const badge = document.querySelector('.about-version-badge');
            if (badge) {
                badge.textContent = 'v' + window.APP_VERSION;
            }

            // Inject into page title if needed
            const titleVersion = document.querySelector('[data-version]');
            if (titleVersion) {
                titleVersion.textContent = 'v' + window.APP_VERSION;
            }
        })
        .catch(() => {
            window.APP_VERSION = '0.0.0';
        });
})();

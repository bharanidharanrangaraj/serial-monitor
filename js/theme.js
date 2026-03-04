/**
 * Theme Manager — Light & Dark theme support
 */
const ThemeManager = {
    init() {
        // Check saved preference or system preference, default to dark
        const savedTheme = localStorage.getItem('sm_theme');
        let themeToSet = 'dark';

        if (savedTheme) {
            themeToSet = savedTheme;
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            themeToSet = 'light';
        }

        this.set(themeToSet);
    },

    get() {
        return document.documentElement.getAttribute('data-theme') || 'dark';
    },

    set(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('sm_theme', theme);
        this.updateToggleButton(theme);
    },

    toggle() {
        const currentTheme = this.get();
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.set(newTheme);
    },

    updateToggleButton(theme) {
        const btn = document.getElementById('btn-theme-toggle');
        if (!btn) return;

        if (theme === 'light') {
            btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
            btn.title = 'Switch to Dark Mode';
        } else {
            btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
            btn.title = 'Switch to Light Mode';
        }
    }
};

// Apply theme immediately (before DOM ready) to avoid flash
const _earlyTheme = localStorage.getItem('sm_theme') ||
    (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
document.documentElement.setAttribute('data-theme', _earlyTheme);

// After DOM ready: init fully and wire click listener here (single source of truth)
document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.init();

    const btn = document.getElementById('btn-theme-toggle');
    if (btn) {
        btn.onclick = function () {
            ThemeManager.toggle();
        };
    }
});

// Follow system preference changes only if user hasn't manually set a preference
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (!localStorage.getItem('sm_theme')) {
        ThemeManager.set(e.matches ? 'dark' : 'light');
    }
});

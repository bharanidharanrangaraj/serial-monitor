/**
 * Theme Manager — Dark/Light theme toggle with localStorage persistence
 */
const ThemeManager = {
    init() {
        const saved = localStorage.getItem('serial-monitor-theme') || 'dark';
        this.set(saved);

        document.getElementById('btn-theme').addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            this.set(current === 'dark' ? 'light' : 'dark');
        });
    },

    set(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('serial-monitor-theme', theme);
    },

    get() {
        return document.documentElement.getAttribute('data-theme');
    }
};

ThemeManager.init();

/**
 * Search — Full-text search with regex support across terminal output
 */
const Search = {
    matches: [],
    currentMatch: -1,
    query: '',
    isRegex: false,

    init() {
        const input = document.getElementById('search-input');
        const regexToggle = document.getElementById('search-regex');
        const countEl = document.getElementById('search-count');

        input.addEventListener('input', () => {
            this.query = input.value;
            this.search();
        });

        regexToggle.addEventListener('change', (e) => {
            this.isRegex = e.target.checked;
            if (this.query) this.search();
        });

        document.getElementById('search-prev').addEventListener('click', () => this.prevMatch());
        document.getElementById('search-next').addEventListener('click', () => this.nextMatch());
        document.getElementById('search-clear').addEventListener('click', () => {
            input.value = '';
            this.query = '';
            this.clearHighlights();
            countEl.textContent = '0 matches';
        });

        // Keyboard shortcut
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                input.focus();
            }
            if (e.key === 'Escape') {
                input.value = '';
                this.query = '';
                this.clearHighlights();
                countEl.textContent = '0 matches';
                input.blur();
            }
        });
    },

    search() {
        const lines = Terminal.getLines();
        this.matches = [];
        this.currentMatch = -1;

        if (!this.query) {
            this.clearHighlights();
            document.getElementById('search-count').textContent = '0 matches';
            return;
        }

        let regex;
        try {
            regex = this.isRegex ? new RegExp(this.query, 'gi') : new RegExp(this._escapeRegex(this.query), 'gi');
        } catch (e) {
            document.getElementById('search-count').textContent = 'Invalid regex';
            return;
        }

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            line._searchMatch = false;
            line._searchActive = false;
            line._highlightedData = null;

            if (regex.test(line.data || '')) {
                regex.lastIndex = 0; // Reset regex
                line._searchMatch = true;
                line._highlightedData = (line.data || '').replace(regex, '<span class="search-highlight">$&</span>');
                this.matches.push(i);
            }
        }

        document.getElementById('search-count').textContent = `${this.matches.length} match${this.matches.length !== 1 ? 'es' : ''}`;

        if (this.matches.length > 0) {
            this.currentMatch = 0;
            this._activateMatch(0);
        }

        Terminal._scheduleRender();
    },

    nextMatch() {
        if (this.matches.length === 0) return;
        this.currentMatch = (this.currentMatch + 1) % this.matches.length;
        this._activateMatch(this.currentMatch);
    },

    prevMatch() {
        if (this.matches.length === 0) return;
        this.currentMatch = (this.currentMatch - 1 + this.matches.length) % this.matches.length;
        this._activateMatch(this.currentMatch);
    },

    _activateMatch(matchIndex) {
        const lines = Terminal.getLines();
        // Clear previous active
        for (const idx of this.matches) {
            lines[idx]._searchActive = false;
        }
        // Set new active
        const lineIdx = this.matches[matchIndex];
        lines[lineIdx]._searchActive = true;
        Terminal.scrollToLine(lineIdx);
        Terminal._scheduleRender();

        document.getElementById('search-count').textContent = `${matchIndex + 1}/${this.matches.length}`;
    },

    clearHighlights() {
        const lines = Terminal.getLines();
        for (const line of lines) {
            line._searchMatch = false;
            line._searchActive = false;
            line._highlightedData = null;
        }
        this.matches = [];
        this.currentMatch = -1;
        Terminal._scheduleRender();
    },

    _escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
};

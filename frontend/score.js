document.addEventListener('DOMContentLoaded', () => {

    // ── Auth state (mirrors app.js) ───────────────────────────
    const isAuthenticated = () => localStorage.getItem('tpweb_is_authenticated') === 'true';
    const getUserId       = () => localStorage.getItem('tpweb_user_id');
    const getUsername     = () => localStorage.getItem('tpweb_username') || 'Joueur';

    // ── API URL builder (mirrors app.js) ─────────────────────
    const configuredBase = ((window.__APP_CONFIG__?.API_BASE_URL) || '').replace(/\/$/, '');
    const isLocal        = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
    const apiBaseUrl     = isLocal ? '' : configuredBase;
    const toApiUrl       = path => `${apiBaseUrl}${path.startsWith('/') ? path : '/' + path}`;

    // ── Elements ─────────────────────────────────────────────
    const authWall    = document.getElementById('scoreAuthWall');
    const scoreMain   = document.getElementById('scoreMain');
    const welcomeName = document.getElementById('scoreWelcomeName');

    // ── Page init ────────────────────────────────────────────
    const initPage = () => {
        if (!isAuthenticated()) {
            if (authWall)  authWall.style.display  = 'flex';
            if (scoreMain) scoreMain.style.display = 'none';
            return;
        }

        if (authWall)  authWall.style.display  = 'none';
        if (scoreMain) scoreMain.style.display = 'block';
        if (welcomeName) welcomeName.textContent = `Bonjour, ${getUsername()}`;

        activateTab('canvas');
        loadGame('canvas');
    };

    // ── Auth wall buttons ─────────────────────────────────────
    document.getElementById('scoreLoginBtn')?.addEventListener('click', () => {
        window.authModalController?.openModal('login');
    });

    document.getElementById('scoreSignupBtn')?.addEventListener('click', () => {
        window.authModalController?.openModal('signup');
    });

    // ── Tab system ────────────────────────────────────────────
    const loadedGames = new Set();

    const activateTab = (game) => {
        document.querySelectorAll('.scoreTab').forEach(t => {
            const active = t.dataset.game === game;
            t.classList.toggle('active', active);
            t.setAttribute('aria-selected', String(active));
        });

        document.querySelectorAll('.scoreSection').forEach(s => {
            s.style.display = s.id === `scoreSection-${game}` ? 'block' : 'none';
        });
    };

    const loadGame = (game) => {
        if (loadedGames.has(game)) return;
        loadedGames.add(game);

        if (game === 'canvas') renderCanvasScores();
        else if (game === 'gow') renderGowScores();
        else if (game === 'dom') renderDomScores();
    };

    document.querySelectorAll('.scoreTab').forEach(tab => {
        tab.addEventListener('click', () => {
            const game = tab.dataset.game;
            activateTab(game);
            loadGame(game);
        });
    });

    // ── UI helpers ────────────────────────────────────────────
    const showLoading = (el) => {
        el.innerHTML = `<div class="scoreLoading"><div class="scoreSpinner"></div><span>Chargement...</span></div>`;
    };

    const showEmpty = (el, msg) => {
        el.innerHTML = `<p class="scoreEmpty">${msg}</p>`;
    };

    const showError = (el, msg) => {
        el.innerHTML = `<p class="scoreEmpty scoreEmpty--error">${msg}</p>`;
    };

    const rankBadge = (n) => {
        if (n === 1) return `<span class="scoreRankBadge rank-1">1</span>`;
        if (n === 2) return `<span class="scoreRankBadge rank-2">2</span>`;
        if (n === 3) return `<span class="scoreRankBadge rank-3">3</span>`;
        return `<span class="scoreRankNum">${n}</span>`;
    };

    // ── Shared utility ────────────────────────────────────────
    const formatTimeMs = (ms) => {
        const total = Math.floor((Number(ms) || 0) / 1000);
        const m = Math.floor(total / 60);
        const s = total % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    // ── Canvas scores ─────────────────────────────────────────
    const renderCanvasScores = async () => {
        const container = document.getElementById('canvas-score-list');
        if (!container) return;

        const userId = getUserId();
        if (!userId) { showEmpty(container, 'Aucun score enregistré.'); return; }

        showLoading(container);

        try {
            const q = new URLSearchParams({ game: 'canvas', mode: 'solo', limit: '100', userId });
            const res = await fetch(toApiUrl(`/api/scores/top?${q}`));
            const json = await res.json();

            if (!json.success || !json.data?.length) {
                showEmpty(container, 'Aucun score Canvas enregistré pour ce compte.');
                return;
            }

            const data = json.data;
            container.innerHTML = '';

            const bestCard = document.createElement('div');
            bestCard.className = 'scoreBestCard scoreBestCard--canvas';
            const bestTime = formatTimeMs(data[0]?.totalTime);
            const bestMet  = Number(data[0]?.totalMeteorites || 0);
            bestCard.innerHTML = `
                <span class="scoreBestLabel">MEILLEUR SCORE</span>
                <div class="scoreBestValues">
                    <div class="scoreBestValue">
                        <span class="scoreBestNum">${bestTime}</span>
                        <span class="scoreBestUnit">TEMPS</span>
                    </div>
                    <div class="scoreBestDivider"></div>
                    <div class="scoreBestValue">
                        <span class="scoreBestNum">${bestMet}</span>
                        <span class="scoreBestUnit">MÉTÉORITES</span>
                    </div>
                </div>
            `;
            container.appendChild(bestCard);

            const table = document.createElement('div');
            table.className = 'scoreTable';

            const header = document.createElement('div');
            header.className = 'scoreRowHeader';
            header.innerHTML = `<span>#</span><span>Joueur</span><span>Temps</span><span>Météorites</span>`;
            table.appendChild(header);

            data.forEach((score, i) => {
                const pseudo      = score?.data?.pseudo || score?.user?.username || 'Inconnu';
                const time        = formatTimeMs(score?.totalTime);
                const meteorites  = Number(score?.totalMeteorites || 0);

                const row = document.createElement('div');
                row.className = `scoreRow${i < 3 ? ` scoreRow--top${i + 1}` : ''}`;
                row.style.animationDelay = `${i * 28}ms`;
                row.innerHTML = `
                    <span class="scoreRank">${rankBadge(i + 1)}</span>
                    <span class="scorePseudo">${pseudo}</span>
                    <span class="scoreTime">${time}</span>
                    <span class="scoreMeteorites">${meteorites} ☄</span>
                `;
                table.appendChild(row);
            });

            container.appendChild(table);
        } catch {
            showError(container, 'Impossible de charger les scores Canvas.');
        }
    };

    // ── GOW helpers (adapted from app.js commented block) ─────
    const formatGoalMinutes = (minutes) => {
        if (!Array.isArray(minutes) || !minutes.length) return '—';
        return minutes.map(m => {
            if (typeof m === 'string' && /^\d{2}:\d{2}$/.test(m)) return m;
            const n = Number(m);
            if (Number.isFinite(n)) {
                const s = Math.max(0, Math.floor(n));
                return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
            }
            return null;
        }).filter(Boolean).join(', ') || '—';
    };

    const formatTournamentStage = (stage) => {
        const v = String(stage || '').toLowerCase();
        if (v === 'huitieme') return 'Huitième';
        if (v === 'quart')    return 'Quart';
        if (v === 'demi')     return 'Demi-finale';
        if (v === 'finale')   return 'Finale';
        return '';
    };

    const expandTeam = (label) => {
        const raw = String(label || '').trim().toUpperCase();
        const map = {
            PA: 'PARIS', LY: 'LYON', MA: 'MARSEILLE', BO: 'BORDEAUX', LI: 'LILLE',
            NA: 'NANTES', TO: 'TOULOUSE', RE: 'RENNES', NI: 'NICE', ST: 'STRASBOURG'
        };
        return map[raw] || raw || 'ÉQUIPE';
    };

    const deriveResult = (result, myGoals, opGoals) => {
        const s = String(result || '').toLowerCase();
        if (['win', 'victoire', 'gagne'].includes(s))   return 'Victoire';
        if (['loss', 'defaite', 'perdu'].includes(s))   return 'Défaite';
        if (['draw', 'nul'].includes(s))                return 'Match nul';
        if (myGoals > opGoals) return 'Victoire';
        if (myGoals < opGoals) return 'Défaite';
        return 'Match nul';
    };

    // ── GOW scores ────────────────────────────────────────────
    const renderGowScores = async () => {
        const container = document.getElementById('gow-score-list');
        if (!container) return;

        const userId = getUserId();
        if (!userId) { showEmpty(container, 'Aucun match enregistré.'); return; }

        showLoading(container);

        try {
            const modes = ['tournament', 'versus', '1v1'];
            const allData = (await Promise.all(
                modes.map(async mode => {
                    const q = new URLSearchParams({ game: 'gamesonweb', mode, limit: '100', userId });
                    const res = await fetch(toApiUrl(`/api/scores/top?${q}`));
                    const json = await res.json();
                    return json.success && Array.isArray(json.data) ? json.data : [];
                })
            )).flat();

            const unique = Array.from(
                new Map(allData.map(e => [e?._id || `${e?.createdAt}-${e?.totalTime}`, e])).values()
            ).sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0));

            if (!unique.length) {
                showEmpty(container, 'Aucun match GamesOnWeb enregistré pour ce compte.');
                return;
            }

            container.innerHTML = '';

            const wins   = unique.filter(m => deriveResult(m?.data?.result || m?.data?.Résultat, Number(m?.data?.totalButs || 0), Number(m?.data?.totalButsAdversaire || 0)) === 'Victoire').length;
            const losses = unique.filter(m => deriveResult(m?.data?.result || m?.data?.Résultat, Number(m?.data?.totalButs || 0), Number(m?.data?.totalButsAdversaire || 0)) === 'Défaite').length;
            const draws  = unique.length - wins - losses;

            const statsBar = document.createElement('div');
            statsBar.className = 'scoreGowStats';
            statsBar.innerHTML = `
                <div class="scoreGowStat">
                    <span class="scoreGowStatNum">${unique.length}</span>
                    <span class="scoreGowStatLabel">Matchs</span>
                </div>
                <div class="scoreGowStatDivider"></div>
                <div class="scoreGowStat">
                    <span class="scoreGowStatNum scoreGowStatNum--win">${wins}</span>
                    <span class="scoreGowStatLabel">Victoires</span>
                </div>
                <div class="scoreGowStatDivider"></div>
                <div class="scoreGowStat">
                    <span class="scoreGowStatNum scoreGowStatNum--draw">${draws}</span>
                    <span class="scoreGowStatLabel">Nuls</span>
                </div>
                <div class="scoreGowStatDivider"></div>
                <div class="scoreGowStat">
                    <span class="scoreGowStatNum scoreGowStatNum--loss">${losses}</span>
                    <span class="scoreGowStatLabel">Défaites</span>
                </div>
            `;
            container.appendChild(statsBar);

            const grid = document.createElement('div');
            grid.className = 'scoreMatchGrid';

            unique.forEach((match, i) => {
                const p          = match?.data || {};
                const myGoals    = Number(p.totalButs || 0);
                const opGoals    = Number(p.totalButsAdversaire || 0);
                const result     = deriveResult(p.result || p.Résultat, myGoals, opGoals);
                const myMins     = formatGoalMinutes(p.minuteButs);
                const opMins     = formatGoalMinutes(p.minuteButsAdversaire);
                const modeRaw    = (match?.mode || p?.mode || 'inconnu').toUpperCase();
                const stage      = formatTournamentStage(p.tournamentStage);
                const leftTeam   = expandTeam(p.teamLeftLabel || 'YOU');
                const rightTeam  = expandTeam(p.teamRightLabel || 'IA');
                const cls        = result === 'Victoire' ? 'win' : result === 'Défaite' ? 'loss' : 'draw';
                const date       = match?.createdAt
                    ? new Date(match.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '—';

                const card = document.createElement('article');
                card.className = `scoreMatchCard scoreMatchCard--${cls}`;
                card.style.animationDelay = `${i * 22}ms`;
                card.innerHTML = `
                    <div class="scoreMatchTop">
                        <span class="scoreMatchMode">${modeRaw}${stage ? ` · ${stage}` : ''}</span>
                        <span class="scoreMatchDate">${date}</span>
                    </div>
                    <div class="scoreMatchScore">
                        <div class="scoreMatchTeam">
                            <span class="scoreMatchTeamName">${leftTeam}</span>
                            <span class="scoreMatchGoals">${myGoals}</span>
                            ${myMins !== '—' ? `<span class="scoreMatchMinutes">${myMins}</span>` : ''}
                        </div>
                        <span class="scoreMatchVs">VS</span>
                        <div class="scoreMatchTeam">
                            <span class="scoreMatchTeamName">${rightTeam}</span>
                            <span class="scoreMatchGoals">${opGoals}</span>
                            ${opMins !== '—' ? `<span class="scoreMatchMinutes">${opMins}</span>` : ''}
                        </div>
                    </div>
                    <div class="scoreMatchBottom">
                        <span class="scoreMatchResult scoreMatchResult--${cls}">${result}</span>
                    </div>
                `;
                grid.appendChild(card);
            });

            container.appendChild(grid);
        } catch {
            showError(container, 'Impossible de charger les matchs GamesOnWeb.');
        }
    };

    // ── Dom helpers ───────────────────────────────────────────
    const normalizeDiff = (diff) => {
        const d = String(diff || '').toLowerCase();
        if (d === 'hard'   || d === 'difficile') return { label: 'Difficile', key: 'hard' };
        if (d === 'medium' || d === 'moyen')     return { label: 'Moyen',     key: 'medium' };
        if (d === 'easy'   || d === 'facile')    return { label: 'Facile',    key: 'easy' };
        return { label: '—', key: '' };
    };

    const normalizeMode = (mode) => {
        const m = String(mode || '').toLowerCase();
        if (m === 'solo')     return { label: 'Solo',        key: 'solo',     grille: 'Classique' };
        if (m === 'designer') return { label: 'Concepteur',  key: 'concepteur', grille: 'Personnalisée' };
        return { label: mode || '—', key: '', grille: '—' };
    };

    // ── Dom scores ────────────────────────────────────────────
    const buildDomSubTable = (data, modeKey) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'scoreDomSubSection';

        const title = document.createElement('div');
        title.className = `scoreDomSubTitle scoreDomSubTitle--${modeKey}`;
        title.textContent = modeKey === 'solo' ? 'Solo' : 'Concepteur';
        wrapper.appendChild(title);

        if (!data.length) {
            const empty = document.createElement('p');
            empty.className = 'scoreEmpty';
            empty.style.padding = '28px 0';
            empty.textContent = 'Aucune partie enregistrée dans ce mode.';
            wrapper.appendChild(empty);
            return wrapper;
        }

        const best     = data[0];
        const bestTime = formatTimeMs(best?.totalTime);
        const bestDiff = normalizeDiff(best?.data?.difficulty);

        const bestCard = document.createElement('div');
        bestCard.className = 'scoreBestCard scoreBestCard--dom';
        bestCard.innerHTML = `
            <span class="scoreBestLabel">MEILLEUR RUN</span>
            <div class="scoreBestValues">
                <div class="scoreBestValue">
                    <span class="scoreBestNum">${bestTime}</span>
                    <span class="scoreBestUnit">CHRONO</span>
                </div>
                ${bestDiff.key ? `
                <div class="scoreBestDivider"></div>
                <div class="scoreBestValue">
                    <span class="scoreBestNum scoreDomDiff--${bestDiff.key}">${bestDiff.label}</span>
                    <span class="scoreBestUnit">DIFFICULTÉ</span>
                </div>` : ''}
            </div>
        `;
        wrapper.appendChild(bestCard);

        const table = document.createElement('div');
        table.className = 'scoreDomTable';

        const header = document.createElement('div');
        header.className = 'scoreDomRowHeader scoreDomRowHeader--split';
        header.innerHTML = `<span>#</span><span>Grille</span><span>Taille</span><span>Chrono</span><span>Difficulté</span>`;
        table.appendChild(header);

        data.forEach((score, i) => {
            const modeData = normalizeMode(score?.mode || score?.data?.mode);
            const grille   = modeData.grille;
            const n        = Number(score?.data?.gridSize);
            const taille   = n > 0 ? `${n}x${n}` : '—';
            const chrono   = formatTimeMs(score?.totalTime);
            const diffData = normalizeDiff(score?.data?.difficulty);

            const row = document.createElement('div');
            row.className = `scoreDomRow scoreDomRow--split${i < 3 ? ` scoreDomRow--top${i + 1}` : ''}`;
            row.style.animationDelay = `${i * 28}ms`;
            row.innerHTML = `
                <span class="scoreRank">${rankBadge(i + 1)}</span>
                <span class="scoreDomCell">${grille}</span>
                <span class="scoreDomCell">${taille}</span>
                <span class="scoreTime">${chrono}</span>
                <span class="scoreDomDiff scoreDomDiff--${diffData.key}">${diffData.label}</span>
            `;
            table.appendChild(row);
        });

        wrapper.appendChild(table);
        return wrapper;
    };

    const renderDomScores = async () => {
        const container = document.getElementById('dom-score-list');
        if (!container) return;

        const userId = getUserId();
        if (!userId) { showEmpty(container, 'Aucun score enregistré.'); return; }

        showLoading(container);

        try {
            const [soloData, designerData] = await Promise.all(
                ['solo', 'designer'].map(async mode => {
                    const q = new URLSearchParams({ game: 'dom', mode, limit: '100', userId });
                    const res = await fetch(toApiUrl(`/api/scores/top?${q}`));
                    const json = await res.json();
                    return json.success && Array.isArray(json.data) ? json.data : [];
                })
            );

            const sortByTime = arr => [...arr].sort((a, b) => (Number(a?.totalTime) || 0) - (Number(b?.totalTime) || 0));
            const solo     = sortByTime(soloData);
            const designer = sortByTime(designerData);

            if (!solo.length && !designer.length) {
                showEmpty(container, 'Aucun score Dom enregistré pour ce compte.');
                return;
            }

            container.innerHTML = '';
            container.appendChild(buildDomSubTable(solo, 'solo'));
            container.appendChild(buildDomSubTable(designer, 'designer'));
        } catch {
            showError(container, 'Impossible de charger les scores Dom.');
        }
    };

    initPage();
});

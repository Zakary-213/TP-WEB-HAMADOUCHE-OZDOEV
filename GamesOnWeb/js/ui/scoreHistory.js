// js/ui/scoreHistory.js
// Overlay des derniers matchs charge depuis les scores sauvegardes par utilisateur.

(function () {
    "use strict";

    var overlay = document.getElementById("score-history-overlay");
    var closeBtn = document.getElementById("score-history-close-btn");
    var tbody = document.getElementById("score-history-table-body");
    var filterButtons = overlay ? overlay.querySelectorAll(".score-history-filter-btn[data-result-filter]") : [];
    if (!overlay || !tbody) return;
    var activeFilter = "all";
    var historyRows = [];

    function getUserId() {
        if (window.CANVAS_API && typeof window.CANVAS_API.getUserId === "function") {
            return window.CANVAS_API.getUserId();
        }
        return window.localStorage.getItem("tpweb_user_id");
    }

    function toApiUrl(path) {
        if (window.CANVAS_API && typeof window.CANVAS_API.toUrl === "function") {
            return window.CANVAS_API.toUrl(path);
        }
        return path;
    }

    function modeLabel(mode) {
        var normalized = typeof mode === "string" ? mode.toLowerCase() : "";
        if (normalized === "tournament") return "Mode Tournoi";
        if (normalized === "versus" || normalized === "1v1") return "Mode 1vs1";
        return "Mode inconnu";
    }

    function stageLabel(stage) {
        var normalized = typeof stage === "string" ? stage.toLowerCase() : "";
        if (normalized === "huitieme") return "Huitieme de finale";
        if (normalized === "quart") return "Quart de finale";
        if (normalized === "demi") return "Demi-finale";
        if (normalized === "finale") return "Finale";
        return "-";
    }

    function normalizeResult(result, homeGoals, awayGoals) {
        var value = typeof result === "string" ? result.toLowerCase() : "";
        if (value === "win" || value === "victoire" || value === "gagne") return "win";
        if (value === "draw" || value === "nul" || value === "match nul") return "draw";
        if (value === "loss" || value === "defaite" || value === "perdu") return "loss";
        if (homeGoals > awayGoals) return "win";
        if (homeGoals < awayGoals) return "loss";
        return "draw";
    }

    function formatGoalTime(value) {
        if (typeof value === "string" && /^\d{2}:\d{2}'?$/.test(value)) {
            return value.endsWith("'") ? value : value + "'";
        }

        var numeric = Number(value);
        if (!Number.isFinite(numeric)) return null;
        var safeSeconds = Math.max(0, Math.floor(numeric));
        var min = Math.floor(safeSeconds / 60);
        var sec = safeSeconds % 60;
        return String(min).padStart(2, "0") + ":" + String(sec).padStart(2, "0") + "'";
    }

    function formatGoalTimes(times) {
        if (!Array.isArray(times) || !times.length) return [];
        return times.map(formatGoalTime).filter(Boolean);
    }

    function expandTeamLabel(label) {
        var raw = typeof label === "string" ? label.trim() : "";
        if (!raw) return "Equipe";

        var shortToFull = {
            PA: "PARIS",
            LY: "LYON",
            MA: "MARSEILLE",
            BO: "BORDEAUX",
            LI: "LILLE",
            NA: "NANTES",
            TO: "TOULOUSE",
            RE: "RENNES",
            NI: "NICE",
            ST: "STRASBOURG",
            IA: "IA",
            YOU: "YOU"
        };

        var upper = raw.toUpperCase();
        return shortToFull[upper] || upper;
    }

    function toHistoryRow(entry) {
        var payload = entry && entry.data ? entry.data : {};
        var homeGoals = Number(payload.totalButs || 0);
        var awayGoals = Number(payload.totalButsAdversaire || 0);

        var leftLabel = expandTeamLabel(payload.teamLeftLabel || "YOU");
        var rightLabel = expandTeamLabel(payload.teamRightLabel || "IA");

        var mode = typeof (entry && entry.mode) === "string" ? entry.mode.toLowerCase() : String(payload.mode || "").toLowerCase();

        return {
            competition: modeLabel(mode),
            stage: mode === "tournament" ? stageLabel(payload.tournamentStage) : "-",
            home: leftLabel,
            away: rightLabel,
            homeGoals: homeGoals,
            awayGoals: awayGoals,
            result: normalizeResult(payload.result || payload.resultat, homeGoals, awayGoals),
            goals: {
                home: formatGoalTimes(payload.minuteButs),
                away: formatGoalTimes(payload.minuteButsAdversaire)
            }
        };
    }

    async function fetchScoresByMode(userId, mode) {
        var query = new URLSearchParams({
            game: "gamesonweb",
            mode: mode,
            limit: "100",
            userId: userId
        });

        var response = await fetch(toApiUrl("/api/scores/top?" + query.toString()));
        var result = await response.json();
        if (!result.success || !Array.isArray(result.data)) return [];
        return result.data;
    }

    async function loadHistoryRows() {
        var userId = getUserId();
        if (!userId) {
            historyRows = [];
            return;
        }

        var modes = ["tournament", "versus", "1v1"];
        var responses = await Promise.all(modes.map(function (mode) {
            return fetchScoresByMode(userId, mode).catch(function () {
                return [];
            });
        }));

        var merged = responses.flat();
        var uniqueById = Array.from(
            new Map(merged.map(function (entry) {
                var key = entry && entry._id ? entry._id : String((entry && entry.createdAt) || "") + "-" + String((entry && entry.totalTime) || "");
                return [key, entry];
            })).values()
        );

        uniqueById.sort(function (a, b) {
            return new Date((b && b.createdAt) || 0).getTime() - new Date((a && a.createdAt) || 0).getTime();
        });

        historyRows = uniqueById.map(toHistoryRow);
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function resultMeta(result) {
        if (result === "win") return { text: "Victoire", className: "score-history-result--win" };
        if (result === "draw") return { text: "Match nul", className: "score-history-result--draw" };
        return { text: "Defaite", className: "score-history-result--loss" };
    }

    function goalLine(teamName, times) {
        var safeTeam = escapeHtml(teamName);
        if (!times || !times.length) {
            return "<span class=\"score-history-goals-line\"><span class=\"score-history-goals-team\">" + safeTeam + "</span>: aucun but</span>";
        }
        return "<span class=\"score-history-goals-line\"><span class=\"score-history-goals-team\">" + safeTeam + "</span>: " + escapeHtml(times.join(", ")) + "</span>";
    }

    function getFilteredRows() {
        if (activeFilter === "all") return historyRows;
        return historyRows.filter(function (row) {
            return row.result === activeFilter;
        });
    }

    function renderRows() {
        var rows = getFilteredRows();
        if (!rows.length) {
            tbody.innerHTML = "<tr><td colspan=\"6\">Aucune sauvegarde pour ce compte ou pour ce filtre.</td></tr>";
            return;
        }

        tbody.innerHTML = rows.map(function (row) {
            var meta = resultMeta(row.result);
            var teams = escapeHtml(row.home) + " vs " + escapeHtml(row.away);
            var score = escapeHtml(row.homeGoals) + " - " + escapeHtml(row.awayGoals);
            var goalsDetails = "<div class=\"score-history-goals\">"
                + goalLine(row.home, row.goals && row.goals.home)
                + goalLine(row.away, row.goals && row.goals.away)
                + "</div>";

            return "<tr>"
                + "<td>" + escapeHtml(row.competition) + "</td>"
                + "<td>" + escapeHtml(row.stage) + "</td>"
                + "<td class=\"score-history-teams\">" + teams + "</td>"
                + "<td class=\"score-history-score\">" + score + "</td>"
                + "<td><span class=\"score-history-result " + meta.className + "\">" + meta.text + "</span></td>"
                + "<td>" + goalsDetails + "</td>"
                + "</tr>";
        }).join("");
    }

    function updateFilterButtonsState() {
        filterButtons.forEach(function (btn) {
            if (btn.dataset.resultFilter === activeFilter) {
                btn.classList.add("is-active");
            } else {
                btn.classList.remove("is-active");
            }
        });
    }

    function setFilter(nextFilter) {
        activeFilter = nextFilter || "all";
        updateFilterButtonsState();
        renderRows();
    }

    async function open() {
        tbody.innerHTML = "<tr><td colspan=\"6\">Chargement...</td></tr>";
        try {
            await loadHistoryRows();
        } catch (error) {
            console.error("Erreur de chargement des scores GamesOnWeb:", error);
            tbody.innerHTML = "<tr><td colspan=\"6\">Impossible de charger les matchs.</td></tr>";
            overlay.classList.add("settings-overlay--open");
            overlay.setAttribute("aria-hidden", "false");
            return;
        }
        renderRows();
        overlay.classList.add("settings-overlay--open");
        overlay.setAttribute("aria-hidden", "false");
    }

    function close() {
        overlay.classList.remove("settings-overlay--open");
        overlay.setAttribute("aria-hidden", "true");
    }

    function isOpen() {
        return overlay.getAttribute("aria-hidden") === "false";
    }

    if (closeBtn) {
        closeBtn.addEventListener("click", close);
    }

    filterButtons.forEach(function (btn) {
        btn.addEventListener("click", function () {
            setFilter(btn.dataset.resultFilter || "all");
        });
    });

    overlay.addEventListener("click", function (event) {
        if (event.target === overlay) close();
    });

    window.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && isOpen()) {
            event.preventDefault();
            close();
        }
    }, true);

    window.scoreHistory = {
        open: open,
        close: close,
        isOpen: isOpen
    };

    setFilter("all");
})();

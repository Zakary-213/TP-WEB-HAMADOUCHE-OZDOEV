// js/ui/scoreboard.js

class Scoreboard {
    constructor() {
        this.playerScore = 0;
        this.aiScore = 0;
        this.leftTeamLabel = "YOU";
        this.rightTeamLabel = "IA";
        
        this.matchTime = 0;
        this.isMatchRunning = false;

        this.uiPlayer = document.getElementById("score-player");
        this.uiAi = document.getElementById("score-ai");
        this.uiLeftTeam = document.getElementById("score-team-left");
        this.uiRightTeam = document.getElementById("score-team-right");
        this.timerElement = document.getElementById("match-timer");

        this.updateScoreDisplay(0, 0);
        this.updateTeamLabels(this.leftTeamLabel, this.rightTeamLabel);
    }

    updateTeamLabels(leftLabel, rightLabel) {
        this.leftTeamLabel = leftLabel || "YOU";
        this.rightTeamLabel = rightLabel || "IA";

        if (this.uiLeftTeam) this.uiLeftTeam.innerText = this.leftTeamLabel;
        if (this.uiRightTeam) this.uiRightTeam.innerText = this.rightTeamLabel;
    }

    getScorelineText() {
        return `${this.leftTeamLabel} ${this.playerScore} - ${this.aiScore} ${this.rightTeamLabel}`;
    }

    updateScoreDisplay(p, a) {
        // Joueur marque
        if (p > this.playerScore && this.uiPlayer) {
            this.uiPlayer.classList.remove("animate-score");
            // Force le reflow pour redémarrer l'animation si elle était déjà en cours
            void this.uiPlayer.offsetWidth; 
            this.uiPlayer.classList.add("animate-score");
        }
        
        // IA marque
        if (a > this.aiScore && this.uiAi) {
            this.uiAi.classList.remove("animate-score");
            void this.uiAi.offsetWidth;
            this.uiAi.classList.add("animate-score");
        }

        this.playerScore = p;
        this.aiScore = a;
        
        if (this.uiPlayer) this.uiPlayer.innerText = this.playerScore;
        if (this.uiAi) this.uiAi.innerText = this.aiScore;

        // Mettre à jour aussi les panneaux 3D du stade
        if (window.scoreBoard3D && window.scoreBoard3D.updateScore) {
            window.scoreBoard3D.updateScore(this.playerScore, this.aiScore);
        }
    }

    playerScored() {
        this.updateScoreDisplay(this.playerScore + 1, this.aiScore);
    }

    aiScored() {
        this.updateScoreDisplay(this.playerScore, this.aiScore + 1);
    }

    startTimer() {
        this.isMatchRunning = true;
    }

    stopTimer() {
        this.isMatchRunning = false;
    }

    resetTimer() {
        this.matchTime = 0;
        this.updateTimerDisplay();
    }

    updateTimer(deltaTimeSeconds) {
        if (this.isMatchRunning) {
            this.matchTime += deltaTimeSeconds;
            this.updateTimerDisplay();
        }
    }

    updateTimerDisplay() {
        if (!this.timerElement) return;
        const minutes = Math.floor(this.matchTime / 60);
        const seconds = Math.floor(this.matchTime % 60);
        this.timerElement.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    reset() {
        this.playerScore = 0;
        this.aiScore = 0;
        this.matchTime = 0;
        this.isMatchRunning = false;
        this.updateScoreDisplay(0, 0);
        this.updateTimerDisplay();
    }
}

// Instantiate globally so it can be used easily across the game
window.gameScoreboard = new Scoreboard();

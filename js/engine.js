// engine.js

window.engine = {
    createMatch: function(homeTeam, awayTeam) {
        return {
            home: homeTeam,
            away: awayTeam,
            homeScore: 0,
            awayScore: 0,
            minute: 0,
            events: [],
            status: 'pending',
            homeStats: this.initializeMatchStats(),
            awayStats: this.initializeMatchStats()
        };
    },

    initializeMatchStats: function() {
        return {
            possession: 0,
            shots: 0,
            shotsOnTarget: 0,
            corners: 0,
            fouls: 0,
            yellowCards: 0,
            redCards: 0,
            offsides: 0,
            passes: 0,
            passAccuracy: 0
        };
    },

    simulateMatch: function(match) {
        // Logica base per la simulazione della partita
        match.status = 'in_progress';
        
        // Simulazione semplificata
        const totalMinutes = GAME_CONSTANTS.MATCH.TOTAL_MINUTES || 90;
        for (let i = 1; i <= totalMinutes; i++) {
            match.minute = i;
            
            // Calcola possesso palla
            if (Math.random() > 0.5) {
                match.homeStats.possession++;
            } else {
                match.awayStats.possession++;
            }
            
            // Genera eventi casuali (tiri, gol, ecc.)
            this.generateMatchEvents(match);
        }
        
        // Finalizza le statistiche
        this.finalizeMatchStats(match);
        match.status = 'completed';
        
        return match;
    },

    generateMatchEvents: function(match) {
        // Probabilità di eventi ogni minuto
        if (Math.random() < 0.1) { // 10% di probabilità di tiro
            if (Math.random() > 0.5) {
                match.homeStats.shots++;
                if (Math.random() < 0.3) { // 30% di probabilità di gol su tiro
                    match.homeScore++;
                    match.events.push({
                        minute: match.minute,
                        type: 'goal',
                        team: 'home'
                    });
                }
            } else {
                match.awayStats.shots++;
                if (Math.random() < 0.3) {
                    match.awayScore++;
                    match.events.push({
                        minute: match.minute,
                        type: 'goal',
                        team: 'away'
                    });
                }
            }
        }
    },

    finalizeMatchStats: function(match) {
        // Calcola statistiche finali
        match.homeStats.possession = Math.round((match.homeStats.possession / 90) * 100);
        match.awayStats.possession = 100 - match.homeStats.possession;
        
        // Aggiorna altre statistiche
        match.homeStats.passAccuracy = Math.round(Math.random() * 30 + 60); // 60-90%
        match.awayStats.passAccuracy = Math.round(Math.random() * 30 + 60);
    }
};

// Esponi la funzione createMatch globalmente
window.createMatch = function(homeTeam, awayTeam) {
    return window.engine.createMatch(homeTeam, awayTeam);
};

console.log('engine.js loaded successfully');
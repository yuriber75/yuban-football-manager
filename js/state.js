// state.js

// Stato globale del gioco
window.STATE = {
    manager: '',
    teamName: '',
    teams: [],
    league: {
        week: 1,
        currentViewWeek: 0,
        fixtures: [],
        table: {},
        results: [],
        statistics: {
            topScorers: [], 
            topAssisters: [], 
            bestRatings: [],  
            cleanSheets: [], 
            yellowCards: [],     
            redCards: []     
        },
        seasonStats: {
            matchesPlayed: 0,
            totalGoals: 0,
            avgGoalsPerGame: 0,
            cleanSheets: 0,
            cardsTotal: 0
        }
    },
    career: {
        cash: GAME_CONSTANTS.FINANCE.INITIAL_CASH,
        wageBudget: GAME_CONSTANTS.FINANCE.INITIAL_WAGE_BUDGET,
        sponsorTech: GAME_CONSTANTS.FINANCE.INITIAL_SPONSOR_TECH,
        sponsorShirt: GAME_CONSTANTS.FINANCE.INITIAL_SPONSOR_SHIRT
    },
    freeAgents: [],
    negotiations: {
        pendingOffers: [],
        rejectedPlayers: new Set(),
        attemptsCount: {} 
    }
};


// In state.js
window.saveState = function() {
    // Crea una copia dello stato con il Set convertito in array
    const stateToSave = {
        ...STATE,
        negotiations: {
            ...STATE.negotiations,
            rejectedPlayers: Array.from(STATE.negotiations.rejectedPlayers || [])
        }
    };
    
    localStorage.setItem(GAME_CONSTANTS.STORAGE.SAVE_KEY, JSON.stringify(stateToSave));
};

window.loadState = function() {
    const raw = localStorage.getItem(GAME_CONSTANTS.STORAGE.SAVE_KEY);
    if (!raw) return false;
    
    const parsed = JSON.parse(raw);
    
    // Inizializza le finanze mancanti
    if (parsed.teams) {
        parsed.teams.forEach(team => {
            if (!team.finances) {
                team.finances = teamGenerator.generateTeamFinances();
            }
            // Backfill sponsor brand names if missing
            const F = GAME_CONSTANTS.FINANCE;
            if (!team.finances.sponsorTechBrand || !team.finances.sponsorShirtBrand) {
                const brands = F.SPONSOR_BRANDS || [];
                const pickBrand = () => brands.length ? brands[Math.floor(Math.random() * brands.length)] : null;
                team.finances.sponsorTechBrand = team.finances.sponsorTechBrand || pickBrand();
                team.finances.sponsorShirtBrand = team.finances.sponsorShirtBrand || pickBrand();
            }
            
            // Inizializza le tattiche se mancanti
            if (!team.tactics) {
                team.tactics = {
                    formation: team.formation || '442' // usa la formazione esistente o il default
                };
            }
        });
    }

    // Inizializza o ripristina le negoziazioni
    if (!parsed.negotiations) {
        parsed.negotiations = {
            pendingOffers: [],
            rejectedPlayers: [],
            attemptsCount: {}
        };
    }

    // Converti l'array dei rejectedPlayers in Set
    parsed.negotiations.rejectedPlayers = new Set(parsed.negotiations.rejectedPlayers);
    
    Object.assign(STATE, parsed);

    // Dopo aver caricato lo stato, aggiorna la formazione nell'UI
    const myTeam = getMyTeam();
    if (myTeam && (myTeam.tactics?.formation || myTeam.formation)) {
        const formationSelect = document.getElementById('tacticsFormation');
        if (formationSelect) {
            formationSelect.value = myTeam.tactics?.formation || myTeam.formation;
            // Se squadUI è già inizializzato, aggiorna la visualizzazione
            if (window.squadUI) {
                window.squadUI.updateStartingXI(myTeam);
            }
        }
    }

    return true;
};

window.getMyTeam = function() {
    if (!STATE || !STATE.teams || !STATE.teamName) {
        console.error('STATE non inizializzato correttamente');
        return null;
    }
    return STATE.teams.find(t => t.name === STATE.teamName);
};

window.findTeamByName = function(name) {
    return STATE.teams.find(t => t.name === name);
};

// Debug helper
window.debugState = function() {
    console.log('Current STATE:', STATE);
    console.log('My team:', getMyTeam());
};
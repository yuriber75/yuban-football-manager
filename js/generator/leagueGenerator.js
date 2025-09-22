// leagueGenerator.js

window.leagueGenerator = {
    setupNewLeague: function(numTeams, managerName, myTeamName) {
        // Check required dependencies
        if (!window.GAME_CONSTANTS || !window.STATE || !window.teamGenerator || !window.marketAgents) {
            console.error('Required dependencies not loaded');
            throw new Error('Required dependencies not loaded');
        }

        STATE.manager = managerName || 'Manager';
        STATE.teamName = myTeamName || teamGenerator.generateTeamName(0);

        STATE.career = {
            cash: GAME_CONSTANTS.FINANCE.INITIAL_CASH,
            wageBudget: GAME_CONSTANTS.FINANCE.INITIAL_WAGE_BUDGET,
            sponsorTech: GAME_CONSTANTS.FINANCE.INITIAL_SPONSOR_TECH,
            sponsorShirt: GAME_CONSTANTS.FINANCE.INITIAL_SPONSOR_SHIRT
        };

        this.generateTeams(numTeams);
        this.generateFixtures();
        this.initializeLeagueTable();
		
		// per new league, end of year modify this part 
		if (!STATE.freeAgents || STATE.freeAgents.length === 0) {
			console.log('Generating initial free agents in setupNewLeague');
			STATE.freeAgents = window.marketAgents.generateFreeAgents(15);
		}

        saveState();
    },

    generateTeams: function(numTeams) {
        STATE.teams = [];
        for (let i = 0; i < numTeams; i++) {
            const teamName = i === 0 ? STATE.teamName : teamGenerator.generateTeamName(i);
            const team = teamGenerator.makeTeam(teamName);
            
            if (i === 0) {
                team.finances = {
                    transferBudget: STATE.career.cash,
                    wagesBudget: STATE.career.wageBudget,
                    sponsorTech: STATE.career.sponsorTech,
                    sponsorShirt: STATE.career.sponsorShirt,
                    stadiumCapacity: GAME_CONSTANTS.FINANCE.MIN_STADIUM_CAPACITY,
                    currentAttendance: GAME_CONSTANTS.FINANCE.INITIAL_ATTENDANCE,
                    playersForSale: []
                };
            }

            STATE.teams.push(team);
        }
    },

	generateFixtures: function() {
		STATE.league = {
			week: 1,
			fixtures: [],
			table: {},
			results: []
		};

		const n = STATE.teams.length;
		if (n > 0) {
			const rounds = n - 1;
			let teams = [...Array(n).keys()];
			let schedule = [];

			// Prima metà della stagione
			for (let round = 0; round < rounds; round++) {
				let fixtures = [];
				
				// Dividi le squadre a metà e ruotale in direzioni opposte
				const half = Math.floor(teams.length / 2);
				const firstHalf = teams.slice(0, half);
				const secondHalf = teams.slice(half);

				// Crea le partite per questo round
				for (let i = 0; i < half; i++) {
					// Alterna casa/trasferta basandosi sul round e sulla posizione
					if ((round + i) % 2 === 0) {
						fixtures.push([firstHalf[i], secondHalf[i]]);
					} else {
						fixtures.push([secondHalf[i], firstHalf[i]]);
					}
				}

				// Ruota le squadre per il prossimo round
				// Mantieni la prima squadra fissa, ruota le altre
				teams = [
					teams[0],
					...teams.slice(-1),
					...teams.slice(1, -1)
				];

				schedule.push(fixtures);

			}

			// Seconda metà della stagione: inverti casa/trasferta
			const returnSchedule = schedule.map(round =>
				round.map(([home, away]) => [away, home])
			);

			STATE.league.fixtures = [...schedule, ...returnSchedule];

			STATE.teams.forEach((team, teamIdx) => {
				const pattern = STATE.league.fixtures.map(round => {
					const match = round.find(([h, a]) => h === teamIdx || a === teamIdx);
					return match ? (match[0] === teamIdx ? 'H' : 'A') : '-';
				});
			});

			// Verifica numero di partite in casa
			const homeGames = STATE.teams.map(() => 0);
			STATE.league.fixtures.forEach(round => {
				round.forEach(([home]) => {
					homeGames[home]++;
				});
			});
		}
	},

    initializeLeagueTable: function() {
        STATE.teams.forEach(t => {
            STATE.league.table[t.name] = {
                team: t.name,
                pld: 0, pts: 0, w: 0, d: 0, l: 0,
                gf: 0, ga: 0, gd: 0
            };
        });
    },

    generateFreeAgents: function(count) {
        const freeAgents = [];
        for (let i = 0; i < count; i++) {
            const role = this.getRandomRole();
            const player = playerGenerator.makePlayer([role], 'Free Agent');
            player.value *= 0.8;
            player.wage *= 0.8;
            freeAgents.push(player);
        }
        return freeAgents;
    },

initializeFreeAgents: function() {
    console.log('Initializing free agents...');
    
    // Genera free agents solo se non esistono già
    if (!STATE.freeAgents || STATE.freeAgents.length === 0) {
        const freeAgents = [];
        
        // Genera un numero fisso di giocatori per ruolo
        // Portieri (4)
        for (let i = 0; i < 4; i++) {
            const player = window.makePlayer(['GK']);
            player.id = this.generateUniqueId();
            freeAgents.push(player);
        }
        
        // Difensori (6)
        const defRoles = ['DR', 'DC', 'DL'];
        for (let i = 0; i < 6; i++) {
            const player = window.makePlayer([defRoles[i % defRoles.length]]);
            player.id = this.generateUniqueId();
            freeAgents.push(player);
        }
        
        // Centrocampisti (6)
        const midRoles = ['MR', 'MC', 'ML'];
        for (let i = 0; i < 6; i++) {
            const player = window.makePlayer([midRoles[i % midRoles.length]]);
            player.id = this.generateUniqueId();
            freeAgents.push(player);
        }
        
        // Attaccanti (4)
        const attRoles = ['FR', 'ST', 'FL'];
        for (let i = 0; i < 4; i++) {
            const player = window.makePlayer([attRoles[i % attRoles.length]]);
            player.id = this.generateUniqueId();
            freeAgents.push(player);
        }
        
        STATE.freeAgents = freeAgents;
        console.log(`Generated ${freeAgents.length} initial free agents`);
    }
},

replaceFreeAgent: function(player) {
    // Genera un sostituto dello stesso ruolo primario
    const newPlayer = window.makePlayer([player.roles[0]]);
    newPlayer.id = this.generateUniqueId();
    
    // Aggiungi il nuovo giocatore alla lista dei free agent
    if (!STATE.freeAgents) {
        STATE.freeAgents = [];
    }
    STATE.freeAgents.push(newPlayer);
    
    console.log(`Replaced free agent ${player.nome} with ${newPlayer.nome}`);
    return newPlayer;
},

    getRandomRole: function() {
        const roles = ['GK', 'DR', 'DC', 'DL', 'MR', 'MC', 'ML', 'FR', 'ST', 'FL'];
        const weights = [1, 2, 3, 2, 2, 3, 2, 2, 2, 2];
        let total = weights.reduce((a, b) => a + b, 0);
        let rand = Math.random() * total;
        
        for (let i = 0; i < roles.length; i++) {
            if (rand < weights[i]) return roles[i];
            rand -= weights[i];
        }
        return 'MC';
    }
};

// Rendi disponibile globalmente
window.setupNewLeague = leagueGenerator.setupNewLeague.bind(leagueGenerator);
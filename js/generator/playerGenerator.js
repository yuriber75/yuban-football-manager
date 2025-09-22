// playerGenerator.js

window.playerGenerator = {
    generateName: function() {
        const { FIRST, LAST } = GAME_CONSTANTS.NAMES;
        return `${this.pick(FIRST)} ${this.pick(LAST)}`;
    },

    makePlayer: function(roles, club) {
        const playerRoles = Array.isArray(roles) ? roles : [roles];
        const primaryRole = playerRoles[0];
        
        // Crea una copia profonda delle statistiche base
        let baseStats = primaryRole === 'GK' 
            ? this.generateGoalkeeperStats() 
            : {...GAME_CONSTANTS.PLAYER_STATS.BASE_STATS[primaryRole]};
           
        if(playerRoles.length > 1) {
            const secondaryStats = GAME_CONSTANTS.PLAYER_STATS.BASE_STATS[playerRoles[1]];
            Object.keys(baseStats).forEach(stat => {
                baseStats[stat] = Math.round((baseStats[stat] + secondaryStats[stat]) / 2);
            });
        }

        const variance = 20;
        
        const player = {
            id: crypto.randomUUID(),
            nome: this.generateName(),
            roles: playerRoles,
            ruolo: playerRoles[0],
            club: club,
            age: 20 + Math.floor(Math.random() * 14),
            form: 80 + Math.floor(Math.random() * 20),
            starting: false,
            positionIndex: undefined,
            stamina: 100,
			contractYears: 1 + Math.floor(Math.random() * 3),
            // Inizializza tutte le statistiche base
            speed: 0,
            pass: 0,
            shot: 0,
            def: 0,
            drib: 0,
            tackle: 0
        };

        // Applica statistiche con varianza
        Object.entries(baseStats).forEach(([stat, value]) => {
            const randomFactor = (Math.random() - 0.5) * variance * 2;
            const adjustedValue = value + randomFactor;
            player[stat] = Math.round(Math.max(45, Math.min(95, adjustedValue)));
        });
        
        // Calcola l'overall basato sul ruolo
        player.overall = this.calculateOverall(player);

        // Calcola valore e stipendio
		player.value = this.calculatePlayerValue(player);
		player.wage = this.calculatePlayerWage(player);

        // Inizializza statistiche di gioco
        player.stats = this.initializePlayerStats();

        return player;
    },

	calculatePlayerValue: function(player) {
		const F = GAME_CONSTANTS.FINANCE;
		const baseValue = (player.overall / 50) * 8; // Valore base dall'overall

		// Usa i moltiplicatori dalle costanti per l'età
		let ageMultiplier;
		if (player.age < 23) {
			// Giovani talenti: usa YOUNG_TALENT + bonus per ogni anno sotto i 21
			ageMultiplier = F.TRANSFER_VALUE_MULTIPLIER.YOUNG_TALENT;
			if (player.age <= 21) {
				ageMultiplier += ((21 - player.age) * 0.1);
			}
		} else if (player.age <= 28) {
			// Prime della carriera
			ageMultiplier = F.TRANSFER_VALUE_MULTIPLIER.PRIME;
		} else if (player.age <= 32) {
			// Esperti
			ageMultiplier = F.TRANSFER_VALUE_MULTIPLIER.EXPERIENCED;
		} else {
			// Veterani
			ageMultiplier = F.TRANSFER_VALUE_MULTIPLIER.VETERAN;
		}

		// Modificatore per ruolo resta uguale
		const roleMultiplier = {
			'GK': 0.8,
			'DC': 0.9,
			'DR': 0.85, 'DL': 0.85,
			'MC': 1.1,
			'MR': 1.0, 'ML': 1.0,
			'ST': 1.3,
			'FR': 1.2, 'FL': 1.2
		}[player.roles[0]] || 1.0;

		// Calcolo valore finale con limiti dalle costanti
		let calculatedValue = Math.round(
			(baseValue * ageMultiplier * roleMultiplier) + 
			(player.overall >= 85 ? 5 : 0)
		);

		// Applica i limiti min/max dalle costanti
		calculatedValue = Math.min(F.MAX_TRANSFER_VALUE, 
								 Math.max(F.MIN_TRANSFER_VALUE, calculatedValue));

		return calculatedValue;
	},

	// Aggiungi una funzione per calcolare il range di negoziazione
	calculateNegotiationRange: function(player, type = 'TRANSFER_FEE') {
		const F = GAME_CONSTANTS.FINANCE;
		const baseValue = type === 'TRANSFER_FEE' ? player.value : player.wage;
		
		return {
			minAcceptable: baseValue * F.NEGOTIATION_RANGES[type].MIN_ACCEPTABLE,
			maxCounter: baseValue * F.NEGOTIATION_RANGES[type].MAX_COUNTER,
			baseValue: baseValue
		};
	},

	// Modifica calculatePlayerWage per usare i range di negoziazione
	calculatePlayerWage: function(player) {
		const F = GAME_CONSTANTS.FINANCE;
		const baseWage = (player.overall / 50) * 2.4;

		// Usa gli stessi moltiplicatori di età del valore di mercato per coerenza
		let ageWageMultiplier;
		if (player.age < 23) {
			ageWageMultiplier = 0.8; // Più basso per giovani
		} else if (player.age <= 28) {
			ageWageMultiplier = 1.0;
		} else if (player.age <= 32) {
			ageWageMultiplier = 0.9;
		} else {
			ageWageMultiplier = 0.7;
		}

		// Modificatore ruolo resta uguale
		const roleWageMultiplier = {
			'GK': 0.9,
			'DC': 0.85,
			'DR': 0.8, 'DL': 0.8,
			'MC': 1.1,
			'MR': 1.0, 'ML': 1.0,
			'ST': 1.3,
			'FR': 1.2, 'FL': 1.2
		}[player.roles[0]] || 1.0;

		const overallBonus = player.overall >= 85 ? 1.5 : 
							player.overall >= 80 ? 1.2 : 1.0;

		let calculatedWage = +(
			(baseWage * ageWageMultiplier * roleWageMultiplier * overallBonus) + 
			(player.overall >= 85 ? 1 : 0)
		).toFixed(2);

		// Assicurati che lo stipendio sia nei limiti accettabili
		calculatedWage = Math.max(F.MIN_PLAYER_WAGE, calculatedWage);
		
		return calculatedWage;
	},


    generateGoalkeeperStats: function() {
        const styles = [
            { // Portiere moderno
                speed: 35, pass: 70, shot: 55, def: 75, drib: 30, tackle: 65
            },
            { // Portiere classico
                speed: 40, pass: 50, shot: 50, def: 85, drib: 20, tackle: 70
            },
            { // Portiere atletico
                speed: 45, pass: 55, shot: 60, def: 80, drib: 25, tackle: 60
            }
        ];

        return {...this.pick(styles)};  // Ritorna una copia dell'oggetto
    },

    calculateOverall: function(player) {
        let weights = {...GAME_CONSTANTS.PLAYER_STATS.WEIGHTS[player.roles[0]]};
        
        if (player.roles.length > 1 && GAME_CONSTANTS.PLAYER_STATS.WEIGHTS[player.roles[1]]) {
            const secondaryWeights = GAME_CONSTANTS.PLAYER_STATS.WEIGHTS[player.roles[1]];
            Object.keys(weights).forEach(stat => {
                weights[stat] = (weights[stat] + secondaryWeights[stat]) / 2;
            });
        }

        let overall = 0;
        Object.entries(weights).forEach(([stat, weight]) => {
            overall += (player[stat] || 0) * weight;
        });

        const formFactor = (player.form - 80) / 200;
        overall = overall * (1 + formFactor);

        return Math.round(overall);
    },

    addSecondaryDefRole: function(primaryRole) {
        const possibleSecondary = {
            'DR': ['MR', 'DC'],
            'DC': ['DR', 'DL'],
            'DL': ['ML', 'DC']
        };
        return [primaryRole, this.pick(possibleSecondary[primaryRole])];
    },

    addSecondaryMidRole: function(primaryRole) {
        const possibleSecondary = {
            'MR': ['ML', 'MC'],
            'MC': ['MR', 'ML'],
            'ML': ['MR', 'MC']
        };
        return [primaryRole, this.pick(possibleSecondary[primaryRole])];
    },

    addSecondaryFwdRole: function(primaryRole) {
        const possibleSecondary = {
            'FR': ['ST'],
            'ST': ['FR', 'FL'],
            'FL': ['ST']
        };
        return [primaryRole, this.pick(possibleSecondary[primaryRole])];
    },

    addSecondaryRole: function(primaryRole) {
        if(primaryRole === 'GK') return [primaryRole];
        if(primaryRole.startsWith('D')) return this.addSecondaryDefRole(primaryRole);
        if(primaryRole.startsWith('M')) return this.addSecondaryMidRole(primaryRole);
        if(primaryRole.startsWith('F') || primaryRole === 'ST') return this.addSecondaryFwdRole(primaryRole);
        return [primaryRole];
    },

    initializePlayerStats: function() {
        return {
            goals: 0,
            assists: 0,
            shots: 0,
            passes: 0,
            succPass: 0,
            tackles: 0,
            saves: 0,
            cards: 0,
            reds: 0,
            motm: 0,
            rating: 0,
            games: 0
        };
    },

    pick: function(array) {
        return array[Math.floor(Math.random() * array.length)];
    }
};

// Esponi la funzione makePlayer globalmente
window.makePlayer = function(roles, club) {
    return window.playerGenerator.makePlayer(roles, club);
};

// Esponi anche le funzioni di supporto
window.addSecondaryRole = function(primaryRole) {
    return window.playerGenerator.addSecondaryRole(primaryRole);
};

console.log('playerGenerator.js loaded successfully');
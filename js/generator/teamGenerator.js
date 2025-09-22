// teamGenerator.js

window.teamGenerator = {
    generateTeamName: function(index) {
        const names = GAME_CONSTANTS.TEAMS.NAMES;
        return names[index % names.length] + 
               (index >= names.length ? ' ' + (index + 1) : '');
    },

    makeTeam: function(name) {
        const players = this.generatePlayers(name);
        const finances = this.generateTeamFinances();
        const defaultFormation = this.select442Formation(players);

        return {
            name,
            players,
            formation: '442',
            defaultFormation,
            finances
        };
    },

    generateTeamFinances: function() {
        const { FINANCE } = GAME_CONSTANTS;
        return {
            transferBudget: FINANCE.MIN_TRANSFER_BUDGET + 
                          Math.random() * (FINANCE.MAX_TRANSFER_BUDGET - FINANCE.MIN_TRANSFER_BUDGET),
            wagesBudget: FINANCE.MIN_WAGE_BUDGET + 
                        Math.random() * (FINANCE.MAX_WAGE_BUDGET - FINANCE.MIN_WAGE_BUDGET),
            sponsorTech: FINANCE.MIN_SPONSOR_TECH + 
                        Math.random() * (FINANCE.MAX_SPONSOR_TECH - FINANCE.MIN_SPONSOR_TECH),
            sponsorShirt: FINANCE.MIN_SPONSOR_SHIRT + 
                         Math.random() * (FINANCE.MAX_SPONSOR_SHIRT - FINANCE.MIN_SPONSOR_SHIRT),
            stadiumCapacity: Math.floor(FINANCE.MIN_STADIUM_CAPACITY + 
                           Math.random() * (FINANCE.MAX_STADIUM_CAPACITY - FINANCE.MIN_STADIUM_CAPACITY)),
            currentAttendance: FINANCE.INITIAL_ATTENDANCE,
            playersForSale: []
        };
    },

    generatePlayers: function(clubName) {
        const players = [];
        const usedNumbers = new Set();

        // Genera portieri
        for(let i = 0; i < 3; i++) {
            players.push(playerGenerator.makePlayer(['GK'], clubName));
        }

        // Genera difensori
        const defRoles = ['DR', 'DC', 'DC', 'DL', 'DR', 'DL'];
        defRoles.forEach((primaryRole, index) => {
            const roles = index % 3 === 0 ? 
                playerGenerator.addSecondaryDefRole(primaryRole) : [primaryRole];
            players.push(playerGenerator.makePlayer(roles, clubName));
        });

        // Genera centrocampisti
        const midRoles = ['MR', 'MC', 'MC', 'ML', 'MR', 'ML'];
        midRoles.forEach((primaryRole, index) => {
            const roles = index % 3 === 0 ? 
                playerGenerator.addSecondaryMidRole(primaryRole) : [primaryRole];
            players.push(playerGenerator.makePlayer(roles, clubName));
        });

        // Genera attaccanti
        const fwdRoles = ['FR', 'ST', 'FL'];
        fwdRoles.forEach((primaryRole, index) => {
            const roles = index % 3 === 0 ? 
                playerGenerator.addSecondaryFwdRole(primaryRole) : [primaryRole];
            players.push(playerGenerator.makePlayer(roles, clubName));
        });

        // Giocatore extra
        const extraPrimaryRole = playerGenerator.pick(['DR', 'DC', 'DL', 'MR', 'MC', 'ML', 'FR', 'ST', 'FL']);
        const extraRoles = Math.random() < 0.33 ? 
            playerGenerator.addSecondaryRole(extraPrimaryRole) : [extraPrimaryRole];
        players.push(playerGenerator.makePlayer(extraRoles, clubName));

        // Migliora portieri
        players.filter(p => p.roles.includes('GK')).forEach(gk => {
            gk.def = Math.min(gk.def + 10, 99);
            gk.speed = Math.min(gk.speed + 5, 99);
        });

        // Assegna numeri di maglia
        this.assignShirtNumbers(players);

        return players;
    },

    select442Formation: function(players) {
        return {
            GK: [players.find(p => p.roles.includes('GK'))],
            DF: [
                players.find(p => p.roles.includes('DL')),
                players.filter(p => p.roles.includes('DC'))[0],
                players.filter(p => p.roles.includes('DC'))[1],
                players.find(p => p.roles.includes('DR'))
            ],
            MF: [
                players.find(p => p.roles.includes('ML')),
                players.filter(p => p.roles.includes('MC'))[0],
                players.filter(p => p.roles.includes('MC'))[1],
                players.find(p => p.roles.includes('MR'))
            ],
            FW: [
                players.find(p => p.roles.includes('ST')),
                players.find(p => p.roles.includes('FR') || p.roles.includes('FL'))
            ]
        };
    },

	assignShirtNumbers: function(players) {
		const usedNumbers = new Set();

		// Portieri: 1 e 12
		players.filter(p => p.roles[0] === 'GK')
			.forEach((p, i) => {
				const num = i === 0 ? 1 : 12;
				p.number = num;
				usedNumbers.add(num);
			});

		// Difensori: 2,3,5,6
		const defenderNumbers = [2, 3, 5, 6];
		players.filter(p => p.roles[0].startsWith('D'))
			.forEach((p, i) => {
				if (i < defenderNumbers.length) {
					p.number = defenderNumbers[i];
					usedNumbers.add(defenderNumbers[i]);
				} else {
					p.number = this.getRandomAvailableNumber(usedNumbers);
				}
			});

		// Centrocampisti: 4,7,8,10
		const midfielderNumbers = [4, 7, 8, 10];
		players.filter(p => p.roles[0].startsWith('M'))
			.forEach((p, i) => {
				if (i < midfielderNumbers.length) {
					p.number = midfielderNumbers[i];
					usedNumbers.add(midfielderNumbers[i]);
				} else {
					p.number = this.getRandomAvailableNumber(usedNumbers);
				}
			});

		// Attaccanti: 9,11
		const forwardNumbers = [9, 11];
		players.filter(p => p.roles[0].startsWith('F') || p.roles[0] === 'ST')
			.forEach((p, i) => {
				if (i < forwardNumbers.length) {
					p.number = forwardNumbers[i];
					usedNumbers.add(forwardNumbers[i]);
				} else {
					p.number = this.getRandomAvailableNumber(usedNumbers);
				}
			});

		// Assegna numeri random ai giocatori rimanenti
		players.filter(p => !p.hasOwnProperty('number'))
			.forEach(p => {
				p.number = this.getRandomAvailableNumber(usedNumbers);
			});
	},

    getRandomAvailableNumber: function(usedNumbers) {
        let num;
        do {
            num = Math.floor(Math.random() * (99 - 13 + 1)) + 13;
        } while (usedNumbers.has(num));
        usedNumbers.add(num);
        return num;
    }
};

// Esponi la funzione makeTeam globalmente
window.makeTeam = function(name) {
    return window.teamGenerator.makeTeam(name);
};

console.log('teamGenerator.js loaded successfully');
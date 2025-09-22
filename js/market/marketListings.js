// marketListings.js
console.log('Loading marketListings.js...');

if (!window.playerGenerator || !window.STATE || !window.GAME_CONSTANTS) {
	console.error('Required dependencies not loaded for marketListings');
	throw new Error('Missing dependencies');
}

window.marketListings = {
	
    initializeNegotiations: function() {
        if (!STATE.negotiations) {
            STATE.negotiations = {
                pendingOffers: [],
                rejectedPlayers: new Set(),
                attemptsCount: {}
            };
        }
    },

    addPlayerToTransferList: function(player, team) {
        if (!team.finances.playersForSale) {
            team.finances.playersForSale = [];
        }
        player.listed = true;
        team.finances.playersForSale.push({...player});
    },

    generateOffersForPlayer: function(player) {
        const currentWeek = STATE.league.week;
        let offers = [];
        const random = Math.random();

        // 10% chance: no offers, player removed from market
        if (random < 0.1) {
            setTimeout(() => {
                this.removeFromMarket(player.id);
                window.marketUtils.showNotification(
                    `${player.nome} has been removed from the transfer list due to lack of interest.`
                );
            }, 0);
            return [];
        }

        // Generate an offer based on probability
        let offerAmount;
        if (random < 0.5) { // 40% chance (0.1 to 0.5) - ridiculous low offer
            offerAmount = (player.value * 0.5) * (0.95 + Math.random() * 0.1); // 50% of value ±5%
        } else if (random < 0.9) { // 40% chance (0.5 to 0.9) - fair offer
            offerAmount = player.value * (0.95 + Math.random() * 0.1); // 100% of value ±5%
        } else { // 10% chance (0.9 to 1.0) - high offer
            offerAmount = (player.value * 2) * (0.95 + Math.random() * 0.1); // 200% of value ±5%
        }

        // Create the offer
        const offer = {
            playerId: player.id,
            playerName: player.nome,
            type: 'transfer',
            amount: offerAmount,
            wage: player.wage * (1 + Math.random() * 0.2), // 0-20% wage increase
            contractLength: 2 + Math.floor(Math.random() * 3), // 2-4 years
            team: GAME_CONSTANTS.TEAMS.FOREIGN_TEAMS[Math.floor(Math.random() * GAME_CONSTANTS.TEAMS.FOREIGN_TEAMS.length)],
            deadline: currentWeek + 1,
            isExternal: true
        };

        offers.push(offer);
        return offers;
    },

    listPlayerForSale: function(playerId) {
		console.log('Listing player for sale:', {
			playerId,
			currentWeek: STATE.league.week
		});
      
        const myTeam = getMyTeam();
        const player = myTeam.players.find(p => p.id === playerId);
        
        if (!player || !marketValidation.canListPlayerForSale(player, myTeam)) {
            return;
        }
        
        // Non listare se già in vendita
        if (myTeam.finances.playersForSale?.some(p => p.id === player.id)) {
            return;
        }

        // Inizializza strutture dati necessarie
        this.initializeNegotiations();
        this.addPlayerToTransferList(player, myTeam);

        // Genera offerte dopo un breve delay
        setTimeout(() => {
            try {
				console.log('Processing sale listing:', {
					player: player.nome,
					currentWeek: STATE.league.week,
					pendingOffers: STATE.negotiations.pendingOffers.length
				});
				
                const newOffers = this.generateOffersForPlayer(player);
                
                // Add the generated offers to pending negotiations
                if (newOffers && newOffers.length > 0) {
                    STATE.negotiations.pendingOffers.push(...newOffers);
                    console.log('Added new offers:', {
                        player: player.nome,
                        offersCount: newOffers.length,
                        currentWeek: STATE.league.week
                    });
                }
                
                // Generic notification regardless of offers
                window.marketUtils.showNotification(
                    `${player.nome} has been listed on the transfer market.`
                );
                
                console.log('Player listed:', {
                    player: player.nome,
                    currentWeek: STATE.league.week,
                    totalPendingOffers: STATE.negotiations.pendingOffers.length
                });
                saveState();
            } catch (error) {
                console.error('Error generating offers:', error);
                window.marketUtils.showNotification('An error occurred while processing the transfer listing.');
            }
        }, 500);

        // Aggiorna UI
        this.updateViews();
    },
	
	updateViews: function() {
        window.marketUI.updateMarketView();
        window.financeUI.updateFinanceView();
        saveState();
    },
	
	removeFromMarket: function(playerId) {
		const myTeam = getMyTeam();
		const player = myTeam.players.find(p => p.id === playerId);
		
		if (!player) return;
		
		// Rimuovi il flag listed dal giocatore
		delete player.listed;
		
		// Rimuovi il giocatore dalla lista dei giocatori in vendita
		if (myTeam.finances.playersForSale) {
			myTeam.finances.playersForSale = myTeam.finances.playersForSale
				.filter(p => p.id !== playerId);
		}

		// AGGIUNGI QUESTO: Rimuovi tutte le offerte pendenti per questo giocatore
		if (STATE.negotiations?.pendingOffers) {
			console.log('Removing pending offers for player:', playerId);
			const beforeCount = STATE.negotiations.pendingOffers.length;
			STATE.negotiations.pendingOffers = STATE.negotiations.pendingOffers
				.filter(offer => offer.playerId !== playerId);
			console.log(`Removed ${beforeCount - STATE.negotiations.pendingOffers.length} pending offers`);
		}
		
		// Aggiorna le viste
		window.marketUI.updateMarketView();
		window.marketDisplay.updateTransferList(); // Aggiungi questa riga
		window.financeUI.updateFinanceView();
		
		// Mostra notifica
		window.marketUtils.showNotification(`${player.nome} has been removed from the transfer list.`);
		
		saveState();
	},
	
autoListPlayersForSale: function() {
    console.log('Starting autoListPlayersForSale...');
    
    STATE.teams.forEach(team => {
        if (team.name === STATE.teamName) return;
        
        console.log(`Processing team: ${team.name}`);
        
        // Calcola il budget ratio per determinare se la squadra deve vendere
        const avgBudget = STATE.teams.reduce((sum, t) => sum + t.finances.transferBudget, 0) / STATE.teams.length;
        const budgetRatio = team.finances.transferBudget / avgBudget;
        
        // Squadre ricche hanno meno probabilità di vendere
        if (budgetRatio > 1.5 && Math.random() > 0.2) {
            console.log(`${team.name} has good finances, skipping sales`);
            return;
        }
        
        if (!team.finances.playersForSale) {
            team.finances.playersForSale = [];
        }
        
        // Raggruppa i giocatori per ruolo e trova i titolari
        const playersByRole = {};
        team.players.forEach(player => {
            const role = player.roles[0];
            if (!playersByRole[role]) {
                playersByRole[role] = [];
            }
            playersByRole[role].push(player);
        });
        
        // Ordina i giocatori per overall in ogni ruolo
        Object.keys(playersByRole).forEach(role => {
            playersByRole[role].sort((a, b) => b.overall - a.overall);
        });
        
        const roleCount = {
            GK: 0,
            DEF: 0,
            MID: 0,
            ATT: 0
        };
        
        // Trova i giocatori vendibili
        const sellablePlayers = team.players.filter(player => {
            if (player.listed) return false;
            
            const role = player.roles[0];
            const primaryRole = role.charAt(0);
            
            // Aggiorna il conteggio dei ruoli
            if (primaryRole === 'G') roleCount.GK++;
            else if (primaryRole === 'D') roleCount.DEF++;
            else if (primaryRole === 'M') roleCount.MID++;
            else if (['S', 'F'].includes(primaryRole)) roleCount.ATT++;
            
            // Verifica se è una riserva
            const isStarter = playersByRole[role][0] === player;
            if (isStarter) return false;
            
            // Verifica che il titolare sia migliore
            const starter = playersByRole[role][0];
            if (starter.overall <= player.overall) return false;
            
            // Verifica che non sia il migliore in altri ruoli
            const isBestInOtherRole = player.roles.some(otherRole => {
                if (otherRole === role) return false;
                return playersByRole[otherRole]?.[0]?.overall < player.overall;
            });
            if (isBestInOtherRole) return false;
            
            return true;
        });
        
        // Ordina per valore + stipendio
        const sortedPlayers = sellablePlayers.sort((a, b) => {
            return (b.wage + b.value) - (a.wage + a.value);
        });
        
        // Seleziona 1-2 giocatori da vendere
        const playersToList = Math.floor(Math.random() * 2) + 1;
        let listedCount = 0;
        
        sortedPlayers.forEach(player => {
            if (listedCount >= playersToList) return;
            
            const role = player.roles[0].charAt(0);
            let canSell = true;
            
            // Verifica limiti squadra
            if (team.players.length <= GAME_CONSTANTS.FINANCE.MIN_SQUAD_SIZE) {
                canSell = false;
            }
            
            // Verifica limiti per ruolo
            if (role === 'G' && roleCount.GK <= GAME_CONSTANTS.FINANCE.MIN_GOALKEEPER) canSell = false;
            else if (role === 'D' && roleCount.DEF <= GAME_CONSTANTS.FINANCE.MIN_DEFENDER) canSell = false;
            else if (role === 'M' && roleCount.MID <= GAME_CONSTANTS.FINANCE.MIN_MIDFIELDER) canSell = false;
            else if (['S', 'F'].includes(role) && roleCount.ATT <= GAME_CONSTANTS.FINANCE.MIN_FORWARD) canSell = false;
            
            if (canSell) {
                console.log(`${team.name} listing ${player.nome} (${player.overall}) for sale`);
                player.listed = true;
                team.finances.playersForSale.push({...player});
                listedCount++;
                
                // Aggiorna contatori
                if (role === 'G') roleCount.GK--;
                else if (role === 'D') roleCount.DEF--;
                else if (role === 'M') roleCount.MID--;
                else if (['S', 'F'].includes(role)) roleCount.ATT--;
            }
        });
        
        console.log(`${team.name} listed ${listedCount} players for sale`);
    });
    
    window.marketUI.updateMarketView();
    saveState();
},
	
	generateTransferListedPlayers: function() {
		console.log('Generating transfer listed players from other leagues...');
		
		// Array per contenere i giocatori generati
		const transferListed = [];
		
		
		const generatePlayer = (role) => {
			const player = window.makePlayer([role], 
				GAME_CONSTANTS.TEAMS.FOREIGN_TEAMS[Math.floor(Math.random() * GAME_CONSTANTS.TEAMS.FOREIGN_TEAMS.length)]
			);
			
			// Assicurati che l'ID sia unico
			player.id = marketUtils.generateUniqueId();
			player.value *= 1.2;
			player.wage *= 1.2;
			player.listed = true;
			
			return player;
		};
		
		// Genera 4 portieri
		for (let i = 0; i < 4; i++) {
			transferListed.push(generatePlayer('GK'));
		}
		
		// Genera 4 difensori (mix di ruoli)
		const defRoles = ['DR', 'DC', 'DL'];
		for (let i = 0; i < 4; i++) {
			transferListed.push(generatePlayer(defRoles[i % defRoles.length]));
		}
		
		// Genera 4 centrocampisti
		const midRoles = ['MR', 'MC', 'ML'];
		for (let i = 0; i < 4; i++) {
			transferListed.push(generatePlayer(midRoles[i % midRoles.length]));
		}
		
		// Genera 4 attaccanti
		const attRoles = ['FR', 'ST', 'FL'];
		for (let i = 0; i < 4; i++) {
			transferListed.push(generatePlayer(attRoles[i % attRoles.length]));
		}
		
		console.log(`Generated ${transferListed.length} transfer listed players`);
		
		// Crea una squadra fittizia per questi giocatori
		const transferMarketTeam = {
			name: 'Transfer Market',
			finances: {
				playersForSale: transferListed
			}
		};
		
		// Aggiungi la squadra fittizia a STATE
		if (!STATE.transferMarket) {
			STATE.transferMarket = transferMarketTeam;
		}
		
		return transferListed;
	}
	
};

Object.assign(window, {
    marketListings: window.marketListings,
    listPlayerForSale: window.marketListings.listPlayerForSale.bind(window.marketListings),
    removeFromMarket: window.marketListings.removeFromMarket.bind(window.marketListings),
    autoListPlayersForSale: window.marketListings.autoListPlayersForSale.bind(window.marketListings),
    generateTransferListedPlayers: window.marketListings.generateTransferListedPlayers.bind(window.marketListings)
});
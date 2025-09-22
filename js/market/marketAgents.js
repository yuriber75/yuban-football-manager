// marketAgents.js
console.log('Loading marketAgents.js...');

if (!window.playerGenerator || !window.STATE || !window.GAME_CONSTANTS) {
	console.error('Required dependencies not loaded for marketAgents');
	throw new Error('Missing dependencies');
}

window.marketAgents = {
	
	generateFreeAgents: function(count) {
		console.log('Generating', count, 'free agents');
		
		// Distribuzione desiderata per ruolo
		const distribution = {
			GK: 2,  // 2 portieri
			DEF: 4, // 4 difensori
			MID: 5, // 5 centrocampisti
			ATT: 4  // 4 attaccanti
		};
		
		const freeAgents = [];
		
		// Genera portieri
		for (let i = 0; i < distribution.GK; i++) {
			freeAgents.push(window.makePlayer(['GK'], 'Free Agent'));
		}
		
		// Genera difensori
		const defRoles = ['DR', 'DC', 'DL'];
		for (let i = 0; i < distribution.DEF; i++) {
			const role = defRoles[i % defRoles.length];
			freeAgents.push(window.makePlayer(window.addSecondaryRole(role), 'Free Agent'));
		}
		
		// Genera centrocampisti
		const midRoles = ['MR', 'MC', 'ML'];
		for (let i = 0; i < distribution.MID; i++) {
			const role = midRoles[i % midRoles.length];
			freeAgents.push(window.makePlayer(window.addSecondaryRole(role), 'Free Agent'));
		}
		
		// Genera attaccanti
		const attRoles = ['FR', 'ST', 'FL'];
		for (let i = 0; i < distribution.ATT; i++) {
			const role = attRoles[i % attRoles.length];
			freeAgents.push(window.makePlayer(window.addSecondaryRole(role), 'Free Agent'));
		}
		
		console.log(`Generated ${freeAgents.length} free agents`);
		return freeAgents;
	},
	
    processFreeAgentOffer: function(player, wage, contractLength) {
        // Inizializza negotiations se non esiste
        if (!STATE.negotiations) {
            STATE.negotiations = {
                pendingOffers: [],
                rejectedPlayers: new Set(),
                attemptsCount: {}
            };
        }

        const myTeam = getMyTeam();
        
        // Crea l'offerta
        const offer = {
            playerId: player.id,
            playerName: player.nome,
            type: 'freeAgent',
            wage: wage,
            contractLength: contractLength,
            team: myTeam.name,
            deadline: STATE.league.week + 1
        };

        // Aggiungi l'offerta alle trattative pendenti
        STATE.negotiations.pendingOffers.push(offer);

        // Aggiorna la vista
        window.marketDisplay.updateFreeAgentsList();
        
        window.marketUtils.showNotification('Offer submitted. The player will respond after the next match.');('Offer submitted. The player will respond after the next match.');
        saveState();
    },	
	
	
    signFreeAgent: function(playerId) {
        const player = STATE.freeAgents.find(p => p.id === playerId);
        if (!player) return;
		
        window.marketUI.showOfferDialog(player, 'freeAgent');
	},
	
	signFreeAgentContract: function(player, wage, contractLength, team) {
		console.log('Processing free agent contract:', {
			player: player.nome,
			wage: wage,
			contractLength: contractLength,
			team: team.name
		});

		try {
			// Rimuovi il giocatore dai free agents
			STATE.freeAgents = STATE.freeAgents.filter(p => p.id !== player.id);
			
			// Finalizza il trasferimento
			const success = window.marketTransfers.finalizePlayerTransfer(player, team, wage, contractLength);
			
			if (success) {
				// Genera un sostituto dello stesso ruolo primario
				const replacementPlayer = window.makePlayer(
					window.addSecondaryRole(player.roles[0]), 
					'Free Agent'
				);
				
				console.log('Generated replacement free agent:', replacementPlayer.nome);
				
				// Aggiungi il nuovo giocatore alla lista dei free agent
				STATE.freeAgents.push(replacementPlayer);
				
				// Aggiorna le viste
				window.marketDisplay.updateFreeAgentsList();
				window.marketDisplay.updateSquadLimits();
				
				// Mostra notifica
				window.marketUtils.showNotification(
					`${player.nome} has joined your team! A new free agent has become available.`
				);
				
				saveState();
			}
			
			return success;
		} catch (error) {
			console.error('Error in signFreeAgentContract:', error);
			window.marketUtils.showNotification('Error completing free agent signing');
			return false;
		}
	}
	
	
	
};

Object.assign(window, {
    marketAgents: window.marketAgents,
    generateFreeAgents: window.marketAgents.generateFreeAgents.bind(window.marketAgents),
    signFreeAgent: window.marketAgents.signFreeAgent.bind(window.marketAgents),
    signFreeAgentContract: window.marketAgents.signFreeAgentContract.bind(window.marketAgents)
});
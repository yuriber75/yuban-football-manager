// marketNegotiations .js
console.log('Loading marketNegotiations .js...');

if (!window.playerGenerator || !window.STATE || !window.GAME_CONSTANTS) {
	console.error('Required dependencies not loaded for marketNegotiations ');
	throw new Error('Missing dependencies');
}

window.marketNegotiations  = {
	
	processOffer: function(player, type, amount, wage, contractLength) {
		const myTeam = getMyTeam();
		
		// Inizializza STATE.negotiations se non esiste
		if (!STATE.negotiations) {
			STATE.negotiations = {
				pendingOffers: [],
				rejectedPlayers: new Set(),
				attemptsCount: {}
			};
		}

		console.log('Processing offer:', {
			player: player.nome,
			type,
			amount,
			wage,
			contractLength,
			currentWeek: STATE.league.week
		});
		
		if (!marketValidation.validateOffer(player, type, amount, wage, myTeam)) {
			return false;
		}

		if (STATE.negotiations.rejectedPlayers.has(player.id)) {
			window.marketUtils.showNotification('Offer submitted. The player will respond after the next match.');('This player is no longer interested in negotiations.');
			return false;
		}

		// Crea l'offerta
		const offer = {
			playerId: player.id,
			playerName: player.nome,
			type: type,
			amount: amount,
			wage: wage,
			contractLength: contractLength,
			team: myTeam.name,
			deadline: STATE.league.week + 1
		};

		console.log('Created offer:', offer);

		// Per trasferimenti normali, aggiungi l'offerta alle trattative pendenti
		STATE.negotiations.pendingOffers.push(offer);
		
		// Genera e aggiungi offerte competitive
		const competingOffers = marketUtils.generateCompetingOffers(player);
		competingOffers.forEach(o => STATE.negotiations.pendingOffers.push(o));

		console.log('Current negotiations state:', {
			pendingOffers: STATE.negotiations.pendingOffers,
			currentWeek: STATE.league.week,
			nextWeek: STATE.league.week + 1
		});
		
		window.marketDisplay.updateTransferList();
		window.marketUtils.showNotification('Offer submitted. The player will respond after the next match.');('Offer submitted. The player will respond after the next match.');
		saveState();
		return true;
	},	
	
resolveNegotiations: function() {
    if (!STATE.negotiations?.pendingOffers?.length) {
        console.log('No pending negotiations to resolve');
        return;
    }

    const currentWeek = STATE.league.week;
    console.log('Starting negotiations resolution for week:', currentWeek, {
        totalOffers: STATE.negotiations.pendingOffers.length,
        offers: STATE.negotiations.pendingOffers
    });

    // Filtra le offerte per questa settimana
    const currentWeekOffers = STATE.negotiations.pendingOffers.filter(
        offer => offer.deadline === currentWeek
    );

    console.log('Current week offers:', {
        weekOffers: currentWeekOffers.length,
        currentWeek: currentWeek,
        offers: currentWeekOffers
    });

    if (currentWeekOffers.length === 0) {
        console.log('No offers to process this week');
        return;
    }

    // Raggruppa le offerte per giocatore e prendi solo la migliore
    const bestOffers = this.filterBestOffers(currentWeekOffers);
    console.log('Best offers after filtering:', bestOffers);
    
    const responses = [];

    // Processa le migliori offerte
    bestOffers.forEach(offer => {
        const player = marketUtils.findPlayerById(offer.playerId);
        if (!player) {
            console.warn('Player not found for offer:', offer);
            return;
        }

        const chance = this.calculateAcceptanceChance(player, offer);
        const accepted = Math.random() < chance;
        
        console.log('Processing offer:', {
            player: player.nome,
            team: offer.team,
            chance: chance,
            accepted: accepted
        });

        if (!STATE.negotiations.attemptsCount[player.id]) {
            STATE.negotiations.attemptsCount[player.id] = 0;
        }
        STATE.negotiations.attemptsCount[player.id]++;

        responses.push({
            player: player,
            offer: offer,
            accepted: accepted,
            attempts: STATE.negotiations.attemptsCount[player.id],
            needsConfirmation: player.club === getMyTeam().name && 
                             offer.team !== getMyTeam().name
        });
    });

    // Ordina le risposte (prima quelle che richiedono conferma)
    responses.sort((a, b) => {
        if (a.needsConfirmation && !b.needsConfirmation) return -1;
        if (!a.needsConfirmation && b.needsConfirmation) return 1;
        return 0;
    });

    console.log(`Processing ${responses.length} filtered responses:`, responses);

    // Mostra le risposte
    window.marketModals.showResponses(responses, () => {
        console.log('All responses processed, finalizing...');
        this.finalizeNegotiationsProcess();
        window.marketDisplay.updateTransferList();
        window.marketDisplay.updateSquadLimits();
        saveState();
    });
},

    filterBestOffers: function(offers) {
        // Raggruppa le offerte per giocatore
        const offersByPlayer = offers.reduce((acc, offer) => {
            if (!acc[offer.playerId]) {
                acc[offer.playerId] = [];
            }
            acc[offer.playerId].push(offer);
            return acc;
        }, {});

        // Per ogni giocatore, seleziona l'offerta migliore
        return Object.values(offersByPlayer).map(playerOffers => {
            return playerOffers.reduce((best, current) => {
                if (!best) return current;
                return this.compareOffers(best, current) > 0 ? best : current;
            });
        });
    },

    compareOffers: function(offer1, offer2) {
        // Calcola un punteggio per ogni offerta
        const getOfferScore = (offer) => {
            let score = 0;
            
            // Valore del trasferimento (40%)
            if (offer.amount) {
                score += offer.amount * 0.4;
            }
            
            // Stipendio totale (30%)
            score += (offer.wage * offer.contractLength) * 0.3;
            
            // Durata contratto (20%)
            score += offer.contractLength * 0.2;
            
            // Bonus per offerte di squadre ricche (10%)
            const richTeams = ["PSG", "Manchester City", "Real Madrid", "Bayern Munich"];
            if (richTeams.includes(offer.team)) {
                score *= 1.1;
            }
            
            return score;
        };

        return getOfferScore(offer1) - getOfferScore(offer2);
    },
	
	finalizeNegotiationsProcess: function() {
		// Rimuovi tutte le offerte processate
		STATE.negotiations.pendingOffers = STATE.negotiations.pendingOffers.filter(
			o => o.deadline !== STATE.league.week
		);

		// Aggiorna le viste
		window.marketUI.updateMarketView();
		window.marketDisplay.updateTransferList();
		window.marketDisplay.updateFreeAgentsList();
		window.marketDisplay.updateSquadLimits();

		console.log('Negotiations resolution completed');
		console.log('Remaining pending offers:', STATE.negotiations.pendingOffers.length);
		
		saveState();
	},

	calculateAcceptanceChance: function(player, offer) {
		let chance = 0.5; // Base 50%
		
		if (offer.type === 'transfer') {
			// Per i trasferimenti normali
			// Valutazione stipendio (30% dell'impatto)
			const wageRatio = offer.wage / player.wage;
			if (wageRatio >= 1.2) chance += 0.15;
			else if (wageRatio >= 1.1) chance += 0.10;
			else if (wageRatio >= 1.0) chance += 0.05;
			else if (wageRatio < 0.9) chance -= 0.15;
			else if (wageRatio < 0.95) chance -= 0.10;

			// Valutazione prezzo cartellino (40% dell'impatto)
			const valueRatio = offer.amount / player.value;
			if (valueRatio >= 1.3) chance += 0.20;
			else if (valueRatio >= 1.15) chance += 0.15;
			else if (valueRatio >= 1.0) chance += 0.10;
			else if (valueRatio < 0.8) chance -= 0.20;
			else if (valueRatio < 0.9) chance -= 0.15;

			// Bonus durata contratto (15% dell'impatto)
			if (offer.contractLength >= 4) chance += 0.10;
			else if (offer.contractLength >= 3) chance += 0.05;

		} else {
			// Per i free agent
			// Valutazione stipendio (60% dell'impatto)
			const wageRatio = offer.wage / player.wage;
			if (wageRatio >= 1.2) chance += 0.30;      // Bonus maggiore per stipendio alto
			else if (wageRatio >= 1.1) chance += 0.20;
			else if (wageRatio >= 1.0) chance += 0.10;
			else if (wageRatio < 0.9) chance -= 0.30;
			else if (wageRatio < 0.95) chance -= 0.20;

			// Bonus durata contratto (25% dell'impatto)
			// I free agent apprezzano di più i contratti lunghi
			if (offer.contractLength >= 4) chance += 0.15;
			else if (offer.contractLength >= 3) chance += 0.10;
			else if (offer.contractLength >= 2) chance += 0.05;
		}

		// Fattori comuni (15% dell'impatto)
		// Età del giocatore
		if (player.age >= 30) {
			// Giocatori più vecchi sono più propensi ad accettare
			chance += 0.05;
			// Specialmente se sono free agent
			if (offer.type === 'freeAgent') chance += 0.05;
		}

		// Log dettagliato per debug
		console.log('Offer evaluation:', {
			player: player.nome,
			type: offer.type,
			wageRatio: offer.wage / player.wage,
			valueRatio: offer.type === 'transfer' ? offer.amount / player.value : 'N/A',
			contractLength: offer.contractLength,
			age: player.age,
			finalChance: Math.min(Math.max(chance, 0.1), 0.9)
		});

		// Limita tra 0.1 (10%) e 0.9 (90%)
		return Math.min(Math.max(chance, 0.1), 0.9);
	},
};

Object.assign(window, {
    marketNegotiations: window.marketNegotiations,
    processOffer: window.marketNegotiations.processOffer.bind(window.marketNegotiations),
	resolveNegotiations: window.marketNegotiations.resolveNegotiations.bind(window.marketNegotiations),
	finalizeNegotiationsProcess: window.marketNegotiations.finalizeNegotiationsProcess.bind(window.marketNegotiations),
	calculateAcceptanceChance: window.marketNegotiations.calculateAcceptanceChance.bind(window.marketNegotiations)
});
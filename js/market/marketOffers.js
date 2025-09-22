// marketOffers.js
console.log('Loading marketOffers.js...');

if (!window.playerGenerator || !window.STATE || !window.GAME_CONSTANTS) {
	console.error('Required dependencies not loaded for marketOffers');
	throw new Error('Missing dependencies');
}

window.marketOffers = {
	generateExternalOffer: function(player) {
		// Probabilità base di ricevere un'offerta esterna (40%)
		let baseChance = 0.4;
		
		// Modifica la probabilità in base a vari fattori
		// Età
		if (player.age < 24) baseChance += 0.1;        // Giovani più attraenti
		else if (player.age > 30) baseChance -= 0.15;  // Veterani meno attraenti
		
		// Overall
		if (player.overall >= 85) baseChance += 0.2;
		else if (player.overall >= 80) baseChance += 0.1;
		else if (player.overall < 70) baseChance -= 0.1;
		
		// Ruolo (alcuni ruoli sono più richiesti)
		const roleModifier = {
			'ST': 0.1,    // Attaccanti più richiesti
			'MC': 0.05,   // Centrocampisti abbastanza richiesti
			'GK': -0.05   // Portieri meno richiesti
		}[player.roles[0]] || 0;
		
		baseChance += roleModifier;
		
		// Genera offerta solo se supera la probabilità
		if (Math.random() > baseChance) return null;
		
		// Genera nome squadra esterna casuale
		const externalTeams = [
			{ name: "PSG", wealth: "rich" },
			{ name: "Manchester City", wealth: "rich" },
			{ name: "Real Madrid", wealth: "rich" },
			{ name: "Bayern Munich", wealth: "rich" },
			{ name: "Newcastle", wealth: "rich" },
			{ name: "Aston Villa", wealth: "medium" },
			{ name: "Lyon", wealth: "medium" },
			{ name: "Sevilla", wealth: "medium" },
			{ name: "Porto", wealth: "medium" },
			{ name: "Ajax", wealth: "medium" },
			{ name: "Celtic", wealth: "modest" },
			{ name: "Fenerbahce", wealth: "modest" },
			{ name: "Anderlecht", wealth: "modest" },
			{ name: "Sporting CP", wealth: "modest" }
		];
		
		const bidder = marketUtils.pick(externalTeams);
		
		// Calcola l'offerta base
		let offerAmount = player.value;
		
		// Modifica l'offerta in base alla ricchezza del club
		const wealthMultiplier = {
			"rich": 1.1 + Math.random() * 0.3,     // 110-140% del valore
			"medium": 0.9 + Math.random() * 0.2,    // 90-110% del valore
			"modest": 0.7 + Math.random() * 0.2     // 70-90% del valore
		}[bidder.wealth];
		
		offerAmount *= wealthMultiplier;
		
		// Aggiungi variazione casuale (-10% to +10%)
		offerAmount *= (0.9 + Math.random() * 0.2);
		
		// Arrotonda a una cifra ragionevole
		offerAmount = Math.round(offerAmount * 10) / 10;
		
		// Calcola stipendio offerto
		let wageOffer = player.wage;
		wageOffer *= wealthMultiplier;
		wageOffer *= (1 + Math.random() * 0.3); // Offre 100-130% dello stipendio attuale
		
		// Durata contratto basata sull'età
		let contractLength;
		if (player.age <= 23) contractLength = 4 + Math.floor(Math.random() * 2);      // 4-5 anni
		else if (player.age <= 28) contractLength = 3 + Math.floor(Math.random() * 2);  // 3-4 anni
		else if (player.age <= 32) contractLength = 2 + Math.floor(Math.random() * 2);  // 2-3 anni
		else contractLength = 1 + Math.floor(Math.random() * 2);                        // 1-2 anni
		
		const offer = {
			playerId: player.id,
			playerName: player.nome,
			type: 'transfer',
			amount: offerAmount,
			wage: wageOffer,
			contractLength: contractLength,
			team: bidder.name,
			deadline: STATE.league.week + 1,
			isExternal: true
		};
		
		console.log(`External offer generated from ${bidder.name} for ${player.nome}:`, offer);
		return offer;
	},
	
	generateTeamOffer: function(team, player) {
		// Base value con variazione
		let offerAmount = player.value * (0.8 + Math.random() * 0.4); // 80-120% del valore
		
		// Bonus per giocatori giovani e di talento
		if (player.age < 23 && player.overall > 75) {
			offerAmount *= (1.1 + Math.random() * 0.2); // +10-30%
		}
		
		// Modifica in base al budget disponibile
		const budgetRatio = team.finances.transferBudget / offerAmount;
		if (budgetRatio > 3) {
			offerAmount *= (1.1 + Math.random() * 0.2); // +10-30% se il budget è molto alto
		}
		
		// Arrotonda
		offerAmount = Math.round(offerAmount * 10) / 10;
		
		// Offerta stipendio
		let wageOffer = player.wage * (1 + Math.random() * 0.3); // +0-30%
		
		// Durata contratto
		let contractLength;
		if (player.age <= 23) contractLength = 4 + Math.floor(Math.random() * 2);
		else if (player.age <= 28) contractLength = 3 + Math.floor(Math.random() * 2);
		else if (player.age <= 32) contractLength = 2 + Math.floor(Math.random() * 2);
		else contractLength = 1 + Math.floor(Math.random() * 2);
		
		const offer = {
			playerId: player.id,
			playerName: player.nome,
			type: 'transfer',
			amount: offerAmount,
			wage: wageOffer,
			contractLength: contractLength,
			team: team.name,
			deadline: STATE.league.week + 1
		};

		console.log('Generated offer:', {
			player: player.nome,
			team: team.name,
			currentWeek: STATE.league.week,
			deadline: offer.deadline,
			offer: offer
		});

		return offer;
	},	
	
	isTeamInterested: function(team, player) {
		// Verifica budget
		const canAffordTransfer = team.finances.transferBudget >= player.value;
		const canAffordWages = team.finances.wagesBudget >= (team.players.reduce((sum, p) => sum + p.wage, 0) + player.wage);
		
		if (!canAffordTransfer || !canAffordWages) {
			return false;
		}
		
		// Verifica necessità ruolo
		const roleCount = marketUtils.getRoleCount(team);
		const primaryRole = player.roles[0].charAt(0);
		
		let needsRole = false;
		switch(primaryRole) {
			case 'G': 
            needsRole = roleCount.GK < GAME_CONSTANTS.FINANCE.MAX_PER_ROLE.GK;
            break;
			case 'D':
            needsRole = roleCount.DEF < GAME_CONSTANTS.FINANCE.MAX_PER_ROLE.DEF;
            break;
			case 'M':
            needsRole = roleCount.MID < GAME_CONSTANTS.FINANCE.MAX_PER_ROLE.MID;
            break;
			case 'S':
			case 'F':
            needsRole = roleCount.ATT < GAME_CONSTANTS.FINANCE.MAX_PER_ROLE.ATT;
            break;
		}
		
		if (!needsRole) {
			return false;
		}
		
		// Verifica qualità giocatore
		const isUpgrade = this.isPlayerUpgrade(team, player);
		
		return isUpgrade;
	},
	
	isPlayerUpgrade: function(team, player) {
		const similarPlayers = team.players.filter(p => 
			p.roles.some(r => player.roles.includes(r))
		);
		
		// Se non ci sono giocatori simili, è un upgrade
		if (similarPlayers.length === 0) return true;
		
		// Calcola l'overall medio dei giocatori simili
		const avgOverall = similarPlayers.reduce((sum, p) => sum + p.overall, 0) / similarPlayers.length;
		
		// Il giocatore è considerato un upgrade se è almeno 2 punti sopra la media
		return player.overall > (avgOverall + 2);
	}
	
};

Object.assign(window, {
    marketOffers: window.marketOffers,
    generateExternalOffer: window.marketOffers.generateExternalOffer.bind(window.marketOffers),
    generateTeamOffer: window.marketOffers.generateTeamOffer.bind(window.marketOffers),
    isTeamInterested: window.marketOffers.isTeamInterested.bind(window.marketOffers),
    isPlayerUpgrade: window.marketOffers.isPlayerUpgrade.bind(window.marketOffers)
});
// marketValidation .js
console.log('Loading marketValidation .js...');

if (!window.playerGenerator || !window.STATE || !window.GAME_CONSTANTS) {
	console.error('Required dependencies not loaded for marketUI');
	throw new Error('Missing dependencies');
}

window.marketValidation  = {
	
	validateOffer: function(player, type, amount, wage, team) {
		const F = GAME_CONSTANTS.FINANCE;

		// Verifica se i budget sono già negativi
		if (team.finances.transferBudget < 0) {
			window.marketUtils.showNotification('Transfer budget is already negative!');
			return false;
		}

		// Calcola stipendi attuali e offerte pendenti
		const currentWages = team.players.reduce((sum, p) => sum + p.wage, 0);
		const pendingTransfers = STATE.negotiations?.pendingOffers?.filter(o => 
			o.team === team.name && 
			!o.isCompleted
		) || [];
		
		const totalPendingCosts = pendingTransfers.reduce((sum, o) => 
			sum + (o.type === 'transfer' ? o.amount : 0), 0);
		const totalPendingWages = pendingTransfers.reduce((sum, o) => sum + o.wage, 0);

		// Verifica budget considerando offerte pendenti
		if (type === 'transfer' && (amount + totalPendingCosts) > team.finances.transferBudget) {
			window.marketUtils.showNotification('Insufficient transfer budget considering pending offers!');
			return false;
		}

		if ((currentWages + wage + totalPendingWages) > team.finances.wagesBudget) {
			window.marketUtils.showNotification('Cannot afford wages considering pending offers!');
			return false;
		}

		// Verifica limiti stipendio
		const weeklyWage = Math.round((wage * 1000000) / F.WEEKS_PER_SEASON);
		const currentWeeklyWage = Math.round((player.wage * 1000000) / F.WEEKS_PER_SEASON);

		if (weeklyWage > (F.MAX_PLAYER_WAGE * 1000000)) {
			window.marketUtils.showNotification(
				`Weekly wage cannot exceed €${Math.round(F.MAX_PLAYER_WAGE * 1000000).toLocaleString('it-IT')}!`
			);
			return false;
		}

		if (weeklyWage < (F.MIN_PLAYER_WAGE * 1000000)) {
			window.marketUtils.showNotification(
				`Weekly wage cannot be less than €${Math.round(F.MIN_PLAYER_WAGE * 1000000).toLocaleString('it-IT')}!`
			);
			return false;
		}

		if (weeklyWage < currentWeeklyWage * 0.7) {
			window.marketUtils.showNotification(
				`Wage offer cannot be less than €${Math.round(currentWeeklyWage * 0.7).toLocaleString('it-IT')} per week!`
			);
			return false;
		}

		// Verifica valore minimo per trasferimento
		if (type === 'transfer' && amount < player.value * 0.5) {
			window.marketUtils.showNotification('Offer is too low compared to player value!');
			return false;
		}

		// Verifica limiti di ruolo
		const roleCount = marketUtils.getRoleCount(team);
		const primaryRole = player.roles[0].charAt(0);
		
		if (primaryRole === 'G' && (roleCount.GK || 0) >= F.MAX_PER_ROLE.GK) {
			window.marketUtils.showNotification('Maximum number of goalkeepers reached!');
			return false;
		}
		if (['D'].includes(primaryRole) && (roleCount.DEF || 0) >= F.MAX_PER_ROLE.DEF) {
			window.marketUtils.showNotification('Maximum number of defenders reached!');
			return false;
		}
		if (['M'].includes(primaryRole) && (roleCount.MID || 0) >= F.MAX_PER_ROLE.MID) {
			window.marketUtils.showNotification('Maximum number of midfielders reached!');
			return false;
		}
		if (['S', 'F'].includes(primaryRole) && (roleCount.ATT || 0) >= F.MAX_PER_ROLE.ATT) {
			window.marketUtils.showNotification('Maximum number of forwards reached!');
			return false;
		}

		// Verifica dimensione massima squadra
		if (team.players.length >= F.MAX_SQUAD_SIZE) {
			window.marketUtils.showNotification('Maximum squad size reached!');
			return false;
		}

		return true;
	},
	

	canTeamMakeOffer: function(team, player) {
		return this.teamNeedsPlayer(team, player) && 
			   this.canTeamAfford(team, player);
	},
	
	canTeamAfford: function(team, player) {
		if (!team.finances) return false;

		// Verifica budget stipendi
		const currentWages = team.players.reduce((sum, p) => sum + p.wage, 0);
		const canAffordWages = (currentWages + player.wage) <= team.finances.wagesBudget;

		// Verifica budget trasferimenti
		const canAffordTransfer = player.value ? 
			team.finances.transferBudget >= player.value : true;

		return canAffordWages && canAffordTransfer;
	},	
	
	teamNeedsPlayer: function(team, player) {
		if (!team.tactics || !team.tactics.formation) return true;

		// Controlla il numero di giocatori per ruolo
		const roleCount = marketUtils.getRoleCount(team);
		const primaryRole = player.roles[0].charAt(0);

		// Limiti per ruolo
		const F = GAME_CONSTANTS.FINANCE;
		
		switch(primaryRole) {
			case 'G':
				return (roleCount.GK || 0) < F.MAX_PER_ROLE.GK;
			case 'D':
				return (roleCount.DEF || 0) < F.MAX_PER_ROLE.DEF;
			case 'M':
				return (roleCount.MID || 0) < F.MAX_PER_ROLE.MID;
			case 'S':
			case 'F':
				return (roleCount.ATT || 0) < F.MAX_PER_ROLE.ATT;
			default:
				return false;
		}
	},
	
	canListPlayerForSale: function(player, team) {
		// Verifica i limiti della rosa
		const roleCount = marketUtils.getRoleCount(team);
		const primaryRole = player.roles[0].charAt(0);
		
		// Conta i giocatori già in vendita per ogni ruolo
		const listedPlayers = team.finances.playersForSale || [];
		const listedCount = {
			GK: listedPlayers.filter(p => p.roles[0].charAt(0) === 'G').length,
			DEF: listedPlayers.filter(p => p.roles[0].charAt(0) === 'D').length,
			MID: listedPlayers.filter(p => p.roles[0].charAt(0) === 'M').length,
			ATT: listedPlayers.filter(p => ['S', 'F'].includes(p.roles[0].charAt(0))).length
		};
		
		// Verifica dimensione minima squadra
		if (team.players.length - listedPlayers.length <= GAME_CONSTANTS.FINANCE.MIN_SQUAD_SIZE) {
			window.marketUtils.showNotification('Cannot list player: Minimum squad size reached');
			return false;
		}
		
		// Verifica minimi per ruolo considerando i giocatori già in vendita
		if (primaryRole === 'G' && (roleCount.GK - listedCount.GK - 1) < GAME_CONSTANTS.FINANCE.MIN_GOALKEEPER) {
			window.marketUtils.showNotification('Cannot list player: Minimum number of goalkeepers needed');
			return false;
		}
		if (primaryRole === 'D' && (roleCount.DEF - listedCount.DEF - 1) < GAME_CONSTANTS.FINANCE.MIN_DEFENDER) {
			window.marketUtils.showNotification('Cannot list player: Minimum number of defenders needed');
			return false;
		}
		if (primaryRole === 'M' && (roleCount.MID - listedCount.MID - 1) < GAME_CONSTANTS.FINANCE.MIN_MIDFIELDER) {
			window.marketUtils.showNotification('Cannot list player: Minimum number of midfielders needed');
			return false;
		}
		if (['S', 'F'].includes(primaryRole) && (roleCount.ATT - listedCount.ATT - 1) < GAME_CONSTANTS.FINANCE.MIN_FORWARD) {
			window.marketUtils.showNotification('Cannot list player: Minimum number of forwards needed');
			return false;
		}
		
		// Verifica numero massimo di giocatori in vendita
		if (listedPlayers.length >= GAME_CONSTANTS.FINANCE.MAX_PLAYERS_FOR_SALE) {
			window.marketUtils.showNotification('Cannot list player: Maximum number of players for sale reached');
			return false;
		}

		return true;
	},
	
};

Object.assign(window, {
    marketValidation : window.marketValidation ,
    validateOffer: window.marketValidation.validateOffer.bind(window.marketValidation),
    canTeamMakeOffer: window.marketValidation.canTeamMakeOffer.bind(window.marketValidation),
	canTeamAfford: window.marketValidation.canTeamAfford.bind(window.marketValidation),
	canListPlayerForSale: window.marketValidation.canListPlayerForSale.bind(window.marketValidation),	
    teamNeedsPlayer: window.marketValidation.teamNeedsPlayer.bind(window.marketValidation)
});
// marketUtils.js
console.log('Loading marketUtils.js...');

if (!window.playerGenerator || !window.STATE || !window.GAME_CONSTANTS) {
	console.error('Required dependencies not loaded for marketUtils');
	throw new Error('Missing dependencies');
}


window.marketUtils = {
	
    findPlayerInMarket: function(playerId) {
        if (!playerId) return null;
        
        let player = null;
        STATE.teams.some(team => {
            if (team?.name !== STATE.teamName && team?.finances?.playersForSale) {
                player = team.finances.playersForSale.find(p => p?.id === playerId);
                if (player) {
                    player.currentTeam = team;
                    return true;
				}
			}
            return false;
		});
        return player;
	},
    
    findSellingTeam: function(player) {
        if (!player?.id) return null;
        return STATE.teams.find(t => 
            t?.finances?.playersForSale?.some(p => p?.id === player.id)
		);
	},
	
    canMakeOffer: function(player) {
        if (!player) return false;
        const myTeam = getMyTeam();
        if (!myTeam?.finances) return false;
        
        return myTeam.finances.transferBudget >= player.value && 
		this.canAffordWages(myTeam, player.wage);
	},
	
    canAffordWages: function(team, wage) {
        if (!team?.players || !team?.finances?.wagesBudget || !wage) return false;
        
        const currentWages = team.players.reduce((sum, p) => sum + (p?.wage || 0), 0);
        return (currentWages + wage) <= team.finances.wagesBudget;
	},
	
    
    getRoleCount: function(team) {
        if (!team?.players) return { GK: 0, DEF: 0, MID: 0, ATT: 0 };
        
        return team.players.reduce((acc, p) => {
            if (!p?.roles?.[0]) return acc;
            
            const primaryRole = p.roles[0];
            if (primaryRole === 'GK') {
                acc.GK = (acc.GK || 0) + 1;
				} else if (['DC', 'DR', 'DL'].includes(primaryRole)) {
                acc.DEF = (acc.DEF || 0) + 1;
				} else if (['MC', 'MR', 'ML'].includes(primaryRole)) {
                acc.MID = (acc.MID || 0) + 1;
				} else if (['ST', 'FR', 'FL'].includes(primaryRole)) {
                acc.ATT = (acc.ATT || 0) + 1;
			}
            return acc;
		}, { GK: 0, DEF: 0, MID: 0, ATT: 0 });
	},
	
    isPlayerStarting: function(team, player) {
        if (!team?.tactics?.starters || !player?.id) return false;
        return team.tactics.starters.includes(player.id);
	},
	
	canSignPlayer: function(player) {
        const myTeam = getMyTeam();
        if (!myTeam) return false;
		
        // Verifica budget stipendi
        const weeklyWageInK = Math.round(player.wage / GAME_CONSTANTS.FINANCE.WEEKS_PER_SEASON * 1000);
        const availableWageBudget = Math.round((myTeam.finances.wagesBudget / GAME_CONSTANTS.FINANCE.WEEKS_PER_SEASON * 1000) - 
		(myTeam.players.reduce((sum, p) => sum + p.wage, 0) / GAME_CONSTANTS.FINANCE.WEEKS_PER_SEASON * 1000));
		
        return weeklyWageInK <= availableWageBudget;
	},
	
	
	
	showConfirmationModal: function(player, offer, onConfirm, onCancel = null) {
		this.closeAllModals();
		
		const transferCheck = this.canCompleteTransfer(offer);
		if (!transferCheck.canComplete) {
			this.showNotification(transferCheck.reason, () => {
				if (onCancel) onCancel();
			});
			return;
		}
		
		const weeklyWage = Math.round((offer.wage * 1000000) / GAME_CONSTANTS.FINANCE.WEEKS_PER_SEASON);
		const transferFee = offer.type === 'transfer' ? `€${offer.amount.toFixed(2)}M` : 'Free Transfer';
		
		const modal = document.createElement('div');
		modal.className = 'notification-modal confirmation-modal';
		modal.setAttribute('data-modal-type', 'confirmation');
		
		const overlay = document.createElement('div');
		overlay.className = 'modal-overlay';
		overlay.setAttribute('data-modal-type', 'confirmation');
		
		// Scegli il template appropriato
		const templateId = player.club === getMyTeam().name ? 'incomingOfferTemplate' : 'transferConfirmationTemplate';
		const template = document.getElementById(templateId);
		const content = template.content.cloneNode(true);
		
		// Popola i dati
		content.querySelector('.player-name').textContent = player.nome;
		content.querySelector('.player-age').textContent = player.age;
		content.querySelector('.player-position').textContent = player.roles.join(', ');
		content.querySelector('.player-overall').textContent = player.overall;
		content.querySelector('.transfer-fee').textContent = transferFee;
		content.querySelector('.weekly-wage').textContent = `€${weeklyWage.toLocaleString('it-IT')}`;
		content.querySelector('.contract-length').textContent = `${offer.contractLength} years`;
		
		// Aggiungi campi extra per offerte in entrata
		if (templateId === 'incomingOfferTemplate') {
			content.querySelector('.player-value').textContent = `€${player.value.toFixed(2)}M`;
			content.querySelector('.offering-team').textContent = offer.team;
		}
		
		modal.appendChild(content);
		document.body.appendChild(overlay);
		document.body.appendChild(modal);
		
		// Event listeners
		const closeModal = () => {
			if (document.body.contains(overlay)) document.body.removeChild(overlay);
			if (document.body.contains(modal)) document.body.removeChild(modal);
		};
		
		modal.querySelector('.btn-confirm').addEventListener('click', () => {
			closeModal();
			onConfirm();
		});
		
		modal.querySelector('.btn-cancel').addEventListener('click', () => {
			closeModal();
			this.showNotification('Transfer cancelled', () => {
				if (onCancel) onCancel();
			});
		});
	},
	
	showConfirmationDialog: function(message, onAccept, onReject) {
		const dialog = document.createElement('div');
		dialog.className = 'confirmation-dialog';
		dialog.innerHTML = `
        <div class="confirmation-content">
		<p>${message}</p>
		<div class="confirmation-buttons">
		<button class="accept-btn">Accept</button>
		<button class="reject-btn">Reject</button>
		</div>
        </div>
		`;
		
		dialog.querySelector('.accept-btn').onclick = () => {
			document.body.removeChild(dialog);
			onAccept();
		};
		
		dialog.querySelector('.reject-btn').onclick = () => {
			document.body.removeChild(dialog);
			onReject();
		};
		
		document.body.appendChild(dialog);
	},
	
	// Aggiungi questa nuova funzione
	closeAllModals: function() {
		// Rimuovi tutti i modal e overlay esistenti
		document.querySelectorAll('.modal-overlay, .notification-modal').forEach(element => {
			if (document.body.contains(element)) {
				document.body.removeChild(element);
			}
		});
	},
	
	
	showNotification: function(message, onClose) {
		this.closeAllModals();
		
		const overlay = document.createElement('div');
		overlay.className = 'modal-overlay';
		overlay.setAttribute('data-modal-type', 'notification');
		
		const modal = document.createElement('div');
		modal.className = 'notification-modal';
		modal.setAttribute('data-modal-type', 'notification');
		
		modal.innerHTML = `
        <div class="message">${message}</div>
        <button class="btn-ok">OK</button>
		`;
		
		document.body.appendChild(overlay);
		document.body.appendChild(modal);
		
		const closeModal = (e) => {
			if (e) {
				e.preventDefault();
				e.stopPropagation();
			}
			
			if (document.body.contains(overlay)) {
				document.body.removeChild(overlay);
			}
			if (document.body.contains(modal)) {
				document.body.removeChild(modal);
			}
			
			if (onClose) {
				onClose();
			}
		};
		
		modal.addEventListener('click', (e) => e.stopPropagation());
		modal.querySelector('.btn-ok').addEventListener('click', closeModal, { once: true });
		overlay.addEventListener('click', closeModal, { once: true });
	},
	
	canCompleteTransfer: function(offer, team = getMyTeam()) {
		// Verifica se il budget è già negativo
		if (team.finances.transferBudget < 0) {
			return {
				canComplete: false,
				reason: 'Transfer budget is already negative'
			};
		}
		
		const currentWages = team.players.reduce((sum, p) => sum + p.wage, 0);
		
		// Verifica budget stipendi corrente + questa offerta
		const totalWagesWithOffer = currentWages + offer.wage;
		if (totalWagesWithOffer > team.finances.wagesBudget) {
			return {
				canComplete: false,
				reason: `Cannot afford wages (Available: €${(team.finances.wagesBudget - currentWages).toFixed(2)}M, Required: €${offer.wage.toFixed(2)}M)`
			};
		}
		
		// Verifica se abbiamo abbastanza budget per il trasferimento
		if (offer.type === 'transfer' && offer.amount > team.finances.transferBudget) {
			return {
				canComplete: false,
				reason: `Insufficient transfer budget (Available: €${team.finances.transferBudget.toFixed(2)}M)`
			};
		}
		
		// Verifica dimensione squadra
		if (team.players.length >= GAME_CONSTANTS.FINANCE.MAX_SQUAD_SIZE) {
			return {
				canComplete: false,
				reason: 'Squad size limit reached'
			};
		}
		
		return {
			canComplete: true,
			reason: null
		};
	},
	
	
	generateCompetingOffers: function(player) {
		const offers = [];
		const maxCompetingOffers = 2;
		let competingTeams = 0;
		
		STATE.teams.forEach(team => {
			if (competingTeams >= maxCompetingOffers) return;
			
			if (team.name !== STATE.teamName && 
				marketValidation.canTeamMakeOffer(team, player)) {
				
				const variation = 0.8 + Math.random() * 0.4; // -20% to +20%
				const offer = {
					playerId: player.id,
					playerName: player.nome,
					type: 'competing',
					wage: Math.round(player.wage * variation),
					contractLength: Math.floor(Math.random() * 3) + 2,
					team: team.name,
					deadline: STATE.league.week + 1
				};
				
				offers.push(offer);
				competingTeams++;
			}
		});
		
		console.log(`Generated ${offers.length} competing offers for ${player.nome}`);
		return offers;
	},
	
	findPlayerById: function(playerId) {
		if (!playerId) return null;
		
		// Cerca nei free agents
		if (STATE.freeAgents?.length) {
			const player = STATE.freeAgents.find(p => p?.id === playerId);
			if (player) return player;
		}
		
		// Cerca nel mercato internazionale
		if (STATE.transferMarket?.finances?.playersForSale) {
			const player = STATE.transferMarket.finances.playersForSale.find(p => p?.id === playerId);
			if (player) return player;
		}
		
		// Cerca nelle squadre normali
		for (let team of STATE.teams || []) {
			// Cerca nei giocatori della squadra
			const player = team?.players?.find(p => p?.id === playerId);
			if (player) return player;
			
			// Cerca nei giocatori in vendita della squadra
			if (team?.finances?.playersForSale) {
				const listedPlayer = team.finances.playersForSale.find(p => p?.id === playerId);
				if (listedPlayer) return listedPlayer;
			}
		}
		
		console.log('Search context:', {
			freeAgentsCount: STATE.freeAgents?.length || 0,
			transferMarketCount: STATE.transferMarket?.finances?.playersForSale?.length || 0,
			teamsCount: STATE.teams?.length || 0
		});
		
		return null;
	},	
	
	
	findBestOffer: function(offers) {
		if (!offers || offers.length === 0) return null;
		
		return offers.reduce((best, current) => {
			// Calcola un punteggio per ogni offerta
			const getOfferScore = (offer) => {
				let score = 0;
				
				// Punteggio base dallo stipendio (60%)
				score += offer.wage * 0.6;
				
				// Bonus per la durata del contratto (20%)
				score += (offer.contractLength * 0.2);
				
				// Bonus per l'importo del trasferimento se presente (20%)
				if (offer.amount) {
					score += (offer.amount * 0.2);
				}
				
				return score;
			};
			
			const currentScore = getOfferScore(current);
			const bestScore = getOfferScore(best);
			
			console.log('Comparing offers:', {
				current: {
					team: current.team,
					wage: current.wage,
					length: current.contractLength,
					score: currentScore
				},
				best: {
					team: best.team,
					wage: best.wage,
					length: best.contractLength,
					score: bestScore
				}
			});
			
			return currentScore > bestScore ? current : best;
		}, offers[0]);
	},	
	
	pick: function(array) {
        return array[Math.floor(Math.random() * array.length)];
	},
	
	generateUniqueId: function() {
		if (window.crypto && crypto.randomUUID) {
			return crypto.randomUUID();
		}
		
		// Fallback per browser più vecchi
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			const r = Math.random() * 16 | 0;
			const v = c == 'x' ? r : (r & 0x3 | 0x8);
			return v.toString(16);
		});
	},
	
	teamNeedsRole: function(team, role) {
		const roleCount = this.getRoleCount(team);
		const primaryRole = role.charAt(0);
		
		switch(primaryRole) {
			case 'G': return roleCount.GK < 3;
			case 'D': return roleCount.DEF < 8;
			case 'M': return roleCount.MID < 8;
			case 'S':
			case 'F': return roleCount.ATT < 6;
			default: return false;
		}
	},	
	
	getTeamByName: function(teamName) {
        if (!teamName) return null;
        
        // Cerca prima nella squadra del giocatore
        if (teamName === STATE.teamName) {
            return getMyTeam();
        }

        // Cerca nelle altre squadre
        const team = STATE.teams.find(t => t.name === teamName);
        if (team) return team;

        // Cerca nel transfer market (per free agents)
        if (STATE.transferMarket && teamName === 'Transfer Market') {
            return STATE.transferMarket;
        }

        // Se non trova nulla
        console.warn(`Team not found: ${teamName}`);
        return null;
    },
	
};


Object.assign(window, {
    marketUtils: window.marketUtils,
    findPlayerInMarket: window.marketUtils.findPlayerInMarket.bind(window.marketUtils),
    findSellingTeam: window.marketUtils.findSellingTeam.bind(window.marketUtils),
    canMakeOffer: window.marketUtils.canMakeOffer.bind(window.marketUtils),
    canAffordWages: window.marketUtils.canAffordWages.bind(window.marketUtils),
    getRoleCount: window.marketUtils.getRoleCount.bind(window.marketUtils),
    isPlayerStarting: window.marketUtils.isPlayerStarting.bind(window.marketUtils),
    findPlayerById: window.marketUtils.findPlayerById.bind(window.marketUtils),
    findBestOffer: window.marketUtils.findBestOffer.bind(window.marketUtils),
    generateCompetingOffers: window.marketUtils.generateCompetingOffers.bind(window.marketUtils),	
    showNotification: window.marketUtils.showNotification.bind(window.marketUtils),
    showConfirmationModal: window.marketUtils.showConfirmationModal.bind(window.marketUtils),
    showConfirmationDialog: window.marketUtils.showConfirmationDialog.bind(window.marketUtils),	
	pick: window.marketUtils.pick.bind(window.marketUtils),
    generateUniqueId: window.marketUtils.generateUniqueId.bind(window.marketUtils),
    teamNeedsRole: window.marketUtils.teamNeedsRole.bind(window.marketUtils),
    getTeamByName: window.marketUtils.getTeamByName.bind(window.marketUtils),
});
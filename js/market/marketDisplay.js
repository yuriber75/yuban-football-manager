// marketDisplay.js
console.log('Loading marketDisplay.js...');

if (!window.playerGenerator || !window.STATE || !window.GAME_CONSTANTS) {
	console.error('Required dependencies not loaded for marketDisplay');
	throw new Error('Missing dependencies');
}


window.marketDisplay = {
	updateSquadLimits: function() {
		const myTeam = getMyTeam();
		if (!myTeam) return;

		const F = GAME_CONSTANTS.FINANCE;

		// Calcola i limiti della squadra
		const squadSize = myTeam.players.length;
		const maxSquadSize = F.MAX_SQUAD_SIZE;
		
		// Calcola i budget settimanali
		const weeklyWageBudget = (myTeam.finances.wagesBudget / F.WEEKS_PER_SEASON).toFixed(F.DECIMAL_PLACES);
		const currentWeeklyWages = myTeam.players.reduce((sum, p) => sum + (p.wage / F.WEEKS_PER_SEASON), 0).toFixed(F.DECIMAL_PLACES);
		const availableWageBudget = ((weeklyWageBudget - currentWeeklyWages) * 1000000).toFixed(0);
		const transferBudget = myTeam.finances.transferBudget.toFixed(F.DECIMAL_PLACES);

		// Conta i giocatori per ruolo
		const roleCounts = {
			GK: 0,
			DEF: 0,
			MID: 0,
			ATT: 0
		};

		myTeam.players.forEach(player => {
			const primaryRole = player.roles[0];
			if (primaryRole === 'GK') {
				roleCounts.GK++;
			} else if (['DR', 'DC', 'DL'].includes(primaryRole)) {
				roleCounts.DEF++;
			} else if (['MR', 'MC', 'ML'].includes(primaryRole)) {
				roleCounts.MID++;
			} else if (['FR', 'ST', 'FL'].includes(primaryRole)) {
				roleCounts.ATT++;
			} else {
				console.warn(`Unknown role for player ${player.nome}: ${primaryRole}`);
			}
		});

		// Aggiorna l'interfaccia
		const elements = {
			squadSize: document.getElementById('squadSize'),
			weeklyWageBudget: document.getElementById('weeklyWageBudget'),
			currentWeeklyWages: document.getElementById('currentWeeklyWages'),
			availableWageBudget: document.getElementById('availableWageBudget'),
			transferBudget: document.getElementById('transferBudget'),
			gkCount: document.getElementById('gkCount'),
			defCount: document.getElementById('defCount'),
			midCount: document.getElementById('midCount'),
			attCount: document.getElementById('attCount')
		};

		// Aggiorna i valori con il formato corretto
		if (elements.squadSize) {
			elements.squadSize.textContent = `${squadSize}/${maxSquadSize}`;
		}
		if (elements.weeklyWageBudget) {
			elements.weeklyWageBudget.textContent = 
				`${F.CURRENCY_SYMBOL}${weeklyWageBudget}${F.CURRENCY_SUFFIX}`;
		}
		if (elements.currentWeeklyWages) {
			elements.currentWeeklyWages.textContent = 
				`${F.CURRENCY_SYMBOL}${currentWeeklyWages}${F.CURRENCY_SUFFIX}`;
		}
		if (elements.availableWageBudget) {
			elements.availableWageBudget.textContent = 
				`${F.CURRENCY_SYMBOL}${availableWageBudget}`;
		}
		if (elements.transferBudget) {
			elements.transferBudget.textContent = 
				`${F.CURRENCY_SYMBOL}${transferBudget}${F.CURRENCY_SUFFIX}`;
		}
		
		// Aggiorna i conteggi per ruolo usando i limiti specifici
		if (elements.gkCount) {
			elements.gkCount.textContent = `${roleCounts.GK}/${F.MAX_PER_ROLE.GK}`;
		}
		if (elements.defCount) {
			elements.defCount.textContent = `${roleCounts.DEF}/${F.MAX_PER_ROLE.DEF}`;
		}
		if (elements.midCount) {
			elements.midCount.textContent = `${roleCounts.MID}/${F.MAX_PER_ROLE.MID}`;
		}
		if (elements.attCount) {
			elements.attCount.textContent = `${roleCounts.ATT}/${F.MAX_PER_ROLE.ATT}`;
		}
	},
	
updateTransferList: function() {
    console.log('Starting transfer list update');
    
    // Raccogli tutti i giocatori in vendita
    const listedPlayers = [];
    STATE.teams.forEach(team => {
        if (team.finances?.playersForSale) {
            team.finances.playersForSale.forEach(player => {
                listedPlayers.push({...player, currentClub: team.name});
            });
        }
    });

    console.log('Transfer list status:', {
        totalListed: listedPlayers.length,
        players: listedPlayers.map(p => ({
            name: p.nome,
            club: p.currentClub
        }))
    });

    const transferListTable = document.getElementById('transferListTable');
    if (!transferListTable) {
        console.warn('Transfer list table not found');
        return;
    }

    transferListTable.innerHTML = listedPlayers.length ? 
        listedPlayers.map(player => this.createTransferListRow(player)).join('') :
        '<tr><td colspan="8" class="no-data">No players listed for transfer</td></tr>';

    console.log('Transfer list update completed');
},
	
	updateFreeAgentsList: function() {
		console.log('Updating free agents list');
		const tbody = document.getElementById('freeAgentsTable');
		if (!tbody) {
			console.error('Free agents table not found');
			return;
		}
		
		if (!STATE.freeAgents || STATE.freeAgents.length === 0) {
			STATE.freeAgents = window.marketUI.generateFreeAgents(15);
		}
		
		tbody.innerHTML = STATE.freeAgents.map(player => 
			this.createFreeAgentRow(player)
		).join('') || '<tr><td colspan="6" class="no-data">No free agents available</td></tr>';
		
		console.log('Free agents table updated');
	},
	
	createTransferListRow: function(player) {
		const weeklyWage = Math.round((player.wage / 52) * 1000000);
		const isMyPlayer = player.club === STATE.teamName;
		const hasPendingOffer = this.hasPlayerPendingOffer(player.id);

		return `
        <tr>
		<td>${player.nome}</td>
		<td>${player.roles.join(', ')}</td>
		<td>${player.club}</td>
		<td>${player.age}</td>
		<td>${player.overall}</td>
		<td>€${weeklyWage.toLocaleString('it-IT')}</td>
		<td>€${player.value.toFixed(2)}M</td>
            <td>
                ${isMyPlayer ? 
                    '<span class="listed-status">For Sale</span>' : 
                    hasPendingOffer ?
                        '<span class="offer-status">Offer Pending</span>' :
                        `<button class="btn-market" 
                            onclick="window.marketTransfers.makeTransferOffer('${player.id}')"
                            ${!window.marketUtils.canMakeOffer(player) ? 'disabled' : ''}>
                            Make Offer
                        </button>`
                }
            </td>
        </tr>
    `;
	},

	hasPlayerPendingOffer: function(playerId) {
		return STATE.negotiations?.pendingOffers?.some(
			offer => offer.playerId === playerId && offer.team === STATE.teamName
		);
	},

	createFreeAgentRow: function(player) {
		const weeklyWage = Math.round((player.wage / 52) * 1000000);
		const canSign = typeof window.marketUI?.canSignPlayer === 'function' 
			? window.marketUI.canSignPlayer(player) 
			: true;
		const hasPendingOffer = this.hasPlayerPendingOffer(player.id);

		return `
			<tr>
				<td>${player.nome}</td>
				<td>${player.roles.join(', ')}</td>
				<td>${player.age}</td>
				<td>
					<span class="player-overall ${this.getRatingClass(player.overall)}">
						${player.overall}
					</span>
				</td>
				<td>€${weeklyWage.toLocaleString('it-IT')}</td>
				<td>
					${hasPendingOffer ?
						'<span class="offer-status">Offer Pending</span>' :
						`<button class="btn-market" 
							onclick="marketUI.signFreeAgent('${player.id}')"
							${!canSign ? 'disabled' : ''}>
							Sign Player
						</button>`
					}
				</td>
			</tr>
		`;
	},
	
	showOfferDialog: function(player, type) {
	
	    const existingModal = document.querySelector('.modal');
		if (existingModal) {
			document.body.removeChild(existingModal);
		}
		
		const dialog = document.createElement('div');
		dialog.className = 'modal';
		
		const weeklyWage = Math.round((player.wage / 52) * 1000000);
		const offerContent = type === 'transfer' 
        ? `<div class="offer-field">
		<label>Transfer Fee (Current Value: €${player.value.toFixed(2)}M)</label>
		<input type="number" id="offerAmount" 
		min="0" step="0.1" 
		value="${player.value}">
		</div>` 
        : '';
		
		dialog.innerHTML = `
        <div class="box">
		<h3>Make Offer for ${player.nome}</h3>
		<div class="player-summary">
		<div>Age: ${player.age}</div>
		<div>Overall: ${player.overall}</div>
		<div>Role: ${player.roles.join('/')}</div>
		</div>
		<div class="offer-form">
		${offerContent}
		<div class="offer-field">
		<label>Weekly Wage (Current: €${weeklyWage.toLocaleString('it-IT')})</label>
		<input type="number" id="offerWage" 
		min="0" step="1000" 
		value="${weeklyWage}">
		</div>
		<div class="offer-field">
		<label>Contract Length (Years)</label>
		<select id="contractLength">
		<option value="1">1 Year</option>
		<option value="2">2 Years</option>
		<option value="3" selected>3 Years</option>
		<option value="4">4 Years</option>
		<option value="5">5 Years</option>
		</select>
		</div>
		<div class="flex" style="margin-top:16px">
		<button class="btn-primary" id="confirmOffer">Make Offer</button>
		<button id="cancelOffer">Cancel</button>
		</div>
		</div>
        </div>
		`;
		
        document.body.appendChild(dialog);
		
        this.setupOfferDialogListeners(dialog, player, type);
	},
	
	setupOfferDialogListeners: function(dialog, player, type) {
		document.getElementById('confirmOffer').addEventListener('click', () => {
			const weeklyWage = parseFloat(document.getElementById('offerWage').value);
			const annualWageInMillions = (weeklyWage * 52) / 1000000;
			
			const amount = type === 'transfer' 
				? parseFloat(document.getElementById('offerAmount').value)
				: 0;
			const length = parseInt(document.getElementById('contractLength').value);
			
        console.log('Processing offer:', {
            player: player.nome,
            type,
            weeklyWage,
            annualWageInMillions,
            amount,
            length
        });
        
        if (type === 'transfer') {
            window.marketNegotiations.processOffer(player, type, amount, annualWageInMillions, length);
        } else {
            window.marketAgents.processFreeAgentOffer(player, annualWageInMillions, length);
        }

        document.body.removeChild(dialog);
        
        // Aggiorna le viste appropriate
        if (type === 'transfer') {
            this.updateTransferList();
        } else {
            this.updateFreeAgentsList();
        }
    });
    
    document.getElementById('cancelOffer').addEventListener('click', () => {
        document.body.removeChild(dialog);
    });
},
	
	getRatingClass: function(rating) {
		if (rating >= 80) return 'high-rating';
		if (rating >= 70) return 'good-rating';
		if (rating >= 60) return 'average-rating';
		return 'low-rating';
	}
	
};

Object.assign(window, {
    marketDisplay: window.marketDisplay,
	updateSquadLimits: window.marketDisplay.updateSquadLimits.bind(window.marketDisplay),
    updateTransferList: window.marketDisplay.updateTransferList.bind(window.marketDisplay),
    updateFreeAgentsList: window.marketDisplay.updateFreeAgentsList.bind(window.marketDisplay),
    createTransferListRow: window.marketDisplay.createTransferListRow.bind(window.marketDisplay),
    createFreeAgentRow: window.marketDisplay.createFreeAgentRow.bind(window.marketDisplay),
    showOfferDialog: window.marketDisplay.showOfferDialog.bind(window.marketDisplay),
    setupOfferDialogListeners: window.marketDisplay.setupOfferDialogListeners.bind(window.marketDisplay),
    getRatingClass: window.marketDisplay.getRatingClass.bind(window.marketDisplay)
});
// financeUI.js

console.log('Loading financeUI.js...');

// Verifica dipendenze
if (!window.GAME_CONSTANTS || !window.STATE) {
    console.error('Required dependencies not loaded for financeUI');
    throw new Error('Missing dependencies');
}

window.financeUI = {
init: function() {
    console.log('Initializing financeUI...');
    
    try {
        const myTeam = getMyTeam();
        console.log('Initial team state:', myTeam);

        if (!myTeam.finances.lastUpdate) {
            console.log('Processing initial finances...');
            this.processInitialFinances();
        } else {
            console.log('Found existing finances:', myTeam.finances);
        }

        // Setup event listeners dopo aver processato i dati iniziali
        this.setupEventListeners();
        this.updateFinanceView();
    } catch (error) {
        console.error('Error in financeUI init:', error);
    }
},

processInitialFinances: function() {
    const myTeam = getMyTeam();
    const F = GAME_CONSTANTS.FINANCE;

    console.log('Processing initial finances for team:', myTeam.name);

    // Calcola i valori iniziali
    const sponsorIncome = (myTeam.finances.sponsorTech + myTeam.finances.sponsorShirt) / F.WEEKS_PER_SEASON;
    const weeklyWages = this.calculateTotalWeeklyWages(myTeam);
    const facilityCosts = (myTeam.finances.stadiumCapacity * F.FACILITY_COST_PER_SEAT) / 1000000;
    const maintenanceCosts = sponsorIncome * F.MAINTENANCE_COST_PERCENTAGE;

    console.log('Calculated initial values:', {
        sponsorIncome,
        weeklyWages,
        facilityCosts,
        maintenanceCosts
    });

    // Imposta lastUpdate con i valori iniziali
    myTeam.finances.lastUpdate = {
        income: {
            sponsor: sponsorIncome,
            match: 0,
            bonus: 0,
            total: sponsorIncome
        },
        expenses: {
            wages: weeklyWages,
            facility: facilityCosts,
            maintenance: maintenanceCosts,
            total: weeklyWages + facilityCosts + maintenanceCosts
        }
    };

    console.log('Set initial lastUpdate:', myTeam.finances.lastUpdate);

    // Salva lo stato
    saveState();
},

    setupEventListeners: function() {
        // Ascolta gli eventi di fine partita per aggiornare le finanze
        document.addEventListener('matchEnd', (e) => {
            console.log('Match ended, processing finances...');
            this.processWeeklyFinances();
            this.updateFinanceView();
        });

        // Ascolta gli eventi di cambio settimana
        document.addEventListener('gameWeekEnd', (e) => {
            console.log('Game week ended, processing finances...');
            this.processWeeklyFinances();
            this.updateFinanceView();
        });

        // Ascolta gli eventi di aggiornamento del mercato
        document.addEventListener('marketUpdate', (e) => {
            console.log('Market updated, updating finance view...');
            this.updateFinanceView();
        });

        // Ascolta gli eventi di caricamento salvataggio
        document.addEventListener('saveLoaded', (e) => {
            console.log('Save loaded, checking finances...');
            if (!getMyTeam().finances.lastUpdate) {
                this.processInitialFinances();
            }
            this.updateFinanceView();
        });
    },

	processWeeklyFinances: function() {
		try {
			const myTeam = getMyTeam();
			if (!myTeam || !myTeam.finances) {
				throw new Error('Invalid team finances data');
			}

			const finances = myTeam.finances;
			const F = GAME_CONSTANTS.FINANCE;

			// MODIFICA QUI: Ricalcola sempre sponsorIncome dai valori base
			const sponsorIncome = (finances.sponsorTech + finances.sponsorShirt) / F.WEEKS_PER_SEASON;
			
			console.log('Sponsor income calculation:', {
				sponsorTech: finances.sponsorTech,
				sponsorShirt: finances.sponsorShirt,
				calculatedWeeklySponsorship: sponsorIncome,
				previousSponsorship: finances.sponsorIncome
			});

            // Calcola ricavi da biglietti per partite in casa
            let matchRevenue = 0;
            if (this.isHomeGame()) {
                // Aggiorna l'affluenza in base ai risultati
                if (this.lastMatchWasWin()) {
                    finances.currentAttendance = Math.min(
                        finances.currentAttendance * F.ATTENDANCE_WIN_BOOST,
                        finances.stadiumCapacity
                    );
                } else if (this.lastMatchWasLoss()) {
                    finances.currentAttendance = Math.max(
                        finances.currentAttendance * F.ATTENDANCE_LOSS_PENALTY,
                        finances.stadiumCapacity * F.MIN_ATTENDANCE_PERCENTAGE
                    );
                }
                
                matchRevenue = (finances.currentAttendance * F.TICKET_PRICE) / 1000000;
            }

		   // Calcola tutte le entrate
				const sponsorBonus = this.lastMatchWasWin() ? F.SPONSOR_BONUS_WIN : 0;
				const totalIncome = sponsorIncome + matchRevenue + sponsorBonus; // Usa sponsorIncome ricalcolato

				// Calcola tutte le spese
				const weeklyWages = this.calculateTotalWeeklyWages(myTeam);
				const facilityCosts = (finances.stadiumCapacity * F.FACILITY_COST_PER_SEAT) / 1000000;
				const maintenanceCosts = totalIncome * F.MAINTENANCE_COST_PERCENTAGE;
				const totalExpenses = weeklyWages + facilityCosts + maintenanceCosts;

				// Aggiorna il budget
				finances.transferBudget += (totalIncome - totalExpenses);

				// Salva i dettagli per la visualizzazione
				finances.lastUpdate = {
					income: {
						sponsor: sponsorIncome,     // Usa il valore ricalcolato
						match: matchRevenue,
						bonus: sponsorBonus,
						total: totalIncome
					},
					expenses: {
						wages: weeklyWages,
						facility: facilityCosts,
						maintenance: maintenanceCosts,
						total: totalExpenses
					}
				};

				// Aggiorna anche finances.sponsorIncome con il valore corretto
				finances.sponsorIncome = sponsorIncome;

		  // Controlla se ci sono offerte pendenti da processare
		  if (STATE.negotiations?.pendingOffers?.length > 0) {
				console.log('Processing pending transfer offers...');
				window.marketNegotiations.resolveNegotiations();
			}

			saveState();
		} catch (error) {
			console.error('Error processing weekly finances:', error);
		}
	},



    updateFinanceView: function() {
        try {
            const myTeam = getMyTeam();
            if (!myTeam || !myTeam.finances) {
                throw new Error('Invalid team finances data');
            }

            const finances = myTeam.finances;
            const lastUpdate = finances.lastUpdate || {
                income: { total: 0, sponsor: 0, match: 0, bonus: 0 },
                expenses: { total: 0, wages: 0, facility: 0, maintenance: 0 }
            };

            // Update Weekly Summary
            this.updateValue('cashBalance', finances.transferBudget);
            this.updateValue('weeklyIncome', lastUpdate.income.total);
            this.updateValue('weeklyExpenses', lastUpdate.expenses.total);
            this.updateValue('weeklyBalance', lastUpdate.income.total - lastUpdate.expenses.total);

            // Update Income Sources
            this.updateValue('sponsorIncome', lastUpdate.income.sponsor);
            this.updateValue('matchIncome', lastUpdate.income.match);
            this.updateValue('otherIncome', lastUpdate.income.bonus);

            // Update Expenses
            this.updateValue('totalWages', lastUpdate.expenses.wages);
            this.updateValue('facilityCosts', lastUpdate.expenses.facility);
            this.updateValue('otherExpenses', lastUpdate.expenses.maintenance);

            // Update Squad Wages Table
            this.updateSquadWagesTable(myTeam);

        } catch (error) {
            console.error('Error updating finance view:', error);
        }
    },

	updateValue: function(elementId, value) {
		const element = document.getElementById(elementId);
		if (element) {
			const F = GAME_CONSTANTS.FINANCE;
			const numericValue = Number(value) || 0;
			
			const formattedValue = this.formatCurrency(numericValue);
			element.className = 'value-indicator'; // Aggiungi la classe base
			element.innerHTML = `${F.CURRENCY_SYMBOL}${formattedValue}${F.CURRENCY_SUFFIX}`;

			// Aggiungi le classi per i colori
			if (numericValue > 0) {
				element.classList.add('positive');
			} else if (numericValue < 0) {
				element.classList.add('negative');
			}
		}
	},

    updateSquadWagesTable: function(team) {
        const tbody = document.getElementById('squadWagesTable');
        if (!tbody) return;

        tbody.innerHTML = team.players.map(player => this.createPlayerWageRow(player)).join('');
    },

    createPlayerWageRow: function(player) {
        const F = GAME_CONSTANTS.FINANCE;
        const weeklyWage = (player.wage || 0) / F.WEEKS_PER_SEASON;

        return `
            <tr>
                <td>${player.nome}</td>
				<td>${player.roles.join(', ')}</td>				
                <td>${player.age}</td>
                <td>${player.overall}</td>
				<td>${player.contractYears} ${player.contractYears === 1 ? 'year' : 'years'}</td>
                <td>€${(weeklyWage * 1000000).toLocaleString('it-IT', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                })}</td>
                <td>€${(player.value).toLocaleString('it-IT', {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1
                })}${F.CURRENCY_SUFFIX}</td>
                <td>
                    <span class="market-status ${player.listed ? 'listed' : 'not-listed'}">
                        ${player.listed ? 'Listed' : 'Not Listed'}
                    </span>
                </td>
				<td>
					${!player.listed ? 
						`<button class="btn-market" onclick="window.marketListings.listPlayerForSale('${player.id}')">
							List for Sale
						</button>` : 
						`<button class="btn-market" onclick="window.marketListings.removeFromMarket('${player.id}')">
							Remove
						</button>`
					}
				</td>
            </tr>
        `;
    },

    formatCurrency: function(value) {
        const F = GAME_CONSTANTS.FINANCE;
        return new Intl.NumberFormat('it-IT', {
            minimumFractionDigits: F.DECIMAL_PLACES,
            maximumFractionDigits: F.DECIMAL_PLACES
        }).format(value || 0);
    },

    calculateTotalWeeklyWages: function(team) {
        return team.players.reduce((sum, player) => {
            const wage = player.wage || 0;
            return sum + (wage / GAME_CONSTANTS.FINANCE.WEEKS_PER_SEASON);
        }, 0);
    },

    isHomeGame: function() {
        return STATE.lastMatch?.isHome || false;
    },

    lastMatchWasWin: function() {
        return STATE.lastMatch?.result === 'win';
    },

    lastMatchWasLoss: function() {
        return STATE.lastMatch?.result === 'loss';
    }
};

// Esporta le funzioni globalmente
Object.assign(window, {
    financeUI: window.financeUI,
    processWeeklyFinances: window.financeUI.processWeeklyFinances.bind(window.financeUI),
    updateFinanceView: window.financeUI.updateFinanceView.bind(window.financeUI),
    calculateTotalWeeklyWages: window.financeUI.calculateTotalWeeklyWages.bind(window.financeUI)
});

console.log('financeUI.js loaded successfully');


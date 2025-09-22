// marketTransfers.js
console.log('Loading marketTransfers.js...');

if (!window.playerGenerator || !window.STATE || !window.GAME_CONSTANTS) {
	console.error('Required dependencies not loaded for marketUI');
	throw new Error('Missing dependencies');
}

window.marketTransfers = {
	
	
	finalizeNegotiationsProcess: function() {
		console.log('Finalizing negotiations process');
		
		// Rimuovi le offerte processate
		if (STATE.negotiations) {
			const oldCount = STATE.negotiations.pendingOffers.length;
			STATE.negotiations.pendingOffers = STATE.negotiations.pendingOffers.filter(
				offer => offer.deadline > STATE.league.week
			);
			console.log(`Removed ${oldCount - STATE.negotiations.pendingOffers.length} processed offers`);
		}
		
		// Aggiorna le viste
		window.marketUI.updateMarketView();
		window.marketDisplay.updateTransferList();
		window.marketDisplay.updateSquadLimits();
		
		// Salva lo stato
		saveState();
		
		console.log('Negotiations process completed');
	},
	
	processTransferOffer: function(offer, player) {
		return new Promise((resolve, reject) => {
			try {
				// Prima fase: negoziazione contratto con il giocatore
				marketModals.negotiateContract(offer, player).then(contractAccepted => {
					if (contractAccepted) {
						// Seconda fase: conferma del trasferimento
						window.marketModals.showTransferConfirmation(offer, player, () => {
							resolve();
						});
						} else {
						window.marketUtils.showNotification(
							`${player.nome} has rejected the contract offer from ${offer.team}.`
						);
						resolve();
					}
				});
				} catch (error) {
				console.error('Error in processTransferOffer:', error);
				reject(error);
			}
		});
	},
	
	executeTransfer: function(player, amount, wage, contractLength, buyingTeam) {
		// Se buyingTeam è una stringa (nome squadra esterna) creiamo un oggetto temporaneo
		if (typeof buyingTeam === 'string' || !buyingTeam) {
			buyingTeam = {
				name: typeof buyingTeam === 'string' ? buyingTeam : player.club,
				isExternalTeam: true,
				finances: {
					transferBudget: amount // Per squadre esterne, assumiamo abbiano il budget necessario
				}
			};
		}
		
		console.log('Starting transfer execution:', {
			playerId: player.id,
			playerName: player.nome,
			playerClub: player.club,
			amount: amount,
			buyingTeam: buyingTeam.name,
			isExternalTeam: buyingTeam.isExternalTeam
		});
		
		try {
			// Trova la squadra venditrice
			let sellingTeam = STATE.teams.find(team => 
				team.players.some(p => p.id === player.id) || 
				team.finances?.playersForSale?.some(p => p.id === player.id)
			);
			
			// Se il giocatore non è in nessuna squadra del campionato, potrebbe essere nel transfer market
			if (!sellingTeam && STATE.transferMarket?.finances?.playersForSale) {
				const isInTransferMarket = STATE.transferMarket.finances.playersForSale.some(
					p => p.id === player.id
				);
				if (isInTransferMarket) {
					sellingTeam = {
						name: player.club || 'Transfer Market',
						finances: STATE.transferMarket.finances,
						isExternalTeam: true
					};
				}
			}
			
			if (!sellingTeam) {
				console.error('Could not determine selling team for player:', player);
				return false;
			}
			
			// Crea una copia pulita del giocatore
			const playerToTransfer = {
				...JSON.parse(JSON.stringify(player)),
				club: buyingTeam.name,
				wage: wage,
				contractYears: contractLength
			};
			delete playerToTransfer.listed;
			
			// Gestisci la rimozione del giocatore
			if (!sellingTeam.isExternalTeam) {
				// Per squadre del campionato
				sellingTeam.players = sellingTeam.players.filter(p => p.id !== player.id);
				if (sellingTeam.finances?.playersForSale) {
					sellingTeam.finances.playersForSale = sellingTeam.finances.playersForSale
					.filter(p => p.id !== player.id);
				}
				} else if (STATE.transferMarket?.finances?.playersForSale) {
				// Per il transfer market
				STATE.transferMarket.finances.playersForSale = 
				STATE.transferMarket.finances.playersForSale.filter(p => p.id !== player.id);
			}
			
			// Aggiorna i budget solo per le squadre del campionato
			if (!buyingTeam.isExternalTeam) {
				buyingTeam.finances.transferBudget -= amount;
			}
			if (!sellingTeam.isExternalTeam) {
				sellingTeam.finances.transferBudget += amount;
			}
			
			// Se la squadra acquirente è nel campionato, aggiungi il giocatore alla rosa
			if (!buyingTeam.isExternalTeam) {
				// Assegna nuovo numero di maglia
				const usedNumbers = new Set(buyingTeam.players.map(p => p.number));
				let newNumber = 1;
				while (usedNumbers.has(newNumber)) newNumber++;
				playerToTransfer.number = newNumber;
				
				buyingTeam.players.push(playerToTransfer);
			}
			
			// Rimuovi eventuali offerte pendenti
			if (STATE.negotiations?.pendingOffers) {
				STATE.negotiations.pendingOffers = STATE.negotiations.pendingOffers
				.filter(o => o.playerId !== player.id);
			}
			
			// Aggiorna le viste
			window.marketUI.updateMarketView();
			window.marketDisplay.updateTransferList();
			window.marketDisplay.updateSquadLimits();
			if (window.financeUI) {
				window.financeUI.updateFinanceView();
				}
			
			// Salva lo stato
			saveState();
			
			return true;
			
			} catch (error) {
			console.error('Error in executeTransfer:', error);
			return false;
		}
	},
	
	
	finalizeNegotiationsProcess: function() {
		// Rimuovi tutte le offerte processate
		if (STATE.negotiations) {
			STATE.negotiations.pendingOffers = STATE.negotiations.pendingOffers.filter(
				offer => offer.deadline > STATE.league.week
			);
		}
		
		// Aggiorna le viste
		window.marketUI.updateMarketView();
		window.marketDisplay.updateTransferList();
		window.marketDisplay.updateSquadLimits();
		
		saveState();
	},
	
acceptOffer: function(offer, player) {
    console.log('Starting accept offer process:', {
        player: player.nome,
        from: player.club,
        to: offer.team
    });

    const sellingTeam = window.marketUtils.getTeamByName(player.club);
    const isFreeAgent = !sellingTeam;
    const isExternalOffer = offer.isExternal;

    if (isExternalOffer) {
        this.handleExternalTransfer(offer, player, sellingTeam);
        return;
    }
    
    const buyingTeam = STATE.teams.find(t => t.name === offer.team);
    if (!buyingTeam) {
        console.error('Buying team not found:', offer.team);
        return;
    }

    try {
        const playerToTransfer = JSON.parse(JSON.stringify(player));
        
        // Se è un acquisto da un'altra squadra
        if (offer.type === 'transfer' && sellingTeam) {
            console.log('Processing transfer:', {
                player: player.nome,
                from: sellingTeam.name,
                to: buyingTeam.name,
                squadSize: sellingTeam.players.length
            });
            
            // Aggiorna i budget
            buyingTeam.finances.transferBudget -= offer.amount;
            sellingTeam.finances.transferBudget += offer.amount;
            sellingTeam.finances.transferProfit += offer.amount;

            // Aggiorna i budget degli stipendi
            buyingTeam.finances.wagesBudget -= offer.wage;
            sellingTeam.finances.wagesBudget += player.wage;
            
            // Rimuovi il giocatore dalla squadra venditrice
            this.removePlayerFromSellingTeam(sellingTeam, player.id);
            
        } else if (offer.type === 'freeAgent') {
            // Rimuovi dai free agents
            STATE.freeAgents = STATE.freeAgents.filter(p => p.id !== player.id);
            buyingTeam.finances.wagesBudget -= offer.wage;              
        }
        
        // Aggiorna i dati del giocatore
        this.updatePlayerDetails(playerToTransfer, buyingTeam, offer);

        // Aggiungi alla nuova squadra
        buyingTeam.players.push(playerToTransfer);

        // Pulisci le offerte pendenti
        this.cleanupPendingOffers(player.id);

        // Aggiungi alla storia dei trasferimenti
        this.addTransferHistory(player, offer);

        // Aggiorna UI e salva
        this.updateUIAndSave();
        
        console.log('Transfer completed:', {
            player: playerToTransfer.nome,
            oldTeamSize: sellingTeam?.players.length,
            newTeamSize: buyingTeam.players.length
        });

        // Mostra notifica
        window.marketUtils.showNotification(
            `Transfer completed: ${playerToTransfer.nome} has joined ${buyingTeam.name}`
        );
        
    } catch (error) {
        console.error('Error in acceptOffer:', error);
        window.marketUtils.showNotification('Error completing transfer');
    }
},
	
	addTransferHistory: function(player, offer) {
		// Inizializza la struttura dei trasferimenti se non esiste
		if (!STATE.transfers) {
			STATE.transfers = {
				history: [],
				currentSeason: 1
			};
		}

		// Crea il record del trasferimento
		const transfer = {
			season: STATE.transfers.currentSeason,
			week: STATE.league.week,
			playerId: player.id,
			playerName: player.nome,
			fromTeam: player.club,
			toTeam: offer.team,
			fee: offer.amount,
			wage: offer.wage,
			type: offer.type || 'transfer'
		};

		// Aggiungi alla storia generale
		STATE.transfers.history.push(transfer);

		// Aggiorna la storia della squadra se coinvolta
		const myTeam = getMyTeam();
		if (player.club === myTeam.name || offer.team === myTeam.name) {
			if (!myTeam.transferHistory) {
				myTeam.transferHistory = [];
			}

			const isOutgoing = player.club === myTeam.name;
			myTeam.transferHistory.push({
				...transfer,
				direction: isOutgoing ? 'out' : 'in',
				balance: isOutgoing ? offer.amount : -offer.amount
			});
		}

		console.log('Transfer history added:', {
			player: player.nome,
			from: player.club,
			to: offer.team,
			amount: offer.amount,
			type: offer.type
		});

		return transfer;
	},

	removePlayerFromSellingTeam: function(team, playerId) {
		team.players = team.players.filter(p => p.id !== playerId);
		
		if (team.finances?.playersForSale) {
			team.finances.playersForSale = team.finances.playersForSale
				.filter(p => p.id !== playerId);
		}

	},

	updatePlayerDetails: function(player, buyingTeam, offer) {
		player.club = buyingTeam.name;
		player.wage = offer.wage;
		player.contractYears = offer.contractLength;
		delete player.listed;

		// Assegna nuovo numero di maglia
		const usedNumbers = new Set(buyingTeam.players.map(p => p.number));
		let newNumber = 1;
		while (usedNumbers.has(newNumber)) newNumber++;
		player.number = newNumber;
	},

	cleanupPendingOffers: function(playerId) {
		if (STATE.negotiations?.pendingOffers) {
			STATE.negotiations.pendingOffers = STATE.negotiations.pendingOffers
				.filter(o => o.playerId !== playerId);
		}
	},

	updateUIAndSave: function() {
		window.marketUI.updateMarketView();
		if (window.financeUI) {
			window.financeUI.updateFinanceView();
		}
		window.marketDisplay.updateTransferList();
		window.marketDisplay.updateSquadLimits();
		saveState();
	},
	
	
	makeTransferOffer: function(playerId) {
		console.log('Making transfer offer for player:', playerId);
		
		const player = window.marketUtils.findPlayerById(playerId);
		if (!player) {
			console.error('Player not found:', playerId, {
				context: {
					hasTransferMarket: !!STATE.transferMarket,
					transferMarketPlayers: STATE.transferMarket?.finances?.playersForSale?.length || 0,
					teamsWithPlayers: STATE.teams?.filter(t => t.finances?.playersForSale?.length > 0).length || 0
				}
			});
			return;
		}
		
		console.log('Found player:', player);
		window.marketDisplay.showOfferDialog(player, 'transfer');
	},
	
	finalizePlayerTransfer: function(player, team, wage, contractLength) {
		// Verifica finale prima del trasferimento
		const finalCheck = window.marketUtils.canCompleteTransfer({
			type: 'transfer',
			amount: 0, 
			wage: wage
		}, team);
		
		if (!finalCheck.canComplete) {
			window.marketUtils.showNotification(`Cannot complete transfer: ${finalCheck.reason}`);
			return false;
		}
		
		player.wage = wage;
		player.club = team.name;
		player.contractYears = contractLength;
		delete player.listed;
		
		const usedNumbers = new Set(team.players.map(p => p.number));
		let newNumber = 1;
		while (usedNumbers.has(newNumber)) newNumber++;
		player.number = newNumber;
		
		team.players.push(player);
		return true;
	},
	
handleExternalTransfer: function(offer, player, sellingTeam) {
    console.log('Starting external transfer:', {
        player: player.nome,
        from: player.club,
        to: offer.team,
        isExternal: true
    });

    try {
        // Trova la squadra venditrice se non è stata passata
        const sellingTeam = window.marketUtils.getTeamByName(player.club) || 
            STATE.teams.find(t => t.players.some(p => p.id === player.id));

        if (!sellingTeam) {
            console.error('Selling team not found for player:', player.nome);
            return;
        }

        console.log('Found selling team:', {
            team: sellingTeam.name,
            beforeSquadSize: sellingTeam.players.length,
            beforeListedSize: sellingTeam.finances?.playersForSale?.length
        });

        // Prima rimuovi dalla lista dei trasferimenti
        if (sellingTeam.finances?.playersForSale) {
            sellingTeam.finances.playersForSale = sellingTeam.finances.playersForSale
                .filter(p => p.id !== player.id);
        }

        // Poi rimuovi dalla rosa principale
        sellingTeam.players = sellingTeam.players.filter(p => p.id !== player.id);

        // Aggiorna i budget
        if (offer.amount) {
            sellingTeam.finances.transferBudget += offer.amount;
            sellingTeam.finances.transferProfit += offer.amount;
        }
        sellingTeam.finances.wagesBudget += player.wage;

        console.log('After removal:', {
            squadSize: sellingTeam.players.length,
            listedPlayers: sellingTeam.finances?.playersForSale?.length,
            playerStillInSquad: sellingTeam.players.some(p => p.id === player.id),
            playerStillListed: sellingTeam.finances?.playersForSale?.some(p => p.id === player.id)
        });

        // Aggiungi alla storia dei trasferimenti
        if (!STATE.transfers) {
            STATE.transfers = {
                history: [],
                currentSeason: STATE.league.season || 1
            };
        }

        const transfer = {
            season: STATE.transfers.currentSeason,
            week: STATE.league.week,
            playerId: player.id,
            playerName: player.nome,
            from: player.club,
            to: offer.team,
            fee: offer.amount || 0,
            wage: offer.wage,
            type: 'external'
        };

        STATE.transfers.history.push(transfer);

        // Aggiorna la storia della tua squadra se coinvolta
        const myTeam = getMyTeam();
        if (player.club === myTeam.name) {
            if (!myTeam.transferHistory) {
                myTeam.transferHistory = [];
            }
            myTeam.transferHistory.push({
                ...transfer,
                direction: 'out',
                balance: offer.amount
            });
        }

        // Pulisci le offerte pendenti
        if (STATE.negotiations?.pendingOffers) {
            STATE.negotiations.pendingOffers = STATE.negotiations.pendingOffers
                .filter(o => o.playerId !== player.id);
        }

        // Aggiorna l'UI
        this.updateUIAfterTransfer();

        // Forza un aggiornamento specifico della lista trasferimenti
        window.marketDisplay.updateTransferList();

        console.log('External transfer completed:', {
            player: player.nome,
            from: player.club,
            to: offer.team,
            fee: offer.amount,
            finalSquadSize: sellingTeam.players.length,
            finalListedSize: sellingTeam.finances?.playersForSale?.length
        });

        // Salva lo stato dopo tutte le modifiche
        saveState();

        // Mostra notifica
        window.marketUtils.showNotification(
            `${player.nome} has been transferred to ${offer.team} for €${offer.amount}M`
        );

    } catch (error) {
        console.error('Error in handleExternalTransfer:', error);
        window.marketUtils.showNotification('Error completing transfer');
    }
},

	updateUIAfterTransfer: function() {
		window.marketDisplay.updateTransferList();
		window.marketDisplay.updateSquadLimits();
		window.marketUI.updateMarketView();
		
		if (window.financeUI) {
			window.financeUI.updateFinanceView();
		}

		saveState();
	}
		
};

Object.assign(window, {
    marketTransfers: window.marketTransfers,
    makeTransferOffer: window.marketTransfers.makeTransferOffer.bind(window.marketTransfers),
    executeTransfer: window.marketTransfers.executeTransfer.bind(window.marketTransfers),
	finalizePlayerTransfer: window.marketTransfers.finalizePlayerTransfer.bind(window.marketTransfers),   
    acceptOffer: window.marketTransfers.acceptOffer.bind(window.marketTransfers)
});
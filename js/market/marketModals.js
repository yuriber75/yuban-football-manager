// marketModals.js
console.log('Loading marketModals.js...');

if (!window.playerGenerator || !window.STATE || !window.GAME_CONSTANTS || 
    !window.marketTransfers || !window.marketNegotiations || !window.marketUtils) {
    console.error('Required dependencies not loaded for marketModals');
    throw new Error('Missing dependencies');
	}

const { TEMPLATES, MESSAGES } = window.GAME_CONSTANTS;

window.marketModals = {
	formatters: {
		weeklyWage: (value) => `€${((value * 1000000) / 52).toLocaleString('it-IT')}/week`,
		millions: (value) => `€${(value || 0).toFixed(1)}M`,
		freeTransfer: () => 'Free Transfer',
		array: (value) => Array.isArray(value) ? value.join(', ') : String(value),
		default: (value) => value?.toString() || 'N/A'
	},
	
showBaseModal: function(templateId, content, buttons, callback) {
    console.log('Showing modal:', templateId);
    this.cleanupModals();

    const template = document.getElementById(templateId);
    if (!template) {
        console.error(`Template not found: ${templateId}`);
        if (callback) callback(false);
        return;
    }

    try {
        // Crea il container
        const modalContainer = document.createElement('div');
        modalContainer.className = 'modal-container';
        modalContainer.id = `modal-${Date.now()}`;

        // Clona il template SENZA modificarne la struttura
        const modalContent = template.content.cloneNode(true);
        
        // Inserisci il contenuto clonato nel container
        modalContainer.appendChild(modalContent);

        // Popola il contenuto
        this.setModalContent(modalContainer, content);
        
        // Setup dei pulsanti
        this.setupModalButtons(modalContainer, buttons);
        
        // Aggiungi il modale al body
        document.body.appendChild(modalContainer);
        
        console.log('Modal created with ID:', modalContainer.id);
        return modalContainer;
    } catch (error) {
        console.error('Error showing modal:', error);
        if (callback) callback(false);
        return null;
    }
},
	
	showOutgoingTransferResponse: function(response, callback) {
		const { player, offer } = response;
		const playerAccepts = Math.random() < window.marketNegotiations.calculateAcceptanceChance(player, offer);

		const content = {
			'.player-name': player.nome,
			'.current-wage': { value: player.wage, formatter: 'weeklyWage' },
			'.offered-wage': { value: offer.wage, formatter: 'weeklyWage' },
			'.contract-length': `${offer.contractLength} years`,
			'.status-message': playerAccepts ? 
				'The player is willing to accept these terms.' : 
				'The player is not satisfied with these terms.'
		};

		const buttons = {
			confirm: () => {
				if (playerAccepts) {
					this.showTransferConfirmation(response, callback);
				} else {
					window.marketUtils.showNotification(
						`${player.nome} has rejected the contract terms.`,
						callback
					);
				}
			},
			cancel: () => window.marketUtils.showNotification('Negotiation cancelled', callback)
		};

		this.showBaseModal('contractNegotiationTemplate', content, buttons, callback);
	},

negotiateContract: function(offer, player) {
    return new Promise((resolve) => {
        const content = {
            '.player-name': player.nome,
            '.current-wage': { 
                value: player.wage, 
                formatter: 'weeklyWage' 
            },
            '.offered-wage': { 
                value: offer.wage, 
                formatter: 'weeklyWage' 
            },
            '.contract-length': `${offer.contractLength} years`
        };

        // Calcola accettazione
        const acceptanceChance = window.marketNegotiations.calculateAcceptanceChance(player, offer);
        const accepted = Math.random() < acceptanceChance;

        content['.status-message'] = accepted ?
            'The player is willing to accept these terms.' :
            'The player is not satisfied with these terms.';

        const buttons = {
            confirm: () => {
                this.cleanupModals();
                resolve(accepted);
            },
            cancel: () => {
                this.cleanupModals();
                resolve(false);
            }
        };

        this.showBaseModal('contractNegotiationTemplate', content, buttons);
    });
},

showResponses: function(responses, onComplete) {
    console.log('Showing responses:', {
        count: responses.length,
        responses: responses,
        currentWeek: STATE.league.week
    });

    const showNextResponse = (index = 0) => {
        if (index >= responses.length) {
            onComplete();
            return;
        }

        this.cleanupModals();
        const response = responses[index];
        const myTeam = getMyTeam();
        
        console.log('Processing response:', response);
        
        try {
            if (response.player.club === myTeam.name) {
                // Se è un tuo giocatore che ha ricevuto un'offerta
                console.log('Showing outgoing transfer response for your player');
                this.showOutgoingTransferResponse(response, () => showNextResponse(index + 1));
            }
            else if (response.offer.team === myTeam.name) {
                // Se sei tu che hai fatto un'offerta
                console.log('Showing incoming transfer response for your offer');
                this.showIncomingTransferResponse(response, () => showNextResponse(index + 1));
            }
            else {
                // Altri trasferimenti
                console.log('Processing transfer between other teams');
                if (response.accepted) {
                    marketTransfers.acceptOffer(response.offer, response.player);
                }
                showNextResponse(index + 1);
            }
        } catch (error) {
            console.error('Error processing response:', error, response);
            showNextResponse(index + 1);
        }
    };
    
    showNextResponse(0);
},

	setModalContent: function(container, content) {
		Object.entries(content).forEach(([selector, config]) => {
			try {
				const element = container.querySelector(selector);
				if (!element) {
					console.warn(`Element not found: ${selector}`);
					return;
				}

				if (typeof config === 'object' && config.formatter) {
					element.textContent = this.formatters[config.formatter](config.value);
				} else {
					element.textContent = this.formatters.default(config);
				}
			} catch (error) {
				console.error(`Error setting content for ${selector}:`, error);
			}
		});
	},

	showIncomingTransferResponse: function(response, callback) {
		const { 
			player: { nome = 'Unknown', age = 'N/A', roles = [], overall = 'N/A' },
			offer: { amount, wage = 0, contractLength = 0, type = 'transfer' }
		} = response;

		const content = {
			'.player-name': nome,
			'.player-age': age,
			'.player-position': { value: roles, formatter: 'array' },
			'.player-overall': overall,
			'.transfer-fee': { 
				value: amount, 
				formatter: type === 'freeAgent' ? 'freeTransfer' : 'millions' 
			},
			'.weekly-wage': { value: wage, formatter: 'weeklyWage' },
			'.contract-length': `${contractLength} years`
		};

		const buttons = {
			confirm: () => {
				window.marketTransfers.acceptOffer(response.offer, response.player);
				window.marketUtils.showNotification(
					`${nome} has joined your team!`,
					callback
				);
			},
			cancel: () => {
				window.marketUtils.showNotification(MESSAGES.CANCEL, callback);
			}
		};

		this.showBaseModal(TEMPLATES.TRANSFER, content, buttons, callback);
	},

showTransferConfirmation: function(response, callback) {
    console.log('Showing transfer confirmation for:', response.player.nome);
    
    const myTeam = getMyTeam();
    const isOutgoingTransfer = response.player.club === myTeam.name;
    
    const { 
        player: { nome, age, roles = [], overall },
        offer: { amount, wage, contractLength, team, type = 'transfer', isExternal }
    } = response;

    const content = {
        // Modifica il titolo del modale in base al tipo di trasferimento
        '.modal-header h3': isOutgoingTransfer ? 'Outgoing Transfer' : 'Incoming Transfer',
        '.player-name': nome,
        '.player-info-grid .player-age': age,
        '.player-info-grid .player-position': { value: roles, formatter: 'array' },
        '.player-info-grid .player-overall': overall,
        '.deal-info-grid .transfer-fee': { 
            value: amount, 
            formatter: type === 'freeAgent' ? 'freeTransfer' : 'millions' 
        },
        '.deal-info-grid .weekly-wage': { value: wage, formatter: 'weeklyWage' },
        '.deal-info-grid .contract-length': `${contractLength} years`,
        // Aggiungi info sulla squadra di destinazione/provenienza
        '.deal-info-grid .transfer-direction': isOutgoingTransfer ? 
            `Transfer to ${team}` : 
            `Transfer from ${response.player.club}`
    };

    const buttons = {
        confirm: () => {
            this.cleanupModals();
            if (isExternal) {
                window.marketTransfers.handleExternalTransfer(response.offer, response.player);
            } else {
                window.marketTransfers.acceptOffer(response.offer, response.player);
            }
            window.marketUtils.showNotification(
                isOutgoingTransfer ?
                    `${nome} has been sold to ${team}` :
                    `${nome} has joined your team from ${response.player.club}`,
                callback
            );
        },
        cancel: () => {
            this.cleanupModals();
            window.marketUtils.showNotification(MESSAGES.CANCEL, callback);
        }
    };

    // Modifica anche il testo dei pulsanti
    const modalEl = this.showBaseModal(TEMPLATES.TRANSFER, content, buttons, callback);
    if (modalEl) {
        const confirmBtn = modalEl.querySelector('.btn-confirm');
        const cancelBtn = modalEl.querySelector('.btn-cancel');
        if (confirmBtn) {
            confirmBtn.textContent = isOutgoingTransfer ? 'Complete Sale' : 'Complete Purchase';
        }
        if (cancelBtn) {
            cancelBtn.textContent = isOutgoingTransfer ? 'Cancel Sale' : 'Cancel Purchase';
        }
    }

    return modalEl;
},


	showRejectionResponse: function(response, callback) {
		if (response.offer.team === getMyTeam().name) {
			const maxAttemptsReached = response.attempts >= 3;
			const message = maxAttemptsReached ?
				`${response.player.nome} is no longer interested in negotiations.` :
				`${response.player.nome} has rejected your offer.`;
			
			if (maxAttemptsReached) {
				STATE.negotiations.rejectedPlayers.add(response.player.id);
			}
			
			window.marketUtils.showNotification(message, callback);
		} else {
			if (callback) callback();
		}
	},


    setupModalButtons: function(container, handlers) {
        // Handler per il tasto ESC
        const escHandler = (e) => {
            if (e.key === 'Escape' && container.parentNode) {
                document.removeEventListener('keydown', escHandler);
                this.cleanupModals();
                if (handlers.cancel) handlers.cancel();
            }
        };

        document.addEventListener('keydown', escHandler);

        // Setup pulsante conferma
        if (handlers.confirm) {
            const confirmBtn = container.querySelector('.btn-confirm');
            if (confirmBtn) {
                confirmBtn.onclick = (e) => {
                    e.preventDefault();
                    if (container.parentNode) {
                        document.removeEventListener('keydown', escHandler);
                        this.cleanupModals();
                        handlers.confirm();
                    }
                };
            }
        }
        
        // Setup pulsante cancella
        if (handlers.cancel) {
            const cancelBtn = container.querySelector('.btn-cancel');
            if (cancelBtn) {
                cancelBtn.onclick = (e) => {
                    e.preventDefault();
                    if (container.parentNode) {
                        document.removeEventListener('keydown', escHandler);
                        this.cleanupModals();
                        handlers.cancel();
                    }
                };
            }
        }

        // Cleanup function
        const cleanup = () => {
            document.removeEventListener('keydown', escHandler);
        };

        // Aggiungi al container un riferimento alla funzione di cleanup
        container.cleanup = cleanup;
    },

	cleanupModals: function() {
		console.log('Cleaning up modals...'); // Debug log
		const existingModals = document.querySelectorAll('.modal-container');
		console.log('Found modals:', existingModals.length); // Debug log
		
		existingModals.forEach(modal => {
			try {
				if (modal?.parentNode) {
					modal.parentNode.removeChild(modal);
					console.log('Modal removed successfully');
				}
			} catch (error) {
				console.error('Error removing modal:', error);
			}
		});
	},

};

Object.assign(window, {
    marketModals: window.marketModals,
    negotiateContract: window.marketModals.negotiateContract.bind(window.marketModals),
	showTransferConfirmation: window.marketModals.showTransferConfirmation.bind(window.marketModals),   
    showResponses: window.marketModals.showResponses.bind(window.marketModals)
});
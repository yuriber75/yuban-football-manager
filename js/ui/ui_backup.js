// ui.js

/*
	Include:
	
	Coordina tutti gli altri moduli UI
	Gestisce l'inizializzazione generale
	Gestisce la navigazione tra i tab
	Gestisce la modale iniziale
	Fornisce funzioni di debug
	Si occupa della validazione dello stato e delle dipendenze
*/

window.UI = {
    // Inizializzazione dell'interfaccia utente
    init: function() {
        if (!this.validateDependencies()) {
            console.error('UI dependencies not loaded correctly');
            document.getElementById('introModal').style.display = 'flex';
            return;
		}
		
        // Se non c'è stato valido, mostra la modale
        if (!this.validateState()) {
            document.getElementById('introModal').style.display = 'flex';
            return;
		}
		
        this.setupEventListeners();
        this.renderAll();
	},
	
    // Validazione delle dipendenze
    validateDependencies: function() {
        return window.GAME_CONSTANTS && 
		window.squadUI && 
		window.marketUI && 
		window.leagueUI &&
		window.commonUI;
	},
	
    // Setup della modale iniziale
    setupIntroModal: function() {
        const introModal = document.getElementById('introModal');
        const loadSaveBtn = document.getElementById('loadSaveBtn');
        const newCareerBtn = document.getElementById('newCareerBtn');
        const guestBtn = document.getElementById('guestBtn');
        
        loadSaveBtn.addEventListener('click', () => {
            if (loadState()) {
                this.hideIntroModal();
                this.showTab('squadTab');
                this.renderAll();
                window.marketUtils.showNotification('Offer submitted. The player will respond after the next match.');('Salvataggio caricato con successo.');
				} else {
                window.marketUtils.showNotification('Offer submitted. The player will respond after the next match.');('Nessun salvataggio trovato.');
			}
		});
		
        newCareerBtn.addEventListener('click', () => {
            const mgr = document.getElementById('mgrName').value.trim() || 'Manager';
            const team = document.getElementById('teamName').value.trim() || 
			('FC ' + (Math.random() > .5 ? 'Nuova' : 'Sud'));
            const n = parseInt(document.getElementById('numTeams').value, 10);
            
            setupNewLeague(n, mgr, team);
            this.hideIntroModal();
            this.showTab('squadTab');
            this.renderAll();
		});
		
        guestBtn.addEventListener('click', () => {
            setupNewLeague(10, 'Ospite', 'AC Ospite');
            this.hideIntroModal();
            this.showTab('squadTab');
            this.renderAll();
		});
	},
	
    // Nasconde la modale iniziale
    hideIntroModal: function() {
        document.getElementById('introModal').style.display = 'none';
	},
	
    // Setup degli event listener generali
    setupEventListeners: function() {
        // Event listeners per i tab
        document.querySelectorAll('.tab').forEach(btn => {
            btn.addEventListener('click', () => this.showTab(btn.dataset.tab));
		});
		
        // Event listener per partita
		/*
			document.getElementById('goToMatch').addEventListener('click', () => {
            const opp = document.getElementById('uiOpp').value;
            startMatch(opp);
            this.showTab('matchTab');
			});
			// Nel tuo event listener per la fine della partita
			document.addEventListener('matchEnd', () => {
			marketUI.resolveNegotiations();
			});	   
			
			
		*/
		
		
		document.getElementById('goToMatch').addEventListener('click', () => {
			const myTeam = getMyTeam();
			
			// Verifica se la formazione è valida prima di iniziare la partita
			if (!window.squadUI || !window.squadUI.isFormationValid) {
				console.error('squadUI not loaded properly');
				return;
			}
			
			const formationCheck = window.squadUI.isFormationValid(myTeam);
			if (!formationCheck.valid) {
				// Mostra notifica di errore
				window.marketUtils.showNotification(
					`Cannot start match: ${formationCheck.message}`
				);
				
				// Vai al tab della squadra
				window.UI.showTab('squadTab');
				return;
			}
			
			// Mostra l'anteprima della partita
			window.matchPreview.show();
		});
		
		// Setup listener per i pulsanti dell'anteprima partita
		document.addEventListener('DOMContentLoaded', () => {
			document.getElementById('playMatchBtn').addEventListener('click', () => {
				window.matchPreview.executeMatch();
			});
			
			document.getElementById('modifyFormationBtn').addEventListener('click', () => {
				window.UI.showTab('squadTab');
			});
		});
		
		console.log('Pre-match state:', {
			week: STATE.league.week,
			pendingOffers: STATE.negotiations?.pendingOffers || [],
			formationValid: formationCheck.valid
		});
			
			// Prendi tutte le partite della settimana corrente
			const currentFixtures = STATE.league.fixtures[STATE.league.week - 1] || [];
			
			// Simula tutte le partite della giornata
			const weekResults = currentFixtures.map(fixture => {
				const [homeIdx, awayIdx] = fixture;
				const homeTeam = STATE.teams[homeIdx];
				const awayTeam = STATE.teams[awayIdx];
				
				// Per la tua squadra, usa la logica esistente
				if (homeTeam.name === STATE.teamName || awayTeam.name === STATE.teamName) {
					const isHome = homeTeam.name === STATE.teamName;
					const result = Math.random() > 0.5 ? 'win' : 'loss';
					const homeGoals = result === 'win' ? Math.floor(Math.random() * 3) + 1 : Math.floor(Math.random() * 2);
					const awayGoals = result === 'win' ? Math.floor(Math.random() * 2) : Math.floor(Math.random() * 3) + 1;
					
					// Salva il riferimento alla tua partita
					if (isHome) {
						STATE.lastMatch = {
							isHome: true,
							homeTeam: homeTeam.name,
							awayTeam: awayTeam.name,
							homeGoals: homeGoals,
							awayGoals: awayGoals,
							result: homeGoals > awayGoals ? 'win' : homeGoals < awayGoals ? 'loss' : 'draw'
						};
						} else {
						STATE.lastMatch = {
							isHome: false,
							homeTeam: homeTeam.name,
							awayTeam: awayTeam.name,
							homeGoals: homeGoals,
							awayGoals: awayGoals,
							result: awayGoals > homeGoals ? 'win' : awayGoals < homeGoals ? 'loss' : 'draw'
						};
					}
					
					return {
						week: STATE.league.week,
						home: homeIdx,
						away: awayIdx,
						homeGoals: homeGoals,
						awayGoals: awayGoals,
						stats: {
							scorers: [],
							assists: [],
							cards: [],
							ratings: {}
						}
					};
					} else {
					// Per le altre squadre, genera risultati casuali
					const homeGoals = Math.floor(Math.random() * 4);
					const awayGoals = Math.floor(Math.random() * 4);
					
					return {
						week: STATE.league.week,
						home: homeIdx,
						away: awayIdx,
						homeGoals: homeGoals,
						awayGoals: awayGoals,
						stats: {
							scorers: [],
							assists: [],
							cards: [],
							ratings: {}
						}
					};
				}
			});
			
			// Aggiorna i risultati nel STATE
			if (!STATE.league.results) STATE.league.results = [];
			STATE.league.results = [
				...STATE.league.results.filter(r => r.week !== STATE.league.week),
				...weekResults 
			];
			
			// Risolvi le negoziazioni pendenti
			if (STATE.negotiations?.pendingOffers?.length > 0) {
				console.log('Resolving negotiations after match...');
				window.marketNegotiations.resolveNegotiations();
			}
			
			
			// Aggiorna la classifica per tutte le partite
			weekResults.forEach(result => {
				window.leagueUI.updateLeagueTable(result);
			});
			
			// Risolvi le negoziazioni
			if (STATE.negotiations?.pendingOffers?.length > 0) {
				console.log('Resolving negotiations...');
				window.marketNegotiations.resolveNegotiations();
			}
			
			STATE.league.week++;
			STATE.league.currentViewWeek = STATE.league.week - 1;
			
		
			// Trigger degli eventi
			document.dispatchEvent(new Event('matchEnd'));
			document.dispatchEvent(new Event('gameWeekEnd'));
			
			
			// Aggiorna le viste
			if (window.financeUI) {
				window.financeUI.processWeeklyFinances();
				window.financeUI.updateFinanceView();
			}
			window.marketUI.updateMarketView();
			window.leagueUI.renderLeagueTab();
			
			console.log('Post-match state:', {
				weekResults: weekResults,
				week: STATE.league.week,
				pendingOffers: STATE.negotiations?.pendingOffers || []
			});
			
			// Salva lo stato
			saveState();
			
			// Mostra il tab match
			this.showTab('matchTab');
		});
		
        // Setup listener formazione
        squadUI.setupFormationListeners();
	},
	
    // Gestione dei tab
	showTab: function(tabId) {
		// Nascondi tutti i contenuti prima
		['squadContent', 'otherContent', 'financeContent', 'marketContent', 'leagueContent', 'matchContent']
		.forEach(id => commonUI.toggleElement(id, false));
		
		// Rimuovi active da tutti i tab
		document.querySelectorAll('.tab').forEach(tab => {
			tab.classList.remove('active');
		});
		
		// Attiva il tab selezionato
		const tab = document.querySelector(`[data-tab="${tabId}"]`);
		if (tab) {
			tab.classList.add('active');
		}
		
		// Mostra e aggiorna il contenuto appropriato
		switch(tabId) {
			case 'squadTab':
			commonUI.toggleElement('squadContent', true);
			squadUI.renderSquadTab();
			break;
			case 'otherTab':
			commonUI.toggleElement('otherContent', true);
			squadUI.renderOtherTeamsTab();
			break;
			case 'financeTab':
			commonUI.toggleElement('financeContent', true);
			window.financeUI?.updateFinanceView();
			break;
			case 'marketTab':
			commonUI.toggleElement('marketContent', true);
			window.marketUI?.updateMarketView();
			break;
			case 'leagueTab':
			commonUI.toggleElement('leagueContent', true);
			leagueUI.renderLeagueTab();
			break;
			case 'matchTab':
			commonUI.toggleElement('matchContent', true);
			break;
			case 'matchPreviewTab':
			commonUI.toggleElement('matchPreviewContent', true);
			break;
		}
	},
		
		// Mostra l'anteprima della partita
		showMatchPreview: function() {
			// Ottieni i team
			const myTeam = getMyTeam();
			const currentFixtures = STATE.league.fixtures[STATE.league.week - 1] || [];
			let opponentTeam = null;
			
			// Trova l'avversario
			for (const fixture of currentFixtures) {
				const [homeIdx, awayIdx] = fixture;
				const homeTeam = STATE.teams[homeIdx];
				const awayTeam = STATE.teams[awayIdx];
				
				if (homeTeam.name === STATE.teamName) {
					opponentTeam = awayTeam;
					break;
				} else if (awayTeam.name === STATE.teamName) {
					opponentTeam = homeTeam;
					break;
				}
			}
			
			if (!opponentTeam) {
				console.error('Opponent team not found');
				return;
			}
			
			// Aggiorna i nomi delle squadre
			document.getElementById('homeTeamName').textContent = myTeam.name;
			document.getElementById('awayTeamName').textContent = opponentTeam.name;
			document.getElementById('homeFormation').textContent = this.formatFormation(myTeam.formation || myTeam.tactics?.formation || '4-4-2');
			document.getElementById('awayFormation').textContent = this.formatFormation(opponentTeam.formation || '4-4-2');
			
			// Renderizza le formazioni
			this.renderPreviewFormation('homeTeamFormation', myTeam);
			this.renderPreviewFormation('awayTeamFormation', opponentTeam);
			
			// Mostra il tab dell'anteprima
			this.showTab('matchPreviewTab');
		},
		
		// Renderizza una formazione nell'anteprima
		renderPreviewFormation: function(containerId, team) {
			const container = document.getElementById(containerId);
			if (!container) return;
			
			container.innerHTML = '';
			container.classList.add('pitch-view', 'preview-pitch');
			
			const formation = team.formation || team.tactics?.formation || '4-4-2';
			
			if (!GAME_CONSTANTS.POSITION_ROLES[formation]) {
				console.error('Invalid formation:', formation);
				return;
			}
			
			Object.entries(GAME_CONSTANTS.POSITION_ROLES[formation]).forEach(([section, positions]) => {
				positions.forEach((pos, index) => {
					const player = team.players.find(p => 
						p.starting && 
						p.positionIndex === index && 
						p.section === section
					);
					
					const wrapper = document.createElement('div');
					wrapper.className = 'player-position-wrapper';
					wrapper.style.left = `${pos.x}%`;
					wrapper.style.top = `${pos.y}%`;
					
					const dot = document.createElement('div');
					dot.className = 'player-dot';
					
					if (player) {
						dot.textContent = player.number;
						
						const label = document.createElement('div');
						label.className = 'player-label';
						const names = player.nome.split(' ');
						const formattedName = names.length > 1 ? `${names[0][0]}.${names[names.length - 1]}` : player.nome;
						label.textContent = formattedName;
						
						wrapper.appendChild(dot);
						wrapper.appendChild(label);
						wrapper.title = `${player.nome} (${player.overall})`;
					} else {
						dot.classList.add('empty');
						wrapper.appendChild(dot);
						wrapper.title = pos.natural.join('/');
					}
					
					container.appendChild(wrapper);
				});
			});
		},
		
		// Esegue la partita dopo l'anteprima
		executeMatch: function() {
			console.log('Executing match...');
			
			// Prendi tutte le partite della settimana corrente
			const currentFixtures = STATE.league.fixtures[STATE.league.week - 1] || [];
			
			// Simula tutte le partite della giornata
			const weekResults = currentFixtures.map(fixture => {
				const [homeIdx, awayIdx] = fixture;
				const homeTeam = STATE.teams[homeIdx];
				const awayTeam = STATE.teams[awayIdx];
			
				// Se una delle squadre è la tua squadra, esegui la logica della partita
				if (homeTeam.name === STATE.teamName || awayTeam.name === STATE.teamName) {
					const opp = awayTeam.name === STATE.teamName ? homeTeam.name : awayTeam.name;
					const result = startMatch(opp);
					
					return {
						week: STATE.league.week,
						home: homeIdx,
						away: awayIdx,
						homeGoals: result.home,
						awayGoals: result.away,
						stats: {
							scorers: result.scorers || [],
							assists: result.assists || [],
							cards: result.cards || [],
							ratings: result.ratings || {}
						}
					};
				} else {
					// Per le altre squadre, genera risultati casuali
					const homeGoals = Math.floor(Math.random() * 4);
					const awayGoals = Math.floor(Math.random() * 4);
					
					return {
						week: STATE.league.week,
						home: homeIdx,
						away: awayIdx,
						homeGoals: homeGoals,
						awayGoals: awayGoals,
						stats: {
							scorers: [],
							assists: [],
							cards: [],
							ratings: {}
						}
					};
				}
			});
			
			// Aggiorna i risultati nel STATE
			if (!STATE.league.results) STATE.league.results = [];
			STATE.league.results = [
				...STATE.league.results.filter(r => r.week !== STATE.league.week),
				...weekResults 
			];
			
			// Risolvi le negoziazioni pendenti
			if (STATE.negotiations?.pendingOffers?.length > 0) {
				console.log('Resolving negotiations after match...');
				window.marketNegotiations.resolveNegotiations();
			}
			
			// Aggiorna la classifica per tutte le partite
			weekResults.forEach(result => {
				window.leagueUI.updateLeagueTable(result);
			});
			
			STATE.league.week++;
			STATE.league.currentViewWeek = STATE.league.week - 1;
			
			// Trigger degli eventi
			document.dispatchEvent(new Event('matchEnd'));
			document.dispatchEvent(new Event('gameWeekEnd'));
			
			// Aggiorna le viste
			if (window.financeUI) {
				window.financeUI.processWeeklyFinances();
				window.financeUI.updateFinanceView();
			}
			window.marketUI.updateMarketView();
			window.leagueUI.renderLeagueTab();
			
			console.log('Post-match state:', {
				weekResults: weekResults,
				week: STATE.league.week,
				pendingOffers: STATE.negotiations?.pendingOffers || []
			});
			
			// Salva lo stato
			saveState();
			
			// Mostra il tab match
			this.showTab('matchTab');
		},
		
		// Formatta la formazione per la visualizzazione
		formatFormation: function(formation) {
			if (!formation) return '4-4-2';
			return formation.split('').join('-');
		},
		
		// Rendering di tutti i componenti
		renderAll: function() {
        if (!this.validateState()) {
		console.error('STATE non inizializzato completamente');
		return;
        }
		
        try {
		this.renderHeader();
		squadUI.renderSquadTab();
		marketUI.renderFinanceTab();
		leagueUI.renderLeagueTab();
        } catch (error) {
		console.error('Errore nel rendering generale:', error);
        }
		},
		
		// Validazione dello stato
		validateState: function() {
        return STATE && 
		STATE.teams && 
		Array.isArray(STATE.teams) && 
		STATE.teams.length > 0 && 
		STATE.league && 
		STATE.league.table && 
		STATE.league.fixtures && 
		Array.isArray(STATE.league.fixtures);
		},
		
		// Rendering dell'header
		renderHeader: function() {
        commonUI.updateElement('uiMgr', STATE.manager);
        commonUI.updateElement('uiTeam', STATE.teamName);
		},
		
		// Funzioni di utilità per debug
		debug: {
        logState: function() {
		console.log('Current STATE:', STATE);
		console.log('Current team:', getMyTeam());
        },
        
        validateUI: function() {
		console.log('Validating UI components...');
		console.log('GAME_CONSTANTS:', !!window.GAME_CONSTANTS);
		console.log('squadUI:', !!window.squadUI);
		console.log('marketUI:', !!window.marketUI);
		console.log('leagueUI:', !!window.leagueUI);
		console.log('commonUI:', !!window.commonUI);
        }
		}
		};
		
		// Inizializzazione quando il documento è pronto
		document.addEventListener('DOMContentLoaded', function() {
		window.UI.init();
		});
		
		// Esporta UI globalmente
		window.UI = UI;		
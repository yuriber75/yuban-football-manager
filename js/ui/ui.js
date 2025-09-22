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
                introModal.style.display = 'none';
                this.renderAll();
            } else {
                alert('No save file found');
            }
        });
        
        newCareerBtn.addEventListener('click', () => {
            const managerName = document.getElementById('managerName').value || 'Manager';
            const teamName = document.getElementById('teamName').value || 'FC Sud';
            
            if (window.leagueGenerator) {
                window.leagueGenerator.setupNewLeague(10, managerName, teamName);
                introModal.style.display = 'none';
                this.renderAll();
            }
        });
        
        guestBtn.addEventListener('click', () => {
            if (window.leagueGenerator) {
                window.leagueGenerator.setupNewLeague(10, 'Guest', 'Guest FC');
                introModal.style.display = 'none';
                this.renderAll();
            }
        });
    },
    
    // Setup degli event listener
    setupEventListeners: function() {
        // Setup della modale iniziale
        this.setupIntroModal();
        
        // Setup dei tab
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.showTab(tab.dataset.tab);
            });
        });
        
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
				this.showTab('squadTab');
				return;
			}
			
			// Mostra l'anteprima della partita
			window.matchPreview.show();
		});
		
        // Setup listener formazione
        squadUI.setupFormationListeners();
	},
	
    // Gestione dei tab
	showTab: function(tabId) {
		// Nascondi tutti i contenuti prima
		['squadContent', 'otherContent', 'financeContent', 'marketContent', 'leagueContent', 'matchContent', 'matchPreviewContent']
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
		}
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
window.UI = window.UI;
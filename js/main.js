// main.js

// Utility di debug
window.debugUI = {
    showModal: function() {
        document.getElementById('introModal').classList.add('show');
    },
    hideModal: function() {
        document.getElementById('introModal').classList.remove('show');
    },
    checkDependencies: function() {
        const required = [
            'utils',
            'STATE',
            'makePlayer',
            'makeTeam',
            'createMatch',
            'formationBias',
            'dynamicTactics',
            'UI',
            'marketUI',
            'financeUI'			
        ];

        const missing = required.filter(dep => typeof window[dep] === 'undefined');
        if (missing.length > 0) {
            console.error('Missing dependencies:', missing);
            return false;
        }
        return true;
    }
};

function initializeMarket() {
    if (!window.marketUI) {
        console.error('MarketUI not available');
        return;
    }

    try {
        console.log('Starting market initialization...');
        
        // Inizializza marketUI
        if (typeof window.marketUI.init === 'function') {
            window.marketUI.init();
        }

        // Inizializza le finanze per tutte le squadre
        if (STATE.teams?.length) {
            STATE.teams.forEach(team => {
                if (typeof window.marketUI.initializeTeamFinances === 'function') {
                    window.marketUI.initializeTeamFinances(team);
                }
            });

            // Genera giocatori dal mercato internazionale
            if (typeof window.marketUI.generateTransferListedPlayers === 'function') {
                window.marketUI.generateTransferListedPlayers();
            }
            
            // Fai mettere in vendita giocatori alle squadre AI
            if (typeof window.marketUI.autoListPlayersForSale === 'function') {
                window.marketUI.autoListPlayersForSale();
            }
            
            console.log('Market initialization completed');
        }
    } catch (error) {
        console.error('Error initializing market:', error);
    }
}

// Utility globali per gestione gioco
window.gameUtils = {
    resetGame: function() {
        localStorage.removeItem(GAME_CONSTANTS.STORAGE.SAVE_KEY);
        location.reload();
    },
    getGameState: function() {
        return window.STATE;
    },
    clearSave: function() {
        localStorage.removeItem(GAME_CONSTANTS.STORAGE.SAVE_KEY);
        console.log('Save data cleared');
    }
};


document.addEventListener('DOMContentLoaded', function() {
    try {
        // Verifica dipendenze
        if (!window.debugUI.checkDependencies()) {
            throw new Error('Dependencies not loaded');
        }
		
        const introModal = document.getElementById('introModal');
        if (!introModal) {
            throw new Error('Could not find introModal element');
        }
        
        function hideModal() {
            introModal.classList.remove('show');
            introModal.style.display = 'none';
        }

        function showModal() {
            introModal.classList.add('show');
            introModal.style.display = 'flex';
        }

        function initializeGame() {
            hideModal();
            window.UI.init();
            window.UI.showTab('squadTab');
        }

        // Setup degli event listeners con verifica degli elementi
        const elementIds = ['loadSaveBtn', 'newCareerBtn', 'guestBtn', 'mgrName', 'teamName', 'numTeams'];
        const elements = {};
        
        // Verifica che tutti gli elementi esistano
        for (const id of elementIds) {
            const element = document.getElementById(id);
            if (!element) {
                throw new Error(`Required element "${id}" not found in the document`);
            }
            elements[id] = element;
        }

        // Load Save Button
        elements.loadSaveBtn.addEventListener('click', function() {
            try {
                if (window.loadState()) {
                    hideModal();
                    initializeGame();
                    console.log('Save loaded successfully');
                } else {
                    alert('No save file found');
                }
            } catch (error) {
                console.error('Error loading save:', error);
                alert('Error loading save: ' + error.message);
            }
        });

        // New Career Button
        elements.newCareerBtn.addEventListener('click', function() {
            try {
                const mgr = elements.mgrName.value.trim() || 'Manager';
                const team = elements.teamName.value.trim() || 
                        ('FC ' + (Math.random() > .5 ? 'Nuova' : 'Sud'));
                const n = parseInt(elements.numTeams.value, 10);
                
                console.log('Creating new career:', { mgr, team, n });
                
                // Check required dependencies first
                const requiredDeps = [
                    'GAME_CONSTANTS',
                    'STATE',
                    'teamGenerator',
                    'marketAgents',
                    'financeUI',
                    'marketUI',
                    'UI'
                ];
                
                const missingDeps = requiredDeps.filter(dep => !window[dep]);
                if (missingDeps.length > 0) {
                    throw new Error('Missing dependencies: ' + missingDeps.join(', '));
                }

                // Setup della lega
                window.setupNewLeague(n, mgr, team);
                console.log('League setup completed');
                
                // Inizializza le finanze
                console.log('Initializing finances...');
                window.financeUI.init();

                // Inizializza il mercato
                console.log('Initializing market...');
                initializeMarket();

                // Inizializza il gioco
                console.log('Initializing game...');
                hideModal();
                initializeGame();
                
                console.log('Career setup completed successfully');
            } catch (error) {
                console.error('Error during career setup:', error);
                console.error('Error details:', error.stack);
                alert('Error creating career: ' + error.message);
            }
        });

        // Guest Mode Button
        elements.guestBtn.addEventListener('click', function() {
            try {
                console.log('Starting guest mode');
                window.setupNewLeague(10, 'Guest', 'AC Guest');
                initializeMarket();
                hideModal();
                initializeGame();
            } catch (error) {
                console.error('Error during guest mode setup:', error);
                alert('Error starting guest mode: ' + error.message);
            }
        });

        // Show initial modal
        showModal();

    } catch (error) {
        console.error('Error during initialization:', error);
        alert('Error during initialization: ' + error.message);
        const introModal = document.getElementById('introModal');
        if (introModal) {
            introModal.classList.add('show');
            introModal.style.display = 'flex';
        }
    }
});


// Gestione errori globale
window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error('Global error:', {
        message: msg,
        url: url,
        line: lineNo,
        column: columnNo,
        error: error
    });
    return false;
};

function initializeGame() {
    hideModal();
    
    // Verifica che tutti i moduli necessari siano disponibili
    const requiredModules = {
        'UI': window.UI,
        'commonUI': window.commonUI,
        'squadUI': window.squadUI,
        'financeUI': window.financeUI,
        'marketUI': window.marketUI,
		'marketNegotiations': window.marketNegotiations,
		'marketValidation': window.marketValidation,		
		'marketModals': window.marketModals,
		'marketOffers': window.marketOffers,		
        'marketTransfers': window.marketTransfers,
        'marketListings': window.marketListings,
        'marketDisplay': window.marketDisplay,
        'marketUtils': window.marketUtils,
        'marketAgents': window.marketAgents,
        'leagueUI': window.leagueUI,
        'matchUI': window.matchUI
    };

    // Verifica la presenza di tutti i moduli
    const missingModules = Object.entries(requiredModules)
        .filter(([name, module]) => !module)
        .map(([name]) => name);

    if (missingModules.length > 0) {
        console.error('Missing required modules:', missingModules);
        return;
    }

    try {
        // Inizializza i moduli nell'ordine corretto
        const initOrder = [
            'commonUI', 
            'financeUI', 
            'marketUtils',
            'marketAgents',
            'marketListings',
			'marketNegotiations',
			'marketValidation',	
			'marketModals',	
			'marketOffers',				
            'marketTransfers',
            'marketDisplay',
            'marketUI',
            'squadUI', 
            'leagueUI', 
            'matchUI'
        ];
        
        initOrder.forEach(moduleName => {
            const module = window[moduleName];
            if (typeof module?.init === 'function') {
                try {
                    module.init();
                    console.log(`${moduleName} initialized successfully`);
                } catch (error) {
                    console.error(`Error initializing ${moduleName}:`, error);
                }
            }
        });

        // Inizializza UI principale per ultimo
        if (typeof window.UI?.init === 'function') {
            window.UI.init();
            window.UI.showTab('squadTab');
        }

        // Salva lo stato dopo l'inizializzazione
        saveState();

    } catch (error) {
        console.error('Error during game initialization:', error);
    }
}
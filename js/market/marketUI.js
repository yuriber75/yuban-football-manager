// marketUI.js
console.log('Loading marketUI.js...');

if (!window.playerGenerator || !window.STATE || !window.GAME_CONSTANTS) {
    console.error('Required dependencies not loaded for marketUI');
    throw new Error('Missing dependencies');
}

const F = GAME_CONSTANTS.FINANCE;

// 1. Crea l'oggetto marketUI con tutte le funzioni necessarie
window.marketUI = {
    // Funzioni base di marketUI
    initializeTeamFinances: function(team) {
        team.finances = {
            transferBudget: STATE.career?.cash || F.INITIAL_CASH,
            wagesBudget: STATE.career?.wageBudget || F.INITIAL_WAGE_BUDGET,
            sponsorTech: STATE.career?.sponsorTech || F.INITIAL_SPONSOR_TECH,
            sponsorShirt: STATE.career?.sponsorShirt || F.INITIAL_SPONSOR_SHIRT,
            stadiumCapacity: F.MIN_STADIUM_CAPACITY + 
                Math.floor(Math.random() * (F.MAX_STADIUM_CAPACITY - F.MIN_STADIUM_CAPACITY)),
            currentAttendance: F.INITIAL_ATTENDANCE,
            sponsorIncome: (F.MIN_SPONSOR_TECH + F.MIN_SPONSOR_SHIRT) / F.WEEKS_PER_SEASON +
                (Math.random() * ((F.MAX_SPONSOR_TECH + F.MAX_SPONSOR_SHIRT) / F.WEEKS_PER_SEASON)),
            playersForSale: []
        };
        
        if (team.name === STATE.teamName && window.financeUI) {
            window.financeUI.processInitialFinances();
        }
        
        return team.finances;
    },

	init: function() {
		console.log('Initializing market UI...');
		
		// Inizializza lo stato delle negoziazioni se non esiste
		if (!STATE.negotiations) {
			STATE.negotiations = {
				pendingOffers: [],
				rejectedPlayers: new Set(),
				attemptsCount: {}
			};
		}
		
		if (!STATE.freeAgents || STATE.freeAgents.length === 0) {
			console.log('Generating free agents...');
			STATE.freeAgents = this.generateFreeAgents(15);
		}
		

		this.updateMarketView();
		
		document.addEventListener('gameWeekEnd', () => {

			this.updateMarketView();
			marketNegotiations.resolveNegotiations();
			if (Math.random() < 0.2) {
				this.autoListPlayersForSale();
			}
		});
	},

    updateMarketView: function() {
        try {
            if (window.marketDisplay?.updateSquadLimits) {
                window.marketDisplay.updateSquadLimits();
            }
            if (window.marketDisplay?.updateTransferList) {
                window.marketDisplay.updateTransferList();
            }
            if (window.marketDisplay?.updateFreeAgentsList) {
                window.marketDisplay.updateFreeAgentsList();
            }
        } catch (error) {
            console.error('Error in updateMarketView:', error);
        }
    },

    renderFinanceTab: function() {
        if (window.financeUI) {
            window.financeUI.updateFinanceView();
        }
        this.updateMarketView();
    },

    setupMarketTabs: function() {
        const tabs = document.querySelectorAll('.market-tab');
        
        const initialTab = document.querySelector('.market-tab.active');
        if (initialTab) {
            const tabType = initialTab.dataset.marketTab;
            const content = document.getElementById(`${tabType}Content`);
            if (content) {
                content.style.display = 'block';
                this[`update${tabType.charAt(0).toUpperCase() + tabType.slice(1)}List`]?.();
            }
        }
        
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const tabType = tab.dataset.marketTab;
                
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                document.querySelectorAll('#marketContent .card')
                    .forEach(content => content.style.display = 'none');
                
                const content = document.getElementById(`${tabType}Content`);
                if (content) {
                    content.style.display = 'block';
                    this[`update${tabType.charAt(0).toUpperCase() + tabType.slice(1)}List`]?.();
                }
            });
        });
    },

}

// 2. Importa le funzioni dagli altri moduli
Object.assign(window.marketUI, 
    window.marketUtils || {},
	window.marketTransfers || {},
    window.marketAgents || {},
    window.marketListings || {},
    window.marketDisplay || {}
);

Object.assign(window, {
    marketUI: window.marketUI,

    initializeTeamFinances: window.marketUI.initializeTeamFinances.bind(window.marketUI),
    updateMarketView: window.marketUI.updateMarketView.bind(window.marketUI),
    executeTransfer: window.marketTransfers.executeTransfer.bind(window.marketTransfers),
    
    listPlayerForSale: window.marketListings.listPlayerForSale.bind(window.marketListings),
    removeFromMarket: window.marketListings.removeFromMarket.bind(window.marketListings),
    autoListPlayersForSale: window.marketListings.autoListPlayersForSale.bind(window.marketListings),
    
    signFreeAgent: window.marketAgents.signFreeAgent.bind(window.marketAgents),
    generateFreeAgents: window.marketAgents.generateFreeAgents.bind(window.marketAgents),

    
    canMakeOffer: window.marketUtils.canMakeOffer.bind(window.marketUtils),
    canSignPlayer: window.marketUtils.canSignPlayer.bind(window.marketUtils),
    findPlayerById: window.marketUtils.findPlayerById.bind(window.marketUtils),
    findPlayerInMarket: window.marketUtils.findPlayerInMarket.bind(window.marketUtils),
    
    updateSquadLimits: window.marketDisplay.updateSquadLimits.bind(window.marketDisplay),
    showOfferDialog: window.marketDisplay.showOfferDialog.bind(window.marketDisplay)
});


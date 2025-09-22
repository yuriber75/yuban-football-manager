// matchPreview.js

window.matchPreview = {
    
    // Mostra l'anteprima della partita
    show: function() {
        const myTeam = getMyTeam();
        const opponentTeam = this.getOpponentTeam();
        
        console.log('Match Preview - My Team:', myTeam);
        console.log('Match Preview - Opponent Team:', opponentTeam);
        
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
        this.renderFormation('homeTeamFormation', myTeam);
        this.renderFormation('awayTeamFormation', opponentTeam);
        
        // Mostra l'anteprima
        this.showPreviewTab();
    },
    
    // Ottieni la squadra avversaria
    getOpponentTeam: function() {
        const currentFixtures = STATE.league.fixtures[STATE.league.week - 1] || [];
        
        for (const fixture of currentFixtures) {
            const [homeIdx, awayIdx] = fixture;
            const homeTeam = STATE.teams[homeIdx];
            const awayTeam = STATE.teams[awayIdx];
            
            if (homeTeam.name === STATE.teamName) {
                return awayTeam;
            } else if (awayTeam.name === STATE.teamName) {
                return homeTeam;
            }
        }
        return null;
    },
    
    // Renderizza una formazione nell'anteprima
    renderFormation: function(containerId, team) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Container not found:', containerId);
            return;
        }
        
        container.innerHTML = '';
        container.classList.add('pitch-view', 'preview-pitch');
        
        const formation = team.formation || team.tactics?.formation || '4-4-2';
        
        console.log(`Rendering formation for ${team.name}:`, formation);
        console.log(`Team players before setup:`, team.players.map(p => ({
            nome: p.nome, 
            starting: p.starting, 
            section: p.section, 
            positionIndex: p.positionIndex,
            overall: p.overall,
            roles: p.roles
        })));
        
        if (!GAME_CONSTANTS.POSITION_ROLES[formation]) {
            console.error('Invalid formation:', formation);
            return;
        }
        
        // Se non è il team del giocatore, usa la funzione esistente di squadUI per selezionare il miglior 11
        const isMyTeam = team.name === STATE.teamName;
        if (!isMyTeam && window.squadUI && window.squadUI.selectBestEleven) {
            // Assicurati che il team abbia la formazione impostata
            if (!team.formation) {
                team.formation = '4-4-2';
            }
            console.log('Selecting best eleven for opponent team...');
            window.squadUI.selectBestEleven(team);
            console.log(`Team players after selectBestEleven:`, team.players.filter(p => p.starting).map(p => ({
                nome: p.nome, 
                starting: p.starting, 
                section: p.section, 
                positionIndex: p.positionIndex,
                overall: p.overall
            })));
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
                    dot.textContent = player.number || '?';
                    
                    const label = document.createElement('div');
                    label.className = 'player-label';
                    const names = player.nome.split(' ');
                    const formattedName = names.length > 1 ? `${names[0][0]}.${names[names.length - 1]}` : player.nome;
                    
                    // Add rating to the label
                    label.innerHTML = `${formattedName}<br><small>(${player.overall})</small>`;
                    
                    wrapper.appendChild(dot);
                    wrapper.appendChild(label);
                    wrapper.title = `${player.nome} (OVR: ${player.overall})`;
                } else {
                    console.log(`No player found for ${section} position ${index}:`, pos.natural);
                    dot.classList.add('empty');
                    wrapper.appendChild(dot);
                    wrapper.title = pos.natural.join('/');
                }
                
                container.appendChild(wrapper);
            });
        });
        
        console.log(`Finished rendering formation for ${team.name}`);
    },
    
    // Mostra il tab dell'anteprima
    showPreviewTab: function() {
        // Nascondi tutti i contenuti
        ['squadContent', 'otherContent', 'financeContent', 'marketContent', 'leagueContent', 'matchContent', 'matchPreviewContent']
        .forEach(id => commonUI.toggleElement(id, false));
        
        // Rimuovi active da tutti i tab
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Mostra l'anteprima
        commonUI.toggleElement('matchPreviewContent', true);
        
        // Setup event listeners per i bottoni
        this.setupEventListeners();
    },
    
    // Setup event listeners per i bottoni dell'anteprima
    setupEventListeners: function() {
        const playMatchBtn = document.getElementById('playMatchBtn');
        const modifyFormationBtn = document.getElementById('modifyFormationBtn');
        
        if (playMatchBtn && !playMatchBtn.hasAttribute('data-listener-added')) {
            playMatchBtn.addEventListener('click', () => {
                this.executeMatch();
            });
            playMatchBtn.setAttribute('data-listener-added', 'true');
        }
        
        if (modifyFormationBtn && !modifyFormationBtn.hasAttribute('data-listener-added')) {
            modifyFormationBtn.addEventListener('click', () => {
                if (window.UI && window.UI.showTab) {
                    window.UI.showTab('squadTab');
                }
            });
            modifyFormationBtn.setAttribute('data-listener-added', 'true');
        }
    },
    
    // Esegue la partita
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
        window.UI.showTab('matchTab');
    },
    
    // Formatta la formazione per la visualizzazione
    formatFormation: function(formation) {
        if (!formation) return '4-4-2';
        return formation.split('').join('-');
    }
};

// Esporta globalmente
Object.assign(window, {
    matchPreview: window.matchPreview
});

console.log('matchPreview.js loaded successfully');
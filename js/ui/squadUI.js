// squadUI.js

/*
Include:

Rendering della rosa
Gestione della formazione
Drag and drop dei giocatori
Aggiornamento delle statistiche
Gestione degli slot in campo
*/

window.squadUI = {
	init: function() {
		// Setup dei listener per la formazione
		this.setupFormationListeners();
		
		// Carica la formazione salvata
		const team = getMyTeam();
		if (team && (team.tactics?.formation || team.formation)) {
			const formationSelect = document.getElementById('tacticsFormation');
			if (formationSelect) {
				formationSelect.value = team.tactics?.formation || team.formation;
                this.updateStartingXI(team);
			}
		}

    // Wire buttons for autopick and clear (with fallback to old IDs)
    const autoBtn = document.getElementById('autopick') || document.getElementById('autoPickXI');
    const clearBtn = document.getElementById('clear') || document.getElementById('clearXI');
        if (autoBtn) {
            autoBtn.addEventListener('click', () => {
                const my = getMyTeam();
                this.autoPickXIAndBench(my);
                this.renderSquadTab();
                saveState();
            });
        }
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                const my = getMyTeam();
                this.clearStartingXI(my);
                this.renderSquadTab();
                saveState();
            });
        }
	},
	
    // Rendering principale della tab squadra
    renderSquadTab: function() {
        const myTeam = getMyTeam();
        if (!myTeam || !myTeam.players) {
            console.error('Team non inizializzato correttamente');
            return;
        }

        this.updateSquadStats(myTeam);
        this.renderRoster(myTeam);
        this.updateStartingXI(myTeam);
    },

    // Aggiorna le statistiche della squadra
    updateSquadStats: function(team) {
        const stats = {
            totalPlayers: team.players.length,
            avgAge: Math.round(team.players.reduce((sum, p) => sum + p.age, 0) / team.players.length),
            avgOvr: Math.round(team.players.reduce((sum, p) => sum + p.overall, 0) / team.players.length)
        };

        commonUI.updateElement('totalPlayers', stats.totalPlayers);
        commonUI.updateElement('avgAge', stats.avgAge);
        commonUI.updateElement('avgOvr', stats.avgOvr);
    },

    // Rendering della rosa completa
    renderRoster: function(team) {
        const rosterTable = document.getElementById('fullRoster');
        const tbody = rosterTable.querySelector('tbody');
        tbody.innerHTML = '';

        // Raggruppa i giocatori per ruolo
        const players = {
            GK: team.players.filter(p => p.roles[0] === 'GK'),
            DF: team.players.filter(p => p.roles[0].startsWith('D')),
            MF: team.players.filter(p => p.roles[0].startsWith('M')),
            FW: team.players.filter(p => p.roles[0].startsWith('F') || p.roles[0] === 'ST')
        };

        // Rendering per ogni sezione
        Object.entries(GAME_CONSTANTS.ROLES.SECTIONS).forEach(([key, title]) => {
            if (players[key].length > 0) {
                tbody.appendChild(commonUI.createSectionHeader(title, players[key].length));
                tbody.appendChild(commonUI.createTableHeader(key === 'GK'));
                players[key].forEach(player => {
                    const row = commonUI.createPlayerRow(player, true);
                    row.addEventListener('dragstart', commonUI.dragAndDrop.handleDragStart);
                    row.addEventListener('dragend', commonUI.dragAndDrop.handleDragEnd);
                    tbody.appendChild(row);
                });
            }
        });
    },

    // Verifica se la formazione è valida (tutti gli 11 posti sono occupati)
    isFormationValid: function(team) {
        const startingPlayers = team.players.filter(p => p.starting);
        
        // Deve avere esattamente 11 giocatori titolari
        if (startingPlayers.length !== 11) {
            return {
                valid: false,
                message: `Formation incomplete: ${startingPlayers.length}/11 players selected`
            };
        }
        
        // Verifica che ci sia almeno un portiere
        const goalkeepers = startingPlayers.filter(p => p.section === 'GK');
        if (goalkeepers.length !== 1) {
            return {
                valid: false,
                message: 'You must select exactly 1 goalkeeper'
            };
        }
        
        // Verifica che ogni posizione sia occupata secondo la formazione
        const formation = team.formation || team.tactics?.formation;
        if (!formation || !GAME_CONSTANTS.POSITION_ROLES[formation]) {
            return {
                valid: false,
                message: 'Invalid formation selected'
            };
        }
        
        const positions = GAME_CONSTANTS.POSITION_ROLES[formation];
        for (const [section, slots] of Object.entries(positions)) {
            const sectionPlayers = startingPlayers.filter(p => p.section === section);
            if (sectionPlayers.length !== slots.length) {
                return {
                    valid: false,
                    message: `Formation error: ${section} section has ${sectionPlayers.length}/${slots.length} players`
                };
            }
        }
        
        return {
            valid: true,
            message: 'Formation is complete and valid'
        };
    },

    // Aggiorna la visualizzazione in campo
    updateStartingXI: function(team) {
        if (!window.GAME_CONSTANTS || !window.GAME_CONSTANTS.POSITION_ROLES) {
            console.error('GAME_CONSTANTS non è stato caricato correttamente');
            return;
        }

        const formation = document.getElementById('tacticsFormation').value;
        const startingXI = document.getElementById('startingXI');
        startingXI.innerHTML = '';

        Object.entries(GAME_CONSTANTS.POSITION_ROLES[formation]).forEach(([section, positions]) => {
            positions.forEach((pos, index) => {
                const slot = this.createPositionSlot(pos, section, index);
                const player = team.players.find(p => 
                    p.starting && 
                    p.positionIndex === index && 
                    p.section === section
                );

                if (player) {
                    this.addPlayerToSlot(slot, player, pos.natural);
                }

                startingXI.appendChild(slot);
            });
        });
    },

    // Crea uno slot posizione nel campo
    createPositionSlot: function(pos, section, index) {
        const slot = document.createElement('div');
        slot.className = 'position-slot';
        slot.dataset.section = section;
        slot.dataset.index = index;
        slot.dataset.naturalRoles = JSON.stringify(pos.natural);
        slot.dataset.roles = pos.natural.join('/');
        slot.style.left = `${pos.x}%`;
        slot.style.top = `${pos.y}%`;

        slot.addEventListener('dragover', commonUI.dragAndDrop.handleDragOver);
        slot.addEventListener('drop', (e) => this.handlePositionDrop(e, slot));
        slot.addEventListener('dragleave', commonUI.dragAndDrop.handleDragLeave);

        return slot;
    },

    // Aggiunge un giocatore a uno slot
	addPlayerToSlot: function(slot, player, naturalRoles) {
		const isNatural = commonUI.dragAndDrop.isPlayerNaturalInPosition(player, naturalRoles);
		const playerEl = document.createElement('div');
		
		playerEl.className = `field-player ${isNatural ? '' : 'out-of-position'}`;
		playerEl.draggable = true;
		playerEl.dataset.playerId = player.id;
		
		const names = player.nome.split(' ');
		const displayName = names.length > 1 ? `${names[0][0]}. ${names[1]}` : player.nome;
		
		const roleClass = `role-${player.roles[0]}`;
		
		playerEl.innerHTML = `
			<div class="player-number ${roleClass} ${isNatural ? '' : 'out-of-position'}">${player.number}</div>
			<div class="player-name">${displayName}</div>
			${!isNatural ? '<div class="out-of-position-marker">⚠</div>' : ''}
		`;

		playerEl.addEventListener('dragstart', commonUI.dragAndDrop.handleDragStart);
		playerEl.addEventListener('dragend', commonUI.dragAndDrop.handleDragEnd);
		
		slot.appendChild(playerEl);
	},

    // Gestisce il drop di un giocatore in una posizione
    handlePositionDrop: function(e, slot) {
        e.preventDefault();
        slot.classList.remove('drag-over');
        
        const playerId = e.dataTransfer.getData('text/plain');
        const team = getMyTeam();
        const player = team.players.find(p => p.id === playerId);
        if (!player) return;

        const section = slot.dataset.section;
        const index = parseInt(slot.dataset.index);
        const naturalRoles = JSON.parse(slot.dataset.naturalRoles);

        if (!commonUI.dragAndDrop.isPlayerNaturalInPosition(player, naturalRoles)) {
            if (!confirm('Questo giocatore giocherà fuori ruolo con una penalità del 20%. Continuare?')) {
                return;
            }
        }

        this.handlePlayerSwap(slot, player, section, index, team);
        this.updateStartingXI(team);
        saveState();
    },

    // Gestisce lo scambio di giocatori
    handlePlayerSwap: function(slot, newPlayer, section, index, team) {
        const currentPlayerEl = slot.querySelector('.field-player');
        if (currentPlayerEl) {
            const currentPlayerId = currentPlayerEl.dataset.playerId;
            const currentPlayer = team.players.find(p => p.id === currentPlayerId);
            if (currentPlayer) {
                if (newPlayer.starting) {
                    currentPlayer.positionIndex = newPlayer.positionIndex;
                    currentPlayer.section = newPlayer.section;
                    currentPlayer.starting = true;
                } else {
                    currentPlayer.starting = false;
                    currentPlayer.positionIndex = undefined;
                    currentPlayer.section = undefined;
                }
                this.updatePlayerRow(currentPlayer);
            }
        }

        newPlayer.starting = true;
        newPlayer.section = section;
        newPlayer.positionIndex = index;
        // Se il giocatore era in panchina, rimuovilo dalla panchina
        if (typeof newPlayer.benchIndex === 'number') {
            newPlayer.benchIndex = undefined;
        }
        this.updatePlayerRow(newPlayer);
    },

    // Aggiorna la riga di un giocatore nella tabella
    updatePlayerRow: function(player) {
        const row = document.querySelector(`tr[data-player-id="${player.id}"]`);
        if (row) {
            const isOnBench = typeof player.benchIndex === 'number';
            commonUI.toggleClass(row, 'player-starting', !!player.starting);
            commonUI.toggleClass(row, 'player-bench', isOnBench);
            const statusCell = row.querySelector('td:last-child');
            if (statusCell) {
                statusCell.innerHTML = player.starting ? 
                    '<span class="status-starting">Starting</span>' : 
                    (isOnBench ? '<span class="status-bench">Bench</span>' : '<span class="status-sub">Sub</span>');
            }
        }
    },

    // Pulisce gli 11 titolari (mantiene la panchina intatta)
    clearStartingXI: function(team) {
        team.players.forEach(p => {
            if (p.starting) {
                p.starting = false;
                p.positionIndex = undefined;
                p.section = undefined;
            }
        });
    },

    // Auto-pick per XI e panchina con massimo 1 portiere in panchina
    autoPickXIAndBench: function(team) {
        if (!team) return;

        // Reset: mantieni benchIndex, azzera solo XI
        team.players.forEach(p => {
            p.starting = false;
            p.positionIndex = undefined;
            p.section = undefined;
        });

        // Scegli miglior 11 in base alla formazione corrente
        if (!team.formation && team.tactics?.formation) team.formation = team.tactics.formation;
        if (!team.formation) team.formation = '442';
        this.selectBestEleven(team);

        // Costruisci insieme giocatori già scelti
        const starters = new Set(team.players.filter(p => p.starting).map(p => p.id));
        // Svuota la panchina
        team.players.forEach(p => { p.benchIndex = undefined; });

        // Ordina i rimanenti per overall desc
        const remaining = team.players.filter(p => !starters.has(p.id)).sort((a,b) => b.overall - a.overall);

        let benchCount = 0;
        let gkOnBench = 0;
        for (const p of remaining) {
            if (benchCount >= 7) break;
            const isGK = (Array.isArray(p.roles) ? p.roles : [p.ruolo || p.primaryRole]).includes('GK') || p.roles?.[0] === 'GK' || p.ruolo === 'GK' || p.primaryRole === 'GK';
            if (isGK) {
                if (gkOnBench >= 1) continue;
                gkOnBench++;
            }
            p.benchIndex = benchCount;
            benchCount++;
        }

        this.updateStartingXI(team);
        // Aggiorna righe tabella
        team.players.forEach(p => this.updatePlayerRow(p));
    },

    // Setup degli event listener per la formazione
setupFormationListeners: function() {
    document.getElementById('tacticsFormation').addEventListener('change', (e) => {
        const team = getMyTeam();
        const newFormation = e.target.value;
        if (!team.tactics) {
            team.tactics = {};
        }
        team.tactics.formation = newFormation;
        team.formation = newFormation;
        
        // Ottieni il numero di slot per ogni reparto nella nuova formazione
        const newPositions = GAME_CONSTANTS.POSITION_ROLES[newFormation];
        const slotsPerSection = {
            GK: newPositions.GK.length,
            DF: newPositions.DF.length,
            MF: newPositions.MF.length,
            FW: newPositions.FW.length
        };

        // Resetta tutti i giocatori starting e mantieni solo quelli necessari per sezione
        Object.entries(slotsPerSection).forEach(([section, maxSlots]) => {
            // Filtra i giocatori starting per sezione e ordinali per positionIndex
            const sectionPlayers = team.players
                .filter(p => p.starting && p.section === section)
                .sort((a, b) => a.positionIndex - b.positionIndex);
            
            // Se ci sono più giocatori del necessario, rimuovi quelli in eccesso
            // partendo dall'ultimo
            if (sectionPlayers.length > maxSlots) {
                // Prendi gli ultimi giocatori in eccesso
                sectionPlayers.slice(-1 * (sectionPlayers.length - maxSlots)).forEach(player => {
                    player.starting = false;
                    player.positionIndex = undefined;
                    player.section = undefined;
                    
                    // Aggiorna la riga del giocatore nella tabella
                    this.updatePlayerRow(player);
                });
            }
        });

        // Aggiorna entrambe le viste
        this.updateStartingXI(team);
        this.renderRoster(team);
        
        // Reinizializza il drag and drop
        const players = document.querySelectorAll('.field-player');
        players.forEach(player => {
            player.draggable = true;
            player.addEventListener('dragstart', commonUI.dragAndDrop.handleDragStart);
            player.addEventListener('dragend', commonUI.dragAndDrop.handleDragEnd);
        });

        const slots = document.querySelectorAll('.position-slot');
        slots.forEach(slot => {
            slot.addEventListener('dragover', commonUI.dragAndDrop.handleDragOver);
            slot.addEventListener('drop', (e) => this.handlePositionDrop(e, slot));
            slot.addEventListener('dragleave', commonUI.dragAndDrop.handleDragLeave);
        });

        saveState();
    });
},

    renderOtherTeamsTab: function() {
        const teamSelector = document.getElementById('teamSelector');
        teamSelector.innerHTML = '<option value="">Select Team</option>';
        
        // Popola il selettore delle squadre
        STATE.teams
            .filter(team => team.name !== STATE.teamName)
            .forEach(team => {
                teamSelector.innerHTML += `
                    <option value="${team.name}">${team.name}</option>
                `;
            });

        // Event listener per il cambio squadra
        teamSelector.addEventListener('change', (e) => {
            const selectedTeam = STATE.teams.find(t => t.name === e.target.value);
            if (!selectedTeam) {
                this.clearOtherTeamView();
                return;
            }
            this.displayOtherTeam(selectedTeam);
        });

        // Pulisci la vista iniziale
        this.clearOtherTeamView();
    },

    clearOtherTeamView: function() {
        // Resetta tutti i campi
        commonUI.updateElement('otherTotalPlayers', '0');
        commonUI.updateElement('otherAvgAge', '0');
        commonUI.updateElement('otherAvgOvr', '0');
        commonUI.updateElement('otherFormation', '-');
        
        document.getElementById('otherRoster').querySelector('tbody').innerHTML = '';
        document.getElementById('otherStartingXI').innerHTML = '';
    },

displayOtherTeam: function(team) {
	team.formation = this.determineBestFormation(team);
    // Aggiorna statistiche
    const stats = {
        totalPlayers: team.players.length,
        avgAge: (team.players.reduce((sum, p) => sum + p.age, 0) / team.players.length).toFixed(1),
        avgOvr: (team.players.reduce((sum, p) => sum + p.overall, 0) / team.players.length).toFixed(1)
    };

    commonUI.updateElement('otherTotalPlayers', stats.totalPlayers);
    commonUI.updateElement('otherAvgAge', stats.avgAge);
    commonUI.updateElement('otherAvgOvr', stats.avgOvr);
    commonUI.updateElement('otherFormation', team.formation);

    // Seleziona il miglior 11
    this.selectBestEleven(team);

    // Renderizza la rosa
    this.renderOtherTeamRoster(team);
    
    // Renderizza la formazione
    this.renderOtherTeamFormation(team);
},

// Aggiungi questa nuova funzione per determinare il miglior modulo
determineBestFormation: function(team) {
    const formations = ['442', '433', '352', '451', '541'];
    let bestFormation = '442';
    let bestScore = -1;

    formations.forEach(formation => {
        // Reset dei giocatori
        team.players.forEach(p => {
            p.starting = false;
            p.positionIndex = undefined;
            p.section = undefined;
        });

        const score = this.calculateFormationScore(team, formation);
        if (score > bestScore) {
            bestScore = score;
            bestFormation = formation;
        }
    });

    return bestFormation;
},

calculateFormationScore: function(team, formation) {
    const positions = GAME_CONSTANTS.POSITION_ROLES[formation];
    let totalScore = 0;
    let filledPositions = 0;

    // Per ogni sezione (GK, DF, MF, FW)
    Object.entries(positions).forEach(([section, slots]) => {
        let availablePlayers = [...team.players].filter(p => !p.starting);

        slots.forEach((pos) => {
            if (availablePlayers.length === 0) return;

            // Trova il miglior giocatore per questa posizione
            const bestPlayer = availablePlayers.reduce((best, current) => {
                const currentFit = this.calculatePositionFit(current, pos.natural);
                const bestFit = best ? this.calculatePositionFit(best, pos.natural) : -1;
                return currentFit > bestFit ? current : best;
            }, null);

            if (bestPlayer) {
                totalScore += this.calculatePositionFit(bestPlayer, pos.natural);
                filledPositions++;
                availablePlayers = availablePlayers.filter(p => p.id !== bestPlayer.id);
            }
        });
    });

    // Penalizza formazioni che non riusciamo a riempire completamente
    if (filledPositions < 11) {
        totalScore = totalScore * (filledPositions / 11);
    }

    return totalScore;
},

// Aggiungi questa nuova funzione per selezionare il miglior 11
selectBestEleven: function(team) {
    // Reset tutti i giocatori
    team.players.forEach(p => {
        p.starting = false;
        p.positionIndex = undefined;
        p.section = undefined;
    });

    const formation = team.formation;
    const positions = GAME_CONSTANTS.POSITION_ROLES[formation];

    // Per ogni sezione (GK, DF, MF, FW)
    Object.entries(positions).forEach(([section, slots]) => {
        // Filtra i giocatori disponibili per quella sezione
        let availablePlayers = team.players.filter(p => {
            if (p.starting) return false; // Salta se già titolare
            
            // Verifica se il giocatore può giocare in quella sezione
            if (section === 'GK') return p.roles.includes('GK');
            if (section === 'DF') return p.roles.some(r => r.startsWith('D'));
            if (section === 'MF') return p.roles.some(r => r.startsWith('M'));
            if (section === 'FW') return p.roles.some(r => r.startsWith('F')) || p.roles.includes('ST');
            return false;
        });

        // Per ogni slot in quella sezione
        slots.forEach((pos, index) => {
            if (availablePlayers.length === 0) return;

            // Trova il miglior giocatore per quella posizione
            let bestPlayer = availablePlayers.reduce((best, current) => {
                const currentFit = this.calculatePositionFit(current, pos.natural);
                const bestFit = best ? this.calculatePositionFit(best, pos.natural) : -1;
                return currentFit > bestFit ? current : best;
            }, null);

            if (bestPlayer) {
                bestPlayer.starting = true;
                bestPlayer.section = section;
                bestPlayer.positionIndex = index;
                
                // Rimuovi il giocatore dalla lista dei disponibili
                availablePlayers = availablePlayers.filter(p => p.id !== bestPlayer.id);
            }
        });
    });
},

// Funzione helper per calcolare quanto bene un giocatore si adatta a una posizione
calculatePositionFit: function(player, naturalRoles) {
    // Base fit è l'overall del giocatore
    let fit = player.overall;

    // Verifica se il giocatore è nel suo ruolo naturale
    const isNaturalRole = player.roles.some(r => naturalRoles.includes(r));
    
    // Verifica se il giocatore è completamente fuori ruolo
    const isCompletelyOutOfPosition = !player.roles.some(r => {
        return naturalRoles.some(nr => 
            r.startsWith(nr[0]) || // Stessa categoria (D, M, F)
            (r === 'ST' && nr.startsWith('F')) || // Striker può giocare come forward
            (r.startsWith('F') && nr === 'ST') // Forward può giocare come striker
        );
    });

    if (isNaturalRole) {
        // Bonus per ruolo naturale
        fit += 5;
    } else if (isCompletelyOutOfPosition) {
        // Penalità del 20% per fuori ruolo
        fit = fit * 0.8;
    } else {
        // Penalità minore (10%) per ruolo simile ma non naturale
        fit = fit * 0.9;
    }

    // Bonus/Malus per forma
    fit += (player.form - 80) / 2;

    return Math.round(fit);
},

    renderOtherTeamRoster: function(team) {
        const tbody = document.getElementById('otherRoster').querySelector('tbody');
        tbody.innerHTML = '';

        // Raggruppa i giocatori per ruolo
        const players = {
            GK: team.players.filter(p => p.roles[0] === 'GK'),
            DF: team.players.filter(p => p.roles[0].startsWith('D')),
            MF: team.players.filter(p => p.roles[0].startsWith('M')),
            FW: team.players.filter(p => p.roles[0].startsWith('F') || p.roles[0] === 'ST')
        };

        // Rendering per ogni sezione
        Object.entries(GAME_CONSTANTS.ROLES.SECTIONS).forEach(([key, title]) => {
            if (players[key].length > 0) {
                tbody.appendChild(commonUI.createSectionHeader(title, players[key].length));
                tbody.appendChild(commonUI.createTableHeader(key === 'GK'));
                players[key].forEach(player => {
                    tbody.appendChild(commonUI.createPlayerRow(player, false));
                });
            }
        });
    },

renderOtherTeamFormation: function(team) {
    const container = document.getElementById('otherStartingXI');
    container.innerHTML = '';
    container.classList.add('pitch-view');

    if (!GAME_CONSTANTS.POSITION_ROLES[team.formation]) {
        console.error('Formazione non valida:', team.formation);
        return;
    }

    Object.entries(GAME_CONSTANTS.POSITION_ROLES[team.formation]).forEach(([section, positions]) => {
        positions.forEach((pos, index) => {
            const player = team.players.find(p => 
                p.starting && 
                p.positionIndex === index && 
                p.section === section
            );

            // Wrapper per il dot e il label
            const wrapper = document.createElement('div');
            wrapper.className = 'player-position-wrapper';
            wrapper.style.left = `${pos.x}%`;
            wrapper.style.top = `${pos.y}%`;

            // Dot per il numero
            const dot = document.createElement('div');
            dot.className = 'player-dot';

            if (player) {
                const isNatural = player.roles.some(r => pos.natural.includes(r));
                if (!isNatural) {
                    dot.classList.add('out-of-position');
                }
                dot.classList.add(`role-${player.ruolo}`);

                // Solo il numero nel dot
                const numberDiv = document.createElement('div');
                numberDiv.className = 'player-number';
                numberDiv.textContent = player.number;
                dot.appendChild(numberDiv);

                // Formatta il nome per il label
                const names = player.nome.split(' ');
                const formattedName = names.length > 1 
                    ? `${names[0][0]}.${names[1]}`
                    : player.nome;

                // Label sotto con nome e ruolo
                const label = document.createElement('div');
                label.className = 'player-label';
                label.textContent = `${formattedName} (${player.ruolo})`;
                
                wrapper.appendChild(dot);
                wrapper.appendChild(label);
                
                wrapper.title = `${player.nome} (${player.overall})`;
            } else {
                dot.classList.add('empty');
                wrapper.title = pos.natural.join('/');
                wrapper.appendChild(dot);
            }

            container.appendChild(wrapper);
        });
    });
}

};

// Verifica che squadUI sia stato caricato
console.log('squadUI loaded successfully');
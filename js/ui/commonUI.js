// commonUI.js

/*
Include:

Funzioni per la gestione delle tabelle
Funzioni per il rating dei giocatori
Funzioni per il drag and drop
Funzioni di formattazione
Funzioni di utilità per l'UI
*/

window.commonUI = {
    // Funzione per ottenere la classe di rating appropriata
    getRatingClass: function(overall) {
        const { RATING_THRESHOLDS, RATING_CLASSES } = GAME_CONSTANTS.UI;
        
        if (overall >= RATING_THRESHOLDS.HIGH) return RATING_CLASSES.HIGH;
        if (overall >= RATING_THRESHOLDS.GOOD) return RATING_CLASSES.GOOD;
        if (overall >= RATING_THRESHOLDS.AVERAGE) return RATING_CLASSES.AVERAGE;
        return RATING_CLASSES.LOW;
    },

    // Funzione per creare header di sezione nelle tabelle
    createSectionHeader: function(title, count) {
        const tr = document.createElement('tr');
        tr.className = 'position-header';
        tr.innerHTML = `<td colspan="12"><strong>${title}</strong> (${count})</td>`;
        return tr;
    },

    // Funzione per creare header della tabella
    createTableHeader: function(isGK = false) {
        const tr = document.createElement('tr');
        const headers = isGK ? GAME_CONSTANTS.UI.HEADERS.GK : GAME_CONSTANTS.UI.HEADERS.OUTFIELD;

        tr.innerHTML = `
            <th>Name</th>
            <th>Role</th>
            <th>Age</th>
            ${headers.stats.map(stat => 
                `<th title="${stat.tooltip}">${stat.label}</th>`
            ).join('')}
            <th>Form</th>
            <th>OVR</th>
            <th>Status</th>
        `;
        return tr;
    },

    // Funzione per creare una riga giocatore generica
    createPlayerRow: function(player, isDraggable = false) {
        const tr = document.createElement('tr');
        if (isDraggable) {
            tr.draggable = true;
            tr.dataset.playerId = player.id;
        }

        const overallClass = this.getRatingClass(player.overall);
        const isGK = player.roles[0] === 'GK';
        const headers = isGK ? GAME_CONSTANTS.UI.HEADERS.GK : GAME_CONSTANTS.UI.HEADERS.OUTFIELD;
        const isStarting = !!player.starting;
        const isOnBench = typeof player.benchIndex === 'number';

        tr.innerHTML = `
            <td>${player.number} ${player.nome}</td>
            <td>${player.roles.join('/')}</td>
            <td>${player.age}</td>
            ${headers.stats.map(stat => 
                `<td><span class="player-stat" title="${stat.tooltip}">${Math.round(player[stat.key])}</span></td>`
            ).join('')}
            <td>${player.form}%</td>
            <td><span class="player-overall ${overallClass}">${player.overall}</span></td>
            <td>${isStarting ? '<span class="status-starting">Starting</span>' : 
                               (isOnBench ? '<span class="status-bench">Bench</span>' : '<span class="status-sub">Sub</span>')}</td>
        `;
        if (isStarting) tr.classList.add('player-starting');
        if (isOnBench) tr.classList.add('player-bench');
        
        return tr;
    },

    // Funzioni per gestire il drag and drop
    dragAndDrop: {
        handleDragStart: function(e) {
            e.target.classList.add('dragging');
            e.dataTransfer.setData('text/plain', e.target.dataset.playerId);
        },

        handleDragEnd: function(e) {
            e.target.classList.remove('dragging');
        },

        handleDragOver: function(e) {
            e.preventDefault();
            e.currentTarget.classList.add('drag-over');
        },

        handleDragLeave: function(e) {
            e.currentTarget.classList.remove('drag-over');
        },

        isPlayerNaturalInPosition: function(player, naturalRoles) {
            return player.roles.some(role => naturalRoles.includes(role));
        }
    },

    // Funzione per formattare valori monetari
    formatCurrency: function(value) {
        return `€${value.toFixed(2)}M`;
    },

    // Funzione per aggiornare lo stato di un elemento UI
    updateElement: function(elementId, value, prefix = '', suffix = '') {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = `${prefix}${value}${suffix}`;
        }
    },

    // Funzione per mostrare/nascondere elementi
    toggleElement: function(elementId, show) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = show ? 'block' : 'none';
        }
    },

    // Funzione per aggiungere/rimuovere classi
    toggleClass: function(element, className, add) {
        if (element) {
            element.classList[add ? 'add' : 'remove'](className);
        }
    },

    // Funzione per validare input
    validateInput: function(value, min, max) {
        const num = parseFloat(value);
        return !isNaN(num) && num >= min && num <= max;
    }
};

// Verifica che commonUI sia stato caricato
console.log('commonUI loaded successfully');
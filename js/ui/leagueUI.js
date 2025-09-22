// leagueUI.js

/*
	Include:
	
	Visualizzazione della classifica
	Visualizzazione delle partite
	Navigazione tra le giornate
	Statistiche del campionato (capocannonieri, assist, etc.)
	Gestione dei risultati
*/

window.leagueUI = {
    // Rendering principale della tab campionato
    renderLeagueTab: function() {
        if (!this.validateLeagueData()) {
            console.error('Dati lega non inizializzati correttamente');
            return;
		}
		
        this.renderTable();
        this.renderFixtures();
        this.renderStats();
	},
	
    // Validazione dei dati della lega
    validateLeagueData: function() {
        return STATE.league && 
		STATE.league.table && 
		STATE.league.fixtures &&
		Array.isArray(STATE.league.fixtures);
	},
	
    // Rendering della classifica
    renderTable: function() {
        const tableEl = document.getElementById('leagueTable');
        if (!tableEl) return;
		
        try {
            const tableData = Object.values(STATE.league.table)
			.sort((a, b) => this.sortTeams(a, b));
			
            tableEl.innerHTML = `
			<tr>
			<th>Pos</th>
			<th>Team</th>
			<th title="Games Played">GP</th>
			<th title="Points">Pts</th>
			<th title="Wins">W</th>
			<th title="Draws">D</th>
			<th title="Losses">L</th>
			<th title="Goals For">GF</th>
			<th title="Goals Against">GA</th>
			<th title="Goal Difference">GD</th>
			</tr>
			${tableData.map((team, index) => this.createTableRow(team, index + 1)).join('')}
            `;
			} catch (error) {
            console.error('Errore nel rendering della classifica:', error);
            tableEl.innerHTML = '<tr><td colspan="10">Error loading league table</td></tr>';
		}
	},
	
    // Criterio di ordinamento delle squadre
    sortTeams: function(a, b) {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.gd !== a.gd) return b.gd - a.gd;
        if (b.gf !== a.gf) return b.gf - a.gf;
        return a.team.localeCompare(b.team);
	},
	
    // Crea una riga della classifica
    createTableRow: function(team, position) {
        const isMyTeam = team.team === STATE.teamName;
        return `
		<tr class="${isMyTeam ? 'my-team' : ''}">
		<td>${position}</td>
		<td>${team.team}</td>
		<td>${team.pld || 0}</td>
		<td><strong>${team.pts || 0}</strong></td>
		<td>${team.w || 0}</td>
		<td>${team.d || 0}</td>
		<td>${team.l || 0}</td>
		<td>${team.gf || 0}</td>
		<td>${team.ga || 0}</td>
		<td>${team.gd || 0}</td>
		</tr>
        `;
	},
	
	sortFixturesList: function(fixtures) {
		if (!fixtures || fixtures.length === 0) {
			return [];
		}
		
		// Trova le tue partite
		const myTeamGames = fixtures.filter(f => 
			STATE.teams[f[0]].name === STATE.teamName || 
			STATE.teams[f[1]].name === STATE.teamName
		);
		
		// Trova le altre partite
		const otherGames = fixtures.filter(f => 
			STATE.teams[f[0]].name !== STATE.teamName && 
			STATE.teams[f[1]].name !== STATE.teamName
		);
		
		return [...fixtures];
	},
	
	shuffleArray: function(array) {
		for (let i = array.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[array[i], array[j]] = [array[j], array[i]];
		}
		return array;
	},	
	
	renderFixtures: function() {
		const fixturesEl = document.getElementById('fixtures');
		const navigationEl = document.querySelector('.fixtures-navigation');
		if (!fixturesEl || !navigationEl) return;
		
		try {
			const currentWeek = STATE.league.currentViewWeek ?? (STATE.league.week - 1);
            
			const totalWeeks = STATE.league.fixtures.length;
			
			// Log per debug
			console.log('Current week:', currentWeek + 1);
			
			// Rendering della navigazione
			this.createFixturesNavigation(currentWeek, totalWeeks);
			
			// Prendi le partite della settimana corrente
			const fixtures = STATE.league.fixtures[currentWeek] || [];
			
			console.log('Original fixtures:', fixtures.map(f => ({
				home: STATE.teams[f[0]].name,
				away: STATE.teams[f[1]].name
			})));
			
			// Ordina le partite (mette le tue partite per prime)
			const sortedFixtures = this.sortFixturesList(fixtures);
			
			console.log('Sorted fixtures:', sortedFixtures.map(f => ({
				home: STATE.teams[f[0]].name,
				away: STATE.teams[f[1]].name
			})));
			
			// Crea il contenuto HTML
			fixturesEl.innerHTML = this.createFixturesList(sortedFixtures);
			
			} catch (error) {
			console.error('Errore nel rendering delle partite:', error);
			fixturesEl.innerHTML = '<div class="error">Error loading fixtures</div>';
		}
	},

	
    createFixturesNavigation: function(currentWeek, totalWeeks) {
        const navigationEl = document.querySelector('.fixtures-navigation');
        if (!navigationEl) return;
		
        navigationEl.innerHTML = `
		<button class="prev-week" ${currentWeek === 0 ? 'disabled' : ''}>
		Previous Week
		</button>
		<span>Week ${currentWeek + 1}/${totalWeeks}</span>
		<button class="next-week" ${currentWeek >= totalWeeks - 1 ? 'disabled' : ''}>
		Next Week
		</button>
        `;
		
        // Aggiungi event listeners
        navigationEl.querySelector('.prev-week').addEventListener('click', () => {
            if (currentWeek > 0) {
                this.changeWeek(currentWeek - 1);
			}
		});
		
        navigationEl.querySelector('.next-week').addEventListener('click', () => {
            if (currentWeek < totalWeeks - 1) {
                this.changeWeek(currentWeek + 1);
			}
		});
	},
	
    changeWeek: function(week) {
        if (week >= 0 && week < STATE.league.fixtures.length) {
            STATE.league.currentViewWeek = week;
            this.renderFixtures();
		}
	},
	
	createFixturesList: function(fixtures) {
		if (!fixtures || fixtures.length === 0) {
			return '<div class="no-fixtures">No fixtures for this week</div>';
		}
		
		return fixtures.map(fixture => {
			const [homeIdx, awayIdx] = fixture;
			const home = STATE.teams[homeIdx];
			const away = STATE.teams[awayIdx];
			
			if (!home || !away) return '';
			
			const result = this.getMatchResult(homeIdx, awayIdx);
			return this.createFixtureItem(home, away, result);
		}).join('');
	},
	
	createFixtureItem: function(home, away, result) {
		const homeClass = home.name === STATE.teamName ? 'my-team' : '';
		const awayClass = away.name === STATE.teamName ? 'my-team' : '';
		
		return `
        <div class="fixture-item ${result ? 'played' : ''}">
		<div class="team home ${homeClass}">
		${home.name || 'Unknown Team'}
		</div>
		<div class="score">
		${result ? `${result.homeGoals} - ${result.awayGoals}` : 'vs'}
		</div>
		<div class="team away ${awayClass}">
		${away.name || 'Unknown Team'}
		</div>
        </div>
		`;
	},
	
	
	
	
    // Ottiene il risultato di una partita
    getMatchResult: function(homeIdx, awayIdx) {
        if (!STATE.league.results) return null;
        return STATE.league.results.find(r => 
            r.week === STATE.league.week - 1 && 
            r.home === homeIdx && 
            r.away === awayIdx
		);
	},
	
	
    // Rendering delle statistiche
    renderStats: function() {
        const statsEl = document.getElementById('leagueStats');
        if (!statsEl) return;
		
        const stats = this.calculateLeagueStats();
        statsEl.innerHTML = `
		<div class="stats-section">
		<h3>Top Scorers</h3>
		${this.createStatsTable(stats.topScorers, ['Player', 'Team', 'Goals'])}
		</div>
		<div class="stats-section">
		<h3>Top Assisters</h3>
		${this.createStatsTable(stats.topAssisters, ['Player', 'Team', 'Assists'])}
		</div>
		<div class="stats-section">
		<h3>Best Ratings</h3>
		${this.createStatsTable(stats.bestRatings, ['Player', 'Team', 'Rating'])}
		</div>
        `;
	},
	
    // Calcola le statistiche del campionato
    calculateLeagueStats: function() {
        const allPlayers = STATE.teams.flatMap(team => 
            team.players.map(p => ({...p, team: team.name}))
		);
		
        return {
            topScorers: allPlayers
			.sort((a, b) => (b.stats?.goals || 0) - (a.stats?.goals || 0))
			.slice(0, 10),
            topAssisters: allPlayers
			.sort((a, b) => (b.stats?.assists || 0) - (a.stats?.assists || 0))
			.slice(0, 10),
            bestRatings: allPlayers
			.filter(p => p.stats?.games > 0)
			.sort((a, b) => (b.stats?.rating / b.stats?.games) - (a.stats?.rating / a.stats?.games))
			.slice(0, 10)
		};
	},
	
    // Crea una tabella di statistiche
    createStatsTable: function(data, headers) {
        return `
		<table class="stats-table">
		<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
		${data.map((item, index) => `
		<tr>
		<td>${index + 1}. ${item.nome}</td>
		<td>${item.team}</td>
		<td>${this.getStatValue(item, headers[2])}</td>
		</tr>
		`).join('')}
		</table>
        `;
	},
	
    // Ottiene il valore di una statistica
    getStatValue: function(player, statType) {
        switch (statType) {
            case 'Goals':
			return player.stats?.goals || 0;
            case 'Assists':
			return player.stats?.assists || 0;
            case 'Rating':
			const games = player.stats?.games || 1;
			return ((player.stats?.rating || 0) / games).toFixed(1);
            default:
			return 0;
		}
	},
	
    // Setup dei listener per gli eventi
    setupFixturesListeners: function() {
        // Aggiungi qui eventuali listener per interazioni con le partite
	},
	
	updateLeagueTable: function(result) {
		const homeTeam = STATE.teams[result.home].name;
		const awayTeam = STATE.teams[result.away].name;
		
		// Aggiorna statistiche squadra in casa
		const homeStats = STATE.league.table[homeTeam];
		homeStats.pld++;
		homeStats.gf += result.homeGoals;
		homeStats.ga += result.awayGoals;
		homeStats.gd = homeStats.gf - homeStats.ga;
		
		// Aggiorna statistiche squadra in trasferta
		const awayStats = STATE.league.table[awayTeam];
		awayStats.pld++;
		awayStats.gf += result.awayGoals;
		awayStats.ga += result.homeGoals;
		awayStats.gd = awayStats.gf - awayStats.ga;
		
		// Assegna punti
		if (result.homeGoals > result.awayGoals) {
			homeStats.w++;
			homeStats.pts += 3;
			awayStats.l++;
			} else if (result.homeGoals < result.awayGoals) {
			awayStats.w++;
			awayStats.pts += 3;
			homeStats.l++;
			} else {
			homeStats.d++;
			awayStats.d++;
			homeStats.pts++;
			awayStats.pts++;
		}
	},
	
	getMatchResult: function(homeIdx, awayIdx) {
		if (!STATE.league.results) return null;
		
		// Cerca il risultato per questa combinazione di squadre nella settimana visualizzata
		const currentViewWeek = STATE.league.currentViewWeek !== undefined 
		? STATE.league.currentViewWeek 
		: STATE.league.week - 1;
		
		return STATE.league.results.find(r => 
			r.week === currentViewWeek + 1 && // +1 perché le settimane partono da 1 non da 0
			r.home === homeIdx && 
			r.away === awayIdx
		);
	}



};

// Verifica che leagueUI sia stato caricato
console.log('leagueUI loaded successfully');

Object.assign(window, {
    leagueUI: window.leagueUI,
    updateLeagueTable: window.leagueUI.updateLeagueTable.bind(window.leagueUI),
	getMatchResult: window.leagueUI.getMatchResult.bind(window.leagueUI)
});
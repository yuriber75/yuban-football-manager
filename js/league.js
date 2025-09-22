// league.js
console.log('Loading league.js...');

window.league = {
    init: function() {
        console.log('Initializing league system...');
        if (!STATE.league) {
            STATE.league = {
                week: 1,
                fixtures: [],
                table: {},
                results: []
            };
        }
    },

    applyResult: function(res) {
        const h = STATE.league.table[res.home];
        const a = STATE.league.table[res.away];

        h.pld++;
        a.pld++;
        h.gf += res.hg;
        h.ga += res.ag;
        a.gf += res.ag;
        a.ga += res.hg;
        h.gd = h.gf - h.ga;
        a.gd = a.gf - a.ga;

        if (res.hg > res.ag) {
            h.w++;
            a.l++;
            h.pts += 3;
        } else if (res.hg < res.ag) {
            a.w++;
            h.l++;
            a.pts += 3;
        } else {
            h.d++;
            a.d++;
            h.pts++;
            a.pts++;
        }
    },

    simulateWeek: function() {
        const weekIdx = STATE.league.week - 1;
        if (weekIdx < 0 || weekIdx >= STATE.league.fixtures.length) return [];

        const fixtures = STATE.league.fixtures[weekIdx];
        const results = fixtures.map(([i, j]) => {
            const home = STATE.teams[i].name;
            const away = STATE.teams[j].name;
            
            const homeStrength = this.calculateTeamStrength(STATE.teams[i]);
            const awayStrength = this.calculateTeamStrength(STATE.teams[j]);
            const diff = (homeStrength - awayStrength) / 100;
            
            const hg = Math.max(0, Math.floor(Math.random() * 4 + diff));
            const ag = Math.max(0, Math.floor(Math.random() * 4 - diff));

            return { home, away, hg, ag };
        });

        results.forEach(r => this.applyResult(r));
        STATE.league.week++;
        return results;
    },

    calculateTeamStrength: function(team) {
        if (!team || !team.players) return 50;
        
        const ratings = team.players.map(p => {
            const overall = (p.speed + p.pass + p.shot + p.def + p.drib) / 5;
            return overall * (p.form / 100);
        });
        
        return ratings.reduce((a, b) => a + b, 0) / ratings.length;
    },

    getLeagueStats: function() {
        const stats = {
            topScorer: { name: '', goals: 0 },
            mostCleanSheets: { name: '', sheets: 0 },
            bestAttack: { team: '', goals: 0 },
            bestDefense: { team: '', conceded: Number.MAX_VALUE }
        };

        STATE.teams.forEach(team => {
            const tableEntry = STATE.league.table[team.name];
            if (tableEntry) {
                if (tableEntry.gf > stats.bestAttack.goals) {
                    stats.bestAttack = { team: team.name, goals: tableEntry.gf };
                }
                if (tableEntry.ga < stats.bestDefense.conceded) {
                    stats.bestDefense = { team: team.name, conceded: tableEntry.ga };
                }
            }

            team.players.forEach(p => {
                if (p.stats && p.stats.goals > stats.topScorer.goals) {
                    stats.topScorer = { name: p.nome, goals: p.stats.goals };
                }
                if (p.ruolo === 'GK' && p.stats && p.stats.cleanSheets > stats.mostCleanSheets.sheets) {
                    stats.mostCleanSheets = { name: p.nome, sheets: p.stats.cleanSheets };
                }
            });
        });

        return stats;
    },

    getCurrentGameweek: function() {
        return {
            week: STATE.league.week,
            fixtures: this.getCurrentFixtures(),
            isLastWeek: STATE.league.week >= STATE.league.fixtures.length
        };
    },

    getCurrentFixtures: function() {
        const weekIdx = STATE.league.week - 1;
        if (weekIdx < 0 || weekIdx >= STATE.league.fixtures.length) return [];
        
        return STATE.league.fixtures[weekIdx].map(([i, j]) => ({
            home: STATE.teams[i].name,
            away: STATE.teams[j].name
        }));
    },

    getTeamSchedule: function(teamName) {
        const schedule = [];
        STATE.league.fixtures.forEach((fixtures, week) => {
            fixtures.forEach(([i, j]) => {
                const home = STATE.teams[i].name;
                const away = STATE.teams[j].name;
                if (home === teamName || away === teamName) {
                    schedule.push({
                        week: week + 1,
                        home,
                        away,
                        played: week < STATE.league.week - 1
                    });
                }
            });
        });
        return schedule;
    },

    simulateToEnd: function() {
        const results = [];
        while (STATE.league.week < STATE.league.fixtures.length) {
            results.push(...this.simulateWeek());
        }
        return results;
    },

    debug: function() {
        console.log('Current week:', STATE.league.week);
        console.log('Fixtures:', this.getCurrentFixtures());
        console.log('League table:', STATE.league.table);
        console.log('Stats:', this.getLeagueStats());
    }
};

// Esporta l'oggetto league e le sue funzioni
Object.assign(window, {
    league: window.league,
    applyResult: window.league.applyResult.bind(window.league),
    simulateWeek: window.league.simulateWeek.bind(window.league),
    calculateTeamStrength: window.league.calculateTeamStrength.bind(window.league),
    getLeagueStats: window.league.getLeagueStats.bind(window.league),
    getCurrentGameweek: window.league.getCurrentGameweek.bind(window.league),
    getCurrentFixtures: window.league.getCurrentFixtures.bind(window.league),
    getTeamSchedule: window.league.getTeamSchedule.bind(window.league),
    simulateToEnd: window.league.simulateToEnd.bind(window.league),
    debugLeague: window.league.debug.bind(window.league)
});
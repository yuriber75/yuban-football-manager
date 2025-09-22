// tactics.js
console.log('Loading tactics.js...');

window.tactics = {
    init: function() {
        console.log('Initializing tactics system...');
    },

	formationBias: function(code) {
		switch (code) {
			case '433':
				return {
					attack: .65,
					press: .45,
					longBall: .35
				};
			case '352':
				return {
					attack: .55,
					press: .70,
					longBall: .30
				};
			case '451':
				return {
					attack: .40,
					press: .35,
					longBall: .20
				};
			case '541':
				return {
					attack: .30,
					press: .40, 
					longBall: .60   
				};
			case '343':
				return {
					attack: .75,
					press: .60, 
					longBall: .25 
				};
			case '442':
			default:
				return {
					attack: .50,
					press: .50,
					longBall: .25
				};
		}
	},

    dynamicTactics: function(base, minute, scoreDiff) {
        let attack = base.attack,
            press = base.press,
            longBall = base.longBall;

        // Modifica tattica in base al tempo e risultato
        if (minute > 70) {
            if (scoreDiff < 0) {
                // In svantaggio negli ultimi 20 minuti
                attack += .15;
                press += .10;
                longBall += .05;
            }
            if (scoreDiff > 0) {
                // In vantaggio negli ultimi 20 minuti
                attack -= .10;
                press -= .10;
            }
        }

        // Inizio partita più cauto
        if (minute < 15) {
            attack -= .05;
        }

        // Funzione helper per limitare i valori
        const clamp = v => Math.max(.05, Math.min(.95, v));

        return {
            attack: clamp(attack),
            press: clamp(press),
            longBall: clamp(longBall)
        };
    },

    getTacticDescription: function(formation) {
        const bias = this.formationBias(formation);
        let style = '';
        
        if (bias.attack > 0.6) style += 'Offensivo';
        else if (bias.attack < 0.4) style += 'Difensivo';
        else style += 'Bilanciato';
        
        if (bias.press > 0.6) style += ', Pressing Alto';
        if (bias.longBall > 0.3) style += ', Palla Lunga';
        
        return style;
    },

	getFormationRoles: function(formation) {
		switch (formation) {
			case '433':
				return {
					def: 4,
					mid: 3,
					att: 3
				};
			case '352':
				return {
					def: 3,
					mid: 5,
					att: 2
				};
			case '451':
				return {
					def: 4,
					mid: 5,
					att: 1
				};
			case '541':
				return {
					def: 5,
					mid: 4,
					att: 1
				};
			case '343':
				return {
					def: 3,
					mid: 4,
					att: 3
				};
			case '442':
			default:
				return {
					def: 4,
					mid: 4,
					att: 2
				};
		}
	},

    getMentalityModifiers: function(mentality) {
        const modifiers = {
            'defensive': {
                attack: -0.1,
                press: -0.2,
                longBall: 0.1
            },
            'balanced': {
                attack: 0,
                press: 0,
                longBall: 0
            },
            'attacking': {
                attack: 0.1,
                press: 0.1,
                longBall: -0.05
            },
            'all_out_attack': {
                attack: 0.2,
                press: 0.15,
                longBall: -0.1
            }
        };
        
        return modifiers[mentality] || modifiers.balanced;
    },

    debug: function(formation) {
        console.log('Formation:', formation);
        console.log('Base Bias:', this.formationBias(formation));
        console.log('Style:', this.getTacticDescription(formation));
        console.log('Roles:', this.getFormationRoles(formation));
    }
};

// Esporta l'oggetto tactics e le sue funzioni
Object.assign(window, {
    tactics: window.tactics,
    formationBias: window.tactics.formationBias.bind(window.tactics),
    dynamicTactics: window.tactics.dynamicTactics.bind(window.tactics),
    getTacticDescription: window.tactics.getTacticDescription.bind(window.tactics),
    getFormationRoles: window.tactics.getFormationRoles.bind(window.tactics),
    getMentalityModifiers: window.tactics.getMentalityModifiers.bind(window.tactics),
    debugTactics: window.tactics.debug.bind(window.tactics)
});
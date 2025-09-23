// constants.js

window.GAME_CONSTANTS = {
    GAME: {
        MINUTES_IN_GAME: 90,
        MAX_PLAYERS: 11,
        MAX_SUBS: 5,
        MIN_PLAYERS: 7,
        MATCH_SPEED_MIN: 100,
        MATCH_SPEED_MAX: 1200,
        DEFAULT_MATCH_SPEED: 450
    },
	
    TEMPLATES: {
        CONTRACT: 'contractNegotiationTemplate',
        TRANSFER: 'transferConfirmationTemplate'
    },
	
    MESSAGES: {
        ACCEPT: 'The player is willing to accept these terms.',
        REJECT: 'The player is not satisfied with these terms.',
        CANCEL: 'Transfer cancelled'
    },
	
    POSITION_ROLES: {
        '442': {
            'FW': [
                { x: 35, y: 20, natural: ['FR', 'FL', 'ST'] },
                { x: 65, y: 20, natural: ['FR', 'FL', 'ST'] }
            ],
            'MF': [
                { x: 20, y: 45, natural: ['ML'] },
                { x: 40, y: 45, natural: ['MC'] },
                { x: 60, y: 45, natural: ['MC'] },
                { x: 80, y: 45, natural: ['MR'] }
            ],
            'DF': [
                { x: 20, y: 70, natural: ['DL'] },
                { x: 40, y: 70, natural: ['DC'] },
                { x: 60, y: 70, natural: ['DC'] },
                { x: 80, y: 70, natural: ['DR'] }
            ],
            'GK': [{ x: 50, y: 90, natural: ['GK'] }]
        },
        '433': {
            'FW': [
                { x: 20, y: 20, natural: ['FL', 'ST'] },
                { x: 50, y: 20, natural: ['ST'] },
                { x: 80, y: 20, natural: ['FR', 'ST'] }
            ],
            'MF': [
                { x: 30, y: 45, natural: ['ML', 'MC'] },
                { x: 50, y: 45, natural: ['MC'] },
                { x: 70, y: 45, natural: ['MR', 'MC'] }
            ],
            'DF': [
                { x: 20, y: 70, natural: ['DL'] },
                { x: 40, y: 70, natural: ['DC'] },
                { x: 60, y: 70, natural: ['DC'] },
                { x: 80, y: 70, natural: ['DR'] }
            ],
            'GK': [{ x: 50, y: 90, natural: ['GK'] }]
        },
	    '343': {
            'FW': [
                { x: 20, y: 20, natural: ['FL', 'ST'] },
                { x: 50, y: 20, natural: ['ST'] },
                { x: 80, y: 20, natural: ['FR', 'ST'] }
            ],
            'MF': [
                { x: 20, y: 45, natural: ['ML'] },
                { x: 40, y: 45, natural: ['MC'] },
                { x: 60, y: 45, natural: ['MC'] },
                { x: 80, y: 45, natural: ['MR'] }
            ],
            'DF': [
                { x: 30, y: 70, natural: ['DC'] },
                { x: 50, y: 70, natural: ['DC'] },
                { x: 70, y: 70, natural: ['DC'] }
            ],
            'GK': [{ x: 50, y: 90, natural: ['GK'] }]
        },
        '352': {
            'FW': [
                { x: 35, y: 20, natural: ['FR', 'FL', 'ST'] },
                { x: 65, y: 20, natural: ['FR', 'FL', 'ST'] }
            ],
            'MF': [
                { x: 20, y: 45, natural: ['ML'] },
                { x: 35, y: 45, natural: ['MC'] },
                { x: 50, y: 45, natural: ['MC'] },
                { x: 65, y: 45, natural: ['MC'] },
                { x: 80, y: 45, natural: ['MR'] }
            ],
            'DF': [
                { x: 30, y: 70, natural: ['DC'] },
                { x: 50, y: 70, natural: ['DC'] },
                { x: 70, y: 70, natural: ['DC'] }
            ],
            'GK': [{ x: 50, y: 90, natural: ['GK'] }]
        },
        '451': {
            'FW': [
                { x: 50, y: 20, natural: ['ST'] }
            ],
            'MF': [
                { x: 20, y: 45, natural: ['ML', 'MR'] },
                { x: 35, y: 45, natural: ['MC'] },
                { x: 50, y: 45, natural: ['MC'] },
                { x: 65, y: 45, natural: ['MC'] },
                { x: 80, y: 45, natural: ['ML', 'MR'] }
            ],
            'DF': [
                { x: 20, y: 70, natural: ['DL'] },
                { x: 40, y: 70, natural: ['DC'] },
                { x: 60, y: 70, natural: ['DC'] },
                { x: 80, y: 70, natural: ['DR'] }
            ],
            'GK': [{ x: 50, y: 90, natural: ['GK'] }]
        },
        '541': {
            'FW': [
                { x: 50, y: 20, natural: ['ST'] }
            ],
            'MF': [
                { x: 20, y: 45, natural: ['ML'] },
                { x: 40, y: 45, natural: ['MC'] },
                { x: 60, y: 45, natural: ['MC'] },
                { x: 80, y: 45, natural: ['MR'] }
            ],
            'DF': [
                { x: 10, y: 70, natural: ['DL'] },
                { x: 30, y: 70, natural: ['DC'] },
                { x: 50, y: 70, natural: ['DC'] },
                { x: 70, y: 70, natural: ['DC'] },
                { x: 90, y: 70, natural: ['DR'] }
            ],
            'GK': [{ x: 50, y: 90, natural: ['GK'] }]
        }
    },

    // Strutture formazioni
    FORMATIONS: {
        '442': { DF: 4, MF: 4, FW: 2 },
        '433': { DF: 4, MF: 3, FW: 3 },
		'343': { DF: 3, MF: 4, FW: 3 },
        '352': { DF: 3, MF: 5, FW: 2 },
        '451': { DF: 4, MF: 5, FW: 1 },
        '541': { DF: 5, MF: 4, FW: 1 }
    },

    // Costanti per i ruoli
    ROLES: {
        SECTIONS: {
            GK: 'GOALKEEPERS',
            DF: 'DEFENDERS',
            MF: 'MIDFIELDERS',
            FW: 'FORWARDS'
        },
        NAMES: {
            GK: 'Goalkeeper',
            DR: 'Right Back',
            DC: 'Center Back',
            DL: 'Left Back',
            MR: 'Right Midfielder',
            MC: 'Center Midfielder',
            ML: 'Left Midfielder',
            FR: 'Right Forward',
            ST: 'Striker',
            FL: 'Left Forward'
        }
    },

    // Costanti UI
    UI: {
        RATING_THRESHOLDS: {
            HIGH: 80,
            GOOD: 70,
            AVERAGE: 60
        },
        RATING_CLASSES: {
            HIGH: 'high-rating',
            GOOD: 'good-rating',
            AVERAGE: 'average-rating',
            LOW: 'low-rating'
        },
        HEADERS: {
            GK: {
                stats: [
                    { key: 'speed', label: 'REF', tooltip: 'Reflexes' },
                    { key: 'pass', label: 'DIS', tooltip: 'Distribution' },
                    { key: 'shot', label: 'KIC', tooltip: 'Kicking' },
                    { key: 'def', label: 'HAN', tooltip: 'Handling' },
                    { key: 'drib', label: 'CON', tooltip: 'Control' },
                    { key: 'tackle', label: 'PEN', tooltip: 'Penalties' }
                ]
            },
            OUTFIELD: {
                stats: [
                    { key: 'speed', label: 'PAC', tooltip: 'Pace' },
                    { key: 'pass', label: 'PAS', tooltip: 'Passing' },
                    { key: 'shot', label: 'SHO', tooltip: 'Shooting' },
                    { key: 'def', label: 'DEF', tooltip: 'Defense' },
                    { key: 'drib', label: 'DRI', tooltip: 'Dribbling' },
                    { key: 'tackle', label: 'TAC', tooltip: 'Tackling' }
                ]
            }
        }
    },

    // Costanti per il mercato

	FINANCE: {
		// Budget iniziali
		INITIAL_CASH: 30,
		INITIAL_SPONSOR_TECH: 70, 
		INITIAL_SPONSOR_SHIRT: 12,
		INITIAL_WAGE_BUDGET: 82,  //60+12

		// Limiti di budget
		MIN_TRANSFER_BUDGET: 20,
		MAX_TRANSFER_BUDGET: 50,
		MIN_WAGE_BUDGET: 40,
		MAX_WAGE_BUDGET: 100,
		MIN_SPONSOR_TECH: 5,
		MAX_SPONSOR_TECH: 20,
		MIN_SPONSOR_SHIRT: 8,
		MAX_SPONSOR_SHIRT: 30,

		// Stadio e biglietti
		MIN_STADIUM_CAPACITY: 15000,
		MAX_STADIUM_CAPACITY: 20000,
		INITIAL_ATTENDANCE: 5000,
		MIN_ATTENDANCE_PERCENTAGE: 0.2, // Minimo 20% di riempimento
		TICKET_PRICE: 60,
		
		// Modificatori affluenza
		ATTENDANCE_WIN_BOOST: 1.1,  // +10% dopo vittoria
		ATTENDANCE_LOSS_PENALTY: 0.95, // -5% dopo sconfitta
		
		// Costi di gestione
		FACILITY_COST_PER_SEAT: 0.2, // Costo per posto dello stadio
		MAINTENANCE_COST_PERCENTAGE: 0.08, // 5% dei ricavi
		
		// Mercato e Rose
		MIN_SQUAD_SIZE: 14,
		MAX_PLAYERS_FOR_SALE: 4,
		MIN_GOALKEEPER: 2,
		MIN_DEFENDER: 4,
		MIN_MIDFIELDER: 4,
		MIN_FORWARD: 2,
		TRANSFER_OFFER_CHANCE: 0.7,
		MIN_ACCEPTANCE_CHANCE: 0.3,
		MAX_ACCEPTANCE_CHANCE: 0.9,
		WAGE_NEGOTIATION_TOLERANCE: 0.2,
		VALUE_NEGOTIATION_TOLERANCE: 0.15,
		MIN_CONTRACT_LENGTH: 1,
		MAX_CONTRACT_LENGTH: 5,
			
		// Stipendi
		WAGE_PAYMENT_INTERVAL: 'weekly', // or 'monthly'
		WAGE_BUDGET_WARNING_THRESHOLD: 0.9, // Avviso quando si raggiunge il 90%
		MIN_PLAYER_WAGE: 0.02, // 20,000 per settimana
		MAX_PLAYER_WAGE: 0.25,  // 250,000 per settimana
		
		// Sponsor
		SPONSOR_PAYMENT_INTERVAL: 'weekly',
		SPONSOR_BONUS_WIN: 0.1,  // Bonus 100,000 per vittoria
		SPONSOR_BONUS_TROPHY: 5,  // Bonus 5M per trofeo
			// Elenco marchi sponsor fittizi per immersione
			SPONSOR_BRANDS: [
				"NovaTech",
				"QuantumWear",
				"Apex Motors",
				"Skyline Airways",
				"Stellar Bank",
				"Orbit Telecom",
				"Vertex Energy",
				"Titan Tools",
				"Helix Health",
				"Nimbus Cloud",
				"Pioneer Foods",
				"Ultrix Electronics",
				"Aurora Drinks",
				"Summit Insurance",
				"Vector Logistics"
			],
		
		// Trasferimenti
		MIN_TRANSFER_VALUE: 1,      // 1M minimo
		MAX_TRANSFER_VALUE: 100,    // 100M massimo
		BASE_VALUE_MULTIPLIER: 8,   // Moltiplicatore base per il valore
		BASE_WAGE_MULTIPLIER: 2.4,  // Moltiplicatore base per lo stipendio
		
		// Modificatori per età più dettagliati
		TRANSFER_VALUE_MULTIPLIER: {
			YOUNG_TALENT: 1.5,    // < 23 anni
			PRIME: 1.2,           // 23-28 anni
			EXPERIENCED: 0.8,     // 29-32 anni
			VETERAN: 0.5,         // > 32 anni
			YOUTH_BONUS: 0.1      // Bonus per anno sotto i 21
		},

		// Limiti stipendio
		WAGE_LIMITS: {
			MIN_WEEKLY: 0.01,     // 10,000 a settimana minimo
			MAX_WEEKLY: 0.2,      // 200,000 a settimana massimo
			SUPERSTAR: 0.4        // Bonus superstar (0.4M a settimana)
		},

		// Range negoziazione più dettagliati
		NEGOTIATION_RANGES: {
			TRANSFER_FEE: {
				MIN_ACCEPTABLE: 0.7,  // 70% del valore richiesto
				MAX_COUNTER: 1.3,     // 130% del valore richiesto
				PREFERRED: 1.0        // Valore preferito
			},
			WAGES: {
				MIN_ACCEPTABLE: 0.8,  // 80% dello stipendio richiesto
				MAX_COUNTER: 1.2,     // 120% dello stipendio richiesto
				PREFERRED: 1.0        // Stipendio preferito
			}
		},
		
		// Premi e bonus
		MATCH_WIN_BONUS: 0.1,    // 100,000 per vittoria
		CLEAN_SHEET_BONUS: 0.05, // 50,000 per clean sheet
		GOAL_BONUS: 0.02,        // 20,000 per goal
		
		// Penalità finanziarie
		MINIMUM_SQUAD_SIZE_FINE: 1,  // 1M per giocatore mancante
		WAGE_BUDGET_OVERFLOW_FINE: 0.5, // 500,000 per settimana
		
		// Conversioni temporali
		WEEKS_PER_SEASON: 52,
		MATCHES_PER_SEASON: 38,
		
		// Formattazione
		CURRENCY_SYMBOL: '€',
		CURRENCY_SUFFIX: 'M',
		DECIMAL_PLACES: 3,
		
		MAX_SQUAD_SIZE: 25,
		MAX_PER_ROLE: {
			GK: 4,    // Portieri
			DEF: 9,   // Difensori (DC, DR, DL)
			MID: 9,   // Centrocampisti (MC, MR, ML)
			ATT: 6    // Attaccanti (ST, FR, FL)
		}
	},

	
	NAMES: {
		FIRST: [
			"Alessandro", "Andrea", "Antonio", "Christian", "Daniele",
			"Fabio", "Federico", "Francesco", "Gennaro", "Gianluca",
			"Gianluigi", "Giorgio", "Giuseppe", "Lorenzo", "Luca",
			"Marco", "Paolo", "Roberto", "Salvatore", "Stefano",
			"Adrian", "Andres", "Angel", "Arjen", "Bastian",
			"Carlos", "Cristiano", "David", "Didier", "Eden",
			"Edinson", "Fernando", "Frank", "Gabriel", "Gareth",
			"Harry", "Henrik", "Iker", "James", "Jan",
			"Javier", "John", "Juan", "Karim", "Kevin",
			"Kylian", "Lionel", "Luis", "Luka", "Manuel",
			"Mario", "Michael", "Neymar", "Oliver", "Patrick",
			"Paul", "Pedro", "Peter", "Philippe", "Raul",
			"Robert", "Robin", "Ronaldo", "Ronaldinho", "Ryan",
			"Samuel", "Sergio", "Steven", "Thierry", "Thomas",
			"Wayne", "Wesley", "Xavi", "Zinedine", "Zlatan", "Aaron", 
			"Abdul", "Abel", "Abraham", "Adam", "Adama",
			"Adrien", "Ahmad", "Ahmed", "Alan", "Albert", "Alberto",
			"Aleks", "Aleksandar", "Alex", "Alexander", "Alexis", "Alfonso",
			"Ali", "Allan", "Alphonso", "Alvaro", "Amir", "Andre",
			"Andreas", "Andriy", "Andy", "Anthony", "Antoine", "Anton",
			"Antonio", "Arda", "Ari", "Arkadiusz", "Arthur", "Arturo",
			"Asmir", "Axel", "Benjamin", "Bernardo", "Bernard", "Billy",
			"Bobby", "Boris", "Bradley", "Brandon", "Brian", "Bruno",
			"Bryan", "Callum", "Cameron", "Cesc", "Charles", "Charlie",
			"Chris", "Christopher", "Claude", "Claudio", "Clement", "Craig",
			"Curtis", "Damian", "Daniel", "Danny", "Darren", "Darwin",
			"Dean", "Denis", "Dennis", "Dejan", "Diego", "Dimitri",
			"Dominic", "Douglas", "Dusan", "Edin", "Eduardo", "Edouard",
			"Emil", "Emiliano", "Emmanuel", "Eric", "Erik", "Erling",
			"Esteban", "Ethan", "Evan", "Ezequiel", "Fabian", "Felipe",
			"Felix", "Ferran", "Filip", "Florian", "Francis", "Franco",
			"Fred", "Fredrik", "Gary", "Geoffrey", "George", "Gerard",
			"Giovanni", "Glen", "Gordon", "Grant", "Gregory", "Grzegorz",
			"Guillaume", "Gustav", "Hakan", "Hans", "Harvey", "Hakim",
			"Heung-Min", "Hirving", "Hugo", "Ibrahim", "Ilkay", "Isaac",
			"Ivan", "Jack", "Jacob", "Jadon", "Jake", "Jakob",
			"Jamie", "Jan", "Jarrod", "Jason", "Jay", "Jeremy",
			"Jerome", "Jesse", "Joao", "Joaquin", "Joel", "Johann",
			"Jonas", "Jonathan", "Jordan", "Jorge", "Josef", "Joshua",
			"Julian", "Kai", "Karel", "Karl", "Karol", "Keith",
			"Kenneth", "Kenny", "Kepa", "Kieran", "Kurt", "Kyle",
			"Leandro", "Leon", "Leonardo", "Leroy", "Lewis", "Lucas",
			"Lukas", "Luke", "Malcolm", "Marc", "Marcel", "Marcelo",
			"Marcus", "Mason", "Mateo", "Mathias", "Matthijs", "Maxwell",
			"Memphis", "Miguel", "Mikel", "Milan", "Morgan", "Moses",
			"Moussa", "Nathan", "Nathaniel", "Neil", "Nelson", "Nicolas",
			"Niklas", "Niko", "Norman", "Oscar", "Owen", "Pablo",
			"Pascal", "Pierre", "Raheem", "Ralph", "Ramon", "Raphael",
			"Rasmus", "Raymond", "Reece", "Remy", "Ricardo", "Richard",
			"Richarlison", "Riyad", "Rodrigo", "Roger", "Roland", "Roman",
			"Ruben", "Russell", "Sadio", "Said", "Scott", "Sean",
			"Sebastian", "Serge", "Simon", "Sofyan", "Solomon", "Stan",
			"Stefan", "Stephen", "Stuart", "Sven", "Tadic", "Takumi",
			"Tanguy", "Teden", "Theo", "Thiago", "Timothy", "Timo",
			"Tomas", "Tommy", "Tony", "Travis", "Trevor", "Trent",
			"Tyler", "Tyrone", "Victor", "Vincent", "Virgil", "Vinicius",
			"Vladimir", "Walter", "Wilfried", "William", "Willy", "Wout",
			"Yannick", "Youri", "Yusuf", "Zack", "Zakaria"
		],
		
		LAST: [
			"Albertini", "Antognoni", "Baggio", "Baresi", "Buffon",
			"Cannavaro", "Chiellini", "DelPiero", "Donadoni", "Gattuso",
			"Insigne", "Maldini", "Nesta", "Pirlo", "Totti",
			"Agüero", "Alonso", "Ballack", "Beckham", "Bergkamp",
			"Cantona", "Casillas", "Cruyff", "Drogba", "Eto'o",
			"Figo", "Gerrard", "Henry", "Ibrahimović", "Iniesta",
			"Kaká", "Lampard", "Lewandowski", "Mbappe", "Messi",
			"Modric", "Nedvěd", "Neymar", "Owen", "Platini",
			"Raúl", "Rivaldo", "Robben", "Ronaldo", "Rooney",
			"Scholes", "Shevchenko", "Suárez", "VanBasten", "VanPersie",
			"Vieira", "Xavi", "Zidane", "Vialli", "Vieri", "Zola",
			"Benzema", "De Bruyne", "Griezmann", "Haaland", "Hazard",
			"Kane", "Kroos", "Lukaku", "Mahrez", "Mbappé",
			"Müller", "Neuer", "Pogba", "Salah", "Son",
			"Sterling", "TerStegen", "VanDijk", "Vardy", "Virgil",
			"Aarons", "Abedi", "Adebayo", "Aguerd", "Aidoo", "Ajer",
			"Alaba", "Alba", "Alcantara", "Alderweireld", "Alexander-Arnold", "Almada",
			"Almiron", "Alvarez", "Amartey", "Amrabat", "Anderson", "Andrade",
			"Antony", "Araujo", "Areola", "Arnold", "Arribas", "Arteta",
			"Asensio", "Aspas", "Aubameyang", "Aurier", "Azpilicueta", "Badiashile",
			"Bailey", "Baldock", "Bardsley", "Barnes", "Bassey", "Bastoni",
			"Bellerin", "Bellingham", "Bennacer", "Bentancur", "Berardi", "Bernardo",
			"Bertrand", "Boly", "Bonucci", "Botman", "Boufal", "Bowen",
			"Bremer", "Bruno", "Buendia", "Bukayo", "Busquets", "Butland",
			"Calvert-Lewin", "Camavinga", "Canos", "Carrasco", "Castagne", "Cavani",
			"Ceballos", "Chambers", "Chiesa", "Chilwell", "Christiansen", "Clark",
			"Coady", "Coleman", "Cornet", "Costa", "Coutinho", "Cucurella",
			"Daka", "Dalot", "Dawson", "DeBruyne", "Declan", "Dembele",
			"Dendoncker", "DeVrij", "Dewsbury-Hall", "Dias", "Diaz", "Digne",
			"Doherty", "Douglas", "Doucoure", "Dunk", "Ederson", "Edouard",
			"Elanga", "Elneny", "Emerson", "Endo", "Eriksen", "Estupinan",
			"Fabinho", "Fati", "Felix", "Fernandes", "Fernandez", "Firmino",
			"Foden", "Forster", "Gabriel", "Gakpo", "Gallagher", "Garcia",
			"Gibbs-White", "Gomes", "Gordon", "Gosens", "Goueundouzi", "Gray",
			"Guedes", "Gudmundsson", "Guehi", "Guerreiro", "Guimaraes", "Gusto",
			"Havertz", "Henderson", "Hernandez", "Hickey", "Højbjerg", "Holding",
			"Hudson-Odoi", "Hughes", "Iheanacho", "Isak", "Isco", "Israel",
			"Jansson", "Jesus", "Jiminez", "Johnson", "Jones", "Jorginho",
			"Justin", "Kamada", "Keita", "Kilman", "Kimmich", "Konate",
			"Koulibaly", "Kovacic", "Kulusevski", "Kvaratskhelia", "Laporte", "Lavia",
			"Lemina", "Leno", "Lerma", "Lindelof", "Lingard", "Lloris",
			"Locatelli", "Lodi", "Longstaff", "Lopez", "Lozano", "Luiz",
			"MacAllister", "Maddison", "Malacia", "Maguire", "Mariano", "Martinez",
			"Martinelli", "Matip", "McKennie", "McNeil", "Mendes", "Mendy",
			"Militao", "Minamino", "Mings", "Miranda", "Mitchell", "Morata",
			"Moreno", "Mount", "Mudryk", "Murphy", "Mwepu", "Navas",
			"Nelson", "Neves", "Nketiah", "Nkunku", "Noble", "Norgaard",
			"Nunez", "Odegaard", "Olise", "Onana", "Openda", "Osimhen",
			"Pacheco", "Palhinha", "Palmer", "Paqueta", "Paredes", "Patterson",
			"Paulinho", "Pedri", "Pele", "Pepe", "Pereira", "Phillips",
			"Pickford", "Pino", "Pulisic", "Raphinha", "Rashford", "Regulion",
			"Ricardo", "Rice", "Richarlison", "Robertson", "Rodri", "Rodriguez",
			"Romero", "Roque", "Rrahmani", "Ruben", "Rudiger", "Sabitzer",
			"Saka", "Sanchez", "Sancho", "Sandro", "Sarr", "Savio",
			"Scamacca", "Schick", "Semedo", "Shaw", "Silva", "Sissoko",
			"Skipp", "Smith-Rowe", "Solanke", "Soucek", "Stones", "Szoboszlai",
			"Tapsoba", "Telles", "Thiago", "Timber", "Tomori", "Torres",
			"Traore", "Trossard", "Tsimikas", "Udogie", "Valverde", "VanDeBeek",
			"Varane", "Vinicius", "Walker", "Ward", "Ward-Prowse", "Welbeck",
			"White", "Willian", "Wilson", "Xhaka", "Zakaria", "Zaniolo",
			"Zinchenko", "Zouma"
		]
	},

	TEAMS: {
		NAMES: [
			// Traditional Style
			"United Warriors", "City Rovers", "Royal Knights",
			"Athletic Thunder", "Empire FC", "Metropolitan Stars",
			"Borough Rangers", "Union Dragons", "County Lions",
			"Town Wanderers", "Valley Raiders", "Capital Wolves",

			// Nature Themed
			"Forest Hawks", "Mountain Tigers", "Storm Riders",
			"River Phoenix", "Ocean Raiders", "Desert Warriors",
			"Thunder Legion", "Lightning FC", "Avalanche United",
			"Tornado FC", "Hurricane City", "Tsunami Strikers",

			// Animal Themed
			"Red Dragons", "Black Panthers", "Golden Eagles",
			"Silver Wolves", "White Bears", "Blue Sharks",
			"Purple Cobras", "Green Vipers", "Bronze Lions",
			"Crystal Falcons", "Steel Tigers", "Shadow Foxes",

			// Modern Style
			"Elite FC", "Legacy United", "Victory City",
			"Glory Hunters", "Phoenix Rising", "Titan FC",
			"Dynasty United", "Supreme FC", "Infinity Stars",
			"Power United", "Quantum FC", "Eclipse City",

			// Mythical
			"Atlas FC", "Olympus United", "Sparta FC",
			"Hercules City", "Phoenix United", "Titan Rovers"
		],
		

	FOREIGN_TEAMS :[
			'Real Madrid', 'Barcelona', 'Bayern Munich', 'PSG', 
			'Manchester United', 'Liverpool', 'Ajax', 'Porto',
			'Juventus', 'Inter', 'Dortmund', 'Lyon', 'AC Milan'
		]	
	},

    PLAYER_STATS: {
        BASE_STATS: {
            'GK': { speed: 35, pass: 55, shot: 50, def: 70, drib: 45, tackle: 60 },
            'DR': { speed: 75, pass: 65, shot: 45, def: 75, drib: 65, tackle: 75 },
            'DC': { speed: 65, pass: 60, shot: 40, def: 80, drib: 55, tackle: 80 },
            'DL': { speed: 75, pass: 65, shot: 45, def: 75, drib: 65, tackle: 75 },
            'MR': { speed: 80, pass: 75, shot: 65, def: 60, drib: 75, tackle: 65 },
            'MC': { speed: 70, pass: 80, shot: 70, def: 65, drib: 75, tackle: 70 },
            'ML': { speed: 80, pass: 75, shot: 65, def: 60, drib: 75, tackle: 65 },
            'FR': { speed: 85, pass: 70, shot: 80, def: 45, drib: 80, tackle: 45 },
            'ST': { speed: 80, pass: 65, shot: 85, def: 40, drib: 75, tackle: 40 },
            'FL': { speed: 85, pass: 70, shot: 80, def: 45, drib: 80, tackle: 45 }
        },
        
        WEIGHTS: {
            'GK': { speed: 0.2, pass: 0.1, shot: 0.05, def: 0.4, drib: 0.05, tackle: 0.2 },
            'DR': { speed: 0.2, pass: 0.15, shot: 0.05, def: 0.25, drib: 0.1, tackle: 0.25 },
            'DC': { speed: 0.15, pass: 0.1, shot: 0.05, def: 0.35, drib: 0.05, tackle: 0.3 },
            'DL': { speed: 0.2, pass: 0.15, shot: 0.05, def: 0.25, drib: 0.1, tackle: 0.25 },
            'MR': { speed: 0.2, pass: 0.25, shot: 0.15, def: 0.1, drib: 0.2, tackle: 0.1 },
            'MC': { speed: 0.15, pass: 0.3, shot: 0.15, def: 0.15, drib: 0.15, tackle: 0.1 },
            'ML': { speed: 0.2, pass: 0.25, shot: 0.15, def: 0.1, drib: 0.2, tackle: 0.1 },
            'FR': { speed: 0.25, pass: 0.15, shot: 0.3, def: 0.05, drib: 0.2, tackle: 0.05 },
            'ST': { speed: 0.2, pass: 0.1, shot: 0.35, def: 0.05, drib: 0.25, tackle: 0.05 },
            'FL': { speed: 0.25, pass: 0.15, shot: 0.3, def: 0.05, drib: 0.2, tackle: 0.05 }
        }
    },

    STORAGE: {
        SAVE_KEY: 'manager-sim-save-v2'
    },

};


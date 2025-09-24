// React port of GAME_CONSTANTS. Keep shape identical to vanilla for compatibility.
export const GAME_CONSTANTS = {
  STORAGE: {
    // Save key for localStorage persistence
    SAVE_KEY: 'yuban-fm-save',
  },
  GAME: {
    MINUTES_IN_GAME: 90,
    MAX_PLAYERS: 11,
    MAX_SUBS: 5,
    MIN_PLAYERS: 7,
    MATCH_SPEED_MIN: 100,
    MATCH_SPEED_MAX: 1200,
    DEFAULT_MATCH_SPEED: 450,
  },
  TEMPLATES: {
    CONTRACT: 'contractNegotiationTemplate',
    TRANSFER: 'transferConfirmationTemplate',
  },
  MESSAGES: {
    ACCEPT: 'The player is willing to accept these terms.',
    REJECT: 'The player is not satisfied with these terms.',
    CANCEL: 'Transfer cancelled',
  },
  POSITION_ROLES: {
    '442': {
      FW: [
        { x: 35, y: 20, natural: ['FR', 'FL', 'ST'] },
        { x: 65, y: 20, natural: ['FR', 'FL', 'ST'] },
      ],
      MF: [
        { x: 20, y: 45, natural: ['ML'] },
        { x: 40, y: 45, natural: ['MC'] },
        { x: 60, y: 45, natural: ['MC'] },
        { x: 80, y: 45, natural: ['MR'] },
      ],
      DF: [
        { x: 20, y: 70, natural: ['DL'] },
        { x: 40, y: 70, natural: ['DC'] },
        { x: 60, y: 70, natural: ['DC'] },
        { x: 80, y: 70, natural: ['DR'] },
      ],
      GK: [{ x: 50, y: 90, natural: ['GK'] }],
    },
    '433': {
      FW: [
        { x: 20, y: 20, natural: ['FL', 'ST'] },
        { x: 50, y: 20, natural: ['ST'] },
        { x: 80, y: 20, natural: ['FR', 'ST'] },
      ],
      MF: [
        { x: 30, y: 45, natural: ['ML', 'MC'] },
        { x: 50, y: 45, natural: ['MC'] },
        { x: 70, y: 45, natural: ['MR', 'MC'] },
      ],
      DF: [
        { x: 20, y: 70, natural: ['DL'] },
        { x: 40, y: 70, natural: ['DC'] },
        { x: 60, y: 70, natural: ['DC'] },
        { x: 80, y: 70, natural: ['DR'] },
      ],
      GK: [{ x: 50, y: 90, natural: ['GK'] }],
    },
    '343': {
      FW: [
        { x: 20, y: 20, natural: ['FL', 'ST'] },
        { x: 50, y: 20, natural: ['ST'] },
        { x: 80, y: 20, natural: ['FR', 'ST'] },
      ],
      MF: [
        { x: 20, y: 45, natural: ['ML'] },
        { x: 40, y: 45, natural: ['MC'] },
        { x: 60, y: 45, natural: ['MC'] },
        { x: 80, y: 45, natural: ['MR'] },
      ],
      DF: [
        { x: 30, y: 70, natural: ['DC'] },
        { x: 50, y: 70, natural: ['DC'] },
        { x: 70, y: 70, natural: ['DC'] },
      ],
      GK: [{ x: 50, y: 90, natural: ['GK'] }],
    },
    '352': {
      FW: [
        { x: 35, y: 20, natural: ['FR', 'FL', 'ST'] },
        { x: 65, y: 20, natural: ['FR', 'FL', 'ST'] },
      ],
      MF: [
        { x: 10, y: 45, natural: ['ML'] },
        { x: 30, y: 45, natural: ['MC'] },
        { x: 50, y: 45, natural: ['MC'] },
        { x: 70, y: 45, natural: ['MC'] },
        { x: 90, y: 45, natural: ['MR'] },
      ],
      DF: [
        { x: 30, y: 70, natural: ['DC'] },
        { x: 50, y: 70, natural: ['DC'] },
        { x: 70, y: 70, natural: ['DC'] },
      ],
      GK: [{ x: 50, y: 90, natural: ['GK'] }],
    },
    '451': {
      FW: [{ x: 50, y: 20, natural: ['ST'] }],
      MF: [
        { x: 10, y: 45, natural: ['ML', 'MR'] },
        { x: 30, y: 45, natural: ['MC'] },
        { x: 50, y: 45, natural: ['MC'] },
        { x: 70, y: 45, natural: ['MC'] },
        { x: 90, y: 45, natural: ['ML', 'MR'] },
      ],
      DF: [
        { x: 20, y: 70, natural: ['DL'] },
        { x: 40, y: 70, natural: ['DC'] },
        { x: 60, y: 70, natural: ['DC'] },
        { x: 80, y: 70, natural: ['DR'] },
      ],
      GK: [{ x: 50, y: 90, natural: ['GK'] }],
    },
    '541': {
      FW: [{ x: 50, y: 20, natural: ['ST'] }],
      MF: [
        { x: 20, y: 45, natural: ['ML'] },
        { x: 40, y: 45, natural: ['MC'] },
        { x: 60, y: 45, natural: ['MC'] },
        { x: 80, y: 45, natural: ['MR'] },
      ],
      DF: [
        { x: 10, y: 70, natural: ['DL'] },
        { x: 30, y: 70, natural: ['DC'] },
        { x: 50, y: 70, natural: ['DC'] },
        { x: 70, y: 70, natural: ['DC'] },
        { x: 90, y: 70, natural: ['DR'] },
      ],
      GK: [{ x: 50, y: 90, natural: ['GK'] }],
    },
  },
  FORMATIONS: {
    '442': { DF: 4, MF: 4, FW: 2 },
    '433': { DF: 4, MF: 3, FW: 3 },
    '343': { DF: 3, MF: 4, FW: 3 },
    '352': { DF: 3, MF: 5, FW: 2 },
    '451': { DF: 4, MF: 5, FW: 1 },
    '541': { DF: 5, MF: 4, FW: 1 },
  },
  ROLES: {
    SECTIONS: { GK: 'GOALKEEPERS', DF: 'DEFENDERS', MF: 'MIDFIELDERS', FW: 'FORWARDS' },
    NAMES: {
      GK: 'Goalkeeper', DR: 'Right Back', DC: 'Center Back', DL: 'Left Back',
      MR: 'Right Midfielder', MC: 'Center Midfielder', ML: 'Left Midfielder',
      FR: 'Right Forward', ST: 'Striker', FL: 'Left Forward',
    },
  },
  UI: {
    RATING_THRESHOLDS: { HIGH: 80, GOOD: 70, AVERAGE: 60 },
    RATING_CLASSES: { HIGH: 'high-rating', GOOD: 'good-rating', AVERAGE: 'average-rating', LOW: 'low-rating' },
    HEADERS: {
      GK: { stats: [
        { key: 'speed', label: 'REF', tooltip: 'Reflexes' },
        { key: 'pass', label: 'DIS', tooltip: 'Distribution' },
        { key: 'shot', label: 'KIC', tooltip: 'Kicking' },
        { key: 'def', label: 'HAN', tooltip: 'Handling' },
        { key: 'freeKick', label: 'FK', tooltip: 'Free Kicks' },
        { key: 'penalty', label: 'PEN', tooltip: 'Penalties' },
        { key: 'oneOnOne', label: '1v1', tooltip: 'One-on-one saves' },
        { key: 'aerial', label: 'AER', tooltip: 'Aerial ability' },
      ]},
      OUTFIELD: { stats: [
        { key: 'speed', label: 'PAC', tooltip: 'Pace' },
        { key: 'pass', label: 'PAS', tooltip: 'Passing' },
        { key: 'shot', label: 'SHO', tooltip: 'Shooting' },
        { key: 'def', label: 'DEF', tooltip: 'Defense' },
        { key: 'drib', label: 'DRI', tooltip: 'Dribbling' },
        { key: 'tackle', label: 'TAC', tooltip: 'Tackling' },
        { key: 'cross', label: 'CRS', tooltip: 'Crossing' },
        { key: 'heading', label: 'HEA', tooltip: 'Heading' },
      ]},
    },
  },
  FINANCE: {
    INITIAL_CASH: 30,
  // Baseline (annual) sponsors used only when no plan is active. Keep modest.
  INITIAL_SPONSOR_TECH: 10,
  INITIAL_SPONSOR_SHIRT: 5,
    INITIAL_WAGE_BUDGET: 82,
    MIN_TRANSFER_BUDGET: 20,
    MAX_TRANSFER_BUDGET: 50,
    MIN_WAGE_BUDGET: 40,
    MAX_WAGE_BUDGET: 100,
    MIN_SPONSOR_TECH: 5,
    MAX_SPONSOR_TECH: 20,
    MIN_SPONSOR_SHIRT: 8,
    MAX_SPONSOR_SHIRT: 30,
  MIN_STADIUM_CAPACITY: 15000,
  // Raised to allow multi-tier upgrades to take effect beyond 20k
  MAX_STADIUM_CAPACITY: 40000,
  INITIAL_ATTENDANCE: 8000,
  MIN_ATTENDANCE_PERCENTAGE: 0.35,
  TICKET_PRICE: 80,
  ATTENDANCE_PRICE_ELASTICITY: 0.6,
  STADIUM_UPGRADES: [
    { id: 'tier1', addSeats: 3000, cost: 8, upkeepPerSeatMult: 1.05 },
    { id: 'tier2', addSeats: 4000, cost: 12, upkeepPerSeatMult: 1.1 },
    { id: 'tier3', addSeats: 6000, cost: 18, upkeepPerSeatMult: 1.15 },
  ],
    ATTENDANCE_WIN_BOOST: 1.1,
    ATTENDANCE_LOSS_PENALTY: 0.95,
  FACILITY_COST_PER_SEAT: 0.12,
  // Stadium valuation & loans
  STADIUM_BASE_VALUE_PER_SEAT: 0.002, // M€ per seat baseline (2k € per seat)
  MIN_STADIUM_CONDITION: 0.6,
  LOAN_BANKS: [
    'Banca Mediterranea', 'Alpine Trust', 'Europa Capital', 'Iberia Credit', 'Nordic Mutual', 'Adriatic Bank'
  ],
  LOAN_LTV_RANGE: { MIN: 0.3, MAX: 0.6 }, // % of stadium value
  LOAN_RATE_RANGE_WEEKLY: { MIN: 0.0015, MAX: 0.0045 }, // 0.15%–0.45% per week
  LOAN_TERMS_WEEKS: [26, 52, 78],
  MAX_ACTIVE_LOANS: 2,
  SECOND_LOAN_RATE_MULT: 2.5, // second loan has +150% interest → 2.5x base rate
  SALARY_CAP_RATIO: 0.85,
  MAINTENANCE_COST_PERCENTAGE: 0.05,
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
    WAGE_PAYMENT_INTERVAL: 'weekly',
    WAGE_BUDGET_WARNING_THRESHOLD: 0.9,
  MIN_PLAYER_WAGE: 0.02,
  MAX_PLAYER_WAGE: 0.10,
    SPONSOR_PAYMENT_INTERVAL: 'weekly',
    SPONSOR_BONUS_WIN: 0.1,
    SPONSOR_BONUS_TROPHY: 5,
    MIN_TRANSFER_VALUE: 1,
    MAX_TRANSFER_VALUE: 100,
    BASE_VALUE_MULTIPLIER: 8,
  BASE_WAGE_MULTIPLIER: 2.4,
    TRANSFER_VALUE_MULTIPLIER: {
      YOUNG_TALENT: 1.5,
      PRIME: 1.2,
      EXPERIENCED: 0.8,
      VETERAN: 0.5,
      YOUTH_BONUS: 0.1,
    },
    WAGE_LIMITS: { MIN_WEEKLY: 0.01, MAX_WEEKLY: 0.2, SUPERSTAR: 0.4 },
  // Ensure sponsor income can support a share of weekly wages. 1.0 ~= breakeven on wages via sponsorship alone.
    SPONSOR_WAGE_SUPPORT_RATIO: 0.0,
    // Sponsor plans (mutually exclusive). Inverse proportionality between upfront cash and weekly pay.
    SPONSOR_PLANS: [
      { id: 'upfront_heavy', label: 'Upfront Heavy', upfront: 8, weekly: 0.25, durationWeeks: 52 },
      { id: 'balanced', label: 'Balanced', upfront: 4, weekly: 0.5, durationWeeks: 52 },
      { id: 'weekly_heavy', label: 'Weekly Heavy', upfront: 1, weekly: 0.9, durationWeeks: 52 },
    ],
    // Pool of fictional sponsor brand names; used to label sponsor offers
    SPONSOR_BRANDS: [
      'NovaTech', 'Orion Air', 'Apex Motors', 'VeloBank', 'Atlas Health', 'Stellar Energy',
      'Cobalt Drinks', 'Polar Telecom', 'Aurora Hotels', 'Nimbus Cloud', 'Titan Tools', 'Vertex Insurance',
      'Solaris Power', 'Zenith Foods', 'BluePeak Logistics', 'EuroLink', 'Marathon Outfitters', 'QuantumNet'
    ],
    // Investment tracks for passive weekly income
    INVESTMENTS: {
      merchandising: {
        label: 'Merchandising',
        levels: [
          { cost: 5, weekly: 0.2 },
          { cost: 10, weekly: 0.5 },
          { cost: 20, weekly: 1.2 },
        ],
      },
      hospitality: {
        label: 'Hospitality',
        levels: [
          { cost: 6, weekly: 0.22 },
          { cost: 12, weekly: 0.55 },
          { cost: 24, weekly: 1.3 },
        ],
      },
    },
    NEGOTIATION_RANGES: {
      TRANSFER_FEE: { MIN_ACCEPTABLE: 0.7, MAX_COUNTER: 1.3, PREFERRED: 1.0 },
      WAGES: { MIN_ACCEPTABLE: 0.8, MAX_COUNTER: 1.2, PREFERRED: 1.0 },
    },
    MATCH_WIN_BONUS: 0.1,
    CLEAN_SHEET_BONUS: 0.05,
    GOAL_BONUS: 0.02,
    MINIMUM_SQUAD_SIZE_FINE: 1,
    WAGE_BUDGET_OVERFLOW_FINE: 0.5,
    WEEKS_PER_SEASON: 52,
    MATCHES_PER_SEASON: 38,
    CURRENCY_SYMBOL: '€',
    CURRENCY_SUFFIX: 'M',
    DECIMAL_PLACES: 3,
    MAX_SQUAD_SIZE: 25,
    MAX_PER_ROLE: { GK: 4, DEF: 9, MID: 9, ATT: 6 },
    // New finance dimensions
    TV_RIGHTS_DEFAULT_WEEKLY: 0.0,
    COMPETITION_PRIZES_DEFAULT_WEEKLY: 0.0,
    CLAUSES_PROVISION_DEFAULT_WEEKLY: 0.0,
    STADIUM_MAINTENANCE_PLANS: [
      { id: 'basic', label: 'Basic', weekly: 0.00 },
      { id: 'standard', label: 'Standard', weekly: 0.05 },
      { id: 'enhanced', label: 'Enhanced', weekly: 0.10 }
    ],
    STADIUM_CONDITION: {
      INITIAL: 0.85, // 85% starting condition
      MIN: 0.50,
      MAX: 1.00
    },
    STADIUM_PLAN_EFFECTS: {
      // attendanceMult applies as a quality factor; weeklyDecay reduces condition each week
      basic:    { attendanceMult: 1.00, weeklyDecay: 0.005 },
      standard: { attendanceMult: 1.03, weeklyDecay: 0.003 },
      enhanced: { attendanceMult: 1.06, weeklyDecay: 0.0015 }
    },
    TRAINING_FACILITY: {
      label: 'Training Facility',
      levels: [
        { cost: 6, weekly: 0.04 },
        { cost: 10, weekly: 0.08 },
        { cost: 16, weekly: 0.14 }
      ],
      AREAS: {
        pitches: {
          label: 'Training Pitches',
          levels: [
            { cost: 3, weekly: 0.020 },
            { cost: 5, weekly: 0.040 },
            { cost: 8, weekly: 0.070 }
          ]
        },
        gym: {
          label: 'Gym',
          levels: [
            { cost: 2, weekly: 0.012 },
            { cost: 3, weekly: 0.025 },
            { cost: 5, weekly: 0.040 }
          ]
        },
        lockers: {
          label: 'Locker Rooms',
          levels: [
            { cost: 1, weekly: 0.008 },
            { cost: 2, weekly: 0.015 },
            { cost: 3, weekly: 0.030 }
          ]
        }
      }
    },
    MEDICAL_DEPT: {
      label: 'Medical Department',
      levels: [
        { cost: 4, weekly: 0.04 },
        { cost: 8, weekly: 0.08 },
        { cost: 14, weekly: 0.14 }
      ],
      perDoctorWeekly: 0.02,
      maxDoctors: 4
    },
    TECHNICAL_STAFF: [
      { id: 'basic', label: 'Basic Staff', weekly: 0.05, boost: 0.00 },
      { id: 'advanced', label: 'Advanced Staff', weekly: 0.10, boost: 0.01 },
      { id: 'elite', label: 'Elite Staff', weekly: 0.20, boost: 0.02 }
    ],
    PROJECTION_WEEKS: 12,
  // Default consequences when insolvency triggers (2 consecutive weeks cash < 0)
  DEFAULT_PENALTY_MODE: 'light', // 'light' | 'points'
  DEFAULT_PENALTY_POINTS: 3,
    // TV rights negotiation and competition prize presets (React app)
    TV_PROVIDERS: [
      'EuroSport Max', 'GlobalSports', 'ArenaTV', 'PrimeBall', 'SkyField', 'NovaPlay'
    ],
    // Deal templates define typical mixes; actual offers will randomize within ranges
    TV_DEAL_OPTIONS: [
      {
        id: 'fixed_heavy', label: 'Fixed-Heavy',
        fixedWeeklyRange: [0.60, 0.90], // M€/wk
        variableWeeklyRange: [0.05, 0.12], // top-team variable component M€/wk
        durationWeeks: [26, 52]
      },
      {
        id: 'balanced', label: 'Balanced',
        fixedWeeklyRange: [0.35, 0.60],
        variableWeeklyRange: [0.12, 0.22],
        durationWeeks: [26, 52]
      },
      {
        id: 'variable_heavy', label: 'Variable-Heavy',
        fixedWeeklyRange: [0.18, 0.35],
        variableWeeklyRange: [0.22, 0.40],
        durationWeeks: [26, 52]
      }
    ],
    // Simple selectable accrual presets for competition prizes
    COMP_PRIZE_PLANS: [
      { id: 'off', label: 'Off (one-off payouts only)', weekly: 0.00 },
      { id: 'conservative', label: 'Conservative accrual', weekly: 0.10 },
      { id: 'balanced', label: 'Balanced accrual', weekly: 0.25 },
      { id: 'aggressive', label: 'Aggressive accrual', weekly: 0.50 }
    ],
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
    NAMES: window.GAME_CONSTANTS?.TEAMS?.NAMES || [
      'Torino United','Milano FC','Roma City','Napoli Stars','Firenze Lions','Bologna Eagles','Genova Mariners','Palermo Kings',
      'Verona Knights','Parma Rangers','Cagliari Waves','Bari Falcons','Udine Wolves','Vicenza Royals','Perugia Titans','Modena Panthers'
    ],
    FOREIGN_TEAMS: window.GAME_CONSTANTS?.TEAMS?.FOREIGN_TEAMS || [],
  },
  PLAYER_STATS: {
    BASE_STATS: window.GAME_CONSTANTS?.PLAYER_STATS?.BASE_STATS || {
      GK: { speed: 60, pass: 58, shot: 40, def: 70, freeKick: 45, penalty: 55, oneOnOne: 62, aerial: 66 },
      DC: { speed: 58, pass: 62, shot: 42, def: 70, drib: 50, tackle: 68, cross: 40, heading: 68 },
      DR: { speed: 64, pass: 64, shot: 46, def: 64, drib: 58, tackle: 62, cross: 62, heading: 58 },
      DL: { speed: 64, pass: 64, shot: 46, def: 64, drib: 58, tackle: 62, cross: 62, heading: 58 },
      MC: { speed: 64, pass: 68, shot: 58, def: 60, drib: 64, tackle: 58, cross: 56, heading: 56 },
      MR: { speed: 68, pass: 66, shot: 62, def: 56, drib: 68, tackle: 54, cross: 70, heading: 54 },
      ML: { speed: 68, pass: 66, shot: 62, def: 56, drib: 68, tackle: 54, cross: 70, heading: 54 },
      FR: { speed: 72, pass: 66, shot: 68, def: 48, drib: 70, tackle: 48, cross: 62, heading: 58 },
      FL: { speed: 72, pass: 66, shot: 68, def: 48, drib: 70, tackle: 48, cross: 62, heading: 58 },
      ST: { speed: 68, pass: 60, shot: 74, def: 46, drib: 66, tackle: 46, cross: 50, heading: 72 },
    },
    WEIGHTS: window.GAME_CONSTANTS?.PLAYER_STATS?.WEIGHTS || {
      GK: { speed: 0.12, pass: 0.12, shot: 0.04, def: 0.28, freeKick: 0.06, penalty: 0.12, oneOnOne: 0.14, aerial: 0.12 },
      DC: { speed: 0.1, pass: 0.12, shot: 0.04, def: 0.3, drib: 0.05, tackle: 0.1, cross: 0.04, heading: 0.25 },
      DR: { speed: 0.18, pass: 0.2, shot: 0.05, def: 0.17, drib: 0.05, tackle: 0.05, cross: 0.2, heading: 0.1 },
      DL: { speed: 0.18, pass: 0.2, shot: 0.05, def: 0.17, drib: 0.05, tackle: 0.05, cross: 0.2, heading: 0.1 },
      MC: { speed: 0.15, pass: 0.25, shot: 0.15, def: 0.1, drib: 0.05, tackle: 0.05, cross: 0.1, heading: 0.15 },
      MR: { speed: 0.23, pass: 0.2, shot: 0.15, def: 0.08, drib: 0.07, tackle: 0.02, cross: 0.25, heading: 0.05 },
      ML: { speed: 0.23, pass: 0.2, shot: 0.15, def: 0.08, drib: 0.07, tackle: 0.02, cross: 0.25, heading: 0.05 },
      FR: { speed: 0.25, pass: 0.15, shot: 0.25, def: 0.05, drib: 0.05, tackle: 0.03, cross: 0.17, heading: 0.05 },
      FL: { speed: 0.25, pass: 0.15, shot: 0.25, def: 0.05, drib: 0.05, tackle: 0.03, cross: 0.17, heading: 0.05 },
      ST: { speed: 0.2, pass: 0.1, shot: 0.4, def: 0.05, drib: 0.03, tackle: 0.02, cross: 0.05, heading: 0.15 },
    },
  },
  STORAGE: {
    SAVE_KEY: 'manager-sim-save-v2', // match vanilla app for backward compatibility
  },
};

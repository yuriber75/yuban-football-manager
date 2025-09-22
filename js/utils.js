// utils.js

// Namespace principale per le utilities
window.utils = {
    // Funzioni matematiche e numeriche
    math: {
        clamp: function(v, a, b) {
            return Math.max(a, Math.min(b, v));
        },

        rnd: function(a = 1) {
            return Math.random() * a;
        },

        randomInt: function(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }
    },

    // Funzioni per array e collezioni
    array: {
        pick: function(arr) {
            return arr[Math.floor(Math.random() * arr.length)];
        },

        shuffle: function(array) {
            let currentIndex = array.length;
            let randomIndex;

            while (currentIndex != 0) {
                randomIndex = Math.floor(Math.random() * currentIndex);
                currentIndex--;
                [array[currentIndex], array[randomIndex]] = 
                    [array[randomIndex], array[currentIndex]];
            }

            return array;
        }
    },

    // Funzioni di formattazione
    format: {
        money: function(amount, decimals = 2) {
            return amount.toFixed(decimals) + 'M';
        },

        percent: function(value) {
            return (value * 100).toFixed(0) + '%';
        }
    },

    // Funzioni per generazione ID
    id: {
        uuid: function() {
            return crypto.randomUUID();
        }
    },

    // Funzioni per performance
    performance: {
        debounce: function(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        throttle: function(func, limit) {
            let inThrottle;
            return function executedFunction(...args) {
                if (!inThrottle) {
                    func(...args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        }
    },

    // Funzioni di debug
    debug: {
        test: function() {
            console.log('Utils test:');
            console.log('Clamp 150 between 0-100:', utils.math.clamp(150, 0, 100));
            console.log('Random 0-10:', utils.math.rnd(10));
            console.log('Pick from [1,2,3]:', utils.array.pick([1,2,3]));
            console.log('New UUID:', utils.id.uuid());
            console.log('Format money:', utils.format.money(1234.5678));
            console.log('Format percent:', utils.format.percent(0.45));
        }
    }
};

// Alias per compatibilità con il codice esistente
window.clamp = utils.math.clamp;
window.rnd = utils.math.rnd;
window.pick = utils.array.pick;
window.uuid = utils.id.uuid;
window.formatMoney = utils.format.money;
window.formatPercent = utils.format.percent;
window.shuffle = utils.array.shuffle;
window.randomInt = utils.math.randomInt;
window.debounce = utils.performance.debounce;
window.throttle = utils.performance.throttle;
window.debugUtils = utils.debug.test;


console.log('utils.js loaded successfully');
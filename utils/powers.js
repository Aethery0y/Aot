const logger = require('./logger');
const configDb = require('./configDatabase');
const { getRankColorSync, getRankEmojiSync } = require('./databaseHelpers');

// Remove hardcoded power pools - now using database + fallback data
const powerPools = require('../data').powerPools || {
    'Normal': [
        {
            id: 1,
            name: 'Vertical Maneuvering Equipment',
            description: 'Standard ODM gear for mobility and titan combat',
            rank: 'Normal'
        },
        {
            id: 2,
            name: 'Thunder Spear',
            description: 'Explosive spear designed to pierce titan armor',
            rank: 'Normal'
        },
        {
            id: 3,
            name: 'Blade Mastery',
            description: 'Expert swordsmanship with dual blades',
            rank: 'Normal'
        },
        {
            id: 4,
            name: 'Scout Regiment Training',
            description: 'Enhanced combat reflexes and tactics',
            rank: 'Normal'
        },
        {
            id: 29,
            name: 'Garrison Defense',
            description: 'Fortification and defensive combat techniques',
            rank: 'Normal'
        },
        {
            id: 30,
            name: 'Military Police Authority',
            description: 'Leadership and crowd control abilities',
            rank: 'Normal'
        },
        {
            id: 31,
            name: 'Wall Maria Tactics',
            description: 'Outer wall defensive strategies and positioning',
            rank: 'Normal'
        },
        {
            id: 32,
            name: 'Horse Riding Mastery',
            description: 'Expert cavalry combat and mobility',
            rank: 'Normal'
        }
    ],
    'Rare': [
        {
            id: 5,
            name: 'Titan Hardening',
            description: 'Ability to harden skin for defense and offense',
            rank: 'Rare'
        },
        {
            id: 6,
            name: 'Enhanced Strength',
            description: 'Superhuman physical capabilities',
            rank: 'Rare'
        },
        {
            id: 7,
            name: 'Regeneration',
            description: 'Rapid healing of wounds and lost limbs',
            rank: 'Rare'
        },
        {
            id: 8,
            name: 'Steam Release',
            description: 'Release scalding steam as defense mechanism',
            rank: 'Rare'
        },
        {
            id: 33,
            name: 'Titan Sense',
            description: 'Enhanced ability to detect and track titans',
            rank: 'Rare'
        },
        {
            id: 34,
            name: 'Combat Instinct',
            description: 'Heightened battle awareness and reflexes',
            rank: 'Rare'
        },
        {
            id: 35,
            name: 'Wall Rose Knowledge',
            description: 'Strategic understanding of middle wall defenses',
            rank: 'Rare'
        },
        {
            id: 36,
            name: 'Anti-Personnel Combat',
            description: 'Specialized human vs human combat techniques',
            rank: 'Rare'
        }
    ],
    'Epic': [
        {
            id: 9,
            name: 'Armored Titan Power',
            description: 'Massive armored form with incredible defensive capabilities',
            rank: 'Epic'
        },
        {
            id: 10,
            name: 'Colossal Titan Power',
            description: 'Enormous size with devastating steam attacks',
            rank: 'Epic'
        },
        {
            id: 11,
            name: 'Female Titan Power',
            description: 'Agile titan form with hardening and calling abilities',
            rank: 'Epic'
        },
        {
            id: 12,
            name: 'Beast Titan Power',
            description: 'Intelligent titan with throwing and commanding abilities',
            rank: 'Epic'
        }
    ],
    'Legendary': [
        {
            id: 13,
            name: 'Attack Titan Power',
            description: 'The Attack Titan with future memory inheritance',
            rank: 'Legendary'
        },
        {
            id: 14,
            name: 'Warhammer Titan Power',
            description: 'Create weapons and structures from hardened titan material',
            rank: 'Legendary'
        },
        {
            id: 15,
            name: 'Jaw Titan Power',
            description: 'Swift titan with powerful jaws and claws',
            rank: 'Legendary'
        },
        {
            id: 16,
            name: 'Cart Titan Power',
            description: 'Endurance-focused titan with equipment carrying capability',
            rank: 'Legendary'
        }
    ],
    'Mythic': [
        {
            id: 17,
            name: 'Founding Titan Power',
            description: 'The ultimate power to control all titans and coordinate',
            rank: 'Mythic'
        },
        {
            id: 18,
            name: 'Ackerman Bloodline',
            description: 'Awakened Ackerman powers with superhuman combat abilities',
            rank: 'Mythic'
        },
        {
            id: 19,
            name: 'Royal Blood',
            description: 'Royal Fritz bloodline with titan commanding authority',
            rank: 'Mythic'
        },
        {
            id: 20,
            name: 'Coordinate Control',
            description: 'Command over the coordinate plane and titan paths',
            rank: 'Mythic'
        },
        {
            id: 21,
            name: 'Memory Manipulation',
            description: 'Alter and control memories of Eldian people',
            rank: 'Mythic'
        }
    ],
    'Divine': [
        {
            id: 22,
            name: 'Ymir\'s Original Power',
            description: 'The primordial titan power from the source of all organic matter',
            rank: 'Divine'
        },
        {
            id: 23,
            name: 'Paths Mastery',
            description: 'Complete dominion over the paths dimension connecting all Eldians',
            rank: 'Divine'
        },
        {
            id: 24,
            name: 'Titan Genesis',
            description: 'The power to create new titan types and abilities',
            rank: 'Divine'
        },
        {
            id: 25,
            name: 'Reality Alteration',
            description: 'Reshape the physical world through titan power manifestation',
            rank: 'Divine'
        }
    ],
    'Cosmic': [
        {
            id: 26,
            name: 'Source of All Organic Matter',
            description: 'The ultimate origin of all life and titan powers in existence',
            rank: 'Cosmic'
        },
        {
            id: 27,
            name: 'Omnipotent Founder',
            description: 'Transcendent founding power that surpasses all limitations',
            rank: 'Cosmic'
        },
        {
            id: 28,
            name: 'Universal Coordinate',
            description: 'Control over all dimensions, timelines, and realities',
            rank: 'Cosmic'
        }
    ],
    'Transcendent': [
        {
            id: 29,
            name: 'Primordial Genesis',
            description: 'The beginning of all existence and the source of infinite possibilities',
            rank: 'Transcendent'
        },
        {
            id: 30,
            name: 'Reality Sovereign',
            description: 'Absolute dominion over the fabric of existence itself',
            rank: 'Transcendent'
        },
        {
            id: 31,
            name: 'Eternal Ascendant',
            description: 'Transcendence beyond the concept of titans and humanity',
            rank: 'Transcendent'
        }
    ],
    'Omnipotent': [
        {
            id: 32,
            name: 'Divine Omnipresence',
            description: 'Existence in all places, times, and dimensions simultaneously',
            rank: 'Omnipotent'
        },
        {
            id: 33,
            name: 'Absolute Authority',
            description: 'Unquestionable power over all creation and destruction',
            rank: 'Omnipotent'
        }
    ],
    'Absolute': [
        {
            id: 34,
            name: 'Ymir\'s Divine Inheritance',
            description: 'The complete power inherited from the first titan Ymir Fritz, transcending all limitations of the Nine Titans',
            rank: 'Absolute'
        },
        {
            id: 35,
            name: 'Paradis Island\'s Final Hope',
            description: 'The ultimate manifestation of humanity\'s will to survive, combining all Eldian powers into one absolute force',
            rank: 'Absolute'
        },
        {
            id: 36,
            name: 'Devil of All Earth',
            description: 'The legendary power that grants dominion over all titans, paths, and the very fabric of existence itself',
            rank: 'Absolute'
        }
    ]
};

/**
 * Get random power based on user level
 */
function getRandomPower() {
    // Remove level dependency - use database powers only
    const selectedRank = getRandomRank();
    const powerPool = powerPools[selectedRank];

    if (!powerPool || powerPool.length === 0) {
        // Fallback to Normal rank
        return powerPools['Normal'][Math.floor(Math.random() * powerPools['Normal'].length)];
    }

    return powerPool[Math.floor(Math.random() * powerPool.length)];
}

/**
 * Get random rank based on user level and weights
 * DRAW RESTRICTION: Maximum rank obtainable through draws is Mythic
 */
function getRandomRank() {
    // Remove level dependency - use fixed weights
    const allowedDrawRanks = ['Normal', 'Rare', 'Epic', 'Legendary', 'Mythic'];
    
    const weights = {};
    // Use hardcoded weights for now - will be replaced with database
    const hardcodedWeights = {
        'Normal': 70.0,
        'Rare': 20.0,
        'Epic': 7.0,
        'Legendary': 2.5,
        'Mythic': 0.5
    };
    
    for (const rank of allowedDrawRanks) {
        weights[rank] = hardcodedWeights[rank] || 1;
    }

    // Calculate total weight
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);

    // Random selection
    let random = Math.random() * totalWeight;

    for (const [rank, weight] of Object.entries(weights)) {
        random -= weight;
        if (random <= 0) {
            return rank;
        }
    }

    return 'Normal'; // fallback
}

/**
 * Calculate combat power for a power (Enhanced System)
 */
function getPowerCP(power) {
    // Use only database base_cp value - no level bonuses or calculations
    return power.base_cp || power.combat_power || 100;
}

/**
 * Calculate evolution bonus when combining powers (Advanced Complex System)
 */
function calculateEvolutionBonus(mainPower, sacrificePower) {
    const rankValues = {
        'Normal': 1,
        'Rare': 2,
        'Epic': 3,
        'Legendary': 4,
        'Mythic': 5,
        'Divine': 6,
        'Cosmic': 7,
        'Transcendent': 8,
        'Omnipotent': 9,
        'Absolute': 10
    };

    const mainRankValue = rankValues[mainPower.rank] || 1;
    const sacrificeRankValue = rankValues[sacrificePower.rank] || 1;

    // Evolution compatibility factor - certain powers combine better
    const compatibilityBonus = calculateCompatibilityBonus(mainPower, sacrificePower);
    
    // Advanced evolution logic with multiple factors
    let newRankValue;
    let cpMultiplier;
    let evolutionType;
    
    if (sacrificeRankValue > mainRankValue) {
        // Higher rank sacrifice boosts main power significantly
        const rankDifference = sacrificeRankValue - mainRankValue;
        newRankValue = Math.min(10, mainRankValue + Math.floor(rankDifference / 2) + 1 + compatibilityBonus.rankBonus);
        cpMultiplier = 2.5 + (rankDifference * 0.5) + compatibilityBonus.cpBonus;
        evolutionType = 'ascension';
    } else if (sacrificeRankValue === mainRankValue) {
        // Same rank evolution - creates fusion
        newRankValue = Math.min(10, mainRankValue + 1 + compatibilityBonus.rankBonus);
        cpMultiplier = 2.0 + compatibilityBonus.cpBonus;
        evolutionType = 'fusion';
    } else {
        // Lower rank sacrifice provides modest boost - absorption
        newRankValue = Math.min(10, mainRankValue + Math.max(1, Math.floor(sacrificeRankValue / 3)) + compatibilityBonus.rankBonus);
        cpMultiplier = 1.5 + (sacrificeRankValue / mainRankValue) * 0.5 + compatibilityBonus.cpBonus;
        evolutionType = 'absorption';
    }
    
    const newRank = Object.keys(rankValues).find(key => rankValues[key] === newRankValue) || mainPower.rank;
    // Use hardcoded rank data for now - will be replaced with database
    const hardcodedRankData = {
        'Normal': { baseCPMin: 45 },
        'Rare': { baseCPMin: 200 },
        'Epic': { baseCPMin: 800 },
        'Legendary': { baseCPMin: 2000 },
        'Mythic': { baseCPMin: 5000 }
    };
    const newRankData = hardcodedRankData[newRank];
    
    // Calculate new CP with evolution type bonuses
    const cpFromMain = Math.floor(mainPower.combat_power * cpMultiplier);
    const cpFromSacrifice = Math.floor(sacrificePower.combat_power * getSacrificeRatio(evolutionType));
    let newCP = cpFromMain + cpFromSacrifice;
    
    // Apply compatibility bonuses
    newCP = Math.floor(newCP * (1 + compatibilityBonus.finalMultiplier));
    
    // Apply rank minimums
    if (newRankData) {
        newCP = Math.max(newCP, newRankData.baseCPMin);
    }
    
    // Ensure significant improvement based on evolution type
    const minimumImprovement = getMinimumImprovement(evolutionType);
    newCP = Math.max(newCP, Math.floor(mainPower.combat_power * minimumImprovement));

    // Generate new name and description based on evolution type
    const newName = generateEvolvedName(mainPower.name, sacrificePower.name, evolutionType, compatibilityBonus);
    const newDescription = generateEvolvedDescription(mainPower, sacrificePower, evolutionType, compatibilityBonus);

    // Calculate evolution cost (more complex combinations cost more)
    const evolutionCost = calculateEvolutionCost(mainPower, sacrificePower, evolutionType, compatibilityBonus);

    return {
        newCP,
        newRank,
        newName,
        newDescription,
        cpIncrease: newCP - mainPower.combat_power,
        multiplier: parseFloat(cpMultiplier.toFixed(2)),
        evolutionType,
        compatibilityRating: compatibilityBonus.rating,
        evolutionCost,
        successRate: calculateSuccessRate(mainPower, sacrificePower, evolutionType, compatibilityBonus)
    };
}

/**
 * Calculate compatibility bonus between two powers
 */
function calculateCompatibilityBonus(mainPower, sacrificePower) {
    let rankBonus = 0;
    let cpBonus = 0;
    let finalMultiplier = 0;
    let rating = 'Poor';
    
    // Titan power compatibility
    const titanPowers = ['Colossal Titan Power', 'Armored Titan Power', 'Attack Titan Power', 'Female Titan Power', 'Beast Titan Power', 'Jaw Titan Power', 'Cart Titan Power', 'Warhammer Titan Power', 'Founding Titan Power'];
    const isMainTitan = titanPowers.some(titan => mainPower.name.includes(titan));
    const isSacrificeTitan = titanPowers.some(titan => sacrificePower.name.includes(titan));
    
    if (isMainTitan && isSacrificeTitan) {
        rankBonus = 1;
        cpBonus = 0.5;
        finalMultiplier = 0.25;
        rating = 'Perfect';
    }
    
    // Bloodline compatibility
    const bloodlinePowers = ['Ackerman Bloodline', 'Royal Blood'];
    const isMainBloodline = bloodlinePowers.some(bloodline => mainPower.name.includes(bloodline));
    const isSacrificeBloodline = bloodlinePowers.some(bloodline => sacrificePower.name.includes(bloodline));
    
    if (isMainBloodline && isSacrificeBloodline) {
        rankBonus = 1;
        cpBonus = 0.4;
        finalMultiplier = 0.2;
        rating = 'Excellent';
    }
    
    // Equipment and training compatibility
    const equipmentPowers = ['Vertical Maneuvering Equipment', 'Thunder Spear', 'Blade Mastery'];
    const trainingPowers = ['Scout Regiment Training', 'Garrison Defense', 'Military Police Authority'];
    const isMainEquipment = equipmentPowers.some(eq => mainPower.name.includes(eq));
    const isSacrificeTraining = trainingPowers.some(tr => sacrificePower.name.includes(tr));
    
    if (isMainEquipment && isSacrificeTraining) {
        rankBonus = 0;
        cpBonus = 0.3;
        finalMultiplier = 0.15;
        rating = 'Good';
    }
    
    // Hardening and regeneration compatibility
    if (mainPower.name.includes('Hardening') && sacrificePower.name.includes('Regeneration')) {
        rankBonus = 1;
        cpBonus = 0.4;
        finalMultiplier = 0.2;
        rating = 'Excellent';
    }
    
    // Founding titan special compatibility
    if (mainPower.name.includes('Founding') || sacrificePower.name.includes('Founding')) {
        rankBonus = 1;
        cpBonus = 0.3;
        finalMultiplier = 0.15;
        rating = 'Great';
    }
    
    // Source of all organic matter compatibility (ultimate combinations)
    if (mainPower.name.includes('Source of All Organic Matter') || sacrificePower.name.includes('Source of All Organic Matter')) {
        rankBonus = 2;
        cpBonus = 1.0;
        finalMultiplier = 0.5;
        rating = 'Legendary';
    }
    
    return { rankBonus, cpBonus, finalMultiplier, rating };
}

/**
 * Get sacrifice ratio based on evolution type
 */
function getSacrificeRatio(evolutionType) {
    switch (evolutionType) {
        case 'ascension': return 0.8;
        case 'fusion': return 0.6;
        case 'absorption': return 0.4;
        default: return 0.6;
    }
}

/**
 * Get minimum improvement based on evolution type
 */
function getMinimumImprovement(evolutionType) {
    switch (evolutionType) {
        case 'ascension': return 2.0;
        case 'fusion': return 1.8;
        case 'absorption': return 1.5;
        default: return 1.5;
    }
}

/**
 * Calculate evolution cost
 */
function calculateEvolutionCost(mainPower, sacrificePower, evolutionType, compatibilityBonus) {
    const baseCost = 1000;
    const rankMultiplier = {
        'Normal': 1,
        'Rare': 2,
        'Epic': 4,
        'Legendary': 8,
        'Mythic': 16,
        'Divine': 32,
        'Cosmic': 64,
        'Transcendent': 128,
        'Omnipotent': 256,
        'Absolute': 512
    };
    
    const mainRankCost = rankMultiplier[mainPower.rank] || 1;
    const sacrificeRankCost = rankMultiplier[sacrificePower.rank] || 1;
    
    let cost = baseCost * (mainRankCost + sacrificeRankCost);
    
    // Evolution type modifiers
    switch (evolutionType) {
        case 'ascension':
            cost *= 1.5;
            break;
        case 'fusion':
            cost *= 1.2;
            break;
        case 'absorption':
            cost *= 1.0;
            break;
    }
    
    // Compatibility reduces cost
    const compatibilityDiscount = {
        'Poor': 1.0,
        'Fair': 0.9,
        'Good': 0.8,
        'Great': 0.7,
        'Excellent': 0.6,
        'Perfect': 0.5,
        'Legendary': 0.3
    };
    
    cost *= compatibilityDiscount[compatibilityBonus.rating] || 1.0;
    
    return Math.floor(cost);
}

/**
 * Calculate success rate for evolution
 */
function calculateSuccessRate(mainPower, sacrificePower, evolutionType, compatibilityBonus) {
    let baseRate = 75; // 75% base success rate
    
    // Evolution type affects success rate
    switch (evolutionType) {
        case 'ascension':
            baseRate = 60;
            break;
        case 'fusion':
            baseRate = 75;
            break;
        case 'absorption':
            baseRate = 85;
            break;
    }
    
    // Compatibility bonus
    const compatibilityBonus_rate = {
        'Poor': 0,
        'Fair': 5,
        'Good': 10,
        'Great': 15,
        'Excellent': 20,
        'Perfect': 25,
        'Legendary': 30
    };
    
    baseRate += compatibilityBonus_rate[compatibilityBonus.rating] || 0;
    
    // Rank difference penalty
    const rankValues = {
        'Normal': 1, 'Rare': 2, 'Epic': 3, 'Legendary': 4, 'Mythic': 5,
        'Divine': 6, 'Cosmic': 7, 'Transcendent': 8, 'Omnipotent': 9, 'Absolute': 10
    };
    
    const rankDifference = Math.abs((rankValues[mainPower.rank] || 1) - (rankValues[sacrificePower.rank] || 1));
    baseRate -= rankDifference * 2;
    
    return Math.max(30, Math.min(95, baseRate)); // Cap between 30% and 95%
}

/**
 * Generate evolved power name with evolution type and compatibility
 */
function generateEvolvedName(mainName, sacrificeName, evolutionType, compatibilityBonus) {
    const evolutionPrefixes = [
        'Enhanced', 'Awakened', 'Perfected', 'Supreme', 'Ultimate',
        'Transcendent', 'Divine', 'Evolved', 'Refined', 'Empowered'
    ];

    // Attack on Titan specific combinations
    const titanCombinations = {
        'Colossal Titan Power': ['Colossal'],
        'Armored Titan Power': ['Armored'],
        'Attack Titan Power': ['Attack'],
        'Female Titan Power': ['Female'],
        'Beast Titan Power': ['Beast'],
        'Jaw Titan Power': ['Jaw'],
        'Cart Titan Power': ['Cart'],
        'Warhammer Titan Power': ['Warhammer'],
        'Founding Titan Power': ['Founding']
    };

    // Special combinations for specific power pairs
    const specialCombinations = {
        'Titan Hardening + Vertical Maneuvering Equipment': 'Hardened Mobility Mastery',
        'Vertical Maneuvering Equipment + Titan Hardening': 'Hardened Mobility Mastery',
        'Thunder Spear + Blade Mastery': 'Explosive Blade Technique',
        'Blade Mastery + Thunder Spear': 'Explosive Blade Technique',
        'Enhanced Strength + Regeneration': 'Berserker Healing Factor',
        'Regeneration + Enhanced Strength': 'Berserker Healing Factor',
        'Steam Release + Titan Hardening': 'Pressurized Armor Form',
        'Titan Hardening + Steam Release': 'Pressurized Armor Form',
        'Colossal Titan Power + Armored Titan Power': 'Titanic Fortress Form',
        'Armored Titan Power + Colossal Titan Power': 'Titanic Fortress Form',
        'Attack Titan Power + Founding Titan Power': 'Liberating Coordinate',
        'Founding Titan Power + Attack Titan Power': 'Liberating Coordinate',
        'Ackerman Bloodline + Royal Blood': 'Royal Ackerman Heritage',
        'Royal Blood + Ackerman Bloodline': 'Royal Ackerman Heritage'
    };

    // Check for special combinations first
    const combinationKey = `${mainName} + ${sacrificeName}`;
    if (specialCombinations[combinationKey]) {
        return specialCombinations[combinationKey];
    }

    // Titan-specific combinations
    const mainTitan = Object.keys(titanCombinations).find(key => mainName.includes(key));
    const sacrificeTitan = Object.keys(titanCombinations).find(key => sacrificeName.includes(key));
    
    if (mainTitan && sacrificeTitan) {
        const mainType = titanCombinations[mainTitan][0];
        const sacrificeType = titanCombinations[sacrificeTitan][0];
        return `${mainType}-${sacrificeType} Hybrid Titan`;
    }

    // Power + Equipment combinations
    if (mainName.includes('Power') && sacrificeName.includes('Equipment')) {
        const titanType = mainName.replace(' Power', '');
        return `${titanType} Combat Mastery`;
    }

    if (mainName.includes('Equipment') && sacrificeName.includes('Power')) {
        const titanType = sacrificeName.replace(' Power', '');
        return `${titanType} Combat Mastery`;
    }

    // Bloodline combinations
    if (mainName.includes('Bloodline') || sacrificeName.includes('Bloodline')) {
        const bloodlineType = mainName.includes('Bloodline') ? mainName.replace(' Bloodline', '') : sacrificeName.replace(' Bloodline', '');
        const otherPower = mainName.includes('Bloodline') ? sacrificeName : mainName;
        return `${bloodlineType} ${otherPower.split(' ')[0]} Inheritance`;
    }

    // Training/Skill combinations
    if (mainName.includes('Training') || mainName.includes('Mastery')) {
        const prefix = getRandomElement(evolutionPrefixes);
        const baseName = sacrificeName.split(' ')[0];
        return `${prefix} ${baseName} Discipline`;
    }

    // Generic but contextual naming
    const mainKeyword = extractKeyword(mainName);
    const sacrificeKeyword = extractKeyword(sacrificeName);
    
    if (mainKeyword && sacrificeKeyword && mainKeyword !== sacrificeKeyword) {
        return `${mainKeyword}-${sacrificeKeyword} Synthesis`;
    }

    // Fallback based on evolution type
    const prefix = getRandomElement(evolutionPrefixes);
    const baseName = mainName.split(' ')[0];
    
    // Evolution type specific naming
    switch (evolutionType) {
        case 'ascension':
            return `${prefix} ${baseName} Ascension`;
        case 'fusion':
            return `${baseName}-${sacrificeName.split(' ')[0]} Fusion`;
        case 'absorption':
            return `${baseName} ${prefix} Form`;
        default:
            return `${prefix} ${baseName} Evolution`;
    }
}

/**
 * Extract key word from power name for combinations
 */
function extractKeyword(powerName) {
    const keywords = {
        'Vertical Maneuvering Equipment': 'Mobility',
        'Thunder Spear': 'Thunder',
        'Blade Mastery': 'Blade',
        'Scout Regiment Training': 'Scout',
        'Titan Hardening': 'Titan',
        'Enhanced Strength': 'Strength',
        'Regeneration': 'Regen',
        'Steam Release': 'Steam',
        'Armored Titan Power': 'Armor',
        'Colossal Titan Power': 'Colossal',
        'Female Titan Power': 'Female',
        'Beast Titan Power': 'Beast',
        'Attack Titan Power': 'Attack',
        'Warhammer Titan Power': 'Warhammer',
        'Jaw Titan Power': 'Jaw',
        'Cart Titan Power': 'Cart',
        'Founding Titan Power': 'Founding',
        'Ackerman Bloodline': 'Ackerman',
        'Royal Blood': 'Royal'
    };

    return keywords[powerName] || powerName.split(' ')[0];
}

/**
 * Generate evolved power description with evolution type and compatibility
 */
function generateEvolvedDescription(mainPower, sacrificePower, evolutionType, compatibilityBonus) {
    // Evolution type specific descriptions
    const typeDescriptions = {
        'ascension': [
            `${mainPower.name} has ascended to a higher plane of existence by absorbing the essence of ${sacrificePower.name}.`,
            `Through the sacrifice of ${sacrificePower.name}, ${mainPower.name} has transcended its original limitations.`,
            `The power of ${sacrificePower.name} has elevated ${mainPower.name} to unprecedented heights.`
        ],
        'fusion': [
            `A perfect fusion combining the strengths of ${mainPower.name} and ${sacrificePower.name} into one unified power.`,
            `The harmony between ${mainPower.name} and ${sacrificePower.name} has created something greater than the sum of its parts.`,
            `Two powers become one: ${mainPower.name} and ${sacrificePower.name} merged into a single, superior force.`
        ],
        'absorption': [
            `${mainPower.name} has absorbed the essence of ${sacrificePower.name}, gaining new capabilities.`,
            `By consuming ${sacrificePower.name}, ${mainPower.name} has evolved beyond its original form.`,
            `The power of ${sacrificePower.name} has been integrated into ${mainPower.name}'s core structure.`
        ]
    };

    const descriptions = typeDescriptions[evolutionType] || typeDescriptions['fusion'];
    let description = getRandomElement(descriptions);

    // Add compatibility bonus flavor text
    if (compatibilityBonus.rating === 'Perfect' || compatibilityBonus.rating === 'Legendary') {
        description += ` This legendary combination resonates with the very fabric of the Attack on Titan universe.`;
    } else if (compatibilityBonus.rating === 'Excellent') {
        description += ` The compatibility between these powers creates exceptional synergy.`;
    }

    return description;
}

/**
 * Get random element from array
 */
function getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

/**
 * Get power rank color for embeds
 */
function getRankColor(rank) {
    return rankColors[rank] || '#999999';
}

/**
 * Get power rank emoji
 */
function getRankEmoji(rank) {
    return rankEmojis[rank] || '⚪';
}

/**
 * Validate power evolution (Enhanced System)
 */
function validateEvolution(mainPower, sacrificePower, userLevel) {
    const errors = [];

    // Level requirements (updated for new ranks)
    const minLevel = {
        'Normal': 1,
        'Rare': 5,
        'Epic': 15,
        'Legendary': 25,
        'Mythic': 40,
        'Divine': 60,
        'Cosmic': 80
    };

    const requiredLevel = Math.max(
        minLevel[mainPower.rank] || 1,
        minLevel[sacrificePower.rank] || 1
    );

    if (userLevel < requiredLevel) {
        errors.push(`Evolution requires level ${requiredLevel}`);
    }

    // Enhanced power compatibility checks
    if (mainPower.rank === sacrificePower.rank && mainPower.combat_power < sacrificePower.combat_power) {
        errors.push('Main power should be stronger or equal to sacrifice power when ranks are the same');
    }

    // Minimum CP requirements for evolution
    const minCPForEvolution = {
        'Normal': 100,
        'Rare': 300,
        'Epic': 1000,
        'Legendary': 2500,
        'Mythic': 5000,
        'Divine': 10000,
        'Cosmic': 20000
    };

    if (mainPower.combat_power < (minCPForEvolution[mainPower.rank] || 50)) {
        errors.push(`Main power must have at least ${minCPForEvolution[mainPower.rank]} CP to evolve`);
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Generate merged power name based on multiple combined powers
 */
function generateMergedName(mainPower, sacrificePowers) {
    // Extract key words from power names
    const getKeyword = (powerName) => {
        const words = powerName.split(' ');
        const keywords = ['Titan', 'Attack', 'Colossal', 'Armored', 'Female', 'Beast', 'Jaw', 'Cart', 'Warhammer', 'Founding', 'Ackerman', 'Royal', 'Thunder', 'Blade', 'Scout', 'Vertical', 'Steam', 'Hardening', 'Regeneration', 'Strength', 'Speed', 'Endurance', 'Combat', 'Training', 'Mastery', 'Leadership', 'Tactical', 'Military', 'Enhanced', 'Advanced', 'Elite', 'Master', 'Supreme', 'Divine', 'Cosmic', 'Absolute', 'Transcendent', 'Omnipotent'];
        
        for (let word of words) {
            if (keywords.includes(word)) {
                return word;
            }
        }
        return words[0] || 'Power';
    };
    
    const mainKeyword = getKeyword(mainPower.name);
    const sacrificeKeywords = sacrificePowers.map(p => getKeyword(p.name));
    
    // Create unique combinations based on power types
    if (mainKeyword === 'Titan' && sacrificeKeywords.includes('Titan')) {
        return `Primordial Titan Fusion`;
    }
    if (mainKeyword === 'Attack' && sacrificeKeywords.includes('Colossal')) {
        return `Colossal Attack Titan`;
    }
    if (mainKeyword === 'Founding' && sacrificeKeywords.includes('Royal')) {
        return `Royal Founding Authority`;
    }
    if (mainKeyword === 'Ackerman' && sacrificeKeywords.includes('Combat')) {
        return `Ackerman Combat Mastery`;
    }
    if (mainKeyword === 'Thunder' && sacrificeKeywords.includes('Blade')) {
        return `Thunder Blade Mastery`;
    }
    if (mainKeyword === 'Scout' && sacrificeKeywords.includes('Leadership')) {
        return `Scout Commander Authority`;
    }
    if (mainKeyword === 'Enhanced' && sacrificeKeywords.includes('Strength')) {
        return `Superior Physical Enhancement`;
    }
    if (mainKeyword === 'Steam' && sacrificeKeywords.includes('Hardening')) {
        return `Hardened Steam Defense`;
    }
    if (mainKeyword === 'Regeneration' && sacrificeKeywords.includes('Enhanced')) {
        return `Advanced Regeneration Factor`;
    }
    
    // Generic combinations
    const allKeywords = [mainKeyword, ...sacrificeKeywords];
    const uniqueKeywords = [...new Set(allKeywords)];
    
    if (uniqueKeywords.length >= 3) {
        return `${uniqueKeywords[0]} ${uniqueKeywords[1]} ${uniqueKeywords[2]} Fusion`;
    } else if (uniqueKeywords.length === 2) {
        return `${uniqueKeywords[0]} ${uniqueKeywords[1]} Synthesis`;
    } else {
        return `Evolved ${mainKeyword} Power`;
    }
}

/**
 * Calculate merge result for multiple powers
 */
async function calculateMergeResult(mainPower, sacrificePowers) {
    // Simple CP combination - add all powers' CP
    const totalCP = mainPower.combat_power + sacrificePowers.reduce((sum, p) => sum + p.combat_power, 0);
    
    // Add bonus for merging multiple powers (15% base + 5% per additional power)
    const mergeBonus = Math.floor(totalCP * (0.15 + (sacrificePowers.length * 0.05)));
    const finalCP = totalCP + mergeBonus;
    
    // Determine new rank based on final CP from database
    const newRank = await configDb.determineRankByCP(finalCP);
    
    // Generate new name based on merged powers
    const newName = generateMergedName(mainPower, sacrificePowers);
    
    // Calculate merge cost based on combined power
    const mergeCost = Math.floor(
        (mainPower.combat_power * 0.2) + 
        sacrificePowers.reduce((sum, p) => sum + (p.combat_power * 0.2), 0) + 
        (sacrificePowers.length * 1000)
    );
    
    return {
        newCP: finalCP,
        newRank,
        newName,
        cpIncrease: finalCP - mainPower.combat_power,
        mergeCost: Math.max(mergeCost, 500),
        powersUsed: sacrificePowers.length + 1,
        description: `A powerful fusion created by merging ${sacrificePowers.length + 1} different powers into one ultimate ability.`
    };
}

module.exports = {
    getRandomPower,
    getPowerCP,
    calculateEvolutionBonus,
    generateMergedName,
    calculateMergeResult,
    getRankColor: getRankColorSync,
    getRankEmoji: getRankEmojiSync,
    validateEvolution
};
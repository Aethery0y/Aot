const configDb = require('./configDatabase');
const { pool } = require('../config/database');
const logger = require('./logger');

/**
 * Database helper functions to replace hardcoded values
 */

// Get rank color from database
async function getRankColor(rank) {
    const ranks = await configDb.getPowerRanks();
    return ranks[rank]?.color || '#999999';
}

// Get rank emoji from database
async function getRankEmoji(rank) {
    const ranks = await configDb.getPowerRanks();
    return ranks[rank]?.emoji || '⚪';
}

// Synchronous versions for backwards compatibility
function getRankColorSync(rank) {
    const hardcodedColors = {
        'Normal': '#999999',
        'Rare': '#0099ff',
        'Epic': '#9932cc',
        'Legendary': '#ffaa00',
        'Mythic': '#ff0000',
        'Divine': '#00ff00',
        'Cosmic': '#ff6600',
        'Transcendent': '#000000',
        'Omnipotent': '#ffffff',
        'Absolute': '#ff69b4'
    };
    return hardcodedColors[rank] || '#999999';
}

function getRankEmojiSync(rank) {
    const hardcodedEmojis = {
        'Normal': '⚪',
        'Rare': '🔵',
        'Epic': '🟣',
        'Legendary': '🟡',
        'Mythic': '🔴',
        'Divine': '🟢',
        'Cosmic': '🟠',
        'Transcendent': '⚫',
        'Omnipotent': '✨',
        'Absolute': '💎'
    };
    return hardcodedEmojis[rank] || '⚪';
}

// Get gacha rates from database
async function getGachaRates() {
    return await configDb.getGachaRates();
}

// Get command cooldown from database
async function getCommandCooldown(commandName) {
    const config = await configDb.getCommandConfig(commandName);
    return config.cooldown;
}

// Get all enemies from database
async function getEnemiesByRank(rank) {
    const connection = await pool.getConnection();
    try {
        const [rows] = await connection.execute(
            'SELECT * FROM enemy_config WHERE rank = ? AND is_active = TRUE',
            [rank]
        );
        return rows;
    } finally {
        connection.release();
    }
}

// Get random enemy by rank
async function getRandomEnemyByRank(rank) {
    const enemies = await getEnemiesByRank(rank);
    if (enemies.length === 0) {
        // Fallback enemy if none found
        return {
            id: 1,
            name: `${rank} Enemy`,
            description: `A powerful ${rank} rank enemy`,
            rank: rank,
            base_cp: await getMinCPForRank(rank),
            cp_variance: 0.2,
            reward_multiplier: 1.0
        };
    }
    return enemies[Math.floor(Math.random() * enemies.length)];
}

// Get minimum CP for rank
async function getMinCPForRank(rank) {
    const ranks = await configDb.getPowerRanks();
    return ranks[rank]?.minCP || 50;
}

// Get maximum CP for rank
async function getMaxCPForRank(rank) {
    const ranks = await configDb.getPowerRanks();
    return ranks[rank]?.maxCP || 100;
}

// Get power price by rank
async function getPowerPriceByRank(rank) {
    const ranks = await configDb.getPowerRanks();
    return ranks[rank]?.basePrice || 1000;
}

// Get gacha draw price
async function getGachaDrawPrice() {
    return await configDb.getConfig('gacha_draw_price');
}

// Get starting user resources
async function getStartingResources() {
    return {
        coins: await configDb.getConfig('starting_coins'),
        gachaDraws: await configDb.getConfig('starting_draws')
    };
}

// Get daily reward amount
async function getDailyRewardAmount() {
    return await configDb.getConfig('daily_reward_coins');
}

// Get merge cooldown
async function getMergeCooldownHours() {
    return await configDb.getConfig('merge_cooldown_hours');
}

// Get battle coin multiplier
async function getBattleCoinMultiplier() {
    return await configDb.getConfig('battle_coin_multiplier');
}

// Get rank order for comparison
async function getRankOrder(rank) {
    const ranks = await configDb.getPowerRanks();
    return ranks[rank]?.order || 1;
}

// Compare ranks
async function isRankHigher(rank1, rank2) {
    const order1 = await getRankOrder(rank1);
    const order2 = await getRankOrder(rank2);
    return order1 > order2;
}

// Get all available ranks for gacha
async function getGachaRanks() {
    const ranks = await configDb.getPowerRanks();
    return Object.keys(ranks).filter(rank => ranks[rank].weight > 0);
}

// Get embed color from config
async function getEmbedColor() {
    return await configDb.getConfig('embed_color');
}

// Generate enemy with proper CP scaling
async function generateEnemyWithCP(rank, userCP = null) {
    const enemy = await getRandomEnemyByRank(rank);
    const rankData = await configDb.getPowerRanks();
    
    let enemyCP = enemy.base_cp;
    
    // If user CP is provided, scale enemy accordingly
    if (userCP !== null) {
        const variance = enemy.cp_variance || 0.2;
        const minCP = Math.floor(userCP * (1 - variance));
        const maxCP = Math.floor(userCP * (1 + variance));
        enemyCP = Math.floor(Math.random() * (maxCP - minCP + 1)) + minCP;
        
        // Ensure enemy CP is within rank bounds
        const minRankCP = rankData[rank]?.minCP || 50;
        const maxRankCP = rankData[rank]?.maxCP || 100;
        enemyCP = Math.max(minRankCP, Math.min(maxRankCP, enemyCP));
    }
    
    return {
        ...enemy,
        combat_power: enemyCP
    };
}

// Determine rank by CP value
async function determineRankByCP(cp) {
    const ranks = await configDb.getPowerRanks();
    
    // Sort ranks by minimum CP to find the appropriate rank
    const sortedRanks = Object.entries(ranks).sort((a, b) => a[1].minCP - b[1].minCP);
    
    // Find the highest rank that this CP qualifies for
    let appropriateRank = 'Normal';
    for (const [rank, data] of sortedRanks) {
        if (cp >= data.minCP) {
            appropriateRank = rank;
        }
    }
    
    return appropriateRank;
}

// Insert missing enemies into database
async function insertDefaultEnemies() {
    const connection = await pool.getConnection();
    try {
        // Check if enemies exist
        const [count] = await connection.execute('SELECT COUNT(*) as count FROM enemy_config');
        if (count[0].count > 0) return;

        // Insert default enemies for each rank
        const defaultEnemies = [
            // Normal rank enemies
            { name: 'Aberrant Titan', description: 'Unpredictable abnormal titan', rank: 'Normal', base_cp: 60, cp_variance: 0.3, reward_multiplier: 1.0 },
            { name: 'Mindless Titan', description: 'Basic titan with no intelligence', rank: 'Normal', base_cp: 50, cp_variance: 0.2, reward_multiplier: 1.0 },
            { name: 'Wall Crawler', description: 'Titan that climbs walls', rank: 'Normal', base_cp: 70, cp_variance: 0.25, reward_multiplier: 1.1 },
            
            // Rare rank enemies
            { name: 'Abnormal Titan', description: 'Titan with unusual behavior', rank: 'Rare', base_cp: 300, cp_variance: 0.2, reward_multiplier: 1.5 },
            { name: 'Stalker Titan', description: 'Intelligent hunting titan', rank: 'Rare', base_cp: 350, cp_variance: 0.3, reward_multiplier: 1.8 },
            
            // Epic rank enemies
            { name: 'Armored Titan', description: 'Heavily armored titan shifter', rank: 'Epic', base_cp: 1000, cp_variance: 0.15, reward_multiplier: 2.0 },
            { name: 'Colossal Titan', description: 'Massive steam-emitting titan', rank: 'Epic', base_cp: 1100, cp_variance: 0.1, reward_multiplier: 2.5 },
            
            // Legendary rank enemies
            { name: 'Beast Titan', description: 'Intelligent throwing titan', rank: 'Legendary', base_cp: 2500, cp_variance: 0.1, reward_multiplier: 3.0 },
            { name: 'War Hammer Titan', description: 'Weapon-creating titan', rank: 'Legendary', base_cp: 2800, cp_variance: 0.15, reward_multiplier: 3.5 },
            
            // Mythic rank enemies
            { name: 'Founding Titan', description: 'Ultimate coordinate titan', rank: 'Mythic', base_cp: 5500, cp_variance: 0.1, reward_multiplier: 5.0 },
            { name: 'Attack Titan', description: 'Freedom-seeking titan', rank: 'Mythic', base_cp: 5200, cp_variance: 0.2, reward_multiplier: 4.5 },
            
            // Divine rank enemies
            { name: 'Progenitor Titan', description: 'Original titan source', rank: 'Divine', base_cp: 10000, cp_variance: 0.1, reward_multiplier: 8.0 },
            { name: 'Paths Master', description: 'Controller of all paths', rank: 'Divine', base_cp: 11000, cp_variance: 0.15, reward_multiplier: 9.0 },
            
            // Cosmic rank enemies
            { name: 'Cosmic Titan Emperor', description: 'Ruler of titan dimensions', rank: 'Cosmic', base_cp: 20000, cp_variance: 0.1, reward_multiplier: 15.0 },
            { name: 'Omniversal Ruler', description: 'Master of all realities', rank: 'Cosmic', base_cp: 22000, cp_variance: 0.2, reward_multiplier: 18.0 },
            
            // Transcendent rank enemies
            { name: 'Reality Breaker', description: 'Breaks the laws of existence', rank: 'Transcendent', base_cp: 40000, cp_variance: 0.1, reward_multiplier: 30.0 },
            { name: 'Existence Manipulator', description: 'Controls existence itself', rank: 'Transcendent', base_cp: 45000, cp_variance: 0.15, reward_multiplier: 35.0 },
            
            // Omnipotent rank enemies
            { name: 'Universal God', description: 'Omnipotent universal entity', rank: 'Omnipotent', base_cp: 80000, cp_variance: 0.1, reward_multiplier: 60.0 },
            { name: 'Infinity Master', description: 'Master of infinite power', rank: 'Omnipotent', base_cp: 90000, cp_variance: 0.2, reward_multiplier: 70.0 },
            
            // Absolute rank enemies
            { name: 'Absolute Authority', description: 'Ultimate authority over all', rank: 'Absolute', base_cp: 750000, cp_variance: 0.1, reward_multiplier: 200.0 },
            { name: 'Supreme Existence', description: 'The ultimate existence', rank: 'Absolute', base_cp: 900000, cp_variance: 0.15, reward_multiplier: 250.0 }
        ];

        for (const enemy of defaultEnemies) {
            await connection.execute(
                'INSERT INTO enemy_config (name, description, rank, base_cp, cp_variance, reward_multiplier) VALUES (?, ?, ?, ?, ?, ?)',
                [enemy.name, enemy.description, enemy.rank, enemy.base_cp, enemy.cp_variance, enemy.reward_multiplier]
            );
        }

        logger.info('Default enemies inserted into database');
    } finally {
        connection.release();
    }
}

module.exports = {
    getRankColor,
    getRankEmoji,
    getRankColorSync,
    getRankEmojiSync,
    getGachaRates,
    getCommandCooldown,
    getEnemiesByRank,
    getRandomEnemyByRank,
    getMinCPForRank,
    getMaxCPForRank,
    getPowerPriceByRank,
    getGachaDrawPrice,
    getStartingResources,
    getDailyRewardAmount,
    getMergeCooldownHours,
    getBattleCoinMultiplier,
    getRankOrder,
    isRankHigher,
    getGachaRanks,
    getEmbedColor,
    generateEnemyWithCP,
    insertDefaultEnemies,
    determineRankByCP
};
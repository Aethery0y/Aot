

/**
 * Fast helper functions for commonly accessed data
 */

// Precomputed rank data for ultra-fast access
const RANK_DATA = {
    'Normal': { color: '#808080', emoji: '⚪', min: 50, max: 149 },
    'Rare': { color: '#00ff00', emoji: '🟢', min: 220, max: 360 },
    'Epic': { color: '#800080', emoji: '🟣', min: 800, max: 1196 },
    'Legendary': { color: '#ffa500', emoji: '🟠', min: 2000, max: 2700 },
    'Mythic': { color: '#ff0000', emoji: '🔴', min: 5000, max: 6000 },
    'Divine': { color: '#ffd700', emoji: '🟡', min: 9000, max: 11897 },
    'Cosmic': { color: '#ff1493', emoji: '🟢', min: 18000, max: 24910 },
    'Transcendent': { color: '#00ffff', emoji: '🔵', min: 35420, max: 49848 },
    'Omnipotent': { color: '#9400d3', emoji: '🟣', min: 76301, max: 99306 },
    'Absolute': { color: '#ffffff', emoji: '⚪', min: 515666, max: 846418 }
};

/**
 * Get rank color (instant, no database query)
 */
function getRankColorFast(rank) {
    return RANK_DATA[rank]?.color || '#808080';
}

/**
 * Get rank emoji (instant, no database query)
 */
function getRankEmojiFast(rank) {
    return RANK_DATA[rank]?.emoji || '⚪';
}

/**
 * Determine rank by CP (instant calculation)
 */
function determineRankByCPFast(cp) {
    for (const [rank, data] of Object.entries(RANK_DATA)) {
        if (cp >= data.min && cp <= data.max) {
            return rank;
        }
    }
    // Handle edge cases
    if (cp < 50) return 'Normal';
    if (cp > 846418) return 'Absolute';
    return 'Normal';
}

/**
 * Get user data directly from database
 */
async function getUserDataFast(discordId) {
    const { getUserByDiscordId } = require('./database');
    return await getUserByDiscordId(discordId);
}

/**
 * Placeholder for cache invalidation (no-op since caching removed)
 */
function invalidateUserCaches(userId, discordId) {
    // No-op: caching has been removed
}

module.exports = {
    getRankColorFast,
    getRankEmojiFast,
    determineRankByCPFast,
    getUserDataFast,
    invalidateUserCaches,
    RANK_DATA
};
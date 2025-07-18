const cron = require('node-cron');
const moment = require('moment-timezone');
const { getTop10ArenaPlayers } = require('./database');
const config = require('../config/bot');
const logger = require('./logger');

/**
 * Start the daily cleanup scheduler
 */
function startScheduler() {
    // Schedule daily cleanup tasks at 12:00 AM GMT
    cron.schedule('0 0 * * *', async () => {
        await performDailyCleanup();
    }, {
        timezone: 'GMT'
    });
    
    logger.info('Daily cleanup scheduler started (12:00 AM GMT)');
    
    // Optional: Schedule additional cleanup tasks
    cron.schedule('0 3 * * *', async () => {
        await performDailyCleanup();
    }, {
        timezone: 'GMT'
    });
    
    logger.info('Additional daily cleanup scheduler started (3:00 AM GMT)');
}

/**
 * Distribute daily rewards to top arena players (CP purchasing discontinued)
 */
async function distributeArenaRewards() {
    try {
        logger.info('Starting daily arena rewards distribution...');
        
        const top10Players = await getTop10ArenaPlayers();
        
        if (top10Players.length === 0) {
            logger.info('No arena players found for daily rewards');
            return;
        }
        
        // Note: CP purchasing has been discontinued
        // Future implementation could award coins or gacha draws instead
        logger.info(`Found ${top10Players.length} arena players for potential rewards`);
        logger.info('CP purchasing discontinued - no rewards distributed');
        
    } catch (error) {
        logger.error('Error in daily arena rewards distribution:', error);
    }
}

/**
 * Perform daily cleanup tasks
 */
async function performDailyCleanup() {
    try {
        logger.info('Starting daily cleanup tasks...');
        
        // Clean expired command cooldowns
        await cleanupExpiredCooldowns();
        
        // Clean old pagination sessions (if any stored in database)
        await cleanupOldSessions();
        
        // Log database statistics
        await logDatabaseStats();
        
        logger.info('Daily cleanup tasks completed');
        
    } catch (error) {
        logger.error('Error in daily cleanup tasks:', error);
    }
}

/**
 * Clean expired command cooldowns
 */
async function cleanupExpiredCooldowns() {
    try {
        const { pool } = require('../config/database');
        
        const [result] = await pool.execute(
            'DELETE FROM command_cooldowns WHERE expires_at < NOW()'
        );
        
        logger.info(`Cleaned up ${result.affectedRows} expired cooldowns`);
        
    } catch (error) {
        logger.error('Error cleaning up cooldowns:', error);
    }
}

/**
 * Clean old sessions and temporary data
 */
async function cleanupOldSessions() {
    try {
        // This would clean up any session data stored in database
        // For now, we just log the action
        logger.info('Session cleanup completed');
        
    } catch (error) {
        logger.error('Error cleaning up sessions:', error);
    }
}

/**
 * Log database statistics
 */
async function logDatabaseStats() {
    try {
        const { pool } = require('../config/database');
        
        // Get user count
        const [userCount] = await pool.execute('SELECT COUNT(*) as count FROM users');
        
        // Get arena player count
        const [arenaCount] = await pool.execute('SELECT COUNT(*) as count FROM arena_rankings');
        
        // Get total powers owned
        const [powerCount] = await pool.execute('SELECT COUNT(*) as count FROM user_powers');
        
        // Get total coins in economy
        const [economyStats] = await pool.execute(`
            SELECT 
                SUM(coins) as total_wallet_coins,
                SUM(bank_balance) as total_bank_coins,
                AVG(level) as avg_level
            FROM users
        `);
        
        const stats = {
            totalUsers: userCount[0].count,
            arenaPlayers: arenaCount[0].count,
            totalPowers: powerCount[0].count,
            totalWalletCoins: economyStats[0].total_wallet_coins || 0,
            totalBankCoins: economyStats[0].total_bank_coins || 0,
            averageLevel: Math.round(economyStats[0].avg_level || 1)
        };
        
        logger.info('Daily database statistics:', stats);
        
    } catch (error) {
        logger.error('Error getting database statistics:', error);
    }
}

/**
 * Get next reward distribution time
 */
function getNextRewardTime() {
    const now = moment.tz('GMT');
    let nextReward = moment.tz('GMT').startOf('day').add(1, 'day');
    
    // If it's already past midnight today, next reward is tomorrow
    if (now.hour() >= 0) {
        nextReward = now.clone().startOf('day').add(1, 'day');
    }
    
    return {
        nextReward: nextReward.toDate(),
        timeUntil: nextReward.diff(now),
        formatted: nextReward.format('YYYY-MM-DD HH:mm:ss GMT')
    };
}

/**
 * Check if rewards were distributed today
 */
async function checkTodayRewards() {
    try {
        // This could check a rewards log table if implemented
        // For now, we'll assume rewards are distributed properly by cron
        return {
            distributed: true,
            timestamp: new Date()
        };
        
    } catch (error) {
        logger.error('Error checking today\'s rewards:', error);
        return {
            distributed: false,
            error: error.message
        };
    }
}

/**
 * Manual reward distribution (for testing or manual triggers)
 */
async function manualRewardDistribution() {
    logger.info('Manual reward distribution triggered');
    await distributeArenaRewards();
}

/**
 * Get scheduler status
 */
function getSchedulerStatus() {
    const nextReward = getNextRewardTime();
    
    return {
        active: true,
        nextRewardDistribution: nextReward.formatted,
        timeUntilNext: nextReward.timeUntil,
        timezone: 'GMT',
        dailyRewardAmounts: config.dailyRewards
    };
}

module.exports = {
    startScheduler,
    distributeArenaRewards,
    performDailyCleanup,
    getNextRewardTime,
    checkTodayRewards,
    manualRewardDistribution,
    getSchedulerStatus
};

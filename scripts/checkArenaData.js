const logger = require("../utils/logger");
const { pool } = require('../config/database');

async function checkArenaData() {
    try {
        logger.info('Checking arena rankings data...');
        
        // Get all arena rankings
        const [arenaRankings] = await pool.execute(`
            SELECT ar.rank_position, ar.total_cp, u.username, u.discord_id, u.level, u.battles_won, u.battles_lost 
            FROM arena_rankings ar 
            JOIN users u ON ar.user_id = u.id 
            ORDER BY ar.rank_position
        `);
        
        logger.info('Current arena rankings:');
        arenaRankings.forEach((row, index) => {
            logger.info(`${index + 1}. Rank ${row.rank_position}: ${row.username} (${row.discord_id}) - Level ${row.level}, CP: ${row.total_cp}, W/L: ${row.battles_won}/${row.battles_lost}`);
        });
        
        // Get all users
        const [allUsers] = await pool.execute(`
            SELECT id, username, discord_id, level, battles_won, battles_lost, bonus_cp 
            FROM users 
            ORDER BY username
        `);
        
        logger.info('\nAll users in database:');
        allUsers.forEach((user, index) => {
            logger.info(`${index + 1}. ${user.username} (${user.discord_id}) - Level ${user.level}, Bonus CP: ${user.bonus_cp || 0}, W/L: ${user.battles_won}/${user.battles_lost}`);
        });
        
        // Check for inconsistencies
        logger.info('\nChecking for issues...');
        
        // Check for duplicate ranks
        const rankCounts = {};
        arenaRankings.forEach(row => {
            rankCounts[row.rank_position] = (rankCounts[row.rank_position] || 0) + 1;
        });
        
        const duplicateRanks = Object.entries(rankCounts).filter(([rank, count]) => count > 1);
        if (duplicateRanks.length > 0) {
            logger.info('❌ Found duplicate ranks:');
            duplicateRanks.forEach(([rank, count]) => {
                logger.info(`  Rank ${rank}: ${count} users`);
            });
        }
        
        // Check for users without arena rankings
        const [usersWithoutRankings] = await pool.execute(`
            SELECT u.username, u.discord_id 
            FROM users u 
            LEFT JOIN arena_rankings ar ON u.id = ar.user_id 
            WHERE ar.user_id IS NULL
        `);
        
        if (usersWithoutRankings.length > 0) {
            logger.info('❌ Users without arena rankings:');
            usersWithoutRankings.forEach(user => {
                logger.info(`  ${user.username} (${user.discord_id})`);
            });
        }
        
        logger.info('\nData check complete!');
        
    } catch (error) {
        logger.error('Error checking arena data:', error);
    } finally {
        await pool.end();
    }
}

checkArenaData();
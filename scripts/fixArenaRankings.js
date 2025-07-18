const logger = require("../utils/logger");
const { pool } = require('../config/database');

async function fixArenaRankings() {
    try {
        logger.info('Starting arena rankings fix...');
        
        // Clear existing arena rankings
        await pool.execute('DELETE FROM arena_rankings');
        logger.info('Cleared existing arena rankings');
        
        // Get all users with their total combat power
        const [users] = await pool.execute(`
            SELECT 
                u.id, u.username, u.discord_id, u.level, u.battles_won, u.battles_lost,
                COALESCE(up.combat_power, 0) + COALESCE(u.bonus_cp, 0) as total_cp
            FROM users u
            LEFT JOIN user_powers up ON u.equipped_power_id = up.power_id AND up.user_id = u.id
            ORDER BY 
                COALESCE(up.combat_power, 0) + COALESCE(u.bonus_cp, 0) DESC,
                u.battles_won DESC,
                u.level DESC
        `);
        
        logger.info('Found users to rank:');
        users.forEach((user, index) => {
            logger.info(`${index + 1}. ${user.username} - Level ${user.level}, CP: ${user.total_cp}, W/L: ${user.battles_won}/${user.battles_lost}`);
        });
        
        // Insert users into arena rankings with proper sequential ranks
        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            const rank = i + 1; // Sequential ranking starting from 1
            
            await pool.execute(`
                INSERT INTO arena_rankings (user_id, rank_position, total_cp) 
                VALUES (?, ?, ?)
            `, [user.id, rank, user.total_cp]);
            
            logger.info(`Assigned rank ${rank} to ${user.username} (CP: ${user.total_cp})`);
        }
        
        logger.info('\nArena rankings fixed successfully!');
        
        // Verify the fix
        const [newRankings] = await pool.execute(`
            SELECT ar.rank_position, ar.total_cp, u.username, u.discord_id
            FROM arena_rankings ar 
            JOIN users u ON ar.user_id = u.id 
            ORDER BY ar.rank_position
        `);
        
        logger.info('\nNew arena rankings:');
        newRankings.forEach(row => {
            logger.info(`Rank ${row.rank_position}: ${row.username} (CP: ${row.total_cp})`);
        });
        
    } catch (error) {
        logger.error('Error fixing arena rankings:', error);
    } finally {
        await pool.end();
    }
}

fixArenaRankings();
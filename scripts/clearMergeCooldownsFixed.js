const logger = require("../utils/logger");
const { pool } = require('../utils/database');

async function clearMergeCooldowns() {
    let connection;
    
    try {
        connection = await pool.getConnection();
        logger.info('Connected to database via pool');
        
        // Clear all merge cooldowns since they were incorrectly set on failed merges
        const [result] = await connection.execute(
            'DELETE FROM cooldowns WHERE command_name = ?',
            ['merge_command']
        );
        
        logger.info(`Cleared ${result.affectedRows} merge cooldown entries`);
        
        // Also clear any merge-related cooldowns
        const [result2] = await connection.execute(
            'DELETE FROM cooldowns WHERE command_name LIKE ?',
            ['%merge%']
        );
        
        logger.info(`Cleared ${result2.affectedRows} additional merge-related cooldowns`);
        
        logger.info('✅ All merge cooldowns cleared successfully!');
        logger.info('Users can now use merge command immediately');
        
    } catch (error) {
        logger.error('Error clearing merge cooldowns:', error);
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

// Run the script
clearMergeCooldowns();
const logger = require("../utils/logger");
const mysql = require('mysql2/promise');
const config = require('../config/database');

async function clearMergeCooldowns() {
    let connection;
    
    try {
        connection = await mysql.createConnection(config);
        
        logger.info('Connected to database');
        
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
        
    } catch (error) {
        logger.error('Error clearing merge cooldowns:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run the script
clearMergeCooldowns();
const logger = require("../utils/logger");
const mysql = require('mysql2/promise');
const { determineRankByCP } = require('../utils/databaseHelpers');

// Database configuration - use same config as bot
const dbConfig = {
    host: '217.21.91.253',
    user: 'u284410540_aether',
    database: 'u284410540_aethexiz',
    password: 'Aethexiz11122005#',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

async function addRankColumnAndUpdateUserPowers() {
    let connection;
    
    try {
        // Load environment variables
        require('dotenv').config();
        
        logger.info('🔗 Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        
        // Step 1: Add rank column to user_powers table if it doesn't exist
        logger.info('📋 Adding rank column to user_powers table...');
        try {
            await connection.execute(`
                ALTER TABLE user_powers 
                ADD COLUMN rank ENUM('Normal', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Divine', 'Cosmic', 'Transcendent', 'Omnipotent', 'Absolute') 
                AFTER combat_power
            `);
            logger.info('✅ Rank column added successfully');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                logger.info('ℹ️ Rank column already exists');
            } else {
                throw error;
            }
        }
        
        // Step 2: Get all user powers that need rank updates
        logger.info('📊 Fetching all user powers...');
        const [userPowers] = await connection.execute(`
            SELECT up.id, up.combat_power, up.rank
            FROM user_powers up
        `);
        
        logger.info(`📈 Found ${userPowers.length} user powers to process`);
        
        // Step 3: Update each power's rank based on its CP
        let updatedCount = 0;
        for (const power of userPowers) {
            const correctRank = await determineRankByCP(power.combat_power);
            
            if (power.rank !== correctRank) {
                await connection.execute(`
                    UPDATE user_powers 
                    SET rank = ? 
                    WHERE id = ?
                `, [correctRank, power.id]);
                
                updatedCount++;
                logger.info(`🔄 Updated power ID ${power.id}: ${power.combat_power} CP -> ${correctRank} rank`);
            }
        }
        
        logger.info(`✅ Updated ${updatedCount} user powers with correct ranks`);
        
        // Step 4: Verify the updates
        logger.info('🔍 Verifying updates...');
        const [verifyResults] = await connection.execute(`
            SELECT 
                rank,
                COUNT(*) as count,
                MIN(combat_power) as min_cp,
                MAX(combat_power) as max_cp
            FROM user_powers 
            WHERE rank IS NOT NULL
            GROUP BY rank
            ORDER BY 
                CASE rank
                    WHEN 'Normal' THEN 1
                    WHEN 'Rare' THEN 2
                    WHEN 'Epic' THEN 3
                    WHEN 'Legendary' THEN 4
                    WHEN 'Mythic' THEN 5
                    WHEN 'Divine' THEN 6
                    WHEN 'Cosmic' THEN 7
                    WHEN 'Transcendent' THEN 8
                    WHEN 'Omnipotent' THEN 9
                    WHEN 'Absolute' THEN 10
                END
        `);
        
        logger.info('\n📊 Final rank distribution:');
        for (const result of verifyResults) {
            logger.info(`${result.rank}: ${result.count} powers (CP: ${result.min_cp}-${result.max_cp})`);
        }
        
        logger.info('\n🎉 User powers database update completed successfully!');
        
    } catch (error) {
        logger.error('❌ Error updating user powers:', error);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
            logger.info('🔐 Database connection closed');
        }
    }
}

// Run the script if executed directly
if (require.main === module) {
    addRankColumnAndUpdateUserPowers()
        .then(() => {
            logger.info('✅ Script completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            logger.error('❌ Script failed:', error);
            process.exit(1);
        });
}

module.exports = addRankColumnAndUpdateUserPowers;
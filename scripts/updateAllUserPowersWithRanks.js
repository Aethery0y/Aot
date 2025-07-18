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

async function updateAllUserPowersWithRanks() {
    let connection;
    
    try {
        // Load environment variables
        require('dotenv').config();
        
        logger.info('🔗 Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        
        // Step 1: Update addUserPower function calls to include rank
        logger.info('📋 Updating all existing user powers with calculated ranks...');
        
        // Get all user powers without proper ranks
        const [userPowers] = await connection.execute(`
            SELECT up.id, up.user_id, up.power_id, up.combat_power, up.rank,
                   p.name, u.username
            FROM user_powers up
            JOIN powers p ON up.power_id = p.id
            JOIN users u ON up.user_id = u.id
            ORDER BY up.user_id, up.combat_power DESC
        `);
        
        logger.info(`📊 Found ${userPowers.length} user powers to process`);
        
        let updatedCount = 0;
        for (const power of userPowers) {
            const correctRank = await determineRankByCP(power.combat_power);
            
            // Update the rank for this user power
            await connection.execute(`
                UPDATE user_powers 
                SET rank = ? 
                WHERE id = ?
            `, [correctRank, power.id]);
            
            updatedCount++;
            logger.info(`🔄 ${power.username}: "${power.name}" (${power.combat_power} CP) -> ${correctRank} rank`);
        }
        
        logger.info(`✅ Updated ${updatedCount} user powers with correct ranks`);
        
        // Step 2: Verify all powers now have ranks
        const [nullRanks] = await connection.execute(`
            SELECT COUNT(*) as count FROM user_powers WHERE rank IS NULL
        `);
        
        if (nullRanks[0].count > 0) {
            logger.info(`⚠️ Warning: ${nullRanks[0].count} powers still have NULL ranks`);
        } else {
            logger.info('✅ All user powers now have proper ranks stored');
        }
        
        // Step 3: Show final statistics
        const [stats] = await connection.execute(`
            SELECT 
                rank,
                COUNT(*) as count,
                MIN(combat_power) as min_cp,
                MAX(combat_power) as max_cp
            FROM user_powers 
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
        
        logger.info('\n📊 Final user powers rank distribution:');
        for (const stat of stats) {
            logger.info(`${stat.rank}: ${stat.count} powers (CP: ${stat.min_cp}-${stat.max_cp})`);
        }
        
        logger.info('\n🎉 All user powers now have correct ranks stored in database!');
        
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
    updateAllUserPowersWithRanks()
        .then(() => {
            logger.info('✅ Script completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            logger.error('❌ Script failed:', error);
            process.exit(1);
        });
}

module.exports = updateAllUserPowersWithRanks;
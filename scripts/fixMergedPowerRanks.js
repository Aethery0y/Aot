const { pool } = require('../config/database');
const { determineRankByCP } = require('../utils/databaseHelpers');
const logger = require('../utils/logger');

async function fixMergedPowerRanks() {
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Get all powers that might have incorrect ranks based on their CP
        const [powers] = await connection.execute(`
            SELECT 
                p.id,
                p.name,
                p.rank as current_rank,
                p.base_cp,
                COUNT(up.id) as user_count
            FROM powers p
            LEFT JOIN user_powers up ON p.id = up.power_id
            WHERE p.name LIKE '%Fusion%' 
               OR p.name LIKE '%Dominion%' 
               OR p.name LIKE '%Mastery%' 
               OR p.name LIKE '%Supremacy%'
               OR p.base_cp > 5000
            GROUP BY p.id, p.name, p.rank, p.base_cp
            ORDER BY p.base_cp DESC
        `);
        
        logger.info(`Found ${powers.length} potential merged powers to check...`);
        
        let fixedCount = 0;
        
        for (const power of powers) {
            const correctRank = await determineRankByCP(power.base_cp);
            
            if (power.current_rank !== correctRank) {
                logger.info(`Fixing: "${power.name}" - ${power.base_cp} CP`);
                logger.info(`  Current rank: ${power.current_rank} -> Correct rank: ${correctRank}`);
                logger.info(`  Used by ${power.user_count} users`);
                
                // Update the power's rank
                await connection.execute(
                    'UPDATE powers SET rank = ? WHERE id = ?',
                    [correctRank, power.id]
                );
                
                fixedCount++;
            }
        }
        
        logger.info(`\n✅ Fixed ${fixedCount} merged powers with incorrect ranks`);
        
        // Also check for any user_powers that might need rank updates
        const [userPowers] = await connection.execute(`
            SELECT 
                up.id as user_power_id,
                up.combat_power,
                p.name,
                p.rank as power_rank,
                u.username
            FROM user_powers up
            JOIN powers p ON up.power_id = p.id
            JOIN users u ON up.user_id = u.id
            WHERE p.name LIKE '%Fusion%' 
               OR p.name LIKE '%Dominion%' 
               OR p.name LIKE '%Mastery%' 
               OR p.name LIKE '%Supremacy%'
               OR up.combat_power > 5000
            ORDER BY up.combat_power DESC
        `);
        
        logger.info(`\nChecked ${userPowers.length} user-owned merged powers:`);
        for (const userPower of userPowers) {
            const correctRank = await determineRankByCP(userPower.combat_power);
            logger.info(`  ${userPower.username}: "${userPower.name}" - ${userPower.combat_power} CP (${correctRank})`);
        }
        
    } catch (error) {
        logger.error('Error fixing merged power ranks:', error);
        logger.error('Error fixing merged power ranks:', error);
    } finally {
        if (connection) connection.release();
    }
}

// Run the fix
fixMergedPowerRanks().then(() => {
    logger.info('\n🎉 Merged power rank fix completed!');
    process.exit(0);
}).catch(error => {
    logger.error('Script failed:', error);
    process.exit(1);
});
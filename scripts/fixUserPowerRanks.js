const { pool } = require('../config/database');
const { determineRankByCP } = require('../utils/databaseHelpers');
const logger = require('../utils/logger');

/**
 * Fix User Power Ranks Script
 * Updates all user powers to have correct ranks based on their CP values
 */

async function fixUserPowerRanks() {
    try {
        logger.info('Starting user power rank fix script...');
        
        // Get all user powers with their current data
        const [userPowers] = await pool.execute(`
            SELECT 
                up.id as user_power_id,
                up.combat_power,
                up.user_id,
                p.name as power_name,
                p.rank as current_rank,
                u.username
            FROM user_powers up
            JOIN powers p ON up.power_id = p.id
            JOIN users u ON up.user_id = u.id
            ORDER BY up.combat_power DESC
        `);
        
        logger.info(`Found ${userPowers.length} user powers to check`);
        
        let fixedCount = 0;
        let totalChecked = 0;
        
        for (const userPower of userPowers) {
            totalChecked++;
            
            // Calculate correct rank based on CP
            const correctRank = await determineRankByCP(userPower.combat_power);
            
            // Check if current rank is different from correct rank
            if (userPower.current_rank !== correctRank) {
                logger.info(`Fixing ${userPower.username}'s power: "${userPower.power_name}" (${userPower.combat_power} CP) - ${userPower.current_rank} → ${correctRank}`);
                
                // Update the power in powers table to have correct rank
                await pool.execute(
                    'UPDATE powers SET rank = ? WHERE id = (SELECT power_id FROM user_powers WHERE id = ?)',
                    [correctRank, userPower.user_power_id]
                );
                
                fixedCount++;
            }
            
            // Progress logging every 50 powers
            if (totalChecked % 50 === 0) {
                logger.info(`Progress: ${totalChecked}/${userPowers.length} powers checked, ${fixedCount} fixed`);
            }
        }
        
        logger.info(`User power rank fix complete!`);
        logger.info(`Total powers checked: ${totalChecked}`);
        logger.info(`Powers fixed: ${fixedCount}`);
        logger.info(`Powers already correct: ${totalChecked - fixedCount}`);
        
        // Verify the fix by checking some examples
        const [verificationSample] = await pool.execute(`
            SELECT 
                up.combat_power,
                p.name as power_name,
                p.rank,
                u.username
            FROM user_powers up
            JOIN powers p ON up.power_id = p.id
            JOIN users u ON up.user_id = u.id
            WHERE up.combat_power > 15000
            ORDER BY up.combat_power DESC
            LIMIT 10
        `);
        
        logger.info('Verification sample (high CP powers):');
        for (const sample of verificationSample) {
            const expectedRank = await determineRankByCP(sample.combat_power);
            const status = sample.rank === expectedRank ? '✅' : '❌';
            logger.info(`${status} ${sample.username}: "${sample.power_name}" (${sample.combat_power} CP) - Rank: ${sample.rank} (Expected: ${expectedRank})`);
        }
        
    } catch (error) {
        logger.error('Error in user power rank fix script:', error);
        throw error;
    }
}

// Run the script
fixUserPowerRanks()
    .then(() => {
        logger.info('Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        logger.error('Script failed:', error);
        process.exit(1);
    });
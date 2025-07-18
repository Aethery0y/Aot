const { pool } = require('../config/database');
const logger = require('../utils/logger');

async function completePowerFix() {
    const connection = await pool.getConnection();
    
    try {
        logger.info('Starting complete power CP fix...');
        
        // 1. Fix all Epic powers with wrong CP
        const [epicFix] = await connection.execute(`
            UPDATE powers 
            SET base_cp = CASE 
                WHEN name LIKE '%Armored%' THEN 950
                WHEN name LIKE '%Colossal%' THEN 1100
                WHEN name LIKE '%Female%' THEN 900
                WHEN name LIKE '%Beast%' THEN 1000
                WHEN name LIKE '%Cart%' THEN 850
                WHEN name LIKE '%Jaw%' THEN 950
                WHEN name LIKE '%War Hammer%' THEN 1050
                WHEN name LIKE '%Coordinate Fragments%' THEN 1080
                WHEN name LIKE '%Wall Titan%' THEN 1020
                ELSE FLOOR(800 + (RAND() * 400))
            END
            WHERE rank = 'Epic' AND base_cp < 800
        `);
        
        logger.info(`Fixed ${epicFix.affectedRows} Epic powers`);
        
        // 2. Fix all Legendary powers with wrong CP
        const [legendaryFix] = await connection.execute(`
            UPDATE powers 
            SET base_cp = CASE 
                WHEN name LIKE '%Attack Titan%' THEN 2200
                WHEN name LIKE '%Warhammer%' THEN 2300
                WHEN name LIKE '%Cart Titan%' THEN 2000
                WHEN name LIKE '%Jaw Titan%' THEN 2100
                WHEN name LIKE '%Coordinate Mastery%' THEN 2500
                WHEN name LIKE '%Nine Titans%' THEN 2600
                ELSE FLOOR(2000 + (RAND() * 600))
            END
            WHERE rank = 'Legendary' AND base_cp < 2000
        `);
        
        logger.info(`Fixed ${legendaryFix.affectedRows} Legendary powers`);
        
        // 3. Fix all Mythic powers with wrong CP
        const [mythicFix] = await connection.execute(`
            UPDATE powers 
            SET base_cp = CASE 
                WHEN name LIKE '%Founding%' THEN 5500
                WHEN name LIKE '%Ackerman%' THEN 5200
                WHEN name LIKE '%Royal Blood%' THEN 5000
                WHEN name LIKE '%Ymir%' THEN 6000
                WHEN name LIKE '%Coordinate Absolute%' THEN 5600
                WHEN name LIKE '%Rumbling%' THEN 5900
                WHEN name LIKE '%Nine Titans Unity%' THEN 6200
                ELSE FLOOR(5000 + (RAND() * 1200))
            END
            WHERE rank = 'Mythic' AND base_cp < 5000
        `);
        
        logger.info(`Fixed ${mythicFix.affectedRows} Mythic powers`);
        
        // 4. Update all user_powers to match the new base_cp values
        const [userPowerSync] = await connection.execute(`
            UPDATE user_powers up
            JOIN powers p ON up.power_id = p.id
            SET up.combat_power = p.base_cp + FLOOR(RAND() * 100 - 50)
            WHERE ABS(up.combat_power - p.base_cp) > 100
        `);
        
        logger.info(`Synchronized ${userPowerSync.affectedRows} user powers`);
        
        // 5. Check if ACE user has any Mythic powers now
        const [aceCheck] = await connection.execute(`
            SELECT up.*, p.name, p.rank, p.base_cp
            FROM user_powers up
            JOIN powers p ON up.power_id = p.id
            JOIN users u ON up.user_id = u.id
            WHERE u.username = 'ACE' AND p.rank IN ('Mythic', 'Legendary', 'Epic')
            ORDER BY p.rank DESC, up.combat_power DESC
        `);
        
        logger.info(`ACE user has ${aceCheck.length} high-tier powers:`);
        aceCheck.forEach(power => {
            logger.info(`- ${power.name} (${power.rank}): ${power.combat_power} CP`);
        });
        
        // 6. Show final rank distribution and CP ranges
        const [finalCheck] = await connection.execute(`
            SELECT rank, 
                   COUNT(*) as count,
                   MIN(base_cp) as min_cp,
                   MAX(base_cp) as max_cp,
                   AVG(base_cp) as avg_cp
            FROM powers
            GROUP BY rank
            ORDER BY FIELD(rank, 'Normal', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Divine', 'Cosmic', 'Transcendent', 'Omnipotent', 'Absolute')
        `);
        
        logger.info('Final power distribution:');
        finalCheck.forEach(row => {
            logger.info(`${row.rank}: ${row.count} powers, CP: ${row.min_cp}-${row.max_cp} (avg: ${Math.round(row.avg_cp)})`);
        });
        
        // 7. Check for any remaining issues
        const [remainingIssues] = await connection.execute(`
            SELECT name, rank, base_cp
            FROM powers
            WHERE (rank = 'Rare' AND base_cp < 220) 
               OR (rank = 'Epic' AND base_cp < 800)
               OR (rank = 'Legendary' AND base_cp < 2000)
               OR (rank = 'Mythic' AND base_cp < 5000)
            LIMIT 5
        `);
        
        if (remainingIssues.length > 0) {
            logger.info('Remaining issues:');
            remainingIssues.forEach(power => {
                logger.info(`- ${power.name} (${power.rank}): ${power.base_cp} CP`);
            });
        } else {
            logger.info('All power CP values are now correct!');
        }
        
    } catch (error) {
        logger.error('Error in complete power fix:', error);
        throw error;
    } finally {
        connection.release();
    }
}

completePowerFix().then(() => {
    logger.info('Complete power fix finished successfully!');
    process.exit(0);
}).catch(error => {
    logger.error('Complete power fix failed:', error);
    process.exit(1);
});
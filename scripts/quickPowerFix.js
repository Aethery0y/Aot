const { pool } = require('../config/database');
const logger = require('../utils/logger');

async function quickPowerFix() {
    const connection = await pool.getConnection();
    
    try {
        // 1. Check for ACE user and their Coordinate powers
        const [aceUser] = await connection.execute(
            'SELECT * FROM users WHERE username = "ACE"'
        );
        
        if (aceUser.length > 0) {
            logger.info('ACE user found:', aceUser[0].id);
            
            const [acePowers] = await connection.execute(`
                SELECT up.*, p.name, p.rank, p.base_cp
                FROM user_powers up
                JOIN powers p ON up.power_id = p.id
                WHERE up.user_id = ? AND p.name LIKE '%Coordinate%'
                ORDER BY p.rank DESC
            `, [aceUser[0].id]);
            
            logger.info('ACE Coordinate powers:', acePowers.length);
            acePowers.forEach(power => {
                logger.info(`- ${power.name} (${power.rank}): User CP ${power.combat_power}, Base CP ${power.base_cp}`);
            });
        }
        
        // 2. Check for Urban Combat powers
        const [urbanPowers] = await connection.execute(
            'SELECT * FROM powers WHERE name LIKE "%Urban%"'
        );
        
        logger.info('Urban Combat powers found:', urbanPowers.length);
        urbanPowers.forEach(power => {
            logger.info(`- ${power.name} (${power.rank}): ${power.base_cp} CP`);
        });
        
        // 3. Fix specific known issues
        // Update any Urban Combat powers that have wrong rank
        const [urbanFix] = await connection.execute(`
            UPDATE powers 
            SET rank = 'Rare', base_cp = 275 
            WHERE name LIKE '%Urban%' AND rank != 'Rare'
        `);
        
        if (urbanFix.affectedRows > 0) {
            logger.info(`Fixed ${urbanFix.affectedRows} Urban Combat powers`);
        }
        
        // 4. Check for powers with dramatically wrong CP for their rank
        const [wrongCP] = await connection.execute(`
            SELECT name, rank, base_cp
            FROM powers
            WHERE (rank = 'Rare' AND base_cp < 200) 
               OR (rank = 'Epic' AND base_cp < 800)
               OR (rank = 'Legendary' AND base_cp < 2000)
               OR (rank = 'Mythic' AND base_cp < 5000)
            ORDER BY rank, base_cp
            LIMIT 10
        `);
        
        logger.info('Powers with wrong CP for rank:', wrongCP.length);
        wrongCP.forEach(power => {
            logger.info(`- ${power.name} (${power.rank}): ${power.base_cp} CP`);
        });
        
        // 5. Update user_powers to match base_cp from powers table
        const [userPowerUpdate] = await connection.execute(`
            UPDATE user_powers up
            JOIN powers p ON up.power_id = p.id
            SET up.combat_power = p.base_cp
            WHERE up.combat_power != p.base_cp
        `);
        
        logger.info(`Updated ${userPowerUpdate.affectedRows} user powers with correct CP`);
        
        // 6. Final check - show some sample powers by rank
        const [samplePowers] = await connection.execute(`
            SELECT rank, name, base_cp
            FROM powers
            WHERE rank IN ('Rare', 'Epic', 'Legendary', 'Mythic')
            ORDER BY rank, base_cp
            LIMIT 20
        `);
        
        logger.info('Sample powers after fix:');
        samplePowers.forEach(power => {
            logger.info(`- ${power.name} (${power.rank}): ${power.base_cp} CP`);
        });
        
    } catch (error) {
        logger.error('Error in quick power fix:', error);
    } finally {
        connection.release();
    }
}

quickPowerFix().then(() => {
    logger.info('Quick power fix completed');
    process.exit(0);
}).catch(error => {
    logger.error('Quick power fix failed:', error);
    process.exit(1);
});
const { pool } = require('../config/database');
const logger = require('../utils/logger');

async function addACECoordinatePower() {
    const connection = await pool.getConnection();
    
    try {
        logger.info('Adding Coordinate Control Mythic power to ACE user...');
        
        // 1. Find ACE user
        const [aceUser] = await connection.execute(
            'SELECT * FROM users WHERE username = "ACE"'
        );
        
        if (aceUser.length === 0) {
            logger.info('ACE user not found!');
            return;
        }
        
        const aceUserId = aceUser[0].id;
        logger.info(`Found ACE user (ID: ${aceUserId})`);
        
        // 2. Find or create "Coordinate Control" power in powers table
        let [coordinatePower] = await connection.execute(
            'SELECT * FROM powers WHERE name = "Coordinate Control"'
        );
        
        let powerInfo;
        if (coordinatePower.length === 0) {
            // Create the power if it doesn't exist
            const [insertResult] = await connection.execute(`
                INSERT INTO powers (name, description, rank, base_cp, base_price) 
                VALUES (?, ?, ?, ?, ?)
            `, [
                'Coordinate Control',
                'Command over the coordinate plane and titan paths',
                'Mythic',
                5194,
                120000
            ]);
            
            powerInfo = {
                id: insertResult.insertId,
                name: 'Coordinate Control',
                rank: 'Mythic',
                base_cp: 5194
            };
            
            logger.info('Created new Coordinate Control power in database');
        } else {
            powerInfo = coordinatePower[0];
            logger.info(`Found existing Coordinate Control power (ID: ${powerInfo.id})`);
        }
        
        // 3. Check if ACE already has this power
        const [existingUserPower] = await connection.execute(
            'SELECT * FROM user_powers WHERE user_id = ? AND power_id = ?',
            [aceUserId, powerInfo.id]
        );
        
        if (existingUserPower.length > 0) {
            logger.info('ACE already has this power in database');
            return;
        }
        
        // 4. Add the power to ACE's inventory
        const [insertUserPower] = await connection.execute(`
            INSERT INTO user_powers (user_id, power_id, combat_power) 
            VALUES (?, ?, ?)
        `, [aceUserId, powerInfo.id, 5194]);
        
        logger.info(`Added Coordinate Control to ACE's inventory (User Power ID: ${insertUserPower.insertId})`);
        
        // 5. Update ACE's gacha draws count (subtract 1 since they used one)
        const [updateDraws] = await connection.execute(
            'UPDATE users SET gacha_draws = gacha_draws - 1 WHERE id = ?',
            [aceUserId]
        );
        
        logger.info('Updated ACE\'s gacha draws count');
        
        // 6. Verify the addition
        const [verification] = await connection.execute(`
            SELECT up.*, p.name, p.rank, p.base_cp, u.username
            FROM user_powers up
            JOIN powers p ON up.power_id = p.id
            JOIN users u ON up.user_id = u.id
            WHERE u.username = 'ACE' AND p.name = 'Coordinate Control'
        `);
        
        if (verification.length > 0) {
            const power = verification[0];
            logger.info('✅ Successfully added power to ACE:');
            logger.info(`- Username: ${power.username}`);
            logger.info(`- Power: ${power.name} (${power.rank})`);
            logger.info(`- Combat Power: ${power.combat_power}`);
            logger.info(`- Base CP: ${power.base_cp}`);
        }
        
        // 7. Show ACE's current high-tier powers
        const [aceHighTierPowers] = await connection.execute(`
            SELECT up.*, p.name, p.rank, p.base_cp
            FROM user_powers up
            JOIN powers p ON up.power_id = p.id
            WHERE up.user_id = ? AND p.rank IN ('Epic', 'Legendary', 'Mythic')
            ORDER BY p.rank DESC, up.combat_power DESC
        `, [aceUserId]);
        
        logger.info(`\nACE now has ${aceHighTierPowers.length} high-tier powers:`);
        aceHighTierPowers.forEach(power => {
            logger.info(`- ${power.name} (${power.rank}): ${power.combat_power} CP`);
        });
        
    } catch (error) {
        logger.error('Error adding Coordinate Control power to ACE:', error);
        throw error;
    } finally {
        connection.release();
    }
}

addACECoordinatePower().then(() => {
    logger.info('Successfully added Coordinate Control power to ACE!');
    process.exit(0);
}).catch(error => {
    logger.error('Failed to add power to ACE:', error);
    process.exit(1);
});
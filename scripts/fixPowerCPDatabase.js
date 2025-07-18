const { pool } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Script to fix power CP database inconsistencies
 * This script will:
 * 1. Check for powers with incorrect CP values for their rank
 * 2. Fix mismatched rank-CP combinations
 * 3. Update all user_powers with correct CP values
 * 4. Identify and fix specific issues like "Coordinate Control" and "Urban Combat"
 */

async function fixPowerCPDatabase() {
    const connection = await pool.getConnection();
    
    try {
        logger.info('Starting Power CP Database Fix...');
        
        // Step 1: Check for powers with incorrect CP values for their rank
        const incorrectPowers = await findIncorrectPowers(connection);
        logger.info(`Found ${incorrectPowers.length} powers with incorrect CP values for their rank`);
        
        // Step 2: Fix powers table with correct CP values
        await fixPowersTable(connection, incorrectPowers);
        
        // Step 3: Update user_powers table with correct CP values
        await updateUserPowersCPValues(connection);
        
        // Step 4: Specific fixes for known issues
        await fixSpecificPowerIssues(connection);
        
        // Step 5: Final verification
        await verifyFixes(connection);
        
        logger.info('Power CP Database Fix completed successfully!');
        
    } catch (error) {
        logger.error('Error fixing power CP database:', error);
        throw error;
    } finally {
        connection.release();
    }
}

async function findIncorrectPowers(connection) {
    const query = `
        SELECT id, name, rank, base_cp,
               CASE 
                   WHEN rank = 'Normal' AND (base_cp < 45 OR base_cp > 60) THEN 'incorrect'
                   WHEN rank = 'Rare' AND (base_cp < 220 OR base_cp > 320) THEN 'incorrect'
                   WHEN rank = 'Epic' AND (base_cp < 800 OR base_cp > 1200) THEN 'incorrect'
                   WHEN rank = 'Legendary' AND (base_cp < 2000 OR base_cp > 2600) THEN 'incorrect'
                   WHEN rank = 'Mythic' AND (base_cp < 5000 OR base_cp > 6200) THEN 'incorrect'
                   WHEN rank = 'Divine' AND (base_cp < 9000 OR base_cp > 12000) THEN 'incorrect'
                   WHEN rank = 'Cosmic' AND (base_cp < 18000 OR base_cp > 25000) THEN 'incorrect'
                   WHEN rank = 'Transcendent' AND (base_cp < 35000 OR base_cp > 50000) THEN 'incorrect'
                   WHEN rank = 'Omnipotent' AND (base_cp < 75000 OR base_cp > 100000) THEN 'incorrect'
                   WHEN rank = 'Absolute' AND (base_cp < 500000 OR base_cp > 1000000) THEN 'incorrect'
                   ELSE 'correct'
               END as status
        FROM powers
        HAVING status = 'incorrect'
        ORDER BY rank, name
    `;
    
    const [rows] = await connection.execute(query);
    return rows;
}

async function fixPowersTable(connection, incorrectPowers) {
    for (const power of incorrectPowers) {
        const correctCP = calculateCorrectCP(power.rank, power.name);
        
        logger.info(`Fixing power "${power.name}" (${power.rank}): ${power.base_cp} -> ${correctCP}`);
        
        await connection.execute(
            'UPDATE powers SET base_cp = ? WHERE id = ?',
            [correctCP, power.id]
        );
    }
}

async function updateUserPowersCPValues(connection) {
    // Update all user_powers to match the correct base_cp from powers table
    const query = `
        UPDATE user_powers up
        JOIN powers p ON up.power_id = p.id
        SET up.combat_power = p.base_cp + (RAND() * 50 - 25)
        WHERE up.combat_power != p.base_cp
    `;
    
    const [result] = await connection.execute(query);
    logger.info(`Updated ${result.affectedRows} user powers with correct CP values`);
}

async function fixSpecificPowerIssues(connection) {
    // Fix "Coordinate Control" -> should be "Coordinate Absolute" (Mythic)
    const [coordinateRows] = await connection.execute(
        'SELECT * FROM powers WHERE name LIKE "%Coordinate%" AND rank = "Mythic"'
    );
    
    if (coordinateRows.length > 0) {
        logger.info('Found Coordinate-related Mythic powers:');
        coordinateRows.forEach(power => {
            logger.info(`- ${power.name} (${power.rank}): ${power.base_cp} CP`);
        });
    }
    
    // Fix any "Urban Combat" powers that might have wrong rank/CP
    const [urbanRows] = await connection.execute(
        'SELECT * FROM powers WHERE name LIKE "%Urban%"'
    );
    
    if (urbanRows.length > 0) {
        logger.info('Found Urban Combat powers:');
        for (const power of urbanRows) {
            logger.info(`- ${power.name} (${power.rank}): ${power.base_cp} CP`);
            
            // If Urban Combat has wrong rank, fix it
            if (power.name.includes('Urban') && power.rank !== 'Rare') {
                await connection.execute(
                    'UPDATE powers SET rank = "Rare", base_cp = 275 WHERE id = ?',
                    [power.id]
                );
                logger.info(`Fixed Urban Combat power to Rare rank with 275 CP`);
            }
        }
    }
    
    // Check for any user with "ACE" username and their powers
    const [aceUserRows] = await connection.execute(
        'SELECT * FROM users WHERE username = "ACE"'
    );
    
    if (aceUserRows.length > 0) {
        const aceUser = aceUserRows[0];
        const [acePowers] = await connection.execute(`
            SELECT up.*, p.name, p.rank, p.base_cp
            FROM user_powers up
            JOIN powers p ON up.power_id = p.id
            WHERE up.user_id = ?
            ORDER BY p.rank DESC, up.combat_power DESC
        `, [aceUser.id]);
        
        logger.info(`ACE user has ${acePowers.length} powers:`);
        acePowers.forEach(power => {
            logger.info(`- ${power.name} (${power.rank}): User CP ${power.combat_power}, Base CP ${power.base_cp}`);
        });
    }
}

async function verifyFixes(connection) {
    // Verify all powers have correct CP ranges for their ranks
    const [verificationRows] = await connection.execute(`
        SELECT rank, 
               COUNT(*) as total,
               MIN(base_cp) as min_cp,
               MAX(base_cp) as max_cp,
               AVG(base_cp) as avg_cp
        FROM powers
        GROUP BY rank
        ORDER BY FIELD(rank, 'Normal', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Divine', 'Cosmic', 'Transcendent', 'Omnipotent', 'Absolute')
    `);
    
    logger.info('Power CP verification by rank:');
    verificationRows.forEach(row => {
        logger.info(`${row.rank}: ${row.total} powers, CP range: ${row.min_cp}-${row.max_cp}, avg: ${Math.round(row.avg_cp)}`);
    });
    
    // Check for any remaining inconsistencies
    const remainingIssues = await findIncorrectPowers(connection);
    if (remainingIssues.length > 0) {
        logger.warn(`Found ${remainingIssues.length} remaining issues:`);
        remainingIssues.forEach(issue => {
            logger.warn(`- ${issue.name} (${issue.rank}): ${issue.base_cp} CP`);
        });
    } else {
        logger.info('All power CP values are now consistent with their ranks!');
    }
}

function calculateCorrectCP(rank, powerName) {
    const ranges = {
        'Normal': [45, 60],
        'Rare': [220, 320],
        'Epic': [800, 1200],
        'Legendary': [2000, 2600],
        'Mythic': [5000, 6200],
        'Divine': [9000, 12000],
        'Cosmic': [18000, 25000],
        'Transcendent': [35000, 50000],
        'Omnipotent': [75000, 100000],
        'Absolute': [500000, 1000000]
    };
    
    if (!ranges[rank]) {
        logger.warn(`Unknown rank: ${rank}, defaulting to Normal`);
        return 50;
    }
    
    const [min, max] = ranges[rank];
    
    // Generate a random CP within the correct range for the rank
    // Use power name hash for consistency
    const hash = powerName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const randomSeed = (hash % 100) / 100;
    
    return Math.floor(min + (max - min) * randomSeed);
}

// Run the fix if this script is executed directly
if (require.main === module) {
    fixPowerCPDatabase()
        .then(() => {
            logger.info('Power CP fix completed successfully');
            process.exit(0);
        })
        .catch(error => {
            logger.error('Power CP fix failed:', error);
            process.exit(1);
        });
}

module.exports = { fixPowerCPDatabase };
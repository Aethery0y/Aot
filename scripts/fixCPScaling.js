const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
};

async function fixCPScaling() {
    let connection;
    
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        
        // First, check current CP ranges by rank
        console.log('\n=== CURRENT CP RANGES BY RANK ===');
        const [rankRanges] = await connection.execute(`
            SELECT rank, MIN(base_cp) as min_cp, MAX(base_cp) as max_cp, COUNT(*) as count 
            FROM powers 
            GROUP BY rank 
            ORDER BY min_cp
        `);
        
        console.table(rankRanges);
        
        // Check the specific problematic powers
        console.log('\n=== PROBLEMATIC POWERS ===');
        const [problematicPowers] = await connection.execute(`
            SELECT name, rank, base_cp 
            FROM powers 
            WHERE name IN ('Rumbling Preparation', 'Ancestral Titan Power') 
            ORDER BY base_cp DESC
        `);
        
        console.table(problematicPowers);
        
        // Define proper CP ranges for each rank (based on original data/powers.js configuration)
        const properCPRanges = {
            'Normal': { min: 50, max: 150 },
            'Rare': { min: 200, max: 400 },
            'Epic': { min: 800, max: 1200 },
            'Legendary': { min: 2000, max: 3000 },
            'Mythic': { min: 5000, max: 6000 },
            'Divine': { min: 9000, max: 12000 },
            'Cosmic': { min: 18000, max: 25000 },
            'Transcendent': { min: 35000, max: 50000 },
            'Omnipotent': { min: 75000, max: 100000 },
            'Absolute': { min: 500000, max: 1000000 }
        };
        
        console.log('\n=== FIXING CP SCALING ISSUES ===');
        
        // Fix powers that are outside their proper rank ranges
        for (const [rank, ranges] of Object.entries(properCPRanges)) {
            // Get all powers of this rank that are outside the proper range
            const [incorrectPowers] = await connection.execute(`
                SELECT id, name, rank, base_cp 
                FROM powers 
                WHERE rank = ? AND (base_cp < ? OR base_cp > ?)
                ORDER BY base_cp
            `, [rank, ranges.min, ranges.max]);
            
            if (incorrectPowers.length > 0) {
                console.log(`\nFixing ${incorrectPowers.length} ${rank} powers with incorrect CP:`);
                
                for (const power of incorrectPowers) {
                    // Generate new CP within proper range
                    const newCP = Math.floor(Math.random() * (ranges.max - ranges.min + 1)) + ranges.min;
                    
                    console.log(`  ${power.name}: ${power.base_cp} → ${newCP} CP`);
                    
                    await connection.execute(`
                        UPDATE powers 
                        SET base_cp = ? 
                        WHERE id = ?
                    `, [newCP, power.id]);
                }
            }
        }
        
        // Update user_powers table to match the new base_cp values
        console.log('\n=== UPDATING USER POWERS ===');
        const [updateResult] = await connection.execute(`
            UPDATE user_powers up
            JOIN powers p ON up.power_id = p.id
            SET up.combat_power = p.base_cp
            WHERE up.combat_power != p.base_cp
        `);
        
        console.log(`Updated ${updateResult.affectedRows} user powers to match new CP values`);
        
        // Show final results
        console.log('\n=== FINAL CP RANGES BY RANK ===');
        const [finalRanges] = await connection.execute(`
            SELECT rank, MIN(base_cp) as min_cp, MAX(base_cp) as max_cp, COUNT(*) as count 
            FROM powers 
            GROUP BY rank 
            ORDER BY min_cp
        `);
        
        console.table(finalRanges);
        
        // Verify the specific powers are now correct
        console.log('\n=== VERIFIED POWERS ===');
        const [verifiedPowers] = await connection.execute(`
            SELECT name, rank, base_cp 
            FROM powers 
            WHERE name IN ('Rumbling Preparation', 'Ancestral Titan Power') 
            ORDER BY base_cp DESC
        `);
        
        console.table(verifiedPowers);
        
        console.log('\n✅ CP scaling fix completed successfully!');
        
    } catch (error) {
        console.error('Error fixing CP scaling:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run the fix
fixCPScaling();
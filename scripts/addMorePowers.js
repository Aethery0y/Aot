const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

async function addMorePowers() {
    const connection = await mysql.createConnection({
        host: '217.21.91.253',
        user: 'u284410540_aether',
        database: 'u284410540_aethexiz',
        password: 'Aethexiz11122005#'
    });
    
    try {
        // First, alter the powers table to include new ranks if not already done
        try {
            await connection.execute(`
                ALTER TABLE powers 
                MODIFY COLUMN rank ENUM('Normal', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Divine', 'Cosmic') NOT NULL
            `);
            logger.info('Powers table updated with new ranks');
        } catch (error) {
            logger.info('Powers table already has new ranks or error:', error.message);
        }

        // Check current power counts
        const [currentCounts] = await connection.execute(`
            SELECT rank, COUNT(*) as count 
            FROM powers 
            GROUP BY rank 
            ORDER BY CASE rank 
                WHEN 'Normal' THEN 1 
                WHEN 'Rare' THEN 2 
                WHEN 'Epic' THEN 3 
                WHEN 'Legendary' THEN 4 
                WHEN 'Mythic' THEN 5 
                WHEN 'Divine' THEN 6 
                WHEN 'Cosmic' THEN 7 
            END
        `);
        
        logger.info('Current power counts:');
        currentCounts.forEach(row => {
            logger.info(`${row.rank}: ${row.count} powers`);
        });

        // Add many more powers
        const newPowers = [
            // Additional Normal Powers (to reach ~20 total)
            { name: 'Advanced Horseback Combat', description: 'Master mounted combat techniques', rank: 'Normal', base_cp: 55, base_price: 550 },
            { name: 'Siege Warfare Tactics', description: 'Specialized in siege and fortress assault', rank: 'Normal', base_cp: 53, base_price: 530 },
            { name: 'Rapid Deployment', description: 'Quick response and battlefield positioning', rank: 'Normal', base_cp: 52, base_price: 520 },
            { name: 'Resource Optimization', description: 'Efficient use of limited supplies', rank: 'Normal', base_cp: 48, base_price: 480 },
            { name: 'Scout Training Elite', description: 'Advanced scouting and reconnaissance', rank: 'Normal', base_cp: 56, base_price: 560 },
            { name: 'Combat Medicine', description: 'Battlefield surgery and emergency care', rank: 'Normal', base_cp: 50, base_price: 500 },
            { name: 'Fortification Expert', description: 'Expert in building and maintaining defenses', rank: 'Normal', base_cp: 54, base_price: 540 },
            { name: 'Squad Leadership', description: 'Leadership skills for small unit command', rank: 'Normal', base_cp: 57, base_price: 570 },
            { name: 'Urban Warfare Expert', description: 'Specialized combat in city environments', rank: 'Normal', base_cp: 53, base_price: 530 },
            { name: 'Wilderness Survival', description: 'Extended survival in hostile environments', rank: 'Normal', base_cp: 49, base_price: 490 },
            { name: 'Signal Intelligence', description: 'Advanced communication and code breaking', rank: 'Normal', base_cp: 51, base_price: 510 },
            { name: 'Equipment Specialist', description: 'Master of all military equipment', rank: 'Normal', base_cp: 52, base_price: 520 },
            { name: 'Explosive Ordnance Expert', description: 'Specialist in bombs and explosive devices', rank: 'Normal', base_cp: 58, base_price: 580 },
            { name: 'Reconnaissance Master', description: 'Elite information gathering skills', rank: 'Normal', base_cp: 55, base_price: 550 },
            { name: 'Logistics Commander', description: 'Expert in supply chain management', rank: 'Normal', base_cp: 47, base_price: 470 },
            { name: 'Cadet Training Instructor', description: 'Ability to train and inspire new recruits', rank: 'Normal', base_cp: 54, base_price: 540 },

            // Additional Rare Powers (to reach ~20 total)
            { name: 'Titan Blood Absorption', description: 'Absorb titan blood for temporary enhancement', rank: 'Rare', base_cp: 265, base_price: 2100 },
            { name: 'Enhanced Recovery', description: 'Rapid recovery from fatigue and injuries', rank: 'Rare', base_cp: 255, base_price: 2000 },
            { name: 'Titan Weak Point Detection', description: 'Instinctively locate titan weak points', rank: 'Rare', base_cp: 275, base_price: 2200 },
            { name: 'Combat Precognition', description: 'Brief glimpses of immediate future in combat', rank: 'Rare', base_cp: 285, base_price: 2300 },
            { name: 'Bloodlust Suppression', description: 'Maintain sanity during intense combat', rank: 'Rare', base_cp: 245, base_price: 1900 },
            { name: 'Titan Mimicry Voice', description: 'Imitate titan sounds and calls', rank: 'Rare', base_cp: 235, base_price: 1850 },
            { name: 'Enhanced Grip Strength', description: 'Superhuman gripping and holding power', rank: 'Rare', base_cp: 265, base_price: 2100 },
            { name: 'Battle Meditation', description: 'Maintain calm focus in chaotic situations', rank: 'Rare', base_cp: 255, base_price: 2000 },
            { name: 'Ackerman Awakening', description: 'Partial awakening of Ackerman bloodline power', rank: 'Rare', base_cp: 320, base_price: 2500 },
            { name: 'Royal Blood Fragment', description: 'Trace amounts of royal Fritz bloodline', rank: 'Rare', base_cp: 310, base_price: 2400 },
            { name: 'Titan Shifter Instinct', description: 'Natural ability to detect titan shifters', rank: 'Rare', base_cp: 280, base_price: 2200 },
            { name: 'Memory Flash', description: 'Brief access to inherited memories', rank: 'Rare', base_cp: 270, base_price: 2150 },

            // Additional Epic Powers (to reach ~15 total)
            { name: 'Cart Titan Power', description: 'Endurance titan with equipment carrying ability', rank: 'Epic', base_cp: 850, base_price: 7500 },
            { name: 'Jaw Titan Power', description: 'Swift titan with powerful bite and agility', rank: 'Epic', base_cp: 950, base_price: 8200 },
            { name: 'Titan Shifter Awakening', description: 'Awaken dormant titan shifter abilities', rank: 'Epic', base_cp: 920, base_price: 8000 },
            { name: 'War Hammer Mastery', description: 'Create and wield weapons from hardened material', rank: 'Epic', base_cp: 980, base_price: 8500 },
            { name: 'Partial Founding Power', description: 'Limited access to Founding Titan abilities', rank: 'Epic', base_cp: 1100, base_price: 9500 },
            { name: 'Anti-Titan Artillery', description: 'Master of advanced anti-titan weaponry', rank: 'Epic', base_cp: 800, base_price: 7000 },
            { name: 'Marleyan Warrior Elite', description: 'Elite warrior training from Marley', rank: 'Epic', base_cp: 890, base_price: 7800 },
            { name: 'Eldian Restorationist', description: 'Power of the Eldian restoration movement', rank: 'Epic', base_cp: 860, base_price: 7300 },
            { name: 'Paradis Devil Technology', description: 'Advanced technology from Paradis Island', rank: 'Epic', base_cp: 830, base_price: 7200 },
            { name: 'Survey Corps Elite', description: 'Ultimate Survey Corps training and experience', rank: 'Epic', base_cp: 900, base_price: 7900 },
            { name: 'Wall Rose Guardian', description: 'Sacred duty to protect the walls', rank: 'Epic', base_cp: 870, base_price: 7600 },

            // Additional Legendary Powers (to reach ~12 total)
            { name: 'Founding Titan Fragment', description: 'Incomplete piece of the Founding Titan power', rank: 'Legendary', base_cp: 2200, base_price: 28000 },
            { name: 'Paths Traveler', description: 'Ability to travel through the paths dimension', rank: 'Legendary', base_cp: 2100, base_price: 26000 },
            { name: 'Coordinate Echo', description: 'Residual coordinate power from royal blood', rank: 'Legendary', base_cp: 2300, base_price: 30000 },
            { name: 'Titan Serum Master', description: 'Complete mastery over titan transformation', rank: 'Legendary', base_cp: 2000, base_price: 24000 },
            { name: 'Marley Military Command', description: 'Supreme authority over Marleyan forces', rank: 'Legendary', base_cp: 1900, base_price: 22000 },
            { name: 'Wall Titan Communication', description: 'Communicate with the colossal titans in walls', rank: 'Legendary', base_cp: 2150, base_price: 27000 },
            { name: 'Ackerman Clan Chief', description: 'Leadership over the Ackerman bloodline', rank: 'Legendary', base_cp: 2250, base_price: 29000 },
            { name: 'Paradis Island King', description: 'Royal authority over Paradis Island', rank: 'Legendary', base_cp: 2050, base_price: 25000 },

            // Additional Mythic Powers (to reach ~10 total)
            { name: 'Original Founding Power', description: 'True power of the first Founding Titan', rank: 'Mythic', base_cp: 5500, base_price: 90000 },
            { name: 'Ymir Fritz Legacy', description: 'Direct inheritance from the first titan', rank: 'Mythic', base_cp: 5800, base_price: 95000 },
            { name: 'Paths Dimension Lord', description: 'Absolute control over the paths realm', rank: 'Mythic', base_cp: 5200, base_price: 85000 },
            { name: 'Coordinate Supreme', description: 'Ultimate coordinate power over all titans', rank: 'Mythic', base_cp: 5900, base_price: 98000 },
            { name: 'Nine Titans Fusion', description: 'Combination of all nine titan powers', rank: 'Mythic', base_cp: 6000, base_price: 100000 },
            { name: 'Titan Origin Source', description: 'Power from the original source of all titans', rank: 'Mythic', base_cp: 5700, base_price: 92000 },

            // Divine Rank Powers (new tier)
            { name: 'Creator Titan Power', description: 'Power to create new types of titans', rank: 'Divine', base_cp: 9500, base_price: 180000 },
            { name: 'Reality Coordinate', description: 'Power to alter reality through coordinate', rank: 'Divine', base_cp: 10200, base_price: 200000 },
            { name: 'Dimensional Founder', description: 'Founding power that transcends dimensions', rank: 'Divine', base_cp: 9800, base_price: 190000 },
            { name: 'Titan God Authority', description: 'Divine authority over all titan-kind', rank: 'Divine', base_cp: 11000, base_price: 220000 },
            { name: 'Paths Tree Master', description: 'Control over the source tree of all paths', rank: 'Divine', base_cp: 10500, base_price: 210000 },
            { name: 'Memory Sovereign', description: 'Absolute control over all memories', rank: 'Divine', base_cp: 9200, base_price: 175000 },
            { name: 'Time Manipulation Lord', description: 'Control over past, present, and future', rank: 'Divine', base_cp: 11500, base_price: 230000 },
            { name: 'Universe Guardian', description: 'Protector of universal balance', rank: 'Divine', base_cp: 10800, base_price: 215000 },

            // Cosmic Rank Powers (new tier)
            { name: 'Universe Coordinate', description: 'Coordinate power spanning multiple universes', rank: 'Cosmic', base_cp: 18000, base_price: 450000 },
            { name: 'Omniversal Founder', description: 'Founding power across all realities', rank: 'Cosmic', base_cp: 20000, base_price: 500000 },
            { name: 'Titan Multiverse Lord', description: 'Supreme ruler of titans across all dimensions', rank: 'Cosmic', base_cp: 22000, base_price: 550000 },
            { name: 'Reality Shaper', description: 'Power to reshape reality at will', rank: 'Cosmic', base_cp: 19500, base_price: 480000 },
            { name: 'Existence Controller', description: 'Control over the fabric of existence itself', rank: 'Cosmic', base_cp: 21500, base_price: 530000 },
            { name: 'Infinite Paths Master', description: 'Master of infinite dimensional paths', rank: 'Cosmic', base_cp: 17500, base_price: 420000 },
            { name: 'Omnipotent Titan', description: 'Ultimate titan power beyond comprehension', rank: 'Cosmic', base_cp: 25000, base_price: 600000 },
            { name: 'Cosmic Balance Keeper', description: 'Maintains balance across all realities', rank: 'Cosmic', base_cp: 18500, base_price: 460000 }
        ];

        let added = 0;
        let skipped = 0;

        for (const power of newPowers) {
            try {
                await connection.execute(
                    'INSERT INTO powers (name, description, rank, base_cp, base_price) VALUES (?, ?, ?, ?, ?)',
                    [power.name, power.description, power.rank, power.base_cp, power.base_price]
                );
                logger.info(`✓ Added: ${power.name} (${power.rank})`);
                added++;
            } catch (error) {
                if (error.code === 'ER_DUP_ENTRY') {
                    logger.info(`- Skipped duplicate: ${power.name}`);
                    skipped++;
                } else {
                    logger.error(`✗ Error adding ${power.name}:`, error.message);
                }
            }
        }

        // Show final counts
        const [finalCounts] = await connection.execute(`
            SELECT rank, COUNT(*) as count 
            FROM powers 
            GROUP BY rank 
            ORDER BY CASE rank 
                WHEN 'Normal' THEN 1 
                WHEN 'Rare' THEN 2 
                WHEN 'Epic' THEN 3 
                WHEN 'Legendary' THEN 4 
                WHEN 'Mythic' THEN 5 
                WHEN 'Divine' THEN 6 
                WHEN 'Cosmic' THEN 7 
            END
        `);
        
        logger.info('\n=== FINAL POWER COUNTS ===');
        finalCounts.forEach(row => {
            logger.info(`${row.rank}: ${row.count} powers`);
        });
        
        logger.info(`\nSummary: Added ${added} new powers, skipped ${skipped} duplicates`);
        
    } catch (error) {
        logger.error('Error adding powers:', error);
    } finally {
        await connection.end();
    }
}

// Run if called directly
if (require.main === module) {
    addMorePowers()
        .then(() => {
            logger.info('Power expansion completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            logger.error('Script failed:', error);
            process.exit(1);
        });
}

module.exports = { addMorePowers };
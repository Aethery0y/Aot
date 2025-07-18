const { pool } = require('../config/database');
const logger = require('../utils/logger');

async function findAndUpdateAbsolutePowers() {
    try {
        logger.info('Finding and updating Absolute rank powers...');
        
        // First, find all Absolute rank powers
        const [currentPowers] = await pool.execute(
            'SELECT id, name, description FROM powers WHERE rank = "Absolute" ORDER BY id'
        );
        
        logger.info('Current Absolute rank powers:');
        currentPowers.forEach(power => {
            logger.info(`ID ${power.id}: ${power.name}`);
        });

        if (currentPowers.length >= 3) {
            // Update the powers with AOT-themed names
            const updates = [
                {
                    id: currentPowers[0].id,
                    name: 'Ymir\'s Divine Inheritance',
                    description: 'The complete power inherited from the first titan Ymir Fritz, transcending all limitations of the Nine Titans'
                },
                {
                    id: currentPowers[1].id,
                    name: 'Paradis Island\'s Final Hope',
                    description: 'The ultimate manifestation of humanity\'s will to survive, combining all Eldian powers into one absolute force'
                },
                {
                    id: currentPowers[2].id,
                    name: 'Devil of All Earth',
                    description: 'The legendary power that grants dominion over all titans, paths, and the very fabric of existence itself'
                }
            ];

            for (const update of updates) {
                await pool.execute(
                    'UPDATE powers SET name = ?, description = ? WHERE id = ?',
                    [update.name, update.description, update.id]
                );
                logger.info(`Updated power ID ${update.id}: ${update.name}`);
            }
        } else {
            logger.warn('Less than 3 Absolute rank powers found in database');
        }

        // Verify updates
        const [updatedPowers] = await pool.execute(
            'SELECT id, name, description FROM powers WHERE rank = "Absolute" ORDER BY id'
        );
        
        logger.info('Updated Absolute rank powers:');
        updatedPowers.forEach(power => {
            logger.info(`ID ${power.id}: ${power.name}`);
        });

        logger.info('Absolute power updates completed successfully!');
        
    } catch (error) {
        logger.error('Error updating Absolute powers:', error);
        throw error;
    }
}

// Run the update
findAndUpdateAbsolutePowers()
    .then(() => {
        logger.info('Script completed successfully');
        process.exit(0);
    })
    .catch(error => {
        logger.error('Script failed:', error);
        process.exit(1);
    });
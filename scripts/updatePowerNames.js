const { pool } = require('../config/database');
const logger = require('../utils/logger');

async function updatePowerNames() {
    try {
        logger.info('Starting power name updates...');
        
        // Update Absolute rank power names
        const absoluteUpdates = [
            {
                id: 34,
                name: 'Ymir\'s Divine Inheritance',
                description: 'The complete power inherited from the first titan Ymir Fritz, transcending all limitations of the Nine Titans'
            },
            {
                id: 35,
                name: 'Paradis Island\'s Final Hope',
                description: 'The ultimate manifestation of humanity\'s will to survive, combining all Eldian powers into one absolute force'
            },
            {
                id: 36,
                name: 'Devil of All Earth',
                description: 'The legendary power that grants dominion over all titans, paths, and the very fabric of existence itself'
            }
        ];

        for (const update of absoluteUpdates) {
            await pool.execute(
                'UPDATE powers SET name = ?, description = ? WHERE id = ?',
                [update.name, update.description, update.id]
            );
            logger.info(`Updated power ID ${update.id}: ${update.name}`);
        }

        // Check if updates were successful
        const [results] = await pool.execute(
            'SELECT id, name, description FROM powers WHERE rank = "Absolute" ORDER BY id'
        );
        
        logger.info('Updated Absolute rank powers:');
        results.forEach(power => {
            logger.info(`ID ${power.id}: ${power.name}`);
        });

        logger.info('Power name updates completed successfully!');
        
    } catch (error) {
        logger.error('Error updating power names:', error);
        throw error;
    }
}

// Run the update
updatePowerNames()
    .then(() => {
        logger.info('Script completed successfully');
        process.exit(0);
    })
    .catch(error => {
        logger.error('Script failed:', error);
        process.exit(1);
    });
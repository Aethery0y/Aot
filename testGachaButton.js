// Test script to check user's gacha draws
const { getUserByDiscordId } = require('./utils/database');
const logger = require('./utils/logger');

async function testUserDraws() {
    try {
        // Test specific user ID (replace with actual Discord ID from image)
        const user = await getUserByDiscordId('878534779631439872'); // Jade's ID
        
        if (user) {
            logger.info(`User: ${user.username}`);
            logger.info(`Gacha draws: ${user.gacha_draws}`);
            logger.info(`Coins: ${user.coins}`);
        } else {
            logger.info('User not found');
        }
    } catch (error) {
        logger.error('Error:', error);
    }
    
    process.exit(0);
}

testUserDraws();
const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const { token, prefix } = require('./config/bot');
const { initializeDatabase } = require('./utils/database');
const logger = require('./utils/logger');

const fs = require('fs');
const path = require('path');

// Create client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Initialize collections
client.commands = new Collection();
client.prefixCommands = new Collection();



// Load event handlers
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    try {
        const event = require(filePath);

        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }
        logger.info(`Loaded event: ${event.name}`);
    } catch (error) {
        logger.error(`Failed to load event ${file}:`, error);
    }
}

// Load slash commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    try {
        const command = require(filePath);

        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            logger.info(`Loaded slash command: ${command.data.name}`);
        } else {
            logger.warn(`Command at ${filePath} is missing required "data" or "execute" property`);
        }
    } catch (error) {
        logger.error(`Failed to load slash command ${file}:`, error);
    }
}

// Load prefix commands
const prefixCommandsPath = path.join(__dirname, 'commands', 'prefix');
const prefixCommandFiles = fs.readdirSync(prefixCommandsPath).filter(file => file.endsWith('.js'));

for (const file of prefixCommandFiles) {
    const filePath = path.join(prefixCommandsPath, file);
    try {
        const command = require(filePath);

        if ('name' in command && 'execute' in command) {
            client.prefixCommands.set(command.name, command);
            logger.info(`Loaded prefix command: ${command.name}`);
        } else {
            logger.warn(`Prefix command at ${filePath} is missing required "name" or "execute" property`);
        }
    } catch (error) {
        logger.error(`Failed to load prefix command ${file}:`, error);
    }
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

// Initialize database and start bot
async function startBot() {
    try {
        logger.info('Starting Attack on Titan Bot...');

        logger.info('Initializing database...');
        await initializeDatabase();
        logger.info('Database initialized successfully');

        logger.info('Logging in to Discord...');
        await client.login(token);
        
        // Start preventive maintenance and bug monitoring after successful login
        logger.info('Starting maintenance and monitoring systems...');
        const preventiveMaintenance = require('./utils/preventiveMaintenence');
        const bugMonitor = require('./utils/bugMonitor');
        
        setTimeout(async () => {
            try {
                // Start bug monitoring
                bugMonitor.startMonitoring();
                logger.info('Bug monitoring system active');
                
                // Run maintenance check
                await preventiveMaintenance.runMaintenanceCheck();
                preventiveMaintenance.startAutoMaintenance(6); // Run every 6 hours
                logger.info('Preventive maintenance system active');
            } catch (error) {
                logger.error('Failed to start maintenance systems:', error);
            }
        }, 30000); // Wait 30 seconds after startup



    } catch (error) {
        logger.error('Failed to start bot:', error);
        logger.error('Bot startup error:', error);
        process.exit(1);
    }
}

startBot();
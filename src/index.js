const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { initializeDatabase } = require('./database/connection');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');
const { startScheduler } = require('./services/scheduler');
const { initializeSecurity } = require('./security/securityManager');
const { initializeCache } = require('./cache/cacheManager');
const { startHealthMonitor } = require('./monitoring/healthMonitor');
const logger = require('./utils/logger');
const config = require('./config/config');

class EnhancedAOTBot {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMembers
            ],
            allowedMentions: {
                parse: ['users', 'roles'],
                repliedUser: false
            }
        });

        this.commands = new Collection();
        this.prefixCommands = new Collection();
        this.cooldowns = new Collection();
        this.isReady = false;
    }

    async initialize() {
        try {
            logger.info('🚀 Starting Enhanced Attack on Titan Bot...');

            // Initialize core systems
            await this.initializeCoreServices();
            
            // Load bot components
            await this.loadBotComponents();
            
            // Start monitoring and security
            await this.startMonitoringSystems();
            
            // Login to Discord
            await this.client.login(config.discord.token);
            
            logger.info('✅ Enhanced AOT Bot successfully initialized');
            
        } catch (error) {
            logger.error('❌ Failed to initialize bot:', error);
            process.exit(1);
        }
    }

    async initializeCoreServices() {
        logger.info('🔧 Initializing core services...');
        
        // Initialize database with connection pooling and transactions
        await initializeDatabase();
        
        // Initialize Redis cache for performance
        await initializeCache();
        
        // Initialize security systems
        await initializeSecurity();
        
        logger.info('✅ Core services initialized');
    }

    async loadBotComponents() {
        logger.info('📦 Loading bot components...');
        
        // Load commands with validation
        await loadCommands(this.client);
        
        // Load events with error handling
        await loadEvents(this.client);
        
        logger.info('✅ Bot components loaded');
    }

    async startMonitoringSystems() {
        logger.info('📊 Starting monitoring systems...');
        
        // Start health monitoring
        startHealthMonitor(this.client);
        
        // Start scheduled tasks
        startScheduler();
        
        logger.info('✅ Monitoring systems started');
    }

    async gracefulShutdown() {
        logger.info('🛑 Initiating graceful shutdown...');
        
        try {
            // Close database connections
            await require('./database/connection').closeConnections();
            
            // Close cache connections
            await require('./cache/cacheManager').close();
            
            // Destroy Discord client
            this.client.destroy();
            
            logger.info('✅ Graceful shutdown completed');
            process.exit(0);
            
        } catch (error) {
            logger.error('❌ Error during shutdown:', error);
            process.exit(1);
        }
    }
}

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

// Graceful shutdown handlers
process.on('SIGINT', async () => {
    logger.info('Received SIGINT signal');
    await bot.gracefulShutdown();
});

process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM signal');
    await bot.gracefulShutdown();
});

// Initialize and start the bot
const bot = new EnhancedAOTBot();
bot.initialize();

module.exports = bot;
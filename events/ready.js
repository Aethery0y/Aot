const { REST, Routes, ActivityType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        logger.info(`Bot logged in as ${client.user.tag}`);
        logger.info(`Bot is ready and serving ${client.guilds.cache.size} guilds`);
        
        // Set bot activity
        client.user.setActivity('Attack on Titan RPG | /register to start', { 
            type: ActivityType.Streaming,
            url: 'https://www.youtube.com/watch?v=_OlnsrZIYoY'
        });
        
        // Register slash commands
        await registerSlashCommands(client);
        
        // Log bot statistics
        logBotStatistics(client);
        
        logger.info('Bot is fully ready and operational');
    }
};

async function registerSlashCommands(client) {
    try {
        const commands = [];
        const commandsPath = path.join(__dirname, '..', 'commands');
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        // Load slash commands
        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                commands.push(command.data.toJSON());
            }
        }

        if (commands.length === 0) {
            logger.warn('No slash commands found to register');
            return;
        }

        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

        logger.info(`Registering ${commands.length} slash commands...`);

        // Register commands globally
        const data = await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );

        logger.info(`Successfully registered ${data.length} slash commands globally`);

    } catch (error) {
        logger.error('Error registering slash commands:', error);
    }
}

function logBotStatistics(client) {
    const stats = {
        guilds: client.guilds.cache.size,
        users: client.users.cache.size,
        channels: client.channels.cache.size,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
        discordJsVersion: require('discord.js').version
    };

    logger.info('Bot Statistics:', {
        guilds: stats.guilds,
        users: stats.users,
        channels: stats.channels,
        uptimeSeconds: Math.round(stats.uptime),
        memoryUsageMB: Math.round(stats.memoryUsage.heapUsed / 1024 / 1024),
        nodeVersion: stats.nodeVersion,
        discordJsVersion: stats.discordJsVersion
    });

    // Log guild information
    client.guilds.cache.forEach(guild => {
        logger.info(`Guild: ${guild.name} (${guild.id}) - ${guild.memberCount} members`);
    });
}

const { EmbedBuilder } = require('discord.js');
const { checkCooldown } = require('../utils/database');
const { getRegistrationRequiredEmbed } = require('../utils/termsAndConditions');
const config = require('../config/bot');
const logger = require('../utils/logger');

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        // Ignore bot messages
        if (message.author.bot) return;

        // Check if message starts with prefix
        if (!message.content.startsWith(config.prefix)) return;

        // Parse command and arguments
        const args = message.content.slice(config.prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        // Get command from collection
        const command = message.client.prefixCommands.get(commandName) ||
                       message.client.prefixCommands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

        if (!command) return;

        // Check if user needs to be registered for this command
        const allowedCommands = ['help', 'login', 'register'];
        if (!allowedCommands.includes(commandName)) {
            const { getUserByDiscordId } = require('../utils/database');
            const user = await getUserByDiscordId(message.author.id);
            
            if (!user) {
                const registrationEmbed = getRegistrationRequiredEmbed();
                return message.reply({ embeds: [registrationEmbed] });
            }
        }

        try {
            // Check cooldown if command has one (but don't set it yet)
            if (command.cooldown) {
                const cooldownCheck = await checkCooldown(message.author.id, commandName, command.cooldown, false);
                
                if (cooldownCheck.onCooldown) {
                    const timeLeft = Math.max(0, Math.floor(cooldownCheck.timeLeft / 1000)); // Convert to seconds
                    const hours = Math.floor(timeLeft / 3600);
                    const minutes = Math.floor((timeLeft % 3600) / 60);
                    const seconds = timeLeft % 60;
                    
                    let timeString = '';
                    if (hours > 0) {
                        timeString = `${hours}h ${minutes}m ${seconds}s`;
                    } else if (minutes > 0) {
                        timeString = `${minutes}m ${seconds}s`;
                    } else {
                        timeString = `${seconds}s`;
                    }
                    
                    const refreshTime = Math.floor((Date.now() + cooldownCheck.timeLeft) / 1000);
                    const cooldownEmbed = new EmbedBuilder()
                        .setColor('#ffaa00')
                        .setTitle('⏰ Command Cooldown')
                        .setDescription(`Wait **${timeString}** before using \`${config.prefix}${commandName}\` again.\n\n⏱️ **Real-time Countdown:**\nRefreshes <t:${refreshTime}:R> at <t:${refreshTime}:T>`)
                        .setFooter({ text: `Cooldown: ${command.cooldown}s` })
                        .setTimestamp();

                    const cooldownMessage = await message.reply({ embeds: [cooldownEmbed] });
                    
                    // Auto-delete the cooldown message when countdown ends
                    setTimeout(async () => {
                        try {
                            await cooldownMessage.delete();
                        } catch (error) {
                            // Message might already be deleted or we don't have permission
                            logger.debug('Could not delete cooldown message:', error.message);
                        }
                    }, cooldownCheck.timeLeft);
                    
                    return;
                }
            }

            // Log command usage
            logger.command(
                message.author.username,
                `${config.prefix}${commandName}`,
                `args: [${args.join(', ')}] in ${message.guild?.name || 'DM'}`
            );

            // Execute command
            await command.execute(message, args);
            
            // Set cooldown only after successful execution
            if (command.cooldown) {
                const { setCooldownAfterSuccess } = require('../utils/database');
                await setCooldownAfterSuccess(message.author.id, commandName, command.cooldown);
            }

            // Auto-set idle presence after command completion for non-activity commands
            const excludeFromIdlePresence = ['battle', 'fight', 'arena', 'store', 'shop'];

        } catch (error) {
            logger.error(`Error executing ${config.prefix}${commandName}:`, error);

            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Command Error')
                .setDescription('An error occurred while executing this command.')
                .addFields({
                    name: '🛠️ What you can do:',
                    value: '• Check your command syntax\n• Try again in a few moments\n• Contact support if the issue persists',
                    inline: false
                })
                .setFooter({ text: 'Error has been logged for investigation' })
                .setTimestamp();

            try {
                await message.reply({ embeds: [errorEmbed] });
            } catch (replyError) {
                logger.error('Failed to send error message:', replyError);
            }
        }
    }
};

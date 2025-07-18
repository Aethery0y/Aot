const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { checkCooldown } = require('./database');
const logger = require('./logger');

// Store active cooldown messages for real-time updates
const activeCooldowns = new Map();

/**
 * Check if user can use a command, if not, show real-time cooldown
 */
async function checkAndHandleCooldown(userId, commandName, cooldownSeconds, messageOrInteraction) {
    const cooldownResult = await checkCooldown(userId, commandName, cooldownSeconds, false); // Don't set cooldown yet
    
    if (cooldownResult.canUse) {
        return true; // User can use the command
    }
    
    // User is on cooldown - show cooldown message
    await showCooldownMessage(userId, commandName, cooldownResult.timeLeft, messageOrInteraction);
    return false;
}

/**
 * Set cooldown after successful command execution
 */
async function setCooldown(userId, commandName, cooldownSeconds) {
    await checkCooldown(userId, commandName, cooldownSeconds, true); // Set cooldown
}

/**
 * Show cooldown message for both interactions and messages
 */
async function showCooldownMessage(userId, commandName, timeLeft, messageOrInteraction) {
    const embed = createCooldownEmbed(commandName, timeLeft);
    
    try {
        // Check if it's an interaction or message
        if (messageOrInteraction.isButton && messageOrInteraction.isButton()) {
            // It's a button interaction
            await messageOrInteraction.reply({
                embeds: [embed],
                flags: 64 // Ephemeral
            });
        } else if (messageOrInteraction.reply && typeof messageOrInteraction.reply === 'function') {
            // It's a message or interaction with reply method
            await messageOrInteraction.reply({
                embeds: [embed],
                flags: 64 // Ephemeral for interactions, ignored for messages
            });
        } else {
            logger.warn('Unknown message/interaction type in showCooldownMessage');
        }
    } catch (error) {
        logger.error('Error showing cooldown message:', error);
    }
}

/**
 * Show real-time cooldown countdown that updates every 5 seconds (for messages only)
 */
async function showRealTimeCooldown(userId, commandName, timeLeft, message) {
    const cooldownId = `${userId}_${commandName}`;
    
    // Clear existing cooldown if any
    if (activeCooldowns.has(cooldownId)) {
        const existing = activeCooldowns.get(cooldownId);
        clearInterval(existing.interval);
        activeCooldowns.delete(cooldownId);
    }
    
    // Create initial cooldown embed
    const embed = createCooldownEmbed(commandName, timeLeft);
    
    try {
        const cooldownMessage = await message.reply({
            embeds: [embed],
            ephemeral: false
        });
        
        let remainingTime = timeLeft;
        
        // Update every 5 seconds
        const interval = setInterval(async () => {
            remainingTime -= 5000; // 5 seconds
            
            if (remainingTime <= 0) {
                // Cooldown finished - delete message
                clearInterval(interval);
                activeCooldowns.delete(cooldownId);
                
                try {
                    await cooldownMessage.delete();
                } catch (error) {
                    logger.error('Error deleting cooldown message:', error);
                }
                return;
            }
            
            // Update embed with new time
            const updatedEmbed = createCooldownEmbed(commandName, remainingTime);
            
            try {
                await cooldownMessage.edit({
                    embeds: [updatedEmbed]
                });
            } catch (error) {
                logger.error('Error updating cooldown message:', error);
                clearInterval(interval);
                activeCooldowns.delete(cooldownId);
            }
        }, 5000);
        
        // Store cooldown data
        activeCooldowns.set(cooldownId, {
            interval,
            messageId: cooldownMessage.id,
            channelId: message.channel.id,
            startTime: Date.now(),
            duration: timeLeft
        });
        
    } catch (error) {
        logger.error('Error creating cooldown message:', error);
    }
}

/**
 * Create cooldown embed
 */
function createCooldownEmbed(commandName, timeLeft) {
    const totalSeconds = Math.ceil(timeLeft / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    const timeString = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
    
    // Calculate when it will refresh
    const refreshTime = new Date(Date.now() + timeLeft);
    const refreshTimeString = refreshTime.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
    });
    
    return new EmbedBuilder()
        .setColor('#ff6b6b')
        .setTitle('⏰ Command Cooldown')
        .setDescription(`Wait **${timeString}** before using \`ot ${commandName}\` again.`)
        .addFields(
            {
                name: '🕒 Real-time Countdown:',
                value: `Refreshes in ${timeString} at ${refreshTimeString}`,
                inline: false
            },
            {
                name: 'Cooldown Info:',
                value: `${Math.ceil(timeLeft / 1000)}s • Today at ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
                inline: false
            }
        )
        .setFooter({ text: 'This message will disappear when the cooldown ends' })
        .setTimestamp();
}

/**
 * Clean up expired cooldowns on bot restart
 */
function cleanupCooldowns() {
    for (const [cooldownId, data] of activeCooldowns.entries()) {
        const elapsed = Date.now() - data.startTime;
        if (elapsed >= data.duration) {
            clearInterval(data.interval);
            activeCooldowns.delete(cooldownId);
        }
    }
}

module.exports = {
    checkAndHandleCooldown,
    setCooldown,
    showRealTimeCooldown,
    cleanupCooldowns,
    activeCooldowns
};
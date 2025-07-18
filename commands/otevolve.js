const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { getUserByDiscordId, getUserPowers } = require('../utils/database');
const { getRankEmoji } = require('../utils/powers');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('otmerge')
        .setDescription('Merge multiple powers into one stronger power'),
    
    async execute(interaction) {
        try {
            await interaction.deferReply({ flags: 64 });
            
            const user = await getUserByDiscordId(interaction.user.id);
            if (!user) {
                return interaction.editReply({
                    content: '❌ You need to register first! Use `/register` command.'
                });
            }
            
            // Check if user has 1-hour merge cooldown
            const { checkCooldown } = require('../utils/database');
            const cooldownCheck = await checkCooldown(user.id, 'merge_command', 3600, false); // 1 hour in seconds
            
            if (cooldownCheck.onCooldown) {
                const timeLeft = Math.max(0, Math.floor(cooldownCheck.timeLeft / 1000));
                const days = Math.floor(timeLeft / 86400);
                const hours = Math.floor((timeLeft % 86400) / 3600);
                const minutes = Math.floor((timeLeft % 3600) / 60);
                
                let timeString = '';
                if (days > 0) {
                    timeString = `${days}d ${hours}h ${minutes}m`;
                } else if (hours > 0) {
                    timeString = `${hours}h ${minutes}m`;
                } else {
                    timeString = `${minutes}m`;
                }
                
                return interaction.editReply({
                    content: `❌ You can only merge powers once every hour. Wait **${timeString}** before merging again.`
                });
            }

            // Get user's powers
            const userPowers = await getUserPowers(user.id);
            
            logger.info(`Merge command: User ${user.username} has ${userPowers.length} powers`);
            
            if (userPowers.length < 2) {
                return interaction.editReply({
                    content: '❌ You need at least 2 powers to merge! Use `ot gacha` to get more powers.'
                });
            }

            // Filter out equipped power (can't merge equipped power)
            const availablePowers = userPowers.filter(p => p.user_power_id !== user.equipped_power_id);
            
            logger.info(`Merge command: User ${user.username} has ${availablePowers.length} available powers for merging`);
            
            if (availablePowers.length < 2) {
                return interaction.editReply({
                    content: '❌ You need at least 2 non-equipped powers to merge! Your equipped power cannot be merged.'
                });
            }

            // Create dropdown for main power selection (base power that others merge into)
            const mainPowerOptions = availablePowers.slice(0, 25).map(power => {
                const option = {
                    label: power.name.length > 100 ? power.name.substring(0, 97) + '...' : power.name,
                    value: power.user_power_id.toString(),
                    description: `${power.rank} • ${power.combat_power} CP`
                };
                
                // Try to get emoji, but don't fail if it doesn't work
                try {
                    const emoji = getRankEmoji(power.rank);
                    if (emoji) option.emoji = emoji;
                } catch (error) {
                    logger.warn(`Failed to get emoji for rank ${power.rank}:`, error);
                }
                
                return option;
            });
            
            logger.info(`Merge command: Created ${mainPowerOptions.length} power options for dropdown`);
            logger.info(`First few options: ${JSON.stringify(mainPowerOptions.slice(0, 3))}`);
            
            if (mainPowerOptions.length === 0) {
                logger.error('No power options created for dropdown!');
                return interaction.editReply({
                    content: '❌ Unable to create power options. Please try again later.'
                });
            }

            const mainPowerSelect = new StringSelectMenuBuilder()
                .setCustomId('merge_main_power')
                .setPlaceholder('Select the main power (base for merging)')
                .addOptions(mainPowerOptions);
            
            logger.info(`Dropdown created with ${mainPowerOptions.length} options`);

            const row = new ActionRowBuilder()
                .addComponents(mainPowerSelect);
            
            logger.info(`ActionRow created with dropdown component`);

            // Create a clean power list display with character limit handling
            const powersList = availablePowers.map(power => 
                `${power.name} (${power.rank} - ${power.combat_power} CP)`
            ).join('\n');

            // Check if the description will be too long (Discord limit is 4096 characters)
            const baseDescription = `**${user.username}**\n\nSelect the main power from the dropdown below:\n\n**Available Powers:**\n`;
            const endDescription = `\n\n💡 **How Merging Works**\nSelect a main power, then choose multiple powers to merge into it. All selected powers will be consumed to create one stronger power with a new name!\n\n**Step 1:** Choose your main power`;
            const maxPowersLength = 4096 - baseDescription.length - endDescription.length - 100; // Leave some buffer

            let displayPowersList = powersList;
            if (powersList.length > maxPowersLength) {
                // Truncate and add "and X more" message
                const truncatedList = powersList.substring(0, maxPowersLength);
                const lastNewline = truncatedList.lastIndexOf('\n');
                displayPowersList = truncatedList.substring(0, lastNewline) + `\n... and ${availablePowers.length - truncatedList.substring(0, lastNewline).split('\n').length + 1} more powers`;
            }

            logger.info(`Powers list length: ${powersList.length}, Display list length: ${displayPowersList.length}`);

            const embed = new EmbedBuilder()
                .setColor('#FF6B35')
                .setTitle('⚡ Power Merging')
                .setDescription(`${baseDescription}${displayPowersList}${endDescription}`)
                .setTimestamp();

            logger.info(`Embed description length: ${embed.data.description.length}`);

            await interaction.editReply({
                embeds: [embed],
                components: [row]
            });
            
            logger.info(`Merge command response sent successfully`);

        } catch (error) {
            logger.error('Error in merge command:', error);
            const responseMethod = interaction.deferred ? 'editReply' : 'reply';
            await interaction[responseMethod]({
                content: '❌ An error occurred while preparing merge. Please try again later.',
                ...(responseMethod === 'reply' ? { flags: 64 } : {})
            });
        }
    }
};


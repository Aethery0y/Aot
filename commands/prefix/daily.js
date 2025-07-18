const { EmbedBuilder } = require('discord.js');
const { getUserByDiscordId, updateUserStats, setCooldownAfterSuccess } = require('../../utils/database');
const logger = require('../../utils/logger');

module.exports = {
    name: 'daily',
    aliases: ['dailyreward', 'claim'],
    description: 'Claim your daily rewards',
    cooldown: 21600, // 6 hours in seconds (reduced from 12h)

    async execute(message, args) {
        try {
            const user = await getUserByDiscordId(message.author.id);
            if (!user) {
                return message.reply('❌ You need to register first! Use `/register` command.');
            }

            // Cooldown is now handled by the main event system

            // Calculate daily rewards (level system removed)
            const totalCoins = 500; // Fixed daily reward
            
            // Streak bonus (placeholder for future implementation)
            const streakBonus = 0; // TODO: Implement streak system
            
            // Update user stats (exp system removed)
            await updateUserStats(user.id, {
                coins: user.coins + totalCoins
            });

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('📅 Daily Reward Claimed!')
                .setDescription(`**${user.username}** has claimed their daily rewards!`)
                .addFields(
                    {
                        name: '💰 Coins Earned',
                        value: `+${totalCoins.toLocaleString()} coins`,
                        inline: true
                    },
                    {
                        name: '📊 New Total',
                        value: `${(user.coins + totalCoins).toLocaleString()} coins`,
                        inline: true
                    }
                )
                .setFooter({ text: 'Come back tomorrow for more rewards!' })
                .setTimestamp();

            await message.reply({ embeds: [embed] });
            
            // Set cooldown after successful daily claim
            await setCooldownAfterSuccess(message.author.id, 'daily', this.cooldown);
            
            logger.info(`Daily reward claimed by ${user.username}: ${totalCoins} coins`);

        } catch (error) {
            logger.error('Error in daily command:', error);
            message.reply('❌ An error occurred while claiming daily rewards. Please try again later.');
        }
    }
};
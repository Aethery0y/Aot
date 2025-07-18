const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserByDiscordId } = require('../utils/database');
const redeemCodeManager = require('../utils/redeemCodeManager');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('otredeem')
        .setDescription('Redeem a code for rewards')
        .addStringOption(option =>
            option.setName('code')
                .setDescription('The redeem code (format: XXX-XXX-XXX)')
                .setRequired(true)
        ),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            const user = await getUserByDiscordId(interaction.user.id);
            if (!user) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Not Registered')
                    .setDescription('You need to register first using `/register`.')
                    .setTimestamp();
                
                return interaction.editReply({ embeds: [embed] });
            }

            const code = interaction.options.getString('code').toUpperCase();
            
            // Validate code format
            if (!/^[A-Z0-9]{3}-[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(code)) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Invalid Code Format')
                    .setDescription('Code must be in format: XXX-XXX-XXX (letters and numbers only)')
                    .addFields({
                        name: '📝 Example',
                        value: '`ABC-123-XYZ`',
                        inline: false
                    })
                    .setTimestamp();
                
                return interaction.editReply({ embeds: [embed] });
            }

            // Use atomic redeem operation
            const redeemResult = await redeemCodeManager.redeemCode(code, user.id, interaction.user.id);
            
            if (redeemResult.success) {
                const rewardsList = redeemResult.rewards.map(reward => {
                    switch (reward.type) {
                        case 'coins':
                            return `💰 ${reward.amount.toLocaleString()} coins`;
                        case 'gacha_draws':
                            return `🎲 ${reward.amount} gacha draws`;
                        case 'power':
                            return `⚡ ${reward.power}`;
                        default:
                            return `🎁 ${reward.type}`;
                    }
                }).join('\n');

                const embed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('✅ Code Redeemed Successfully!')
                    .setDescription(`**Code:** \`${redeemResult.code}\`\n**Description:** ${redeemResult.description}`)
                    .addFields({
                        name: '🎁 Rewards Received',
                        value: rewardsList,
                        inline: false
                    })
                    .setFooter({ text: 'Rewards have been added to your account' })
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            logger.error('Error in redeem command:', error);
            
            let errorMessage = 'An error occurred while redeeming the code.';
            if (error.message.includes('Invalid redeem code')) {
                errorMessage = 'This code is either invalid or has already been used.';
            } else if (error.message.includes('already used')) {
                errorMessage = 'You have already redeemed this code.';
            } else if (error.message.includes('expired')) {
                errorMessage = 'This code has expired.';
            } else if (error.message.includes('maximum usage')) {
                errorMessage = 'This code has reached its usage limit.';
            }

            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Redemption Failed')
                .setDescription(errorMessage)
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }
    }
};
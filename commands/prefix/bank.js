const { EmbedBuilder } = require('discord.js');
const { getUserByDiscordId } = require('../../utils/database');
const logger = require('../../utils/logger');

module.exports = {
    name: 'bank',
    aliases: ['bankbalance', 'bb'],
    description: 'View your bank account details',

    async execute(message, args) {
        try {
            const user = await getUserByDiscordId(message.author.id);
            if (!user) {
                return message.reply('❌ You need to register first! Use `/register` command.');
            }

            const totalWealth = user.coins + user.bank_balance;
            const bankPercentage = totalWealth > 0 ? Math.round((user.bank_balance / totalWealth) * 100) : 0;

            const embed = new EmbedBuilder()
                .setColor('#0066cc')
                .setTitle('🏦 Bank Account Details')
                .setDescription(`**${user.username}**'s banking information`)
                .addFields(
                    { name: '💵 Wallet Balance', value: `${user.coins.toLocaleString()} coins`, inline: true },
                    { name: '🏦 Bank Balance', value: `${user.bank_balance.toLocaleString()} coins`, inline: true },
                    { name: '💎 Total Wealth', value: `${totalWealth.toLocaleString()} coins`, inline: true },
                    { name: '📊 Bank Security', value: `${bankPercentage}% of wealth secured`, inline: true },
                    { name: '🔒 Protection Status', value: user.bank_balance > 0 ? '✅ Protected from robberies' : '❌ No protection', inline: true },
                    { name: '🏪 Account Type', value: 'Standard Savings', inline: true }
                )
                .addFields({
                    name: '🏦 Banking Services',
                    value: '• `ot deposit <amount>` - Secure your coins\n• `ot withdraw <amount>` - Access your funds\n• `ot deposit all` - Secure all wallet coins\n• `ot withdraw all` - Withdraw all bank funds',
                    inline: false
                })
                .addFields({
                    name: '💡 Banking Tips',
                    value: '• Bank money is safe from `ot rob` attempts\n• No fees for deposits or withdrawals\n• Keep large amounts in bank for security',
                    inline: false
                })
                .setFooter({ text: 'Secure your wealth • Protect your coins' })
                .setTimestamp();

            // Add security recommendation
            if (user.coins > user.bank_balance && user.coins > 1000) {
                embed.addFields({
                    name: '⚠️ Security Recommendation',
                    value: `Consider depositing some wallet coins for safety. You have ${user.coins.toLocaleString()} coins at risk of robbery.`,
                    inline: false
                });
            }

            message.reply({ embeds: [embed] });

            logger.info(`${user.username} viewed bank account: ${user.bank_balance} banked, ${user.coins} wallet`);

        } catch (error) {
            logger.error('Error in bank command:', error);
            message.reply('❌ An error occurred while fetching your bank details. Please try again later.');
        }
    }
};

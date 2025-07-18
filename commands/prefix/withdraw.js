const { EmbedBuilder } = require('discord.js');
const { getUserByDiscordId, withdrawCoins } = require('../../utils/database');
const logger = require('../../utils/logger');

module.exports = {
    name: 'withdraw',
    aliases: ['wd'],
    description: 'Withdraw coins from your bank account',

    async execute(message, args) {
        try {
            const user = await getUserByDiscordId(message.author.id);
            if (!user) {
                return message.reply('❌ You need to register first! Use `/register` command.');
            }

            if (args.length === 0) {
                return message.reply('❌ Please specify an amount to withdraw. Usage: `ot withdraw <amount>` or `ot withdraw all`');
            }

            let amount;
            
            if (args[0].toLowerCase() === 'all') {
                amount = user.bank_balance;
            } else {
                amount = parseInt(args[0]);
                if (isNaN(amount) || amount <= 0) {
                    return message.reply('❌ Please enter a valid positive number or "all".');
                }
            }

            if (amount > user.bank_balance) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Insufficient Bank Funds')
                    .setDescription(`You don't have enough coins in your bank account.`)
                    .addFields(
                        { name: '🏦 Bank Balance', value: `${user.bank_balance.toLocaleString()} coins`, inline: true },
                        { name: '💸 Attempted Withdrawal', value: `${amount.toLocaleString()} coins`, inline: true }
                    )
                    .setTimestamp();

                return message.reply({ embeds: [embed] });
            }

            if (amount === 0) {
                return message.reply('❌ You have no coins in your bank account!');
            }

            // FIXED: Use atomic withdrawal function
            const result = await withdrawCoins(user.id, amount);

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🏦 Withdrawal Successful!')
                .setDescription(`**${user.username}** withdrew coins from the bank`)
                .addFields(
                    { name: '💰 Withdrawn Amount', value: `${result.withdrawnAmount.toLocaleString()} coins`, inline: true },
                    { name: '💵 New Wallet Balance', value: `${result.newWalletBalance.toLocaleString()} coins`, inline: true },
                    { name: '🏦 New Bank Balance', value: `${result.newBankBalance.toLocaleString()} coins`, inline: true }
                )
                .addFields({
                    name: '⚠️ Security Warning',
                    value: 'Coins in your wallet can be stolen through robberies. Consider keeping large amounts in the bank!',
                    inline: false
                })
                .setFooter({ text: 'Use "ot deposit <amount>" to secure coins in bank' })
                .setTimestamp();

            message.reply({ embeds: [embed] });

            logger.info(`${user.username} withdrew ${result.withdrawnAmount} coins from bank`);

        } catch (error) {
            logger.error('Error in withdraw command:', error);
            message.reply(`❌ ${error.message}`);
        }
    }
};

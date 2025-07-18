const { EmbedBuilder } = require('discord.js');
const { getUserByDiscordId, depositCoins } = require('../../utils/database');
const logger = require('../../utils/logger');

module.exports = {
    name: 'deposit',
    aliases: ['dep'],
    description: 'Deposit coins into your bank account',

    async execute(message, args) {
        try {
            const user = await getUserByDiscordId(message.author.id);
            if (!user) {
                return message.reply('❌ You need to register first! Use `/register` command.');
            }

            if (args.length === 0) {
                return message.reply('❌ Please specify an amount to deposit. Usage: `ot deposit <amount>` or `ot deposit all`');
            }

            let amount;
            
            if (args[0].toLowerCase() === 'all') {
                amount = user.coins;
            } else {
                amount = parseInt(args[0]);
                if (isNaN(amount) || amount <= 0) {
                    return message.reply('❌ Please enter a valid positive number or "all".');
                }
            }

            if (amount > user.coins) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Insufficient Funds')
                    .setDescription(`You don't have enough coins to deposit.`)
                    .addFields(
                        { name: '💵 Wallet Balance', value: `${user.coins.toLocaleString()} coins`, inline: true },
                        { name: '💸 Attempted Deposit', value: `${amount.toLocaleString()} coins`, inline: true }
                    )
                    .setTimestamp();

                return message.reply({ embeds: [embed] });
            }

            if (amount === 0) {
                return message.reply('❌ You have no coins to deposit!');
            }

            // FIXED: Use atomic deposit function
            const result = await depositCoins(user.id, amount);

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🏦 Deposit Successful!')
                .setDescription(`**${user.username}** deposited coins into the bank`)
                .addFields(
                    { name: '💰 Deposited Amount', value: `${result.depositedAmount.toLocaleString()} coins`, inline: true },
                    { name: '💵 New Wallet Balance', value: `${result.newWalletBalance.toLocaleString()} coins`, inline: true },
                    { name: '🏦 New Bank Balance', value: `${result.newBankBalance.toLocaleString()} coins`, inline: true }
                )
                .addFields({
                    name: '🔒 Security Benefit',
                    value: 'Your banked coins are now safe from robberies!',
                    inline: false
                })
                .setFooter({ text: 'Use "ot withdraw <amount>" to withdraw coins from bank' })
                .setTimestamp();

            message.reply({ embeds: [embed] });

            logger.info(`${user.username} deposited ${result.depositedAmount} coins to bank`);

        } catch (error) {
            logger.error('Error in deposit command:', error);
            message.reply(`❌ ${error.message}`);
        }
    }
};

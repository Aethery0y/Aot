const { EmbedBuilder } = require('discord.js');
const { getUserByDiscordId, updateUserCoins, updateUserBank } = require('../../utils/database');
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

            // Perform the deposit transaction atomically
            const atomicOperations = require('../../utils/atomicOperations');
            
            const result = await atomicOperations.executeWithLock(async (connection) => {
                // Update coins and bank in single transaction
                await connection.execute(
                    'UPDATE users SET coins = coins - ?, bank_balance = bank_balance + ? WHERE id = ?',
                    [amount, amount, user.id]
                );
                
                // Get updated balances
                const [updatedUser] = await connection.execute(
                    'SELECT coins, bank_balance FROM users WHERE id = ?',
                    [user.id]
                );
                
                return updatedUser[0];
            }, `deposit_${user.id}`);

            const newWalletBalance = result.coins;
            const newBankBalance = result.bank_balance;

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🏦 Deposit Successful!')
                .setDescription(`**${user.username}** deposited coins into the bank`)
                .addFields(
                    { name: '💰 Deposited Amount', value: `${amount.toLocaleString()} coins`, inline: true },
                    { name: '💵 New Wallet Balance', value: `${newWalletBalance.toLocaleString()} coins`, inline: true },
                    { name: '🏦 New Bank Balance', value: `${newBankBalance.toLocaleString()} coins`, inline: true }
                )
                .addFields({
                    name: '🔒 Security Benefit',
                    value: 'Your banked coins are now safe from robberies!',
                    inline: false
                })
                .setFooter({ text: 'Use "ot withdraw <amount>" to withdraw coins from bank' })
                .setTimestamp();

            message.reply({ embeds: [embed] });

            logger.info(`${user.username} deposited ${amount} coins to bank`);

        } catch (error) {
            logger.error('Error in deposit command:', error);
            message.reply('❌ An error occurred during the deposit. Please try again later.');
        }
    }
};

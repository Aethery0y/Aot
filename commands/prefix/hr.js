const { EmbedBuilder } = require('discord.js');
const { getUserByDiscordId, updateUserCoins } = require('../../utils/database');
const logger = require('../../utils/logger');

module.exports = {
    name: 'hr',
    aliases: ['highrisk', 'jackpot'],
    description: 'High risk betting with 10% win chance for 10x payout',
    cooldown: 5, // 5 seconds cooldown

    async execute(message, args) {
        try {
            const user = await getUserByDiscordId(message.author.id);
            if (!user) {
                return message.reply('❌ You need to register first! Use `/register` command.');
            }

            if (args.length === 0) {
                return message.reply('❌ Please specify an amount to bet. Usage: `ot hr <amount>`');
            }

            const amount = parseInt(args[0]);
            if (isNaN(amount) || amount <= 0) {
                return message.reply('❌ Please enter a valid positive number.');
            }

            if (amount > user.coins) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Insufficient Funds')
                    .setDescription(`You don't have enough coins for high risk betting.`)
                    .addFields(
                        { name: '💵 Your Balance', value: `${user.coins.toLocaleString()} coins`, inline: true },
                        { name: '💸 Bet Amount', value: `${amount.toLocaleString()} coins`, inline: true }
                    )
                    .setTimestamp();

                return message.reply({ embeds: [embed] });
            }

            if (amount === 0) {
                return message.reply('❌ You have no coins to bet!');
            }

            // Minimum bet of 100 coins for high risk
            if (amount < 100) {
                return message.reply('❌ Minimum high risk bet is 100 coins!');
            }

            // Maximum bet limit (prevents economy breaking)
            const maxBet = Math.min(user.coins, 50000);
            if (amount > maxBet) {
                return message.reply(`❌ Maximum high risk bet is ${maxBet.toLocaleString()} coins!`);
            }

            // 10% win chance for 10x payout
            const won = Math.random() < 0.1;
            const multiplier = 10;
            const netChange = won ? amount * (multiplier - 1) : -amount; // FIXED: Proper net calculation

            // FIXED: Get fresh user data and update coins atomically
            const freshUser = await getUserByDiscordId(message.author.id);
            const newBalance = await updateUserCoins(freshUser.id, netChange);

            const embed = new EmbedBuilder()
                .setColor(won ? '#gold' : '#ff0000')
                .setTitle(won ? '💰 High Risk Won!' : '💥 High Risk Lost!')
                .setDescription(`**${amount.toLocaleString()}** coins • ${won ? `${multiplier}x multiplier` : '10% chance'}`)
                .addFields(
                    { name: '💰 Balance', value: `${newBalance.toLocaleString()} coins`, inline: true },
                    { name: '📈 Change', value: `${won ? '+' : '-'}${Math.abs(netChange).toLocaleString()}`, inline: true }
                )
                .setTimestamp();

            message.reply({ embeds: [embed] });

            logger.info(`${freshUser.username} high risk bet ${amount} coins - ${won ? `JACKPOT ${Math.abs(netChange)}` : 'LOST'} - New balance: ${newBalance}`);

        } catch (error) {
            logger.error('Error in hr command:', error);
            message.reply('❌ An error occurred during high risk betting. Please try again later.');
        }
    }
};

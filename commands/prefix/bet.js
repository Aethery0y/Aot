const { EmbedBuilder } = require('discord.js');
const { getUserByDiscordId, updateUserCoins } = require('../../utils/database');
const logger = require('../../utils/logger');

module.exports = {
    name: 'bet',
    aliases: ['gamble'],
    description: 'Bet coins with 50% win chance for 2x payout',
    cooldown: 5, // 5 seconds cooldown

    async execute(message, args) {
        try {
            const user = await getUserByDiscordId(message.author.id);
            if (!user) {
                return message.reply('❌ You need to register first! Use `/register` command.');
            }

            if (args.length === 0) {
                return message.reply('❌ Please specify an amount to bet. Usage: `ot bet <amount>` or `ot bet all`');
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
                    .setDescription(`You don't have enough coins to bet.`)
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

            // Minimum bet of 10 coins
            if (amount < 10) {
                return message.reply('❌ Minimum bet is 10 coins!');
            }

            // 50% win chance
            const won = Math.random() < 0.5;
            const winnings = won ? amount : 0; // If won, gain the bet amount (2x total)
            const netChange = won ? amount : -amount;

            // Update user coins
            await updateUserCoins(user.id, netChange);

            const newBalance = user.coins + netChange;

            const embed = new EmbedBuilder()
                .setColor(won ? '#00ff00' : '#ff0000')
                .setTitle(won ? '🎉 Won!' : '💔 Lost!')
                .setDescription(`**${amount.toLocaleString()}** coins ${won ? 'won' : 'lost'}`)
                .addFields(
                    { name: '💰 Balance', value: `${newBalance.toLocaleString()} coins`, inline: true },
                    { name: '📈 Change', value: `${won ? '+' : '-'}${amount.toLocaleString()}`, inline: true }
                )
                .setTimestamp();

            message.reply({ embeds: [embed] });

            logger.info(`${user.username} bet ${amount} coins - ${won ? 'WON' : 'LOST'} - New balance: ${newBalance}`);

        } catch (error) {
            logger.error('Error in bet command:', error);
            message.reply('❌ An error occurred during betting. Please try again later.');
        }
    }
};

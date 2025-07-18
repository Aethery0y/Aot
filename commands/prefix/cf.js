const { EmbedBuilder } = require('discord.js');
const { getUserByDiscordId, updateUserCoins } = require('../../utils/database');
const logger = require('../../utils/logger');

module.exports = {
    name: 'cf',
    aliases: ['coinflip', 'flip'],
    description: 'Coin flip game with 50% win chance for 2x payout',
    cooldown: 3, // 3 seconds cooldown

    async execute(message, args) {
        try {
            const user = await getUserByDiscordId(message.author.id);
            if (!user) {
                return message.reply('❌ You need to register first! Use `/register` command.');
            }

            if (args.length === 0) {
                return message.reply('❌ Please specify an amount to bet. Usage: `ot cf <amount>` or `ot cf all`');
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
                    .setDescription(`You don't have enough coins for coin flip.`)
                    .addFields(
                        { name: '💵 Your Balance', value: `${user.coins.toLocaleString()} coins`, inline: true },
                        { name: '💸 Bet Amount', value: `${amount.toLocaleString()} coins`, inline: true }
                    )
                    .setTimestamp();

                return message.reply({ embeds: [embed] });
            }

            if (amount === 0) {
                return message.reply('❌ You have no coins to flip!');
            }

            // Minimum bet of 5 coins
            if (amount < 5) {
                return message.reply('❌ Minimum coin flip bet is 5 coins!');
            }

            // Random coin flip
            const userChoice = Math.random() < 0.5 ? 'heads' : 'tails';
            const result = Math.random() < 0.5 ? 'heads' : 'tails';
            const won = userChoice === result;

            const winnings = won ? amount : 0;
            const netChange = won ? amount : -amount;

            // Update user coins
            await updateUserCoins(user.id, netChange);

            const newBalance = user.coins + netChange;

            const embed = new EmbedBuilder()
                .setColor(won ? '#00ff00' : '#ff0000')
                .setTitle(won ? '🪙 Heads/Tails Won!' : '🪙 Heads/Tails Lost!')
                .setDescription(`**${amount.toLocaleString()}** coins • ${getFlipEmoji(userChoice)} ${userChoice} vs ${getFlipEmoji(result)} ${result}`)
                .addFields(
                    { name: '💰 Balance', value: `${newBalance.toLocaleString()} coins`, inline: true },
                    { name: '📈 Change', value: `${won ? '+' : '-'}${amount.toLocaleString()}`, inline: true }
                )
                .setTimestamp();

            message.reply({ embeds: [embed] });

            logger.info(`${user.username} coin flipped ${amount} coins - ${userChoice} vs ${result} - ${won ? 'WON' : 'LOST'}`);

        } catch (error) {
            logger.error('Error in coinflip command:', error);
            message.reply('❌ An error occurred during coin flip. Please try again later.');
        }
    }
};

function getFlipEmoji(side) {
    return side === 'heads' ? '🦅' : '🏛️';
}
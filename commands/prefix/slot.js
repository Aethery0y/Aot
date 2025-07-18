const { EmbedBuilder } = require('discord.js');
const { getUserByDiscordId, updateUserCoins } = require('../../utils/database');
const logger = require('../../utils/logger');

module.exports = {
    name: 'slot',
    aliases: ['slots', 'sl'],
    description: 'Play slot machine with classic fruit symbols',
    cooldown: 8, // 8 seconds cooldown

    async execute(message, args) {
        try {
            const user = await getUserByDiscordId(message.author.id);
            if (!user) {
                return message.reply('❌ You need to register first! Use `/register` command.');
            }

            if (args.length === 0) {
                return message.reply('❌ Please specify an amount to bet. Usage: `ot slot <amount>` or `ot slot all`');
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
                    .setDescription(`You don't have enough coins for slots.`)
                    .addFields(
                        { name: '💰 Your Balance', value: `${user.coins.toLocaleString()} coins`, inline: true },
                        { name: '💸 Bet Amount', value: `${amount.toLocaleString()} coins`, inline: true }
                    )
                    .setTimestamp();

                return message.reply({ embeds: [embed] });
            }

            if (amount === 0) {
                return message.reply('❌ You have no coins to play slots!');
            }

            // Minimum bet of 20 coins
            if (amount < 20) {
                return message.reply('❌ Minimum slot bet is 20 coins!');
            }

            // Standard slot machine symbols
            const symbols = [
                { emoji: '🍒', weight: 30, name: 'Cherry', multiplier: 3 },
                { emoji: '🍋', weight: 25, name: 'Lemon', multiplier: 4 },
                { emoji: '🍊', weight: 20, name: 'Orange', multiplier: 5 },
                { emoji: '🍇', weight: 15, name: 'Grapes', multiplier: 6 },
                { emoji: '🔔', weight: 8, name: 'Bell', multiplier: 10 },
                { emoji: '💎', weight: 2, name: 'Diamond', multiplier: 20 }
            ];

            // Start simple slot machine
            await playSimpleSlots(message, user, amount, symbols);

        } catch (error) {
            logger.error('Error in slot command:', error);
            message.reply('❌ An error occurred during slot play. Please try again later.');
        }
    }
};

async function playSimpleSlots(message, user, amount, symbols) {
    // Simple spinning message
    const spinningEmbed = new EmbedBuilder()
        .setColor('#ffff00')
        .setTitle('🎰 Slot Machine')
        .setDescription('🎲 Spinning the slots...')
        .addFields(
            { name: '💰 Bet Amount', value: `${amount.toLocaleString()} coins`, inline: true },
            { name: '🏦 Your Balance', value: `${user.coins.toLocaleString()} coins`, inline: true }
        )
        .setTimestamp();

    const slotMessage = await message.reply({ embeds: [spinningEmbed] });

    // Short delay for spinning effect
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate final result
    const finalReels = [getRandomSymbol(symbols), getRandomSymbol(symbols), getRandomSymbol(symbols)];
    const result = calculateSlotResult(finalReels, amount);

    // FIXED: Get fresh user data and update coins atomically
    const freshUser = await getUserByDiscordId(message.author.id);
    const newBalance = await updateUserCoins(freshUser.id, result.netChange);

    // Display result
    const resultEmbed = new EmbedBuilder()
        .setColor(result.won ? '#00ff00' : '#ff0000')
        .setTitle('🎰 Slot Machine Results')
        .setDescription(`${finalReels[0].emoji} ${finalReels[1].emoji} ${finalReels[2].emoji}`)
        .addFields(
            { name: '🎯 Result', value: result.won ? '🎉 **YOU WON!**' : '💔 **You Lost**', inline: true },
            { name: '💰 Bet Amount', value: `${amount.toLocaleString()} coins`, inline: true },
            { name: '🏦 New Balance', value: `${newBalance.toLocaleString()} coins`, inline: true }
        );

    if (result.won) {
        resultEmbed.addFields(
            { name: '🎊 Winnings', value: `+${result.winnings.toLocaleString()} coins (${result.multiplier}x)`, inline: true }
        );
    } else {
        resultEmbed.addFields(
            { name: '📉 Loss', value: `-${amount.toLocaleString()} coins`, inline: true }
        );
    }

    resultEmbed.setTimestamp();

    await slotMessage.edit({ embeds: [resultEmbed] });

    // Set cooldown after slot play
    const { setCooldownAfterSuccess } = require('../../utils/database');
    await setCooldownAfterSuccess(message.author.id, 'slot', 8);

    logger.info(`${freshUser.username} played slots ${amount} coins - ${result.won ? `WON ${result.winnings}` : 'LOST'} - New balance: ${newBalance}`);
}

function getRandomSymbol(symbols) {
    const totalWeight = symbols.reduce((sum, symbol) => sum + symbol.weight, 0);
    let random = Math.random() * totalWeight;

    for (const symbol of symbols) {
        random -= symbol.weight;
        if (random <= 0) {
            return symbol;
        }
    }

    return symbols[0]; // fallback
}

function calculateSlotResult(reels, betAmount) {
    const [first, second, third] = reels;

    // Three of a kind (winning combinations)
    if (first.name === second.name && second.name === third.name) {
        const multiplier = first.multiplier;
        const winnings = Math.floor(betAmount * (multiplier - 1)); // FIXED: Subtract bet amount from winnings
        return {
            won: true,
            winType: `Three ${first.name}s!`,
            multiplier,
            winnings,
            netChange: winnings // Net change is just the winnings since we already subtracted bet
        };
    }

    // Two of a kind
    const matches = [first, second, third].filter((symbol, index, arr) => 
        arr.findIndex(s => s.name === symbol.name) !== index
    );

    if (matches.length > 0) {
        const matchedSymbol = matches[0];
        const multiplier = Math.max(1, Math.floor(matchedSymbol.multiplier / 2)); // FIXED: Ensure minimum multiplier of 1
        const winnings = Math.floor(betAmount * (multiplier - 1)); // FIXED: Subtract bet amount
        return {
            won: winnings > 0,
            winType: `Two ${matchedSymbol.name}s!`,
            multiplier,
            winnings,
            netChange: winnings
        };
    }

    // No match
    return {
        won: false,
        winType: 'No match - Try again!',
        multiplier: 0,
        winnings: 0,
        netChange: -betAmount
    };
}
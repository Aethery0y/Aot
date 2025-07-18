const { EmbedBuilder } = require('discord.js');
const { getUserByDiscordId, updateUserCoins, updateUserGachaDraws } = require('../../utils/database');
const gachaManager = require('../../utils/gachaManager');
const logger = require('../../utils/logger');

module.exports = {
    name: 'buy',
    description: 'Buy items from the store',
    cooldown: 3, // 3 seconds cooldown

    async execute(message, args) {
        try {
            const user = await getUserByDiscordId(message.author.id);
            if (!user) {
                return message.reply('❌ You need to register first! Use `/register` command.');
            }

            const item = args[0]?.toLowerCase();
            const amount = parseInt(args[1]) || 1;

            if (!item) {
                return showBuyMenu(message, user);
            }

            switch (item) {
                case 'draw':
                case 'draws':
                case 'gacha':
                    await handleBuyDraws(message, user, amount);
                    break;
                default:
                    await showBuyMenu(message, user);
                    break;
            }

        } catch (error) {
            logger.error('Error in buy command:', error);
            message.reply('❌ An error occurred while processing your purchase. Please try again later.');
        }
    }
};

async function showBuyMenu(message, user) {
    const embed = new EmbedBuilder()
        .setColor('#ffd700')
        .setTitle('🛒 Store - Buy Items')
        .setDescription(`**${user.username}** • **${user.coins.toLocaleString()}** coins`)
        .addFields(
            {
                name: '🎰 Gacha Draws',
                value: '`ot buy draw <amount>` - Buy gacha draws\n**Price:** 1,000 coins per draw',
                inline: false
            },
            {
                name: '💡 Examples',
                value: '• `ot buy draw 1` - Buy 1 draw (1,000 coins)\n• `ot buy draw 5` - Buy 5 draws (5,000 coins)\n• `ot buy draw 10` - Buy 10 draws (10,000 coins)',
                inline: false
            },
            {
                name: '🎫 Current Draws',
                value: `You have **${user.gacha_draws}** gacha draws available`,
                inline: false
            }
        )
        .setFooter({ text: 'More items coming soon!' })
        .setTimestamp();

    await message.reply({ embeds: [embed] });
}

async function handleBuyDraws(message, user, amount) {
    try {
        // Use enhanced gacha manager for purchase
        const purchaseResult = await gachaManager.purchaseGachaDraws(user.id, message.author.id, amount);
        
        if (!purchaseResult.success) {
            const errorEmbed = gachaManager.createErrorEmbed(purchaseResult.error, purchaseResult.data);
            return message.reply({ embeds: [errorEmbed] });
        }

        // Create success embed
        const successEmbed = gachaManager.createPurchaseEmbed(user, purchaseResult.data);
        await message.reply({ embeds: [successEmbed] });

        logger.info(`${user.username} successfully bought ${purchaseResult.data.amount} gacha draws for ${purchaseResult.data.totalCost} coins using enhanced system`);

    } catch (error) {
        logger.error('Error in enhanced buy draws:', error);
        
        // Fallback to original system
        if (amount <= 0 || amount > 100) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Invalid Amount')
                .setDescription('Please enter a valid amount between 1 and 100 draws.')
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }

        const pricePerDraw = 1000;
        const totalCost = amount * pricePerDraw;

        if (user.coins < totalCost) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Insufficient Coins')
                .setDescription(`You need **${totalCost.toLocaleString()}** coins to buy ${amount} draw${amount > 1 ? 's' : ''}.\nYou currently have **${user.coins.toLocaleString()}** coins.`)
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }

        // Process purchase with original method
        await updateUserCoins(user.id, -totalCost);
        await updateUserGachaDraws(user.id, amount);
        
        const updatedUser = await getUserByDiscordId(message.author.id);
        
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Purchase Successful!')
            .setDescription(`**${user.username}** successfully purchased ${amount} gacha draw${amount > 1 ? 's' : ''}!`)
            .addFields(
                {
                    name: '💰 Transaction',
                    value: `**Cost:** ${totalCost.toLocaleString()} coins\n**Remaining Coins:** ${updatedUser.coins.toLocaleString()}`,
                    inline: true
                },
                {
                    name: '🎫 Gacha Draws',
                    value: `**New Total:** ${updatedUser.gacha_draws} draws\n**Added:** ${amount} draws`,
                    inline: true
                }
            )
            .setTimestamp();

        await message.reply({ embeds: [embed] });
        logger.info(`${user.username} bought ${amount} gacha draws (fallback method)`);
    }
}
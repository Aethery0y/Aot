const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { getUserByDiscordId, getAllPowers } = require('../../utils/database');
const { createPersistentPagination } = require('../../utils/persistentPagination');
const { getRankEmoji } = require('../../utils/powers');
const logger = require('../../utils/logger');

module.exports = {
    name: 'store',
    aliases: ['shop'],
    description: 'Browse and purchase powers from the store',

    async execute(message, args) {
        try {
            const user = await getUserByDiscordId(message.author.id);
            if (!user) {
                return message.reply('❌ You need to register first! Use `/register` command.');
            }

            // Show store with dropdown menu
            await showStoreMenu(message, user);

        } catch (error) {
            logger.error('Error in store command:', error);
            message.reply('❌ An error occurred while accessing the store. Please try again later.');
        }
    }
};

async function showStoreMenu(message, user) {
    try {
        const embed = new EmbedBuilder()
            .setColor('#ffd700')
            .setTitle('🏪 Power Store')
            .setDescription(`**${user.username}** • **${user.coins.toLocaleString()}** coins\n\nSelect what you'd like to browse:`)
            .addFields(
                {
                    name: '⚡ Power Ranks Available',
                    value: `${getRankEmoji('Normal')} Normal (50-150 CP)\n${getRankEmoji('Rare')} Rare (200-400 CP)\n${getRankEmoji('Epic')} Epic (800-1,200 CP)\n${getRankEmoji('Legendary')} Legendary (2,000-3,000 CP)\n${getRankEmoji('Mythic')} Mythic (5,000-6,000 CP)\n${getRankEmoji('Divine')} Divine (9,000-12,000 CP)\n${getRankEmoji('Cosmic')} Cosmic (18,000-25,000 CP)\n${getRankEmoji('Transcendent')} Transcendent (35,000-50,000 CP)\n${getRankEmoji('Omnipotent')} Omnipotent (75,000-100,000 CP)\n${getRankEmoji('Absolute')} Absolute (500,000-1,000,000 CP)`,
                    inline: true
                },
                {
                    name: '💰 Additional Options',
                    value: '🎫 **Gacha Draws** - Purchase more draws\n📊 **All Ranks** - Browse everything',
                    inline: true
                }
            )
            .setFooter({ text: 'Use the dropdown below to make your selection' })
            .setTimestamp();

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`store_select_${user.id}`)
            .setPlaceholder('Choose what to browse...')
            .addOptions([
                {
                    label: 'Normal Powers',
                    description: 'Browse Normal rank powers (50-150 CP)',
                    value: 'Normal',
                    emoji: '⚪'
                },
                {
                    label: 'Rare Powers',
                    description: 'Browse Rare rank powers (200-400 CP)',
                    value: 'Rare',
                    emoji: '🟢'
                },
                {
                    label: 'Epic Powers',
                    description: 'Browse Epic rank powers (800-1,200 CP)',
                    value: 'Epic',
                    emoji: '🟣'
                },
                {
                    label: 'Legendary Powers',
                    description: 'Browse Legendary rank powers (2,000-3,000 CP)',
                    value: 'Legendary',
                    emoji: '🟠'
                },
                {
                    label: 'Mythic Powers',
                    description: 'Browse Mythic rank powers (4,500-6,000 CP)',
                    value: 'Mythic',
                    emoji: '🔴'
                },
                {
                    label: 'Divine Powers',
                    description: 'Browse Divine rank powers (8,000-12,000 CP)',
                    value: 'Divine',
                    emoji: '✨'
                },
                {
                    label: 'Cosmic Powers',
                    description: 'Browse Cosmic rank powers (18,000-25,000 CP)',
                    value: 'Cosmic',
                    emoji: '🌌'
                },
                {
                    label: 'Transcendent Powers',
                    description: 'Browse Transcendent rank powers (35,000-50,000 CP)',
                    value: 'Transcendent',
                    emoji: '🌟'
                },
                {
                    label: 'Omnipotent Powers',
                    description: 'Browse Omnipotent rank powers (75,000-100,000 CP)',
                    value: 'Omnipotent',
                    emoji: '💎'
                },
                {
                    label: 'Absolute Powers',
                    description: 'Browse Absolute rank powers (500,000-1,000,000 CP)',
                    value: 'Absolute',
                    emoji: '👑'
                },
                {
                    label: 'Gacha Draws',
                    description: 'Purchase gacha draws (1,000 coins each)',
                    value: 'gacha_draws',
                    emoji: '🎫'
                },
                {
                    label: 'All Powers',
                    description: 'Browse all available powers',
                    value: 'all',
                    emoji: '📊'
                }
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await message.reply({
            embeds: [embed],
            components: [row]
        });

        logger.info(`${user.username} opened the store menu`);

    } catch (error) {
        logger.error('Error showing store menu:', error);
        throw error;
    }
}

async function purchasePowerFromStore(message, user, powerName) {
    try {
        const allPowers = await getAllPowers();
        const power = allPowers.find(p => p.name.toLowerCase() === powerName.toLowerCase());

        if (!power) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Power Not Found')
                .setDescription(`Power "**${powerName}**" is not available in the store.`)
                .addFields({
                    name: '💡 Tip',
                    value: 'Use `ot store` to see all available powers.',
                    inline: false
                })
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }

        const price = calculatePowerPrice(power);
        
        // Level requirements removed

        // Check if user has enough coins
        if (user.coins < price) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Insufficient Funds')
                .setDescription(`You don't have enough coins to purchase **${power.name}**.`)
                .addFields(
                    { name: '💰 Price', value: `${price.toLocaleString()} coins`, inline: true },
                    { name: '💵 Your Balance', value: `${user.coins.toLocaleString()} coins`, inline: true },
                    { name: '💸 Shortage', value: `${(price - user.coins).toLocaleString()} coins`, inline: true }
                )
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }

        // Purchase the power
        const powerCP = power.combat_power;
        await purchasePower(user.id, power.id, powerCP, price);

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('🛒 Purchase Successful!')
            .setDescription(`**${user.username}** purchased a new power!`)
            .addFields(
                { name: '⚡ Power', value: power.name, inline: true },
                { name: '🏆 Rank', value: power.rank, inline: true },
                { name: '💪 Combat Power', value: powerCP.toString(), inline: true },
                { name: '💰 Price Paid', value: `${price.toLocaleString()} coins`, inline: true },
                { name: '💵 Remaining Coins', value: `${(user.coins - price).toLocaleString()} coins`, inline: true },
                { name: '📖 Description', value: power.description, inline: false }
            )
            .setFooter({ text: `Use "/otequip" to equip this power` })
            .setTimestamp();

        message.reply({ embeds: [embed] });

        logger.info(`${user.username} purchased ${power.name} for ${price} coins (${powerCP} CP)`);

    } catch (error) {
        logger.error('Error purchasing power:', error);
        throw error;
    }
}

function createStoreEmbed(user, powers, page, totalPages) {
    const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🏪 Attack on Titan Power Store')
        .setDescription(`**Welcome, ${user.username}!**\nPage ${page}/${totalPages}`)
        .addFields(
            { name: '💰 Your Coins', value: `${user.coins.toLocaleString()} coins`, inline: true },

            { name: '🛒 How to Buy', value: '`ot store <power_name>`', inline: true }
        );

    powers.forEach(power => {
        const canAfford = user.coins >= power.calculatedPrice;
        
        const status = !canAfford ? '💸 Too Expensive' : '✅ Available';
        const rankEmoji = getRankEmoji(power.rank);

        embed.addFields({
            name: `${rankEmoji} ${power.name} - ${power.rank}`,
            value: `**Price:** ${power.calculatedPrice.toLocaleString()} coins\n` +
                   `**Status:** ${status}\n` +
                   `*${power.description.substring(0, 80)}${power.description.length > 80 ? '...' : ''}*`,
            inline: false
        });
    });

    if (powers.length === 0) {
        embed.addFields({
            name: '📭 No Powers',
            value: 'No powers on this page.',
            inline: false
        });
    }

    embed.setFooter({ text: 'Powers available for purchase' })
        .setTimestamp();

    return embed;
}

function calculatePowerPrice(power) {
    const basePrices = {
        'Normal': 100000,      // 100k coins
        'Rare': 500000,       // 500k coins  
        'Epic': 2000000,      // 2M coins
        'Legendary': 8000000, // 8M coins
        'Mythic': 25000000,   // 25M coins
        'Divine': 75000000,   // 75M coins
        'Cosmic': 200000000,  // 200M coins
        'Transcendent': 500000000,  // 500M coins
        'Omnipotent': 1500000000,   // 1.5B coins
        'Absolute': 5000000000      // 5B coins
    };
    
    const basePrice = basePrices[power.rank] || 100000;
    
    return basePrice; // Level scaling removed
}

// Level requirement function removed

// Database CP values only - no level calculations needed



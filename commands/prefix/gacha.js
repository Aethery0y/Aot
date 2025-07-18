const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getUserByDiscordId, performGachaDraw, getGachaHistory } = require('../../utils/database');
const { getRankColor, getRankEmoji } = require('../../utils/powers');
const gachaManager = require('../../utils/gachaManager');
const logger = require('../../utils/logger');

module.exports = {
    name: 'gacha',
    aliases: ['g'],
    description: 'Draw powers from the gacha system',
    cooldown: 8, // 8 seconds cooldown

    async execute(message, args) {
        try {
            const user = await getUserByDiscordId(message.author.id);
            if (!user) {
                return message.reply('❌ You need to register first! Use `/register` command.');
            }

            const subcommand = args[0]?.toLowerCase();

            switch (subcommand) {
                case 'draw':
                case 'pull':
                    await handleGachaDraw(message, user, args);
                    await setCooldownForGacha(message);
                    break;
                case 'history':
                case 'h':
                    await handleGachaHistory(message, user);
                    break;
                default:
                    await showGachaMenu(message, user);
                    break;
            }

        } catch (error) {
            logger.error('Error in gacha command:', error);
            message.reply('❌ An error occurred while accessing the gacha system. Please try again later.');
        }
    }
};

// Set cooldown after successful gacha execution
async function setCooldownForGacha(message) {
    const { setCooldownAfterSuccess } = require('../../utils/database');
    await setCooldownAfterSuccess(message.author.id, 'gacha', 8);
}

async function showGachaMenu(message, user) {
    // Get fresh user data to ensure we have the latest gacha_draws count
    const freshUser = await getUserByDiscordId(message.author.id);
    if (!freshUser) {
        return message.reply('❌ You need to register first! Use `/register` command.');
    }

    try {
        // Force initialize gacha manager
        await gachaManager.initialize();
        
        // Use enhanced gacha manager
        const menuData = await gachaManager.createGachaMenu(freshUser);
        await message.reply({ embeds: [menuData.embed], components: menuData.components });
        return; // Exit early if successful
    } catch (error) {
        logger.error('Error showing enhanced gacha menu:', error);
        
        // Fallback to enhanced menu manually
        const pityCounter = freshUser.pity_counter || 0;
        const pityProgress = `${pityCounter}/100`;
        const pityBarLength = 20;
        const filledBars = Math.floor((pityCounter / 100) * pityBarLength);
        const emptyBars = pityBarLength - filledBars;
        const pityBar = '█'.repeat(filledBars) + '░'.repeat(emptyBars);
        
        const embed = new EmbedBuilder()
            .setColor('#9932cc')
            .setTitle('🎰 Enhanced Gacha System')
            .setDescription(`**${freshUser.username}** • Level ${freshUser.level || 1}`)
            .addFields(
                {
                    name: '🎫 Available Draws',
                    value: `**${freshUser.gacha_draws || 0}** free draws`,
                    inline: true
                },
                {
                    name: '💰 Coins',
                    value: `**${(freshUser.coins || 0).toLocaleString()}** coins`,
                    inline: true
                },
                {
                    name: '💎 Price',
                    value: `**1,000** coins/draw`,
                    inline: true
                },
                {
                    name: '🎯 Pity System',
                    value: `**${pityProgress}** pulls to guaranteed 🔴 Mythic\n\`${pityBar}\` ${pityCounter >= 100 ? '🔥 READY!' : `${100 - pityCounter} more`}`,
                    inline: false
                },
                {
                    name: '🎯 Gacha Commands',
                    value: '• `ot gacha draw` - Use one free draw\n• `ot gacha history` - View recent pulls\n• `ot buy draw <amount>` - Purchase more draws',
                    inline: false
                },
                {
                    name: '🏆 Drop Rates',
                    value: '⚪ Normal: 70%\n🔵 Rare: 20%\n🟣 Epic: 7%\n🟠 Legendary: 2.5%\n🔴 Mythic: 0.5%',
                    inline: false
                }
            )
            .setFooter({ text: 'Enhanced Gacha System v2.0 • Use buttons for quick actions' })
            .setTimestamp();

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('gacha_draw')
                    .setLabel('🎰 Draw 1x')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(freshUser.gacha_draws <= 0),
                new ButtonBuilder()
                    .setCustomId('gacha_draw_10x')
                    .setLabel('🎰 Draw 10x')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(freshUser.gacha_draws < 10),
                new ButtonBuilder()
                    .setCustomId('gacha_history')
                    .setLabel('📊 View History')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📊'),
                new ButtonBuilder()
                    .setCustomId('gacha_buy')
                    .setLabel('💰 Buy Draws')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('💰')
            );

        await message.reply({ embeds: [embed], components: [buttons] });
    }
}

async function handleGachaDraw(message, user, args) {
    // Get fresh user data to ensure we have the latest gacha_draws count
    const freshUser = await getUserByDiscordId(message.author.id);
    if (!freshUser) {
        return message.reply('❌ You need to register first! Use `/register` command.');
    }

    if (freshUser.gacha_draws <= 0) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ No Draws Available')
            .setDescription('You have no gacha draws remaining!')
            .addFields(
                {
                    name: '💰 Buy More Draws',
                    value: 'Use `ot buy draw <amount>` to purchase more draws\n**Price:** 1,000 coins per draw',
                    inline: false
                },
                {
                    name: '🎁 Free Draws',
                    value: 'New players get 10 free draws upon registration',
                    inline: false
                }
            )
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }

    // Perform gacha draw
    const drawResult = await performGachaDraw(user.id, 'free');

    const embed = new EmbedBuilder()
        .setColor(getRankColor(drawResult.power.rank))
        .setTitle('🎰 Gacha Draw Result!')
        .setDescription(`**${user.username}** pulled a new power!`)
        .addFields(
            {
                name: '⚡ Power Name',
                value: `${getRankEmoji(drawResult.power.rank)} ${drawResult.power.name}`,
                inline: false
            },
            {
                name: '🏆 Rank',
                value: drawResult.power.rank,
                inline: true
            },
            {
                name: '💪 Combat Power',
                value: `${drawResult.powerCP.toLocaleString()} CP`,
                inline: true
            },
            {
                name: '🎫 Remaining Draws',
                value: `${drawResult.remainingDraws}`,
                inline: true
            },
            {
                name: '📖 Description',
                value: drawResult.power.description,
                inline: false
            }
        )
        .setFooter({ text: 'Use "/otequip" to equip this power • Use "ot gacha history" to see all draws' })
        .setTimestamp();

    // Add special effects for high-rank draws
    if (drawResult.power.rank === 'Mythic') {
        embed.setAuthor({ name: '✨ MYTHIC PULL! ✨' });
    } else if (drawResult.power.rank === 'Legendary') {
        embed.setAuthor({ name: '🌟 LEGENDARY PULL! 🌟' });
    }

    await message.reply({ embeds: [embed] });

    logger.info(`${user.username} drew ${drawResult.power.name} (${drawResult.power.rank}) with ${drawResult.powerCP} CP from gacha`);
}

async function handleGachaHistory(message, user) {
    const history = await getGachaHistory(user.id, 10);

    if (history.length === 0) {
        const embed = new EmbedBuilder()
            .setColor('#ffaa00')
            .setTitle('📜 Gacha History')
            .setDescription('You haven\'t made any gacha draws yet!')
            .addFields(
                {
                    name: '🎰 Get Started',
                    value: 'Use `ot gacha draw` to make your first pull!\nYou can also buy powers directly from `ot store`.',
                    inline: false
                }
            )
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }

    const embed = new EmbedBuilder()
        .setColor('#9932cc')
        .setTitle('📜 Gacha History')
        .setDescription(`**${user.username}**'s recent gacha pulls (Last 10)`)
        .setTimestamp();

    let historyText = '';
    for (const draw of history) {
        const drawDate = new Date(draw.drawn_at).toLocaleDateString();
        const drawType = draw.draw_type === 'free' ? '🎫' : '💰';
        historyText += `${drawType} **${draw.power_name}** (${draw.power_rank}) - ${draw.combat_power.toLocaleString()} CP - ${drawDate}\n`;
    }

    embed.addFields(
        {
            name: '🎯 Recent Pulls',
            value: historyText || 'No recent pulls',
            inline: false
        },
        {
            name: '📊 Statistics',
            value: `Total Pulls: ${history.length}\nLast Pull: ${new Date(history[0].drawn_at).toLocaleDateString()}`,
            inline: false
        }
    );

    await message.reply({ embeds: [embed] });
}
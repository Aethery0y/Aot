const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getUserByDiscordId, getUserPowers } = require('../../utils/database');
const { createPersistentPagination } = require('../../utils/persistentPagination');
const { determineRankByCP, getRankEmojiSync } = require('../../utils/databaseHelpers');
const logger = require('../../utils/logger');

module.exports = {
    name: 'inv',
    aliases: ['inventory'],
    description: 'View your power inventory',
    createInventoryEmbed, // Export the function for persistent pagination

    async execute(message, args) {
        try {
            const user = await getUserByDiscordId(message.author.id);
            if (!user) {
                return message.reply('❌ You need to register first! Use `/register` command.');
            }

            const userPowers = await getUserPowers(user.id);

            if (userPowers.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor('#ffaa00')
                    .setTitle('📦 Your Power Inventory')
                    .setDescription('Your inventory is empty! Use `ot draw` to get your first power.')
                    .setTimestamp();

                return message.reply({ embeds: [embed] });
            }

            // Use existing ranks from database instead of recalculating
            // This avoids performance issues with large inventories

            // Sort powers by rank and then by combat power
            const rankOrder = { 'Mythic': 5, 'Legendary': 4, 'Epic': 3, 'Rare': 2, 'Normal': 1 };
            userPowers.sort((a, b) => {
                if (rankOrder[a.rank] !== rankOrder[b.rank]) {
                    return rankOrder[b.rank] - rankOrder[a.rank];
                }
                return b.combat_power - a.combat_power;
            });

            const powersPerPage = 5;
            const totalPages = Math.ceil(userPowers.length / powersPerPage);

            // Create persistent pagination
            const pagination = createPersistentPagination(
                userPowers,
                powersPerPage,
                (powers, page, totalPages) => createInventoryEmbed(user, powers, page, totalPages),
                message.author.id,
                'inventory'
            );

            await message.reply({
                embeds: [pagination.embed],
                components: pagination.components
            });

            logger.info(`${user.username} viewed inventory (${userPowers.length} powers)`);

        } catch (error) {
            logger.error('Error in inventory command:', error);
            message.reply('❌ An error occurred while fetching your inventory. Please try again later.');
        }
    }
};

function createInventoryEmbed(user, powers, page, totalPages) {
    const embed = new EmbedBuilder()
        .setColor('#00aaff')
        .setTitle(`📦 ${user.username}'s Inventory`)
        .setDescription(`${user.username}'s collected powers`)
        .addFields(
            { name: '📊 Summary', value: `Total Powers: **${powers.length}**\nPage: **${page}/${totalPages}**`, inline: true }
        );

    if (powers.length === 0) {
        embed.addFields({
            name: '📭 Empty Page',
            value: 'No powers on this page.',
            inline: false
        });
        return embed;
    }

    powers.forEach((power, index) => {
        const equipped = power.user_power_id === user.equipped_power_id ? ' ⚡ **[EQUIPPED]**' : '';
        const rank = power.rank || 'Normal';
        const rankEmoji = getRankEmojiSync(rank);
        
        embed.addFields({
            name: `${rankEmoji} ${power.name}${equipped}`,
            value: `**Rank:** ${rank}\n**CP:** ${power.combat_power}\n**Description:** ${power.description}`,
            inline: false
        });
    });

    embed.setFooter({ text: 'Use "/otequip" to equip a power' })
        .setTimestamp();

    return embed;
}

function getRankEmoji(rank) {
    const emojis = {
        'Normal': '⚪',
        'Rare': '🟢',
        'Epic': '🟣',
        'Legendary': '🟠',
        'Mythic': '🔴'
    };
    return emojis[rank] || '⚪';
}

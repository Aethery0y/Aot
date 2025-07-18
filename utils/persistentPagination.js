const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const logger = require('./logger');
const { getRankEmoji, getPowerCP } = require('./powers');
const { determineRankByCP, getRankEmojiSync } = require('./databaseHelpers');

/**
 * Persistent pagination system that doesn't rely on timeouts
 * Uses custom IDs that encode pagination state directly
 */

/**
 * Create persistent pagination system
 */
function createPersistentPagination(items, itemsPerPage, embedCreator, userId, commandType) {
    const totalPages = Math.ceil(items.length / itemsPerPage);
    const currentPage = 1;
    
    // Create initial embed
    const initialItems = items.slice(0, itemsPerPage);
    const initialEmbed = embedCreator(initialItems, currentPage, totalPages);
    
    // Create buttons with encoded state
    const buttons = createPaginationButtons(currentPage, totalPages, userId, commandType, items.length);
    
    return {
        embed: initialEmbed,
        components: totalPages > 1 ? [buttons] : [],
        totalPages,
        currentPage
    };
}

/**
 * Create pagination buttons with encoded state
 */
function createPaginationButtons(currentPage, totalPages, userId, commandType, totalItems) {
    const row = new ActionRowBuilder();
    
    // Encode state into button IDs - handle store ranks properly
    const baseId = commandType.startsWith('store_') ? 
        `page_${commandType}_${userId}_${totalItems}` : 
        `page_${commandType}_${userId}_${totalItems}`;
    
    // First page button
    row.addComponents(
        new ButtonBuilder()
            .setCustomId(`${baseId}_first_${currentPage}`)
            .setLabel('⏮️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === 1)
    );
    
    // Previous page button
    row.addComponents(
        new ButtonBuilder()
            .setCustomId(`${baseId}_prev_${currentPage}`)
            .setLabel('◀️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === 1)
    );
    
    // Page indicator
    row.addComponents(
        new ButtonBuilder()
            .setCustomId(`${baseId}_info_${currentPage}`)
            .setLabel(`${currentPage}/${totalPages}`)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true)
    );
    
    // Next page button
    row.addComponents(
        new ButtonBuilder()
            .setCustomId(`${baseId}_next_${currentPage}`)
            .setLabel('▶️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === totalPages)
    );
    
    // Last page button
    row.addComponents(
        new ButtonBuilder()
            .setCustomId(`${baseId}_last_${currentPage}`)
            .setLabel('⏭️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === totalPages)
    );
    
    return row;
}

/**
 * Handle persistent pagination interaction
 */
async function handlePersistentPaginationInteraction(interaction) {
    if (!interaction.customId.startsWith('page_')) return false;
    
    try {
        // Parse the custom ID to extract state
        const parts = interaction.customId.split('_');
        
        // Handle different custom ID formats
        let commandType, userId, totalItems, action, currentPage;
        
        if (parts.length === 6) {
            // Format: page_commandType_userId_totalItems_action_currentPage
            commandType = parts[1];
            userId = parts[2];
            totalItems = parseInt(parts[3]);
            action = parts[4];
            currentPage = parseInt(parts[5]);
        } else if (parts.length === 7) {
            // Format: page_store_rank_userId_totalItems_action_currentPage
            commandType = `${parts[1]}_${parts[2]}`; // store_rank
            userId = parts[3];
            totalItems = parseInt(parts[4]);
            action = parts[5];
            currentPage = parseInt(parts[6]);
        } else {
            logger.error(`Invalid custom ID format: ${interaction.customId}`);
            await interaction.reply({
                content: '❌ Invalid pagination button format.',
                flags: 64
            });
            return true;
        }
        
        // Check if user is authorized
        if (interaction.user.id !== userId) {
            await interaction.reply({
                content: '❌ You cannot control this pagination.',
                flags: 64
            });
            return true;
        }
        
        // Calculate new page
        const itemsPerPage = getItemsPerPage(commandType);
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        let newPage = currentPage;
        
        switch (action) {
            case 'first':
                newPage = 1;
                break;
            case 'prev':
                newPage = Math.max(1, currentPage - 1);
                break;
            case 'next':
                newPage = Math.min(totalPages, currentPage + 1);
                break;
            case 'last':
                newPage = totalPages;
                break;
            case 'info':
                await interaction.deferUpdate();
                return true;
        }
        
        if (newPage === currentPage) {
            await interaction.deferUpdate();
            return true;
        }
        
        // Fetch fresh data for the new page
        const { items, embedCreator } = await getFreshPaginationData(commandType, interaction.user.id);
        
        if (!items || items.length === 0) {
            await interaction.reply({
                content: '❌ No data available for pagination.',
                flags: 64
            });
            return true;
        }
        
        // Get items for new page
        const startIndex = (newPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageItems = items.slice(startIndex, endIndex);
        
        // Create new embed (handle async embeds)
        const newEmbed = await embedCreator(pageItems, newPage, totalPages);
        
        // Create new buttons with consistent command type
        const newButtons = createPaginationButtons(newPage, totalPages, userId, commandType, items.length);
        
        // Update message
        await interaction.update({
            embeds: [newEmbed],
            components: [newButtons]
        });
        
        return true;
        
    } catch (error) {
        logger.error('Error handling persistent pagination:', error);
        await interaction.reply({
            content: '❌ An error occurred while updating the page.',
            flags: 64
        });
        return true;
    }
}

/**
 * Get items per page for different command types
 */
function getItemsPerPage(commandType) {
    const itemsPerPage = {
        'arena': 10,
        'inventory': 5,
        'store': 6,
        'default': 10
    };
    
    // Handle store_<rank> commands
    if (commandType.startsWith('store_')) {
        return 10; // Show 10 powers per page for store ranks
    }
    
    return itemsPerPage[commandType] || itemsPerPage.default;
}

/**
 * Get fresh pagination data based on command type
 */
async function getFreshPaginationData(commandType, discordUserId) {
    const { getUserByDiscordId, getArenaRankings, getUserPowers, getAllPowers } = require('./database');
    
    try {
        switch (commandType) {
            case 'arena':
                const rankings = await getArenaRankings(200);
                return {
                    items: rankings,
                    embedCreator: createArenaEmbed
                };
                
            case 'inventory':
                const user = await getUserByDiscordId(discordUserId);
                if (!user) return { items: [], embedCreator: null };
                
                const userPowers = await getUserPowers(user.id);
                // Sort powers by rank and then by combat power
                const rankOrder = { 'Mythic': 5, 'Legendary': 4, 'Epic': 3, 'Rare': 2, 'Normal': 1 };
                userPowers.sort((a, b) => {
                    if (rankOrder[a.rank] !== rankOrder[b.rank]) {
                        return rankOrder[b.rank] - rankOrder[a.rank];
                    }
                    return b.combat_power - a.combat_power;
                });
                
                return {
                    items: userPowers,
                    embedCreator: async (powers, page, totalPages) => {
                        const { createInventoryEmbed } = require('../commands/prefix/inventory');
                        return await createInventoryEmbed(user, powers, page, totalPages);
                    }
                };
                
            case 'store':
                const storeUser = await getUserByDiscordId(discordUserId);
                if (!storeUser) return { items: [], embedCreator: null };
                
                const powers = await getAllPowers();
                return {
                    items: powers,
                    embedCreator: (powers, page, totalPages) => createStoreEmbed(storeUser, powers, page, totalPages)
                };
                
            default:
                // Handle store_<rank> commands
                if (commandType.startsWith('store_')) {
                    const rank = commandType.replace('store_', '');
                    const rankUser = await getUserByDiscordId(discordUserId);
                    if (!rankUser) return { items: [], embedCreator: null };
                    
                    const allPowers = await getAllPowers();
                    const filteredPowers = allPowers.filter(power => 
                        power.rank.toLowerCase() === rank.toLowerCase()
                    );
                    
                    const { createStoreRankEmbed } = require('./storeEmbeds');
                    return {
                        items: filteredPowers,
                        embedCreator: (powers, page, totalPages) => createStoreRankEmbed(rankUser, powers, rank, page, totalPages)
                    };
                }
                
                return { items: [], embedCreator: null };
        }
    } catch (error) {
        logger.error(`Error getting fresh pagination data for ${commandType}:`, error);
        return { items: [], embedCreator: null };
    }
}

/**
 * Arena embed creator
 */
function createArenaEmbed(rankings, page, totalPages) {
    const embed = new EmbedBuilder()
        .setColor('#ff6b6b')
        .setTitle('🏟️ Arena Rankings')
        .setDescription('*Top players in the Attack on Titan arena*');

    if (rankings.length === 0) {
        embed.setDescription('No arena rankings available yet. Battle other players to get ranked!');
        return embed;
    }

    const rankingText = rankings.map(player => {
        const medal = getMedalEmoji(player.rank_position);
        return `${medal} **#${player.rank_position}** ${player.username} - Level ${player.level} (${player.total_combat_power} CP)`;
    }).join('\n');

    embed.setDescription(rankingText);
    embed.setFooter({ 
        text: `Page ${page}/${totalPages} • ${rankings.length} players shown • Arena updates in real-time`
    });
    embed.setTimestamp();

    return embed;
}

/**
 * Inventory embed creator
 */
async function createInventoryEmbed(user, powers, page, totalPages) {
    const embed = new EmbedBuilder()
        .setColor('#00aaff')
        .setTitle('📦 Your Power Inventory')
        .setDescription(`**${user.username}**'s collected powers`)
        .addFields(
            { name: '📊 Summary', value: `Total Powers: **${user.total_powers || powers.length}**\nPage: **${page}/${totalPages}**`, inline: true }
        );

    // Calculate correct ranks for all powers
    for (const power of powers) {
        const correctRank = await determineRankByCP(power.combat_power);
        const equipped = power.user_power_id === user.equipped_power_id ? ' ⚡ **[EQUIPPED]**' : '';
        const rankEmoji = getRankEmojiSync(correctRank);
        
        embed.addFields({
            name: `${rankEmoji} ${power.name}${equipped}`,
            value: `**Rank:** ${correctRank}\n**CP:** ${power.combat_power}\n**Description:** ${power.description}`,
            inline: false
        });
    }

    if (powers.length === 0) {
        embed.addFields({
            name: '📭 Empty Page',
            value: 'No powers on this page.',
            inline: false
        });
    }

    embed.setFooter({ text: 'Use "/otequip" to equip a power' })
        .setTimestamp();

    return embed;
}

/**
 * Store embed creator
 */
function createStoreEmbed(user, powers, page, totalPages) {
    const embed = new EmbedBuilder()
        .setColor('#ffd700')
        .setTitle('🏪 Power Store')
        .setDescription(`**${user.username}** • Level ${user.level} • **${user.coins.toLocaleString()}** coins`);

    if (powers.length === 0) {
        embed.setDescription('Store is currently empty.');
        return embed;
    }

    const storeText = powers.map(power => {
        const emoji = getRankEmojiSync(power.rank);
        const price = calculatePowerPrice(power, user.level);
        const cp = getPowerCP(power);
        const affordable = user.coins >= price ? '✅' : '❌';
        return `${emoji} ${affordable} **${power.name}** - ${price.toLocaleString()} coins (${cp} CP)`;
    }).join('\n');

    embed.addFields({
        name: '🛍️ Available Powers',
        value: storeText,
        inline: false
    });

    embed.setFooter({ 
        text: `Page ${page}/${totalPages} • ${powers.length} powers shown • ✅ = Affordable`
    });
    embed.setTimestamp();

    return embed;
}

/**
 * Helper functions
 */
function getMedalEmoji(rank) {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    if (rank <= 10) return '🏆';
    return '🎖️';
}

function calculatePowerPrice(power, userLevel) {
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
    const levelMultiplier = Math.max(1, userLevel / 10);
    return Math.floor(basePrice * levelMultiplier);
}



module.exports = {
    createPersistentPagination,
    handlePersistentPaginationInteraction,
    getFreshPaginationData
};
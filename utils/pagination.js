const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const config = require('../config/bot');

/**
 * Active pagination sessions
 */
const activePaginations = new Map();

/**
 * Create pagination system
 */
function createPagination(items, itemsPerPage, embedCreator, userId) {
    const totalPages = Math.ceil(items.length / itemsPerPage);
    let currentPage = 1;
    
    const paginationId = `${userId}_${Date.now()}`;
    
    // Create initial embed
    const initialItems = items.slice(0, itemsPerPage);
    const initialEmbed = embedCreator(initialItems, currentPage);
    
    // Create buttons
    const buttons = createPaginationButtons(currentPage, totalPages, paginationId);
    
    const pagination = {
        items,
        itemsPerPage,
        totalPages,
        currentPage,
        embedCreator,
        userId,
        paginationId,
        
        // Create initial message
        initialMessage: {
            embeds: [initialEmbed],
            components: totalPages > 1 ? [buttons] : []
        },
        
        // Start collector
        startCollector: function(message) {
            if (totalPages <= 1) return;
            
            // Store pagination data
            activePaginations.set(paginationId, {
                ...pagination,
                message
            });
            
            // Auto-cleanup after timeout (extended to 10 minutes)
            setTimeout(() => {
                activePaginations.delete(paginationId);
            }, config.paginationTimeout || 600000); // 10 minutes instead of 5
        }
    };
    
    return pagination;
}

/**
 * Create pagination buttons
 */
function createPaginationButtons(currentPage, totalPages, paginationId) {
    const row = new ActionRowBuilder();
    
    // First page button
    row.addComponents(
        new ButtonBuilder()
            .setCustomId(`pagination_first_${paginationId}`)
            .setLabel('⏮️ First')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === 1)
    );
    
    // Previous page button
    row.addComponents(
        new ButtonBuilder()
            .setCustomId(`pagination_prev_${paginationId}`)
            .setLabel('◀️ Previous')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === 1)
    );
    
    // Page indicator
    row.addComponents(
        new ButtonBuilder()
            .setCustomId(`pagination_info_${paginationId}`)
            .setLabel(`Page ${currentPage}/${totalPages}`)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true)
    );
    
    // Next page button
    row.addComponents(
        new ButtonBuilder()
            .setCustomId(`pagination_next_${paginationId}`)
            .setLabel('Next ▶️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === totalPages)
    );
    
    // Last page button
    row.addComponents(
        new ButtonBuilder()
            .setCustomId(`pagination_last_${paginationId}`)
            .setLabel('Last ⏭️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === totalPages)
    );
    
    return row;
}

/**
 * Handle pagination interaction
 */
async function handlePaginationInteraction(interaction) {
    if (!interaction.customId.startsWith('pagination_')) return false;
    
    const [, action, paginationId] = interaction.customId.split('_');
    const pagination = activePaginations.get(paginationId);
    
    if (!pagination) {
        await interaction.reply({
            content: '⏰ This pagination has expired. Please run the command again.',
            flags: 64
        });
        return true;
    }
    
    // Check if user is authorized
    if (interaction.user.id !== pagination.userId) {
        await interaction.reply({
            content: '❌ You cannot control this pagination.',
            flags: 64
        });
        return true;
    }
    
    let newPage = pagination.currentPage;
    
    switch (action) {
        case 'first':
            newPage = 1;
            break;
        case 'prev':
            newPage = Math.max(1, pagination.currentPage - 1);
            break;
        case 'next':
            newPage = Math.min(pagination.totalPages, pagination.currentPage + 1);
            break;
        case 'last':
            newPage = pagination.totalPages;
            break;
        case 'info':
            // Do nothing for info button
            await interaction.deferUpdate();
            return true;
    }
    
    if (newPage === pagination.currentPage) {
        await interaction.deferUpdate();
        return true;
    }
    
    // Update pagination
    pagination.currentPage = newPage;
    
    // Get items for new page
    const startIndex = (newPage - 1) * pagination.itemsPerPage;
    const endIndex = startIndex + pagination.itemsPerPage;
    const pageItems = pagination.items.slice(startIndex, endIndex);
    
    // Create new embed
    const newEmbed = pagination.embedCreator(pageItems, newPage);
    
    // Create new buttons
    const newButtons = createPaginationButtons(newPage, pagination.totalPages, paginationId);
    
    // Update message
    await interaction.update({
        embeds: [newEmbed],
        components: [newButtons]
    });
    
    return true;
}

/**
 * Create advanced pagination with jump-to-page
 */
function createAdvancedPagination(items, itemsPerPage, embedCreator, userId, options = {}) {
    const totalPages = Math.ceil(items.length / itemsPerPage);
    const maxJumpPages = options.maxJumpPages || 20; // Limit jump options
    
    if (totalPages <= 5) {
        // Use simple pagination for small lists
        return createPagination(items, itemsPerPage, embedCreator, userId);
    }
    
    const pagination = createPagination(items, itemsPerPage, embedCreator, userId);
    
    // Add jump functionality
    pagination.jumpToPage = async function(interaction, targetPage) {
        if (targetPage < 1 || targetPage > totalPages) {
            await interaction.reply({
                content: `❌ Invalid page number. Please choose between 1 and ${totalPages}.`,
                flags: 64
            });
            return;
        }
        
        this.currentPage = targetPage;
        
        // Get items for target page
        const startIndex = (targetPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageItems = items.slice(startIndex, endIndex);
        
        // Create new embed
        const newEmbed = embedCreator(pageItems, targetPage);
        
        // Create new buttons
        const newButtons = createPaginationButtons(targetPage, totalPages, this.paginationId);
        
        // Update message
        await interaction.update({
            embeds: [newEmbed],
            components: [newButtons]
        });
    };
    
    return pagination;
}

/**
 * Cleanup expired paginations
 */
function cleanupPaginations() {
    const now = Date.now();
    for (const [id, pagination] of activePaginations.entries()) {
        const age = now - parseInt(id.split('_')[1]);
        if (age > config.paginationTimeout) {
            activePaginations.delete(id);
        }
    }
}

// Cleanup expired paginations every 5 minutes
setInterval(cleanupPaginations, 5 * 60 * 1000);

/**
 * Create embed with page info
 */
function addPageInfo(embed, currentPage, totalPages, totalItems) {
    const startItem = (currentPage - 1) * config.ranksPerPage + 1;
    const endItem = Math.min(currentPage * config.ranksPerPage, totalItems);
    
    embed.setFooter({
        text: `Page ${currentPage}/${totalPages} • Showing ${startItem}-${endItem} of ${totalItems} • Navigation expires in 10 minutes`
    });
    
    return embed;
}

/**
 * Get pagination statistics
 */
function getPaginationStats() {
    return {
        activeSessions: activePaginations.size,
        sessionsData: Array.from(activePaginations.entries()).map(([id, data]) => ({
            id,
            userId: data.userId,
            currentPage: data.currentPage,
            totalPages: data.totalPages,
            age: Date.now() - parseInt(id.split('_')[1])
        }))
    };
}

module.exports = {
    createPagination,
    createAdvancedPagination,
    handlePaginationInteraction,
    addPageInfo,
    getPaginationStats
};

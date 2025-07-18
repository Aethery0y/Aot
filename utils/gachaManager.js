const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getUserByDiscordId, performGachaDraw, getGachaHistory, updateUserGachaDraws } = require('./database');
const { getRankColor, getRankEmoji, getRankColorSync, getRankEmojiSync, getGachaRates, getGachaDrawPrice, getEmbedColor } = require('./databaseHelpers');
const logger = require('./logger');
const atomicOperations = require('./atomicOperations');

/**
 * Enhanced Gacha Manager
 * Handles all gacha-related operations with comprehensive error handling and UX improvements
 */
class GachaManager {
    constructor() {
        this.drawRates = null; // Will be loaded from database
        this.pricePerDraw = null; // Will be loaded from database
        this.maxPurchaseAmount = 100;
        this.freeDrawsForNewUsers = 10;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;
        
        this.drawRates = await getGachaRates();
        this.pricePerDraw = await getGachaDrawPrice();
        this.initialized = true;
    }

    /**
     * Enhanced gacha draw with comprehensive validation and feedback
     */
    async performEnhancedGachaDraw(userId, discordId, drawType = 'free') {
        try {
            await this.initialize();
            
            // Get fresh user data
            const user = await getUserByDiscordId(discordId);
            if (!user) {
                throw new Error('User not found');
            }

            // Validate draw availability
            if (user.gacha_draws <= 0) {
                return {
                    success: false,
                    error: 'NO_DRAWS',
                    data: {
                        availableDraws: 0,
                        userCoins: user.coins,
                        pricePerDraw: this.pricePerDraw
                    }
                };
            }

            // Perform atomic draw
            const drawResult = await performGachaDraw(userId, drawType);
            
            if (!drawResult.success) {
                return {
                    success: false,
                    error: 'DRAW_FAILED',
                    message: drawResult.error || 'Unknown error occurred'
                };
            }

            // Enhanced result with additional metadata
            return {
                success: true,
                data: {
                    power: drawResult.power,
                    powerCP: drawResult.powerCP,
                    remainingDraws: drawResult.remainingDraws,
                    drawType: drawType,
                    rarity: drawResult.power.rank,
                    rarityRate: this.drawRates[drawResult.power.rank] || 0,
                    timestamp: new Date(),
                    isRareOrBetter: ['Rare', 'Epic', 'Legendary', 'Mythic'].includes(drawResult.power.rank)
                }
            };

        } catch (error) {
            logger.error('Enhanced gacha draw error:', error);
            return {
                success: false,
                error: 'SYSTEM_ERROR',
                message: 'A system error occurred. Please try again.'
            };
        }
    }

    /**
     * Perform batched gacha draws for better performance
     */
    async performBatchGachaDraw(userId, discordId, drawCount, drawType = 'free') {
        try {
            await this.initialize();
            
            // Get fresh user data
            const user = await getUserByDiscordId(discordId);
            if (!user) {
                throw new Error('User not found');
            }

            // Validate draw availability with strict checking
            if (user.gacha_draws < drawCount || user.gacha_draws <= 0) {
                return {
                    success: false,
                    error: 'INSUFFICIENT_DRAWS',
                    data: {
                        availableDraws: Math.max(0, user.gacha_draws),
                        requestedDraws: drawCount,
                        message: user.gacha_draws <= 0 ? 'No draws available' : `Only ${user.gacha_draws} draws available, need ${drawCount}`
                    }
                };
            }

            // Perform batched atomic draws
            const lockKey = `gacha_batch_${userId}`;
            const batchResult = await atomicOperations.executeWithLock(async (connection) => {
                // Double-check draw availability inside the lock to prevent race conditions
                const [freshUserRows] = await connection.execute(
                    'SELECT gacha_draws FROM users WHERE id = ?',
                    [userId]
                );
                
                const freshUser = freshUserRows[0];
                if (!freshUser || freshUser.gacha_draws < drawCount) {
                    throw new Error(`Insufficient draws: User has ${freshUser ? freshUser.gacha_draws : 0} but needs ${drawCount}`);
                }

                // Deduct all draws at once with additional safety check
                const [updateResult] = await connection.execute(
                    'UPDATE users SET gacha_draws = gacha_draws - ? WHERE id = ? AND gacha_draws >= ?',
                    [drawCount, userId, drawCount]
                );

                // Verify the update was successful
                if (updateResult.affectedRows === 0) {
                    throw new Error('Draw deduction failed - insufficient draws or concurrent modification');
                }

                // Get updated user data
                const [updatedUserRows] = await connection.execute(
                    'SELECT gacha_draws, pity_counter FROM users WHERE id = ?',
                    [userId]
                );

                const updatedUser = updatedUserRows[0];
                const draws = [];

                // Perform all draws with pity control
                let currentPityCounter = updatedUser.pity_counter || 0;
                let pityAlreadyTriggered = false;
                
                // Pre-fetch all powers once for batch processing
                const [allPowers] = await connection.execute(
                    'SELECT * FROM powers WHERE rank IN (?, ?, ?, ?, ?) ORDER BY base_cp ASC',
                    ['Normal', 'Rare', 'Epic', 'Legendary', 'Mythic']
                );

                // Process all draws in batch for speed
                for (let i = 0; i < drawCount; i++) {
                    // Check if pity would trigger on this draw
                    const nextPityCounter = currentPityCounter + 1;
                    let forcePity = false;
                    
                    // Only trigger pity once per multi-draw session
                    if (nextPityCounter >= 100 && !pityAlreadyTriggered) {
                        forcePity = true;
                        pityAlreadyTriggered = true;
                    }
                    
                    const drawResult = await this.performSingleDrawLogicWithPityControlFast(
                        connection, 
                        userId, 
                        drawType, 
                        currentPityCounter,
                        forcePity,
                        allPowers
                    );
                    
                    if (drawResult.success) {
                        currentPityCounter = drawResult.pityCounter;
                        draws.push({
                            success: true,
                            data: {
                                power: drawResult.power,
                                powerCP: drawResult.powerCP,
                                remainingDraws: updatedUser.gacha_draws - i - 1,
                                drawType: drawType,
                                rarity: drawResult.power.rank,
                                rarityRate: this.drawRates[drawResult.power.rank] || 0,
                                timestamp: new Date(),
                                isRareOrBetter: ['Rare', 'Epic', 'Legendary', 'Mythic'].includes(drawResult.power.rank),
                                pityCounter: drawResult.pityCounter,
                                isPityTriggered: drawResult.isPityTriggered
                            }
                        });
                    }
                }

                return {
                    success: true,
                    draws: draws,
                    remainingDraws: updatedUser.gacha_draws
                };
            }, lockKey);

            return batchResult;

        } catch (error) {
            logger.error('Batch gacha draw error:', error);
            return {
                success: false,
                error: 'SYSTEM_ERROR',
                message: 'A system error occurred during batch draw. Please try again.'
            };
        }
    }

    /**
     * Enhanced gacha purchase with validation and atomic transactions
     */
    async purchaseGachaDraws(userId, discordId, amount) {
        try {
            // Validate amount
            if (!amount || amount <= 0 || amount > this.maxPurchaseAmount) {
                return {
                    success: false,
                    error: 'INVALID_AMOUNT',
                    message: `Please enter a valid amount between 1 and ${this.maxPurchaseAmount}.`
                };
            }

            const user = await getUserByDiscordId(discordId);
            if (!user) {
                return {
                    success: false,
                    error: 'USER_NOT_FOUND',
                    message: 'User not found. Please register first.'
                };
            }

            const totalCost = amount * this.pricePerDraw;

            // Check if user has enough coins
            if (user.coins < totalCost) {
                return {
                    success: false,
                    error: 'INSUFFICIENT_COINS',
                    data: {
                        required: totalCost,
                        available: user.coins,
                        shortfall: totalCost - user.coins,
                        amount: amount
                    }
                };
            }

            // Perform atomic purchase
            const lockKey = `gacha_purchase_${userId}`;
            const purchaseResult = await atomicOperations.executeWithLock(async (connection) => {
                // Deduct coins
                await connection.execute(
                    'UPDATE users SET coins = coins - ? WHERE id = ?',
                    [totalCost, userId]
                );

                // Add gacha draws
                await connection.execute(
                    'UPDATE users SET gacha_draws = gacha_draws + ? WHERE id = ?',
                    [amount, userId]
                );

                // Get updated user data
                const [updatedUserRows] = await connection.execute(
                    'SELECT coins, gacha_draws FROM users WHERE id = ?',
                    [userId]
                );

                return updatedUserRows[0];
            }, lockKey);

            return {
                success: true,
                data: {
                    amount: amount,
                    totalCost: totalCost,
                    newBalance: purchaseResult.coins,
                    newDrawCount: purchaseResult.gacha_draws,
                    pricePerDraw: this.pricePerDraw
                }
            };

        } catch (error) {
            logger.error('Enhanced gacha purchase error:', error);
            return {
                success: false,
                error: 'SYSTEM_ERROR',
                message: 'A system error occurred during purchase. Please try again.'
            };
        }
    }

    /**
     * Create enhanced gacha menu with real-time data
     */
    async createGachaMenu(user) {
        try {
            await this.initialize();
            
            const pityCounter = user.pity_counter || 0;
            const pityProgress = `${pityCounter}/100`;
            const pityBarLength = 20;
            const filledBars = Math.floor((pityCounter / 100) * pityBarLength);
            const emptyBars = pityBarLength - filledBars;
            const pityBar = '█'.repeat(filledBars) + '░'.repeat(emptyBars);
            
            const embed = new EmbedBuilder()
                .setColor('#9932cc')
                .setTitle('🎰 Enhanced Gacha System')
                .setDescription(`**${user.username}** • Level ${user.level || 1}`)
                .addFields(
                    {
                        name: '🎫 Available Draws',
                        value: `**${user.gacha_draws || 0}** free draws`,
                        inline: true
                    },
                    {
                        name: '💰 Coins',
                        value: `**${(user.coins || 0).toLocaleString()}** coins`,
                        inline: true
                    },
                    {
                        name: '💎 Price',
                        value: `**${(this.pricePerDraw || 1000).toLocaleString()}** coins/draw`,
                        inline: true
                    },
                    {
                        name: '🎯 Pity System',
                        value: `**${pityProgress}** pulls to guaranteed 🔴 Mythic\n\`${pityBar}\` ${pityCounter >= 100 ? '🔥 READY!' : `${100 - pityCounter} more`}`,
                        inline: false
                    },
                    {
                        name: '⚡ Enhanced Features',
                        value: '• **1x & 10x Draws** - Single or multi-draw options\n• **Pity System** - Guaranteed mythic every 100 pulls\n• **Enhanced History** - Detailed statistics\n• **Atomic Safety** - No lost draws',
                        inline: false
                    },
                    {
                        name: '🏆 Drop Rates',
                        value: Object.entries(this.drawRates || {})
                            .map(([rank, rate]) => `${getRankEmojiSync(rank)} ${rank}: ${rate}%`)
                            .join('\n') || 'Loading rates...',
                        inline: false
                    }
                )
                .setFooter({ text: 'Enhanced Gacha System v2.0 • Use buttons for quick actions' })
                .setTimestamp();

            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('enhanced_gacha_draw')
                        .setLabel('🎰 Draw 1x')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled((user.gacha_draws || 0) <= 0),
                    new ButtonBuilder()
                        .setCustomId('enhanced_gacha_draw_10x')
                        .setLabel('🎰 Draw 10x')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled((user.gacha_draws || 0) < 10),
                    new ButtonBuilder()
                        .setCustomId('enhanced_gacha_history')
                        .setLabel('📜 View History')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('enhanced_gacha_purchase')
                        .setLabel('💰 Buy Draws')
                        .setStyle(ButtonStyle.Success)
                        .setDisabled(user.coins < this.pricePerDraw)
                );

            return { embed, components: [buttons] };

        } catch (error) {
            logger.error('Error creating gacha menu:', error);
            throw error;
        }
    }

    /**
     * Create enhanced draw result embed
     */
    async createDrawResultEmbed(user, drawData) {
        const { power, powerCP, remainingDraws, drawType, rarityRate, isRareOrBetter, pityCounter, isPityTriggered } = drawData;
        
        const embed = new EmbedBuilder()
            .setColor(await getRankColor(power.rank))
            .setTitle('🎰 Gacha Result!')
            .setDescription(`**${user.username}** pulled a ${isRareOrBetter ? '**rare**' : 'new'} power!`)
            .addFields(
                {
                    name: '⚡ Power Obtained',
                    value: `${getRankEmoji(power.rank)} **${power.name}**`,
                    inline: false
                },
                {
                    name: '🏆 Rank & Rarity',
                    value: `${power.rank} (${rarityRate}% chance)`,
                    inline: true
                },
                {
                    name: '💪 Combat Power',
                    value: `**${powerCP.toLocaleString()}** CP`,
                    inline: true
                },
                {
                    name: '🎫 Remaining Draws',
                    value: `**${remainingDraws}** draws left`,
                    inline: true
                },
                {
                    name: '📖 Description',
                    value: power.description,
                    inline: false
                },
                {
                    name: '🎮 Next Steps',
                    value: '• Use `/otequip` to equip this power\n• Use `ot gacha` for more draws\n• Use `ot character` to view your collection',
                    inline: false
                }
            );

        // Add pity information if available
        if (pityCounter !== undefined) {
            const pityText = isPityTriggered ? 
                '🔥 **PITY TRIGGERED!** Guaranteed Mythic received!' : 
                `**${pityCounter}/100** pulls to guaranteed Mythic`;
            
            embed.addFields({
                name: '🎯 Pity System',
                value: pityText,
                inline: true
            });
        }

        embed.setFooter({ text: `Draw Type: ${drawType} • Attack on Titan RPG` })
            .setTimestamp();

        // Add special effects for rare draws
        if (power.rank === 'Mythic') {
            embed.setAuthor({ name: '✨ MYTHIC PULL! ✨ Ultra Rare!' });
        } else if (power.rank === 'Legendary') {
            embed.setAuthor({ name: '🌟 LEGENDARY PULL! 🌟 Super Rare!' });
        } else if (power.rank === 'Epic') {
            embed.setAuthor({ name: '🔥 EPIC PULL! 🔥 Very Rare!' });
        } else if (power.rank === 'Rare') {
            embed.setAuthor({ name: '💎 RARE PULL! 💎' });
        }

        return embed;
    }

    /**
     * Create enhanced history embed with statistics
     */
    async createHistoryEmbed(user, historyData) {
        try {
            if (historyData.length === 0) {
                return new EmbedBuilder()
                    .setColor('#ffaa00')
                    .setTitle('📜 Gacha History')
                    .setDescription(`**${user.username}** hasn't made any gacha draws yet!`)
                    .addFields(
                        {
                            name: '🎰 Get Started',
                            value: 'Use the "Draw Power" button to make your first pull!\nNew players start with 10 free draws.',
                            inline: false
                        },
                        {
                            name: '🎯 Tips',
                            value: '• Higher ranks are rarer but much more powerful\n• Every draw guarantees a power\n• Powers can be evolved for even higher ranks',
                            inline: false
                        }
                    )
                    .setTimestamp();
            }

            // Calculate statistics
            const stats = this.calculateHistoryStats(historyData);
            
            const embed = new EmbedBuilder()
                .setColor('#9932cc')
                .setTitle('📜 Gacha History')
                .setDescription(`**${user.username}**'s recent gacha pulls (Last ${historyData.length || 0})`)
                .setTimestamp();

            // Recent pulls
            let historyText = '';
            for (const draw of historyData.slice(0, 10)) {
                const drawDate = new Date(draw.drawn_at).toLocaleDateString();
                const drawType = draw.draw_type === 'free' ? '🎫' : '💰';
                const rarityEmoji = getRankEmoji(draw.power_rank);
                historyText += `${drawType} ${rarityEmoji} **${draw.power_name}** (${draw.power_rank}) - ${draw.combat_power.toLocaleString()} CP - ${drawDate}\n`;
            }

            embed.addFields(
                {
                    name: '🎯 Recent Pulls',
                    value: historyText || 'No recent pulls',
                    inline: false
                },
                {
                    name: '📊 Statistics',
                    value: `**Total Pulls:** ${stats.totalPulls}\n**Best Pull:** ${stats.bestPull}\n**Average CP:** ${stats.averageCP}\n**Rarest Pull:** ${stats.rarestPull}`,
                    inline: true
                },
                {
                    name: '🏆 Rank Distribution',
                    value: Object.entries(stats.rankDistribution)
                        .map(([rank, count]) => `${getRankEmoji(rank)} ${rank}: ${count}`)
                        .join('\n') || 'No data',
                    inline: true
                }
            );

            return embed;

        } catch (error) {
            logger.error('Error creating history embed:', error);
            throw error;
        }
    }

    /**
     * Fast single draw logic with pre-fetched powers for batch operations
     */
    async performSingleDrawLogicWithPityControlFast(connection, userId, drawType, currentPityCounter, forcePity = false, allPowers = null) {
        try {
            const newPityCounter = currentPityCounter + 1;
            
            // Use pre-fetched powers if available, otherwise fetch them
            const powers = allPowers || (await connection.execute(
                'SELECT * FROM powers WHERE rank IN (?, ?, ?, ?, ?) ORDER BY base_cp ASC',
                ['Normal', 'Rare', 'Epic', 'Legendary', 'Mythic']
            ))[0];
            
            let selectedRank = 'Normal';
            let isPityTriggered = false;
            
            // Check if pity system triggers (forced pity or 100th pull)
            if (forcePity || newPityCounter >= 100) {
                selectedRank = 'Mythic';
                isPityTriggered = true;
            } else {
                // Normal gacha rates
                const roll = Math.random() * 100;
                let cumulativeRate = 0;
                
                for (const [rank, rate] of Object.entries(this.drawRates)) {
                    cumulativeRate += rate;
                    if (roll <= cumulativeRate) {
                        selectedRank = rank;
                        break;
                    }
                }
            }
            
            // Filter powers by selected rank
            const rankPowers = powers.filter(p => p.rank === selectedRank);
            if (rankPowers.length === 0) {
                throw new Error(`No powers found for rank: ${selectedRank}`);
            }
            
            // Randomly select a power from the rank
            const selectedPower = rankPowers[Math.floor(Math.random() * rankPowers.length)];
            
            // Calculate combat power with variation
            const baseCP = selectedPower.base_cp;
            const variation = 0.1; // ±10% variation
            const randomMultiplier = 1 + (Math.random() - 0.5) * 2 * variation;
            const powerCP = Math.max(1, Math.round(baseCP * randomMultiplier));
            
            // Reset pity counter if mythic was drawn (natural mythic OR pity triggered)
            const finalPityCounter = (selectedRank === 'Mythic') ? 0 : newPityCounter;
            
            // Update user's pity counter
            await connection.execute(
                'UPDATE users SET pity_counter = ? WHERE id = ?',
                [finalPityCounter, userId]
            );
            
            // Add power to user's collection
            await connection.execute(
                'INSERT INTO user_powers (user_id, power_id, combat_power, rank) VALUES (?, ?, ?, ?)',
                [userId, selectedPower.id, powerCP, selectedPower.rank]
            );
            
            // Record draw history
            await connection.execute(
                'INSERT INTO gacha_history (user_id, power_id, power_name, power_rank, combat_power, draw_type, drawn_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
                [userId, selectedPower.id, selectedPower.name, selectedPower.rank, powerCP, drawType]
            );
            
            return {
                success: true,
                power: selectedPower,
                powerCP: powerCP,
                pityCounter: finalPityCounter,
                isPityTriggered: isPityTriggered
            };
            
        } catch (error) {
            logger.error('Single draw logic error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Perform single draw logic (helper for batch operations)
     */
    async performSingleDrawLogic(connection, userId, drawType, currentPityCounter) {
        try {
            const newPityCounter = currentPityCounter + 1;
            
            // Get all powers
            const [powers] = await connection.execute(
                'SELECT * FROM powers WHERE rank IN (?, ?, ?, ?, ?) ORDER BY base_cp ASC',
                ['Normal', 'Rare', 'Epic', 'Legendary', 'Mythic']
            );
            
            let selectedRank = 'Normal';
            let isPityTriggered = false;
            
            // Check if pity system triggers (100th pull gets guaranteed mythic)
            if (newPityCounter >= 100) {
                selectedRank = 'Mythic';
                isPityTriggered = true;
            } else {
                // Normal gacha rates
                const roll = Math.random() * 100;
                let cumulativeRate = 0;
                
                for (const [rank, rate] of Object.entries(this.drawRates)) {
                    cumulativeRate += rate;
                    if (roll <= cumulativeRate) {
                        selectedRank = rank;
                        break;
                    }
                }
            }
            
            // Filter powers by selected rank
            const rankPowers = powers.filter(p => p.rank === selectedRank);
            if (rankPowers.length === 0) {
                throw new Error(`No powers found for rank: ${selectedRank}`);
            }
            
            // Randomly select a power from the rank
            const selectedPower = rankPowers[Math.floor(Math.random() * rankPowers.length)];
            
            // Calculate combat power with variation
            const baseCP = selectedPower.base_cp;
            const variation = 0.1; // ±10% variation
            const randomMultiplier = 1 + (Math.random() - 0.5) * 2 * variation;
            const powerCP = Math.max(1, Math.round(baseCP * randomMultiplier));
            
            // Reset pity counter if mythic was drawn (natural mythic OR pity triggered)
            const finalPityCounter = (selectedRank === 'Mythic') ? 0 : newPityCounter;
            
            // Update user's pity counter
            await connection.execute(
                'UPDATE users SET pity_counter = ? WHERE id = ?',
                [finalPityCounter, userId]
            );
            
            // Add power to user's collection
            await connection.execute(
                'INSERT INTO user_powers (user_id, power_id, combat_power, rank) VALUES (?, ?, ?, ?)',
                [userId, selectedPower.id, powerCP, selectedPower.rank]
            );
            
            // Record draw history
            await connection.execute(
                'INSERT INTO gacha_history (user_id, power_id, power_name, power_rank, combat_power, draw_type, drawn_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
                [userId, selectedPower.id, selectedPower.name, selectedPower.rank, powerCP, drawType]
            );
            
            return {
                success: true,
                power: selectedPower,
                powerCP: powerCP,
                pityCounter: finalPityCounter,
                isPityTriggered: isPityTriggered
            };
            
        } catch (error) {
            logger.error('Single draw logic error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Calculate comprehensive statistics from history data
     */
    calculateHistoryStats(historyData) {
        if (historyData.length === 0) {
            return {
                totalPulls: 0,
                bestPull: 'None',
                averageCP: 0,
                rarestPull: 'None',
                rankDistribution: {}
            };
        }

        const rankOrder = ['Normal', 'Rare', 'Epic', 'Legendary', 'Mythic'];
        let totalCP = 0;
        let bestCP = 0;
        let bestPower = '';
        let rarestRank = 'Normal';
        const rankCounts = {};

        for (const draw of historyData) {
            totalCP += draw.combat_power;
            
            if (draw.combat_power > bestCP) {
                bestCP = draw.combat_power;
                bestPower = `${draw.power_name} (${draw.combat_power.toLocaleString()} CP)`;
            }
            
            rankCounts[draw.power_rank] = (rankCounts[draw.power_rank] || 0) + 1;
            
            if (rankOrder.indexOf(draw.power_rank) > rankOrder.indexOf(rarestRank)) {
                rarestRank = draw.power_rank;
            }
        }

        return {
            totalPulls: historyData.length,
            bestPull: bestPower || 'None',
            averageCP: Math.round(totalCP / historyData.length),
            rarestPull: rarestRank,
            rankDistribution: rankCounts
        };
    }

    /**
     * Create purchase confirmation embed
     */
    createPurchaseEmbed(user, purchaseData) {
        const { amount, totalCost, newBalance, newDrawCount } = purchaseData;
        
        return new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Enhanced Purchase Successful!')
            .setDescription(`**${user.username}** successfully purchased ${amount} gacha draw${amount > 1 ? 's' : ''}!`)
            .addFields(
                {
                    name: '💰 Transaction Details',
                    value: `**Cost:** ${totalCost.toLocaleString()} coins\n**Price per draw:** ${this.pricePerDraw.toLocaleString()} coins`,
                    inline: true
                },
                {
                    name: '💎 Updated Balances',
                    value: `**Coins:** ${newBalance.toLocaleString()}\n**Draws:** ${newDrawCount} available`,
                    inline: true
                },
                {
                    name: '🎯 Recommendations',
                    value: `**Purchased:** ${amount} draw${amount > 1 ? 's' : ''}\n**Estimated pulls:** ${amount} new powers\n**Potential rares:** ~${Math.max(1, Math.round(amount * 0.3))} rare+ powers`,
                    inline: false
                },
                {
                    name: '🎰 Next Steps',
                    value: '• Use `ot gacha draw` to use your draws\n• Check `ot gacha` for the enhanced menu\n• View progress with `ot gacha history`',
                    inline: false
                }
            )
            .setFooter({ text: 'Enhanced Gacha System v2.0 • Thank you for your purchase!' })
            .setTimestamp();
    }

    /**
     * Create error embed for various error types
     */
    createErrorEmbed(errorType, errorData = {}) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTimestamp();

        switch (errorType) {
            case 'NO_DRAWS':
                embed.setTitle('❌ No Draws Available')
                    .setDescription('You have no gacha draws remaining!')
                    .addFields(
                        {
                            name: '💰 Purchase More Draws',
                            value: `Use \`ot buy draw <amount>\` to purchase more draws\n**Price:** ${this.pricePerDraw.toLocaleString()} coins per draw`,
                            inline: false
                        },
                        {
                            name: '💡 Your Status',
                            value: `**Available Draws:** ${errorData.availableDraws || 0}\n**Your Coins:** ${(errorData.userCoins || 0).toLocaleString()}`,
                            inline: false
                        }
                    );
                break;

            case 'INSUFFICIENT_COINS':
                embed.setTitle('❌ Insufficient Coins')
                    .setDescription(`You need **${errorData.required?.toLocaleString() || 0}** coins to buy ${errorData.amount || 0} draw${(errorData.amount || 0) > 1 ? 's' : ''}.`)
                    .addFields(
                        {
                            name: '💰 Current Status',
                            value: `**You have:** ${(errorData.available || 0).toLocaleString()} coins\n**You need:** ${(errorData.shortfall || 0).toLocaleString()} more coins`,
                            inline: false
                        },
                        {
                            name: '💡 How to earn coins',
                            value: '• Win battles (`ot battle`)\n• Complete daily rewards (`ot daily`)\n• Use gambling commands (`ot cf`, `ot slot`)\n• Rob other players (`ot rob`)',
                            inline: false
                        }
                    );
                break;

            case 'INVALID_AMOUNT':
                embed.setTitle('❌ Invalid Amount')
                    .setDescription(`Please enter a valid amount between 1 and ${this.maxPurchaseAmount} draws.`)
                    .addFields(
                        {
                            name: '💡 Examples',
                            value: `• \`ot buy draw 1\` - Buy 1 draw (${this.pricePerDraw.toLocaleString()} coins)\n• \`ot buy draw 10\` - Buy 10 draws (${(this.pricePerDraw * 10).toLocaleString()} coins)\n• \`ot buy draw 50\` - Buy 50 draws (${(this.pricePerDraw * 50).toLocaleString()} coins)`,
                            inline: false
                        }
                    );
                break;

            default:
                embed.setTitle('❌ System Error')
                    .setDescription('An unexpected error occurred. Please try again.')
                    .addFields(
                        {
                            name: '🔧 Troubleshooting',
                            value: '• Wait a few seconds and try again\n• Check your internet connection\n• Contact support if the issue persists',
                            inline: false
                        }
                    );
        }

        return embed;
    }
}

module.exports = new GachaManager();
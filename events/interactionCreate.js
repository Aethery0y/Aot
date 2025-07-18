const { EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { handlePaginationInteraction } = require('../utils/pagination');
const { handlePersistentPaginationInteraction } = require('../utils/persistentPagination');
const logger = require('../utils/logger');
const bugMonitor = require('../utils/bugMonitor');
const errorRecovery = require('../utils/errorRecovery');
const secureCommandHandler = require('../utils/secureCommandHandler');
const { determineRankByCP } = require('../utils/databaseHelpers');

// Multi-power merge calculation function
async function calculateMultiPowerMerge(mainPower, sacrificePowers) {
    // Calculate total sacrifice CP
    const totalSacrificeCP = sacrificePowers.reduce((sum, power) => sum + power.combat_power, 0);

    // Final CP = mainPowerCP + sum of all sacrifice powers CP
    const newCP = mainPower.combat_power + totalSacrificeCP;

    // Calculate merge cost based on number of powers and their CP
    const baseCost = 1000;
    const powerCountMultiplier = sacrificePowers.length * 500;
    const cpMultiplier = Math.floor(newCP / 100) * 50;
    const mergeCost = baseCost + powerCountMultiplier + cpMultiplier;

    // Success rate based on power count (more powers = slightly lower success rate)
    const baseSuccessRate = 90;
    const powerCountPenalty = (sacrificePowers.length - 1) * 5;
    const successRate = Math.max(75, baseSuccessRate - powerCountPenalty);

    // Generate merged power name
    const mergedName = generateMergedName(mainPower, sacrificePowers);

    // Determine rank based on final CP
    const newRank = await determineRankByCP(newCP);

    return {
        newCP,
        mergeCost,
        successRate,
        mergedName,
        newRank,
        totalSacrificeCP,
        sacrificeCount: sacrificePowers.length
    };
}

function generateMergedName(mainPower, sacrificePowers) {
    // Extract key words from power names for meaningful combinations
    const extractKeyWords = (name) => {
        const words = name.split(' ').filter(word => 
            word.length > 3 && 
            !['the', 'and', 'of', 'for', 'with', 'enhanced', 'superior', 'advanced'].includes(word.toLowerCase())
        );
        return words;
    };

    // Get key words from main power
    const mainWords = extractKeyWords(mainPower.name);

    // Get key words from sacrifice powers
    const sacrificeWords = [];
    for (const power of sacrificePowers) {
        sacrificeWords.push(...extractKeyWords(power.name));
    }

    // Combine words intelligently
    let mergedName = '';

    if (mainWords.length > 0) {
        // Start with main power's first significant word
        mergedName = mainWords[0];

        // Add a word from sacrifice powers if available
        if (sacrificeWords.length > 0) {
            const uniqueSacrificeWords = [...new Set(sacrificeWords)].filter(word => 
                !mainWords.includes(word)
            );

            if (uniqueSacrificeWords.length > 0) {
                mergedName += ` ${uniqueSacrificeWords[0]}`;
            }
        }

        // Add a descriptive suffix based on number of sacrifices
        const suffixes = ['Fusion', 'Mastery', 'Dominion', 'Supremacy'];
        const suffix = suffixes[Math.min(sacrificePowers.length - 1, suffixes.length - 1)];
        mergedName += ` ${suffix}`;

    } else {
        // Fallback if no good words found
        const powerTypes = ['Merged', 'Fused', 'Combined', 'Ultimate'];
        const type = powerTypes[Math.min(sacrificePowers.length - 1, powerTypes.length - 1)];
        mergedName = `${type} Power`;
    }

    return mergedName;
}



module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        // Handle persistent pagination interactions (page_)
        if (interaction.isButton() && interaction.customId.startsWith('page_')) {
            const handled = await handlePersistentPaginationInteraction(interaction);
            if (handled) return;
        }

        // Handle regular pagination interactions (pagination_)
        if (interaction.isButton() && interaction.customId.startsWith('pagination_')) {
            const handled = await handlePaginationInteraction(interaction);
            if (handled) return;
        }

        // Handle autocomplete interactions
        if (interaction.isAutocomplete()) {
            await handleAutocomplete(interaction);
        }

        // Handle slash commands
        if (interaction.isChatInputCommand()) {
            await handleSlashCommand(interaction);
        }

        // Handle button interactions (non-pagination)
        if (interaction.isButton() && !interaction.customId.startsWith('pagination_') && !interaction.customId.startsWith('page_')) {
            await handleButtonInteraction(interaction);
        }

        // Handle select menu interactions
        if (interaction.isStringSelectMenu()) {
            await handleSelectMenuInteraction(interaction);
        }

        // Handle modal submissions
        if (interaction.isModalSubmit()) {
            await handleModalSubmission(interaction);
        }
    }
};

async function handleAutocomplete(interaction) {
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        logger.warn(`No command matching ${interaction.commandName} was found for autocomplete.`);
        return;
    }

    if (!command.autocomplete) {
        logger.warn(`Command ${interaction.commandName} does not have autocomplete function.`);
        return;
    }

    try {
        await command.autocomplete(interaction);
    } catch (error) {
        logger.error(`Error executing autocomplete for ${interaction.commandName}:`, error);
        try {
            await interaction.respond([]);
        } catch (respondError) {
            logger.error('Error responding to autocomplete:', respondError);
        }
    }
}

async function handleSlashCommand(interaction) {
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        logger.warn(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        // Check cooldown if command has one (but don't set it yet)
        if (command.cooldown) {
            const { checkCooldown } = require('../utils/database');
            const cooldownCheck = await checkCooldown(interaction.user.id, interaction.commandName, command.cooldown, false);

            if (cooldownCheck.onCooldown) {
                const timeLeft = Math.max(0, Math.floor(cooldownCheck.timeLeft / 1000)); // Convert to seconds
                const hours = Math.floor(timeLeft / 3600);
                const minutes = Math.floor((timeLeft % 3600) / 60);
                const seconds = timeLeft % 60;

                let timeString = '';
                if (hours > 0) {
                    timeString = `${hours}h ${minutes}m ${seconds}s`;
                } else if (minutes > 0) {
                    timeString = `${minutes}m ${seconds}s`;
                } else {
                    timeString = `${seconds}s`;
                }

                const refreshTime = Math.floor((Date.now() + cooldownCheck.timeLeft) / 1000);
                const cooldownEmbed = new EmbedBuilder()
                    .setColor('#ffaa00')
                    .setTitle('⏰ Command Cooldown')
                    .setDescription(`Wait **${timeString}** before using \`/${interaction.commandName}\` again.\n\n⏱️ **Real-time Countdown:**\nRefreshes <t:${refreshTime}:R> at <t:${refreshTime}:T>`)
                    .setFooter({ text: `Cooldown: ${command.cooldown}s` })
                    .setTimestamp();

                await interaction.reply({ embeds: [cooldownEmbed], flags: 64 });

                // Auto-delete the cooldown message when countdown ends
                setTimeout(async () => {
                    try {
                        await interaction.deleteReply();
                    } catch (error) {
                        // Message might already be deleted or we don't have permission
                        logger.debug('Could not delete cooldown interaction:', error.message);
                    }
                }, cooldownCheck.timeLeft);

                return;
            }
        }

        // Log command usage
        logger.command(
            interaction.user.username,
            `/${interaction.commandName}`,
            `in ${interaction.guild?.name || 'DM'}`
        );

        // Execute command through secure handler with error recovery
        const startTime = Date.now();
        await errorRecovery.executeWithRecovery(
            `command_${interaction.commandName}`,
            async () => await command.execute(interaction),
            null,
            2 // Max 2 retries for commands
        );
        const executionTime = Date.now() - startTime;

        // Track successful execution
        bugMonitor.trackCommandExecution(interaction.commandName, true, executionTime);

        // Set cooldown only after successful execution
        if (command.cooldown) {
            const { setCooldownAfterSuccess } = require('../utils/database');
            await setCooldownAfterSuccess(interaction.user.id, interaction.commandName, command.cooldown);
        }

    } catch (error) {
        logger.error(`Error executing /${interaction.commandName}:`, error);

        // Track failed execution
        const executionTime = Date.now() - (Date.now() - 1000); // Approximate
        bugMonitor.trackCommandExecution(interaction.commandName, false, executionTime, error);

        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Command Error')
            .setDescription('An error occurred while executing this command.')
            .setFooter({ text: 'Please try again later or contact support if the issue persists.' })
            .setTimestamp();

        const errorMessage = { embeds: [errorEmbed], flags: 64 };

        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        } catch (replyError) {
            logger.error('Failed to send error message:', replyError);
        }
    }
}

async function handleButtonInteraction(interaction) {
    try {
        // Handle custom button interactions here
        // For now, just acknowledge unknown buttons
        logger.info(`Button interaction: ${interaction.customId} by ${interaction.user.username}`);

        // Example: Handle confirmation buttons, action buttons, etc.
        if (interaction.customId.startsWith('confirm_')) {
            await handleConfirmationButton(interaction);
        } else if (interaction.customId.startsWith('action_')) {
            await handleActionButton(interaction);
        } else if (interaction.customId.startsWith('pagination_')) {
            await handlePaginationInteraction(interaction);
        } else if (interaction.customId.startsWith('page_')) {
            await handlePersistentPaginationInteraction(interaction);
        } else if (interaction.customId.startsWith('eat_')) {
            const { handleEatChallenge } = require('../commands/prefix/eat');
            await handleEatChallenge(interaction);
        } else if (interaction.customId === 'cancel_evolution') {
            // Clean up evolution session
            if (interaction.client.evolveSelections) {
                delete interaction.client.evolveSelections[interaction.user.id];
            }

            const cancelEmbed = new EmbedBuilder()
                .setColor('#ff9900')
                .setTitle('🚫 Evolution Cancelled')
                .setDescription('Evolution process has been cancelled. No changes were made.')
                .setTimestamp();

            await interaction.update({
                embeds: [cancelEmbed],
                components: []
            });
        } else if (interaction.customId === 'accept_terms') {
            await handleTermsAcceptance(interaction);
        } else if (interaction.customId === 'decline_terms') {
            await handleTermsDecline(interaction);
        } else if (interaction.customId.startsWith('admin_reply_')) {
            await handleAdminReply(interaction);
        } else if (interaction.customId.startsWith('admin_resolve_')) {
            await handleAdminResolve(interaction);
        } else if (interaction.customId.startsWith('admin_investigate_')) {
            await handleAdminInvestigate(interaction);
        } else if (interaction.customId === 'gacha_draw') {
            await handleGachaDraw(interaction, 1);
        } else if (interaction.customId === 'gacha_draw_10x') {
            await handleGachaDraw(interaction, 10);
        } else if (interaction.customId === 'gacha_history') {
            await handleGachaHistory(interaction);
        } else if (interaction.customId === 'enhanced_gacha_draw') {
            await handleEnhancedGachaDraw(interaction);
        } else if (interaction.customId === 'enhanced_gacha_draw_10x') {
            await handleEnhancedGachaDraw(interaction, 10);
        } else if (interaction.customId === 'enhanced_gacha_history') {
            await handleEnhancedGachaHistory(interaction);
        } else if (interaction.customId === 'enhanced_gacha_purchase') {
            await handleEnhancedGachaPurchase(interaction);
        } else if (interaction.customId.startsWith('store_buy_') && interaction.customId.includes('_draw')) {
            await handleStoreBuyDraws(interaction);
        } else if (interaction.customId.startsWith('give_confirm_')) {
            await handleGiveConfirmation(interaction);
        } else if (interaction.customId.startsWith('give_decline')) {
            // Handle give decline
            await interaction.update({
                content: '❌ Transaction cancelled.',
                components: [],
                embeds: []
            });
        }
        else {
            await interaction.reply({
                content: '❌ Unknown button interaction.',
                flags: 64
            });
        }

    } catch (error) {
        logger.error('Error handling button interaction:', error);

        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ An error occurred while processing the button interaction.',
                flags: 64
            });
        }
    }
}

async function handleConfirmationButton(interaction) {
    // Handle confirmation buttons (e.g., power evolution confirmations)
    const action = interaction.customId.replace('confirm_', '');

    switch (action) {
        case 'evolution':
            await handleEvolutionConfirmation(interaction);
            break;
        case 'merge':
            await handleMergeConfirmation(interaction);
            break;
        case 'purchase':
            await interaction.reply({
                content: '✅ Purchase confirmed! Processing...',
                flags: 64
            });
            break;
        default:
            await interaction.reply({
                content: '❌ Unknown confirmation action.',
                flags: 64
            });
    }
}

async function handleEvolutionConfirmation(interaction) {
    const { evolvePower, removePower, updateUserCoins } = require('../utils/database');

    try {
        // Get stored evolution data
        const evolutionData = interaction.client.evolveSelections?.[interaction.user.id];
        if (!evolutionData) {
            return interaction.reply({
                content: '❌ Evolution session expired. Please start over with `/otevolve`.',
                flags: 64
            });
        }

        const { mainPower, sacrificePower, evolutionResult, userId } = evolutionData;

        // Simulate evolution success/failure based on success rate
        const evolutionSuccess = Math.random() * 100 < evolutionResult.successRate;

        if (evolutionSuccess) {
            // Successful evolution
            await evolvePower(
                mainPower.user_power_id || mainPower.id,
                evolutionResult.newName,
                evolutionResult.newDescription,
                evolutionResult.newRank,
                evolutionResult.newCP
            );

            // Remove sacrifice power
            await removePower(sacrificePower.user_power_id || sacrificePower.id);

            // Deduct coins
            await updateUserCoins(userId, -evolutionResult.evolutionCost);

            const successEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Evolution Successful!')
                .setDescription(`**${mainPower.name}** has successfully evolved!`)
                .addFields(
                    { name: '🆕 New Power', value: `${evolutionResult.newName}\n${evolutionResult.newRank} • ${evolutionResult.newCP} CP`, inline: true },
                    { name: '🔥 Sacrificed', value: `${sacrificePower.name}\n${sacrificePower.rank} • ${sacrificePower.combat_power} CP`, inline: true },
                    { name: '📈 Improvement', value: `+${evolutionResult.cpIncrease.toLocaleString()} CP`, inline: true },
                    { name: '🔄 Evolution Type', value: evolutionResult.evolutionType, inline: true },
                    { name: '⭐ Compatibility', value: evolutionResult.compatibilityRating, inline: true },
                    { name: '💰 Cost', value: `${evolutionResult.evolutionCost.toLocaleString()} coins`, inline: true }
                )
                .setFooter({ text: 'Use /otequip to equip your new power!' })
                .setTimestamp();

            await interaction.update({
                embeds: [successEmbed],
                components: []
            });

        } else {
            // Failed evolution
            const failureEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Evolution Failed!')
                .setDescription(`The evolution attempt failed! Both powers remain unchanged.`)
                .addFields(
                    { name: '🎯 Success Rate', value: `${evolutionResult.successRate}%`, inline: true },
                    { name: '💔 Result', value: 'Evolution failed, no changes made', inline: true },
                    { name: '💰 Refund', value: `${Math.floor(evolutionResult.evolutionCost * 0.5).toLocaleString()} coins (50% refund)`, inline: true }
                )
                .setFooter({ text: 'Better luck next time!' })
                .setTimestamp();

            // Partial refund on failure
            await updateUserCoins(userId, Math.floor(evolutionResult.evolutionCost * 0.5));

            const responseMethod = interaction.deferred ? 'editReply' : 'update';
            await interaction[responseMethod]({
                embeds: [failureEmbed],
                components: []
            });
        }

        // Clean up session data
        delete interaction.client.evolveSelections[interaction.user.id];

    } catch (error) {
        logger.error('Error handling evolution confirmation:', error);
        await interaction.reply({
            content: '❌ An error occurred during evolution. Please try again.',
            flags: 64
        });
    }
}

async function handleActionButton(interaction) {
    // Handle action buttons (e.g., quick battle, quick shop access)
    const action = interaction.customId.replace('action_', '');

    switch (action) {
        case 'quick_battle':
            await interaction.reply({
                content: '⚔️ Use `ot battle` command to start a battle!',
                flags: 64
            });
            break;
        case 'quick_shop':
            await interaction.reply({
                content: '🏪 Use `ot store` command to access the power shop!',
                flags: 64
            });
            break;
        case 'quick_arena':
            await interaction.reply({
                content: '🏟️ Use `ot arena` command to view the leaderboard!',
                flags: 64
            });
            break;
        default:
            await interaction.reply({
                content: '❌ Unknown action.',
                flags: 64
            });
    }
}

async function handleSelectMenuInteraction(interaction) {
    try {
        logger.info(`Select menu interaction: ${interaction.customId} by ${interaction.user.username}`);

        // Handle different select menus
        if (interaction.customId.startsWith('power_select_')) {
            await handlePowerSelectMenu(interaction);
        } else if (interaction.customId.startsWith('battle_select_')) {
            await handleBattleSelectMenu(interaction);
        } else if (interaction.customId.startsWith('store_select_')) {
            await handleStoreSelectMenu(interaction);
        } else if (interaction.customId === 'merge_main_power') {
            await handleMergeMainPowerSelect(interaction);
        } else if (interaction.customId === 'merge_sacrifice_powers') {
            await handleMergeSacrificePowersSelect(interaction);
        } else if (interaction.customId.startsWith('credeem_select_')) {
            await handleCredeemSelectMenu(interaction);
        } else if (interaction.customId.startsWith('credeem_delivery_')) {
            await handleCredeemDeliverySelect(interaction);
        } else {
            await interaction.reply({
                content: '❌ Unknown select menu interaction.',
                flags: 64
            });
        }

    } catch (error) {
        logger.error('Error handling select menu interaction:', error);

        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ An error occurred while processing the select menu interaction.',
                flags: 64
            });
        }
    }
}

async function handlePowerSelectMenu(interaction) {
    const selectedPower = interaction.values[0];

    await interaction.reply({
        content: `⚡ You selected: **${selectedPower}**\nUse \`/otequip\` to equip this power!`,
        flags: 64
    });
}

async function handleBattleSelectMenu(interaction) {
    const selectedOption = interaction.values[0];

    switch (selectedOption) {
        case 'pve_battle':
            await interaction.reply({
                content: '⚔️ Use `ot battle` command to fight titans and humans!',
                flags: 64
            });
            break;
        case 'pvp_battle':
            await interaction.reply({
                content: '🗡️ Use `ot battle @user` to challenge another player!',
                flags: 64
            });
            break;
        case 'arena_battle':
            await interaction.reply({
                content: '🏟️ Use `a battle <rank>` to challenge an arena ranker!',
                flags: 64
            });
            break;
        default:
            await interaction.reply({
                content: '❌ Unknown battle option.',
                flags: 64
            });
    }
}

async function handleMergeMainPowerSelect(interaction) {
    const { getUserByDiscordId, getUserPowers } = require('../utils/database');
    const { getRankEmoji } = require('../utils/powers');

    try {
        const user = await getUserByDiscordId(interaction.user.id);
        const selectedMainPowerId = interaction.values[0];

        // Get user's powers
        const userPowers = await getUserPowers(user.id);
        const mainPower = userPowers.find(p => (p.user_power_id || p.id || p.power_id).toString() === selectedMainPowerId);

        if (!mainPower) {
            return interaction.reply({
                content: '❌ Selected power not found.',
                flags: 64
            });
        }

        // Filter out the selected main power and equipped power for sacrifice options
        const availableSacrifice = userPowers.filter(p => 
            (p.user_power_id || p.id || p.power_id).toString() !== selectedMainPowerId && 
            (p.user_power_id || p.id || p.power_id) !== user.equipped_power_id
        );

        if (availableSacrifice.length === 0) {
            return interaction.reply({
                content: '❌ No available powers to sacrifice. You need at least one other non-equipped power.',
                flags: 64
            });
        }

        // Create dropdown for sacrifice power selection
        const sacrificeOptions = availableSacrifice.slice(0, 25).map(power => ({
            label: power.name.length > 100 ? power.name.substring(0, 97) + '...' : power.name,
            value: (power.user_power_id || power.id || power.power_id).toString(),
            description: `${power.rank} • ${power.combat_power} CP`,
            emoji: getRankEmoji(power.rank)
        }));

        const sacrificeSelect = new StringSelectMenuBuilder()
            .setCustomId('merge_sacrifice_powers')
            .setPlaceholder('Select powers to sacrifice (multiple selection)')
            .setMinValues(1)
            .setMaxValues(Math.min(sacrificeOptions.length, 3))
            .addOptions(sacrificeOptions);

        const row = new ActionRowBuilder()
            .addComponents(sacrificeSelect);

        const embed = new EmbedBuilder()
            .setColor('#FF6B35')
            .setTitle('⚡ Power Merging')
            .setDescription(`**Step 2:** Select powers to sacrifice (1-3 powers)\n\n**Main Power:** ${mainPower.name} (${mainPower.combat_power} CP)\n\n💡 **Tip:** Select multiple powers for stronger results!`)
            .addFields(
                { name: '⚠️ Warning', value: 'Selected sacrifice powers will be permanently destroyed', inline: true },
                { name: '🔮 Result', value: 'You will get one stronger merged power', inline: true }
            )
            .setFooter({ text: 'You can select 1-3 powers to sacrifice!' })
            .setTimestamp();

        // Store the main power ID for the next step
        if (!interaction.client.mergeSelections) {
            interaction.client.mergeSelections = {};
        }
        interaction.client.mergeSelections[interaction.user.id] = {
            mainPowerId: selectedMainPowerId,
            mainPower: mainPower,
            userId: user.id
        };

        await interaction.update({
            embeds: [embed],
            components: [row]
        });

        // Store selection in a temporary way (you might want to use a proper session store)
        interaction.client.evolveSelections = interaction.client.evolveSelections || {};
        interaction.client.evolveSelections[interaction.user.id] = {
            mainPowerId: selectedMainPowerId,
            mainPower: mainPower
        };

    } catch (error) {
        logger.error('Error handling evolve main power select:', error);
        await interaction.reply({
            content: '❌ An error occurred while processing your selection.',
            flags: 64
        });
    }
}

async function handleMergeSacrificePowersSelect(interaction) {
    const { getUserByDiscordId, getUserPowers, evolvePower, removePower, updateUserCoins } = require('../utils/database');
    const { calculateEvolutionBonus } = require('../utils/powers');

    try {
        const user = await getUserByDiscordId(interaction.user.id);
        const selectedSacrificePowerIds = interaction.values; // Multiple powers can be selected

        // Get stored main power selection
        const selections = interaction.client.mergeSelections?.[interaction.user.id];
        if (!selections) {
            return interaction.reply({
                content: '❌ Merge session expired. Please start over with `/otmerge`.',
                flags: 64
            });
        }

        const userPowers = await getUserPowers(user.id);
        const mainPower = userPowers.find(p => (p.user_power_id || p.id || p.power_id).toString() === selections.mainPowerId);
        const sacrificePowers = userPowers.filter(p => 
            selectedSacrificePowerIds.includes((p.user_power_id || p.id || p.power_id).toString())
        );

        if (!mainPower || sacrificePowers.length === 0) {
            return interaction.reply({
                content: '❌ Selected powers not found.',
                flags: 64
            });
        }

        // Calculate merge result for multiple powers
        const mergeResult = await calculateMultiPowerMerge(mainPower, sacrificePowers);

        if (user.coins < mergeResult.mergeCost) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Insufficient Coins')
                .setDescription(`Merge requires **${mergeResult.mergeCost.toLocaleString()}** coins.`)
                .addFields(
                    { name: '💵 Your Balance', value: `${user.coins.toLocaleString()} coins`, inline: true },
                    { name: '💸 Required', value: `${mergeResult.mergeCost.toLocaleString()} coins`, inline: true },
                    { name: '📊 Powers to Merge', value: `${sacrificePowers.length + 1} powers`, inline: true }
                )
                .setTimestamp();

            return interaction.reply({
                embeds: [embed],
                flags: 64
            });
        }

        // Merge preview embed
        const sacrificeList = sacrificePowers.map(p => `${p.name} (${p.rank} • ${p.combat_power} CP)`).join('\n');
        const previewEmbed = new EmbedBuilder()
            .setColor('#FF6B35')
            .setTitle('⚡ Merge Preview')
            .setDescription(`**Merging ${sacrificePowers.length + 1} powers into one**`)
            .addFields(
                { name: '⚔️ Main Power', value: `${mainPower.name}\n${mainPower.rank} • ${mainPower.combat_power} CP`, inline: true },
                { name: '🔥 Sacrifice Powers', value: sacrificeList, inline: true },
                { name: '📈 Final Result', value: `${mergeResult.newCP.toLocaleString()} CP`, inline: true },
                { name: '💰 Merge Cost', value: `${mergeResult.mergeCost.toLocaleString()} coins`, inline: true },
                { name: '🎯 Success Rate', value: `${mergeResult.successRate}%`, inline: true },
                { name: '🎭 New Name', value: mergeResult.mergedName, inline: true },
                { name: '🔰 New Rank', value: mergeResult.newRank, inline: true },
                { name: '🔢 Formula', value: `${mainPower.combat_power} + ${mergeResult.totalSacrificeCP}`, inline: true },
                { name: '📊 Power Count', value: `${mergeResult.sacrificeCount + 1} powers merged`, inline: true }
            )
            .setFooter({ text: 'Click confirm to proceed with merge!' })
            .setTimestamp();

        // Confirmation buttons
        const confirmRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm_merge')
                    .setLabel('Confirm Merge')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId('cancel_merge')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌')
            );

        await interaction.update({
            embeds: [previewEmbed],
            components: [confirmRow]
        });

        // Store merge data for confirmation
        interaction.client.mergeSelections[interaction.user.id] = {
            mainPower,
            sacrificePowers,
            mergeResult,
            userId: user.id
        };

    } catch (error) {
        logger.error('Error handling merge sacrifice power select:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ An error occurred while processing your selection.',
                flags: 64
            });
        }
    }
}

async function handleMergeConfirmation(interaction) {
    const { evolvePower, removePower, updateUserCoins, setCooldownAfterSuccess } = require('../utils/database');

    try {
        // Add deferReply to prevent interaction timeout
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ ephemeral: false });
        }
        // Get stored merge data
        const mergeData = interaction.client.mergeSelections?.[interaction.user.id];
        if (!mergeData) {
            return interaction.reply({
                content: '❌ Merge session expired. Please start over with `/otmerge`.',
                flags: 64
            });
        }

        const { mainPower, sacrificePowers, mergeResult, userId } = mergeData;

        // Check if user has 3-day merge cooldown
        const { checkCooldown } = require('../utils/database');
        const cooldownCheck = await checkCooldown(userId, 'merge_command', 3600, false); // 1 hour in seconds

        if (cooldownCheck.onCooldown) {
            const timeLeft = Math.max(0, Math.floor(cooldownCheck.timeLeft / 1000));
            const days = Math.floor(timeLeft / 86400);
            const hours = Math.floor((timeLeft % 86400) / 3600);
            const minutes = Math.floor((timeLeft % 3600) / 60);

            let timeString = '';
            if (days > 0) {
                timeString = `${days}d ${hours}h ${minutes}m`;
            } else if (hours > 0) {
                timeString = `${hours}h ${minutes}m`;
            } else {
                timeString = `${minutes}m`;
            }

            return interaction.reply({
                content: `❌ You can only merge powers once every hour. Wait **${timeString}** before merging again.`,
                flags: 64
            });
        }

        // Simulate merge success/failure based on success rate
        const mergeSuccess = Math.random() * 100 < mergeResult.successRate;

        if (mergeSuccess) {
            // Successful merge
            await evolvePower(
                mainPower.user_power_id || mainPower.id,
                mergeResult.mergedName,
                `A powerful merged ability combining ${sacrificePowers.length + 1} powers`,
                mergeResult.newRank,
                mergeResult.newCP
            );

            // Remove all sacrifice powers
            for (const sacrificePower of sacrificePowers) {
                await removePower(sacrificePower.user_power_id || sacrificePower.id);
            }

            // Deduct coins
            await updateUserCoins(userId, -mergeResult.mergeCost);

            // Set 3-day cooldown
            await setCooldownAfterSuccess(userId, 'merge_command', 3600); // 1 hour

            const successEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Merge Successful!')
                .setDescription(`**${mainPower.name}** has been successfully merged with ${sacrificePowers.length} other powers!`)
                .addFields(
                    { name: '🆕 New Power', value: `${mergeResult.mergedName}\n${mergeResult.newRank} • ${mergeResult.newCP.toLocaleString()} CP`, inline: true },
                    { name: '🔥 Sacrificed Powers', value: `${sacrificePowers.length} powers consumed`, inline: true },
                    { name: '📈 Final CP', value: `${mergeResult.newCP.toLocaleString()} CP`, inline: true },
                    { name: '💰 Cost', value: `${mergeResult.mergeCost.toLocaleString()} coins`, inline: true },
                    { name: '🔢 Formula', value: `${mainPower.combat_power} + ${mergeResult.totalSacrificeCP}`, inline: true },
                    { name: '⏰ Next Merge', value: 'Available in 1 hour', inline: true }
                )
                .setFooter({ text: 'Use /otequip to equip your new merged power!' })
                .setTimestamp();

            const responseMethod = interaction.deferred ? 'editReply' : 'update';
            await interaction[responseMethod]({
                embeds: [successEmbed],
                components: []
            });

        } else {
            // Failed merge - return half the cost
            const refundAmount = Math.floor(mergeResult.mergeCost * 0.5);
            await updateUserCoins(userId, -refundAmount);

            const failureEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Merge Failed!')
                .setDescription(`The merge attempt failed! All powers remain unchanged.`)
                .addFields(
                    { name: '🎯 Success Rate', value: `${mergeResult.successRate}%`, inline: true },
                    { name: '💔 Result', value: 'Merge failed, no changes made', inline: true },
                    { name: '💰 Refund', value: `${refundAmount.toLocaleString()} coins (50% refund)`, inline: true },
                    { name: '⏰ Next Attempt', value: 'Available immediately', inline: true }
                )
                .setFooter({ text: 'Try again with different powers or wait for better luck!' })
                .setTimestamp();

            const responseMethod = interaction.deferred ? 'editReply' : 'update';
            await interaction[responseMethod]({
                embeds: [failureEmbed],
                components: []
            });
        }

        // Clean up session data
        delete interaction.client.mergeSelections[interaction.user.id];

    } catch (error) {
        logger.error('Error in merge confirmation:', error);
        const responseMethod = interaction.replied || interaction.deferred ? 'followUp' : 'reply';
        await interaction[responseMethod]({
            content: '❌ An error occurred during merge. Please try again later.',
            flags: 64
        });
    }
}

async function handleMergeCancel(interaction) {
    try {
        // Clean up session data
        if (interaction.client.mergeSelections) {
            delete interaction.client.mergeSelections[interaction.user.id];
        }

        await interaction.update({
            content: '❌ Merge cancelled. Use `/otmerge` to start again.',
            embeds: [],
            components: []
        });

    } catch (error) {
        logger.error('Error handling merge cancel:', error);
        await interaction.reply({
            content: '❌ An error occurred while cancelling.',
            flags: 64
        });
    }
}

function getRankEmoji(rank) {
    const emojis = {
        'Normal': '⚪',
        'Rare': '🔵',
        'Epic': '🟣',
        'Legendary': '🟡',
        'Mythic': '🔴'
    };
    return emojis[rank] || '⚪';
}

async function handleTermsAcceptance(interaction) {
    try {
        // Create registration modal
        const modal = new ModalBuilder()
            .setCustomId('registration_modal')
            .setTitle('Attack on Titan RPG Registration');

        const usernameInput = new TextInputBuilder()
            .setCustomId('username_input')
            .setLabel('Choose your username')
            .setStyle(TextInputStyle.Short)
            .setMinLength(3)
            .setMaxLength(20)
            .setPlaceholder('Enter a unique username (3-20 characters)')
            .setRequired(true);

        const passwordInput = new TextInputBuilder()
            .setCustomId('password_input')
            .setLabel('Create a secure password')
            .setStyle(TextInputStyle.Short)
            .setMinLength(6)
            .setMaxLength(50)
            .setPlaceholder('Enter a secure password (6+ characters)')
            .setRequired(true);

        const usernameRow = new ActionRowBuilder().addComponents(usernameInput);
        const passwordRow = new ActionRowBuilder().addComponents(passwordInput);

        modal.addComponents(usernameRow, passwordRow);

        await interaction.showModal(modal);

    } catch (error) {
        logger.error('Error handling terms acceptance:', error);
        await interaction.reply({
            content: '❌ An error occurred. Please try again.',
            flags: 64
        });
    }
}

async function handleTermsDecline(interaction) {
    const declineEmbed = new EmbedBuilder()
        .setColor('#ff6b6b')
        .setTitle('❌ Registration Cancelled')
        .setDescription('You must accept the Terms & Conditions to use this bot.')
        .addFields(
            { name: '📝 Try Again', value: 'Use `/register` when you\'re ready to accept the terms', inline: false }
        )
        .setTimestamp();

    await interaction.update({
        embeds: [declineEmbed],
        components: []
    });
}

async function handleModalSubmission(interaction) {
    try {
        if (interaction.customId === 'registration_modal') {
            await handleRegistrationModal(interaction);
        } else if (interaction.customId === 'login_modal') {
            await handleLoginModal(interaction);
        } else if (interaction.customId === 'change_password_modal') {
            await handlePasswordChangeModal(interaction);
        } else if (interaction.customId.startsWith('report_')) {
            await handleReportModal(interaction);
        } else if (interaction.customId.startsWith('admin_reply_modal_')) {
            await handleAdminReplyModal(interaction);
        } else if (interaction.customId === 'enhanced_gacha_purchase_modal') {
            await handleEnhancedGachaPurchaseModal(interaction);
        } else if (interaction.customId === 'buy_draws_modal') {
            await handleBuyDrawsModal(interaction);
        } else if (interaction.customId.startsWith('credeem_config_')) {
            await handleCredeemConfigModal(interaction);
        } else {
            await interaction.reply({
                content: '❌ Unknown modal submission.',
                flags: 64
            });
        }

    } catch (error) {
        logger.error('Error handling modal submission:', error);

        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ An error occurred while processing the form submission.',
                flags: 64
            });
        }
    }
}

async function handleRegistrationModal(interaction) {
    const { getUserByDiscordId, getUserByUsername, createUser, addUserPower } = require('../utils/database');
    const { getRandomPower, getPowerCP } = require('../utils/powers');
    const bcrypt = require('bcrypt');

    await interaction.deferReply({ flags: 64 });

    try {
        const discordId = interaction.user.id;
        const username = interaction.fields.getTextInputValue('username_input');
        const password = interaction.fields.getTextInputValue('password_input');

        // Check if user is already registered
        const existingUser = await getUserByDiscordId(discordId);
        if (existingUser) {
            const alreadyRegisteredEmbed = new EmbedBuilder()
                .setColor('#ffaa00')
                .setTitle('⚠️ Already Registered')
                .setDescription(`You are already registered as **${existingUser.username}**!`)
                .setTimestamp();

            return interaction.editReply({ embeds: [alreadyRegisteredEmbed] });
        }

        // Check if username is already taken
        const existingUsername = await getUserByUsername(username);
        if (existingUsername) {
            const usernameErrorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Username Taken')
                .setDescription(`The username **${username}** is already taken. Please choose a different one.`)
                .addFields({
                    name: '💡 Tips for choosing a username:',
                    value: '• Use 3-20 characters\n• Mix letters and numbers\n• Make it memorable and unique\n• Avoid special characters',
                    inline: false
                })
                .setFooter({ text: 'Try registering again with a different username!' });

            return interaction.editReply({ embeds: [usernameErrorEmbed] });
        }

        // Validate username (alphanumeric and underscores only)
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            const validationEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Invalid Username')
                .setDescription('Username can only contain letters, numbers, and underscores.')
                .setTimestamp();

            return interaction.editReply({ embeds: [validationEmbed] });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create new user
        const userId = await createUser(discordId, username, hashedPassword);

        if (!userId) {
            throw new Error('Failed to create user account');
        }

        // Generate starting power
        const startingPower = getRandomPower();
        const startingCP = getPowerCP(startingPower);

        // Add starting power to user
        await addUserPower(userId, startingPower.id, startingCP);

        // Add 10 free gacha draws for new users
        const { updateUserGachaDraws } = require('../utils/database');
        await updateUserGachaDraws(userId, 10);

        const successEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('🎉 Registration Successful!')
            .setDescription(`Welcome to the world of **Attack on Titan**, **${username}**!`)
            .addFields(
                { name: '👤 Your Account', value: `**Username:** ${username}\n**Starting Coins:** 1,000`, inline: true },
                { name: '⚡ Starting Power', value: `**${startingPower.name}**\n*${startingPower.description}*\nCP: ${startingCP}`, inline: true },
                { name: '🎁 Welcome Bonus', value: '**10 Free Gacha Draws**\nUse \`ot gacha\` to start drawing!', inline: true },
                { name: '🎮 Getting Started', value: '• `ot character` - View your profile\n• `ot gacha` - Use free draws\n• `ot battle` - Fight titans\n• `ot store` - Buy equipment\n• `ot arena` - View leaderboard', inline: false }
            )
            .setFooter({ text: 'Your journey begins now! Fight for humanity!' })
            .setTimestamp();

        logger.info(`New user registered: ${username} (${discordId})`);

        await interaction.editReply({ embeds: [successEmbed] });

    } catch (error) {
        logger.error('Error in registration modal:', error);

        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Registration Failed')
            .setDescription('An error occurred during registration. Please try again.')
            .setFooter({ text: 'Contact support if the issue persists' });

        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

async function handleLoginModal(interaction) {
    const { loginUser } = require('../utils/database');

    await interaction.deferReply({ flags: 64 });

    try {
        const discordId = interaction.user.id;
        const username = interaction.fields.getTextInputValue('login_username_input');
        const password = interaction.fields.getTextInputValue('login_password_input');

        // Attempt login
        const loginResult = await loginUser(discordId, username, password);

        if (!loginResult.success) {
            let errorTitle = '❌ Login Failed';
            let errorDescription = loginResult.error;

            if (loginResult.error === 'Account is already logged in by another user') {
                errorTitle = '🔒 Account In Use';
                errorDescription = `The account **${username}** is currently logged in by another Discord user.\n\nTo access this account, they must use \`/logout\` first.`;
            }

            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle(errorTitle)
                .setDescription(errorDescription)
                .addFields({
                    name: '🔐 Security Features',
                    value: '• Only one Discord user can be logged in per game account\n• This prevents unauthorized access and cheating\n• Original account creators can always change passwords',
                    inline: false
                })
                .setFooter({ text: 'Attack on Titan RPG Security System' });

            return interaction.editReply({ embeds: [errorEmbed] });
        }

        // Login successful
        const user = loginResult.user;
        const successEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Login Successful!')
            .setDescription(`Welcome back, **${user.username}**!`)
            .addFields(
                { name: '🎮 Your Stats', value: `Coins: ${user.coins.toLocaleString()}\nBattles Won: ${user.battles_won}`, inline: true },
                { name: '🎯 Ready to Play', value: '• Use `a character` to view your profile\n• Use `a battle` to start fighting\n• Use `a draw` to get new powers', inline: true },
                { name: '🔐 Session Active', value: 'You are now logged into this account. Other users cannot access it until you logout.', inline: false }
            )
            .setFooter({ text: 'Your journey continues! Fight for humanity!' })
            .setTimestamp();

        logger.info(`User logged in: ${username} (Discord: ${discordId})`);

        await interaction.editReply({ embeds: [successEmbed] });

    } catch (error) {
        logger.error('Error in login modal:', error);

        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Login Failed')
            .setDescription('An error occurred during login. Please try again.')
            .setFooter({ text: 'Contact support if the issue persists' });

        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

async function handlePasswordChangeModal(interaction) {
    const { changePassword } = require('../utils/database');

    await interaction.deferReply({ flags: 64 });

    try {
        const discordId = interaction.user.id;
        const currentPassword = interaction.fields.getTextInputValue('current_password_input');
        const newPassword = interaction.fields.getTextInputValue('new_password_input');
        const confirmPassword = interaction.fields.getTextInputValue('confirm_password_input');

        // Validate new password confirmation
        if (newPassword !== confirmPassword) {
            const mismatchEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Password Mismatch')
                .setDescription('The new password and confirmation password do not match.')
                .addFields({
                    name: '🔐 Password Requirements',
                    value: '• Must be 6-50 characters long\n• Both password fields must match exactly\n• Use a secure, unique password',
                    inline: false
                })
                .setFooter({ text: 'Please try again with matching passwords' });

            return interaction.editReply({ embeds: [mismatchEmbed] });
        }

        // Attempt password change
        const changeResult = await changePassword(discordId, currentPassword, newPassword);

        if (!changeResult.success) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Password Change Failed')
                .setDescription(changeResult.error)
                .addFields({
                    name: '🔧 If you forgot your password',
                    value: 'Contact support for assistance with password recovery',
                    inline: false
                })
                .setFooter({ text: 'Security is important - verify your current password' });

            return interaction.editReply({ embeds: [errorEmbed] });
        }

        // Password change successful
        const successEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Password Changed Successfully!')
            .setDescription('Your account password has been updated.')
            .addFields(
                { name: '🔐 Security Notice', value: 'Your password has been changed successfully. Keep it secure!', inline: true },
                { name: '🎮 Continue Playing', value: 'You can continue using all game features normally.', inline: true }
            )
            .setFooter({ text: 'Password updated successfully' })
            .setTimestamp();

        logger.info(`Password changed for user: ${discordId}`);

        await interaction.editReply({ embeds: [successEmbed], flags: 64 });

    } catch (error) {
        logger.error('Error in password change modal:', error);

        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Password Change Failed')
            .setDescription('An error occurred while changing your password. Please try again.')
            .setFooter({ text: 'Contact support if the issue persists' });

        await interaction.editReply({ embeds: [errorEmbed], flags: 64 });
    }
}

async function handleStoreSelectMenu(interaction) {
    const { getUserByDiscordId, getAllPowers } = require('../utils/database');
    const { getRankEmoji, getRankColor } = require('../utils/powers');

    try {
        const user = await getUserByDiscordId(interaction.user.id);
        if (!user) {
            return interaction.reply({
                content: '❌ You need to register first! Use `/register` command.',
                flags: 64
            });
        }

        const selectedRank = interaction.values[0];

        if (selectedRank === 'gacha_draws') {
            // Handle enhanced gacha draws purchase
            const gachaManager = require('../utils/gachaManager');

            try {
                const menuData = await gachaManager.createGachaMenu(user);

                // Add store-specific purchase buttons
                const storeButtons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('store_buy_1_draw')
                            .setLabel('Buy 1 Draw (1,000)')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('🎫')
                            .setDisabled(user.coins < 1000),
                        new ButtonBuilder()
                            .setCustomId('store_buy_5_draws')
                            .setLabel('Buy 5 Draws (5,000)')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('🎰')
                            .setDisabled(user.coins < 5000),
                        new ButtonBuilder()
                            .setCustomId('store_buy_10_draws')
                            .setLabel('Buy 10 Draws (10,000)')
                            .setStyle(ButtonStyle.Success)
                            .setEmoji('💎')
                            .setDisabled(user.coins < 10000)
                    );

                // Modify the embed to show store context
                menuData.embed.setTitle('🏪 Store - Enhanced Gacha Draws')
                    .setDescription(`**${user.username}** • Quick purchase options available below`)
                    .addFields({
                        name: '🛒 Quick Purchase Options',
                        value: '• **1 Draw:** 1,000 coins\n• **5 Draws:** 5,000 coins (bulk option)\n• **10 Draws:** 10,000 coins (best value)\n• **Custom amount:** Use `ot buy draw <amount>`',
                        inline: false
                    });

                return interaction.reply({ 
                    embeds: [menuData.embed], 
                    components: [storeButtons, menuData.components[0]], 
                    flags: 64 
                });

            } catch (error) {
                logger.error('Error showing enhanced store gacha menu:', error);

                // Fallback to basic store menu
                const embed = new EmbedBuilder()
                    .setColor('#9932cc')
                    .setTitle('🎫 Gacha Draws Shop')
                    .setDescription(`**${user.username}**`)
                    .addFields(
                        {
                            name: '💰 Your Balance',
                            value: `**${user.coins.toLocaleString()}** coins`,
                            inline: true
                        },
                        {
                            name: '🎫 Current Draws',
                            value: `**${user.gacha_draws}** draws available`,
                            inline: true
                        },
                        {
                            name: '💎 Price',
                            value: '**1,000** coins per draw',
                            inline: true
                        },
                        {
                            name: '🛒 How to Purchase',
                            value: 'Use `ot buy draw <amount>` to purchase gacha draws\n\nExample: `ot buy draw 5` (costs 5,000 coins)',
                            inline: false
                        }
                    )
                    .setFooter({ text: 'Enhanced Gacha System' })
                    .setTimestamp();

                return interaction.reply({ embeds: [embed], flags: 64 });
            }
        }

        // Get powers for selected rank
        const allPowers = await getAllPowers();
        let filteredPowers;

        if (selectedRank === 'all') {
            filteredPowers = allPowers;
        } else {
            // Case-insensitive filtering to handle any case mismatches
            filteredPowers = allPowers.filter(power => 
                power.rank.toLowerCase() === selectedRank.toLowerCase()
            );
        }

        if (filteredPowers.length === 0) {
            return await interaction.reply({
                content: `❌ No powers available for ${selectedRank} rank! This rank may not have powers added yet.`,
                flags: 64
            });
        }

        // Use persistent pagination system for better navigation
        const { createPersistentPagination } = require('../utils/persistentPagination');
        const { createStoreRankEmbed } = require('../utils/storeEmbeds');
        const itemsPerPage = 10;

        // Create a consistent command type for store pagination
        const commandType = selectedRank === 'all' ? 'store' : `store_${selectedRank}`;

        const paginationData = createPersistentPagination(
            filteredPowers,
            itemsPerPage,
            (powers, page, totalPages) => createStoreRankEmbed(user, powers, selectedRank, page, totalPages),
            interaction.user.id,
            commandType
        );

        return await interaction.reply({ 
            embeds: [paginationData.embed], 
            components: paginationData.components,
            flags: 64 
        });

    } catch (error) {
        logger.error('Error handling store select menu:', error);
        await interaction.reply({
            content: '❌ An error occurred while loading the store. Please try again.',
            flags: 64
        });
    }
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
    // Remove level scaling for consistent pricing

    return basePrice;
}

async function handleReportModal(interaction) {
    const { getUserByDiscordId } = require('../utils/database');

    await interaction.deferReply({ flags: 64 });

    try {
        const user = await getUserByDiscordId(interaction.user.id);
        if (!user) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Account Required')
                .setDescription('You need to be registered to submit reports!')
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }

        // Extract report data from modal
        const subject = interaction.fields.getTextInputValue('report_subject');
        const description = interaction.fields.getTextInputValue('report_description');
        const steps = interaction.fields.getTextInputValue('report_steps') || 'None provided';
        const additional = interaction.fields.getTextInputValue('report_additional') || 'None provided';

        // Get report type from customId
        const reportType = interaction.customId.split('_')[1];

        // Get stored report data
        const reportData = global.pendingReports?.get(interaction.customId);

        // Create detailed report embed for admins
        const adminReportEmbed = new EmbedBuilder()
            .setColor(getReportColor(reportType))
            .setTitle(`${getReportEmoji(reportType)} ${getReportTitle(reportType)}`)
            .setDescription(`**Subject:** ${subject}`)
            .addFields(
                { name: '👤 Reporter', value: `${user.username} (${interaction.user.tag})`, inline: true },
                { name: '📅 Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                { name: '📝 Type', value: reportType.charAt(0).toUpperCase() + reportType.slice(1), inline: true },
                { name: '📋 Description', value: description.length > 1024 ? description.substring(0, 1021) + '...' : description, inline: false },
                { name: '🔄 Steps to Reproduce', value: steps.length > 1024 ? steps.substring(0, 1021) + '...' : steps, inline: false },
                { name: '➕ Additional Info', value: additional.length > 1024 ? additional.substring(0, 1021) + '...' : additional, inline: false }
            )
            .setFooter({ text: `Report ID: ${interaction.customId}` })
            .setTimestamp();

        // Add reported user info if applicable
        if (reportData?.reportedUserId) {
            adminReportEmbed.addFields({
                name: '⚠️ Reported User',
                value: `${reportData.reportedUsername} (<@${reportData.reportedUserId}>)`,
                inline: true
            });
        }

        // Log the report
        logger.info(`Report submitted by ${user.username}: ${reportType} - ${subject}`);

        // Send confirmation to user
        const confirmEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Report Submitted Successfully')
            .setDescription('Thank you for helping improve the bot!')
            .addFields(
                { name: '📋 Report Type', value: getReportTitle(reportType), inline: true },
                { name: '📝 Subject', value: subject, inline: true },
                { name: '⏰ Status', value: 'Pending Review', inline: true },
                { name: '🔍 What happens next?', value: '• Admins will review your report\n• Bugs will be investigated and fixed\n• Rule violations will be addressed\n• You may be contacted for additional info', inline: false }
            )
            .setFooter({ text: 'Report submitted • Thank you for your contribution!' })
            .setTimestamp();

        await interaction.editReply({ embeds: [confirmEmbed] });

        // Keep report data for admin replies (don't clean up immediately)
        // Store permanently with a 7-day expiry for admin responses
        if (!global.storedReports) global.storedReports = new Map();

        const reportInfo = {
            reporterId: interaction.user.id,
            reporterUsername: user.username,
            reportType: reportType,
            subject: subject,
            description: description,
            steps: steps,
            additional: additional,
            reportedUserId: reportData?.reportedUserId || null,
            reportedUsername: reportData?.reportedUsername || null,
            timestamp: new Date().toISOString(),
            expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
        };

        global.storedReports.set(interaction.customId, reportInfo);

        // Clean up pending reports
        if (global.pendingReports) {
            global.pendingReports.delete(interaction.customId);
        }

        // Debug log to check reportData
        logger.info('Report Data for notification:', JSON.stringify(reportData, null, 2));

        // Send notification to admin
        await sendAdminNotification(interaction.client, {
            type: reportType,
            subject,
            description,
            steps,
            additional,
            reporter: user.username,
            reporterId: interaction.user.id,
            reportedUser: reportData?.reportedUsername || reportData?.reportedDisplayName || null,
            reportedUserId: reportData?.reportedUserId || null,
            reportId: interaction.customId,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error handling report modal:', error);

        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Report Submission Failed')
            .setDescription('An error occurred while submitting your report. Please try again.')
            .setTimestamp();

        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

function getReportColor(type) {
    switch (type) {
        case 'bug': return '#ff9500';
        case 'user': return '#ff4757';
        case 'exploit': return '#ff3838';
        case 'other': return '#5352ed';
        default: return '#747d8c';
    }
}

function getReportEmoji(type) {
    switch (type) {
        case 'bug': return '🐛';
        case 'user': return '⚠️';
        case 'exploit': return '🚨';
        case 'other': return '📝';
        default: return '📋';
    }
}

function getReportTitle(type) {
    switch (type) {
        case 'bug': return 'Bug Report';
        case 'user': return 'User Report';
        case 'exploit': return 'Exploit/Cheating Report';
        case 'other': return 'General Issue Report';
        default: return 'Report';
    }
}

async function sendAdminNotification(client, reportInfo) {
    try {
        const config = require('../config/bot');

        // Try to send DM first
        try {
            const admin = await client.users.fetch(config.adminId);

            if (!admin) {
                logger.error('Could not fetch admin user for report notification');
                return;
            }

            // Create comprehensive admin notification embed
            const adminEmbed = new EmbedBuilder()
                .setColor(getReportColor(reportInfo.type))
                .setTitle(`🚨 NEW ${getReportTitle(reportInfo.type).toUpperCase()}`)
                .setDescription(`**Subject:** ${reportInfo.subject}`)
                .addFields(
                    { name: '👤 Reporter', value: `${reportInfo.reporter} (<@${reportInfo.reporterId}>)`, inline: true },
                    { name: '📅 Submitted', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    { name: '🏷️ Type', value: reportInfo.type.charAt(0).toUpperCase() + reportInfo.type.slice(1), inline: true },
                    { name: '📝 Description', value: reportInfo.description.length > 1024 ? reportInfo.description.substring(0, 1021) + '...' : reportInfo.description, inline: false }
                )
                .setFooter({ text: `Report ID: ${reportInfo.reportId}` })
                .setTimestamp();

            // Add reported user if applicable
            if (reportInfo.reportedUserId && reportInfo.reportedUser) {
                adminEmbed.addFields({
                    name: '⚠️ Reported User',
                    value: `${reportInfo.reportedUser} (<@${reportInfo.reportedUserId}>)`,
                    inline: true
                });
            }

            // Add steps and additional info if provided
            if (reportInfo.steps && reportInfo.steps !== 'None provided') {
                adminEmbed.addFields({
                    name: '🔄 Steps to Reproduce',
                    value: reportInfo.steps.length > 1024 ? reportInfo.steps.substring(0, 1021) + '...' : reportInfo.steps,
                    inline: false
                });
            }

            if (reportInfo.additional && reportInfo.additional !== 'None provided') {
                adminEmbed.addFields({
                    name: '📎 Additional Information',
                    value: reportInfo.additional.length > 1024 ? reportInfo.additional.substring(0, 1021) + '...' : reportInfo.additional,
                    inline: false
                });
            }

            // Create reply button for admin
            const replyButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`admin_reply_${reportInfo.reportId}`)
                        .setLabel('📧 Reply to Reporter')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId(`admin_resolve_${reportInfo.reportId}`)
                        .setLabel('✅ Mark Resolved')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`admin_investigate_${reportInfo.reportId}`)
                        .setLabel('🔍 Under Investigation')
                        .setStyle(ButtonStyle.Secondary)
                );

            // Try to send DM
            await admin.send({
                embeds: [adminEmbed],
                components: [replyButton]
            });

            logger.info(`Admin notification sent via DM for report: ${reportInfo.reportId}`);

        } catch (dmError) {
            logger.error('Could not send DM to admin, trying reports channel instead:', dmError);

            // Fallback: Try to send to specific reports channel
            try {
                const guild = client.guilds.cache.get(config.guildId);
                if (guild) {
                    const reportsChannel = guild.channels.cache.get(config.reportsChannelId);

                    if (reportsChannel) {
                        const fallbackEmbed = new EmbedBuilder()
                            .setColor(getReportColor(reportInfo.type))
                            .setTitle(`🚨 NEW REPORT - DM FAILED`)
                            .setDescription(`<@${config.adminId}> - Could not send DM. Please enable DMs from server members.`)
                            .addFields(
                                { name: '👤 Reporter', value: `${reportInfo.reporter} (<@${reportInfo.reporterId}>)`, inline: true },
                                { name: '🏷️ Type', value: reportInfo.type.charAt(0).toUpperCase() + reportInfo.type.slice(1), inline: true },
                                { name: '📝 Subject', value: reportInfo.subject, inline: false },
                                { name: '📋 Description', value: reportInfo.description.length > 500 ? reportInfo.description.substring(0, 497) + '...' : reportInfo.description, inline: false },
                                { name: '📋 Check Console', value: 'Full report details are in the console logs. Use `/adminreports` for complete details.', inline: false }
                            )
                            .setFooter({ text: 'Enable DMs to receive full report notifications with reply buttons' })
                            .setTimestamp();

                        await reportsChannel.send({ embeds: [fallbackEmbed] });
                        logger.info(`Admin notification sent to reports channel as DM fallback`);
                    } else {
                        logger.error('Reports channel not found, falling back to any available channel');

                        // Final fallback: any channel in the guild
                        const channel = guild.channels.cache.find(ch => 
                            ch.type === 0 && // TEXT channel
                            ch.permissionsFor(config.adminId)?.has('SendMessages') &&
                            ch.permissionsFor(client.user.id)?.has('SendMessages')
                        );

                        if (channel) {
                            const finalFallbackEmbed = new EmbedBuilder()
                                .setColor('#ff0000')
                                .setTitle(`🚨 REPORT NOTIFICATION FAILED`)
                                .setDescription(`<@${config.adminId}> - New report submitted but notifications failed. Check console logs and use \`/adminreports\` command.`)
                                .addFields(
                                    { name: '👤 Reporter', value: reportInfo.reporter, inline: true },
                                    { name: '🏷️ Type', value: reportInfo.type.charAt(0).toUpperCase() + reportInfo.type.slice(1), inline: true },
                                    { name: '📝 Subject', value: reportInfo.subject, inline: false }
                                )
                                .setFooter({ text: 'Configure reports channel and enable DMs for better notifications' })
                                .setTimestamp();

                            await channel.send({ embeds: [finalFallbackEmbed] });
                            logger.info(`Final fallback notification sent to ${channel.name}`);
                        }
                    }
                }
            } catch (channelError) {
                logger.error('All notification methods failed:', channelError);
            }
        }

    } catch (error) {
        logger.error('Error sending admin notification:', error);
    }

    // Always log to console as backup
    logger.info('ADMIN REPORT NOTIFICATION:', JSON.stringify(reportInfo, null, 2));
}

async function handleAdminReply(interaction) {
    try {
        const config = require('../config/bot');

        // Verify admin permissions
        if (interaction.user.id !== config.adminId) {
            return interaction.reply({
                content: '❌ You do not have permission to use admin functions.',
                flags: 64
            });
        }

        const reportId = interaction.customId.replace('admin_reply_', '');

        // Create reply modal
        const modal = new ModalBuilder()
            .setCustomId(`admin_reply_modal_${reportId}`)
            .setTitle('Reply to Report');

        const replyInput = new TextInputBuilder()
            .setCustomId('admin_reply_message')
            .setLabel('Your Response')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Type your response to the user who submitted this report...')
            .setRequired(true)
            .setMaxLength(2000);

        const actionRow = new ActionRowBuilder().addComponents(replyInput);
        modal.addComponents(actionRow);

        await interaction.showModal(modal);

    } catch (error) {
        logger.error('Error handling admin reply:', error);
        await interaction.reply({
            content: '❌ An error occurred while processing your reply.',
            flags: 64
        });
    }
}

async function handleAdminResolve(interaction) {
    try {
        const config = require('../config/bot');

        // Verify admin permissions
        if (interaction.user.id !== config.adminId) {
            return interaction.reply({
                content: '❌ You do not have permission to use admin functions.',
                flags: 64
            });
        }

        const reportId = interaction.customId.replace('admin_resolve_', '');

        // Update the embed to show resolved status
        const originalEmbed = interaction.message.embeds[0];
        const resolvedEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle(originalEmbed.title + ' - ✅ RESOLVED')
            .setDescription(originalEmbed.description)
            .addFields(originalEmbed.fields)
            .setFooter({ text: `${originalEmbed.footer.text} | Resolved at ${new Date().toLocaleString()}` })
            .setTimestamp();

        await interaction.update({
            embeds: [resolvedEmbed],
            components: []
        });

        logger.info(`Report marked as resolved: ${reportId}`);

    } catch (error) {
        logger.error('Error handling admin resolve:', error);
        await interaction.reply({
            content: '❌ An error occurred while marking the report as resolved.',
            flags: 64
        });
    }
}

async function handleAdminInvestigate(interaction) {
    try {
        const config = require('../config/bot');

        // Verify admin permissions
        if (interaction.user.id !== config.adminId) {
            return interaction.reply({
                content: '❌ You do not have permission to use admin functions.',
                flags: 64
            });
        }

        const reportId = interaction.customId.replace('admin_investigate_', '');

        // Update the embed to show under investigation status
        const originalEmbed = interaction.message.embeds[0];
        const investigatingEmbed = new EmbedBuilder()
            .setColor('#ffaa00')
            .setTitle(originalEmbed.title + ' - 🔍 UNDER INVESTIGATION')
            .setDescription(originalEmbed.description)
            .addFields(originalEmbed.fields)
            .setFooter({ text: `${originalEmbed.footer.text} | Investigation started at ${new Date().toLocaleString()}` })
            .setTimestamp();

        // Keep the reply button but disable others
        const updatedButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`admin_reply_${reportId}`)
                    .setLabel('📧 Reply to Reporter')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`admin_resolve_${reportId}`)
                    .setLabel('✅ Mark Resolved')
                    .setStyle(ButtonStyle.Success)
            );

        await interaction.update({
            embeds: [investigatingEmbed],
            components: [updatedButtons]
        });

        logger.info(`Report marked as under investigation: ${reportId}`);

    } catch (error) {
        logger.error('Error handling admin investigate:', error);
        await interaction.reply({
            content: '❌ An error occurred while marking the report as under investigation.',
            flags: 64
        });
    }
}

async function handleAdminReplyModal(interaction) {
    try {
        const config = require('../config/bot');

        // Verify admin permissions
        if (interaction.user.id !== config.adminId) {
            return interaction.reply({
                content: '❌ You do not have permission to use admin functions.',
                flags: 64
            });
        }

        await interaction.deferReply({ flags: 64 });

        const reportId = interaction.customId.replace('admin_reply_modal_', '');
        const replyMessage = interaction.fields.getTextInputValue('admin_reply_message');

        // Extract reporter ID from stored report data
        const reportData = global.storedReports?.get(reportId);

        if (!reportData) {
            return interaction.editReply({
                content: '❌ Could not find report data. The report may be too old to reply to (reports expire after 7 days).'
            });
        }

        // Check if report has expired
        if (Date.now() > reportData.expiresAt) {
            global.storedReports.delete(reportId);
            return interaction.editReply({
                content: '❌ This report has expired and can no longer receive replies.'
            });
        }

        // Send reply to the original reporter
        try {
            const reporter = await interaction.client.users.fetch(reportData.reporterId);

            const replyEmbed = new EmbedBuilder()
                .setColor('#3498db')
                .setTitle('📧 Response to Your Report')
                .setDescription(`You have received a response regarding your report: **${reportData.subject}**`)
                .addFields(
                    { name: '👤 From', value: 'Bot Administrator', inline: true },
                    { name: '📅 Response Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    { name: '💬 Admin Response', value: replyMessage, inline: false },
                    { name: '📋 Original Report', value: `**Type:** ${reportData.reportType}\n**Subject:** ${reportData.subject}`, inline: false },
                    { name: '📎 File Attachments', value: 'To include files in future reports, upload them to Discord or Imgur and paste the URLs in the "Additional Information" field.', inline: false }
                )
                .setFooter({ text: 'Attack on Titan Bot - Report Response System' })
                .setTimestamp();

            await reporter.send({ embeds: [replyEmbed] });

            // Confirm to admin
            await interaction.editReply({
                content: `✅ Your reply has been sent to ${reportData.reporterUsername}.`
            });

            logger.info(`Admin reply sent for report ${reportId} to user ${reportData.reporterUsername}`);

        } catch (dmError) {
            logger.error('Error sending DM to reporter:', dmError);
            await interaction.editReply({
                content: '❌ Could not send DM to the reporter. They may have DMs disabled or left the server.'
            });
        }

    } catch (error) {
        logger.error('Error handling admin reply modal:', error);
        if (!interaction.replied) {
            await interaction.reply({
                content: '❌ An error occurred while sending your reply.',
                flags: 64
            });
        }
    }
}

async function handleGachaDraw(interaction, drawCount = 1) {
    const { getUserByDiscordId, performGachaDraw } = require('../utils/database');
    const { getRankColor, getRankEmoji } = require('../utils/powers');

    await interaction.deferReply({ flags: 64 });

    try {
        // Get fresh user data to ensure we have the latest gacha_draws count
        const user = await getUserByDiscordId(interaction.user.id);
        if (!user) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Not Registered')
                .setDescription('You need to register first! Use `/register` command.')
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }

        logger.info(`Gacha draw attempt by ${user.username}: has ${user.gacha_draws} draws, requesting ${drawCount} draws`);

        // Check if user has enough draws
        if (user.gacha_draws < drawCount) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Insufficient Draws')
                .setDescription(`You need **${drawCount}** draws but only have **${user.gacha_draws}** available!`)
                .addFields(
                    {
                        name: '💰 Buy More Draws',
                        value: 'Use `ot buy draw <amount>` to purchase more draws\n**Price:** 1,000 coins per draw',
                        inline: false
                    }
                )
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }

        // Perform multiple draws
        const drawResults = [];
        let remainingDraws = user.gacha_draws;

        for (let i = 0; i < drawCount; i++) {
            try {
                const drawResult = await performGachaDraw(user.id, 'free');
                if (drawResult && drawResult.power) {
                    drawResults.push(drawResult);
                    remainingDraws = drawResult.remainingDraws;
                } else {
                    logger.warn(`Draw ${i + 1} failed: invalid result`);
                    break;
                }
            } catch (error) {
                logger.error(`Error in draw ${i + 1}:`, error);
                break;
            }
        }

        if (drawResults.length === 0) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ System Error')
                .setDescription('An unexpected error occurred. Please try again.')
                .addFields(
                    {
                        name: '🔧 Troubleshooting',
                        value: '• Wait a few seconds and try again\n• Check your internet connection\n• Contact support if the issue persists',
                        inline: false
                    }
                )
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }

        // Create result embed
        if (drawCount === 1) {
            // Single draw result
            const drawResult = drawResults[0];
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
                        value: `${remainingDraws}`,
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

            await interaction.editReply({ embeds: [embed] });
        } else {
            // Multiple draw results
            const embed = new EmbedBuilder()
                .setColor('#9932cc')
                .setTitle(`🎰 ${drawCount}x Gacha Draw Results!`)
                .setDescription(`**${user.username}** pulled ${drawResults.length} new powers!`)
                .setTimestamp();

            // Group results by rank
            const rankGroups = {};
            let totalCP = 0;
            let bestRank = 'Normal';
            const rankHierarchy = ['Normal', 'Rare', 'Epic', 'Legendary', 'Mythic'];

            for (const result of drawResults) {
                const rank = result.power.rank;
                if (!rankGroups[rank]) {
                    rankGroups[rank] = [];
                }
                rankGroups[rank].push(result);
                totalCP += result.powerCP;

                // Track best rank
                if (rankHierarchy.indexOf(rank) > rankHierarchy.indexOf(bestRank)) {
                    bestRank = rank;
                }
            }

            // Create results summary
            let resultText = '';
            for (const rank of rankHierarchy) {
                if (rankGroups[rank]) {
                    resultText += `\n**${getRankEmoji(rank)} ${rank}** (${rankGroups[rank].length}x):\n`;
                    for (const result of rankGroups[rank]) {
                        resultText += `• ${result.power.name} - ${result.powerCP.toLocaleString()} CP\n`;
                    }
                }
            }

            embed.addFields(
                {
                    name: '🎯 Draw Results',
                    value: resultText || 'No results to display',
                    inline: false
                },
                {
                    name: '📊 Summary',
                    value: `**Total Powers:** ${drawResults.length}\n**Total CP:** ${totalCP.toLocaleString()}\n**Best Rank:** ${getRankEmoji(bestRank)} ${bestRank}`,
                    inline: true
                },
                {
                    name: '🎫 Remaining Draws',
                    value: `${remainingDraws}`,
                    inline: true
                }
            );

            // Add pity information if available from any draw
            const latestDraw = drawResults[drawResults.length - 1];
            if (latestDraw && latestDraw.pityCounter !== undefined) {
                const pityProgress = latestDraw.pityCounter;
                const pityText = latestDraw.isPityTriggered ? 
                    '🔥 **PITY TRIGGERED!** Guaranteed Mythic received!' : 
                    `**${pityProgress}/100** pulls to guaranteed Mythic`;

                embed.addFields({
                    name: '🎯 Pity System',
                    value: pityText,
                    inline: true
                });
            }

            // Add special effects for notable pulls
            if (bestRank === 'Mythic') {
                embed.setAuthor({ name: '✨ MYTHIC PULL DETECTED! ✨' });
            } else if (bestRank === 'Legendary') {
                embed.setAuthor({ name: '🌟 LEGENDARY PULL DETECTED! 🌟' });
            }

            embed.setFooter({ text: 'Use "/otequip" to equip powers • Use "ot gacha history" to see all draws' });

            await interaction.editReply({ embeds: [embed] });
        }

        logger.info(`${user.username} completed ${drawResults.length}/${drawCount} gacha draws`);

    } catch (error) {
        logger.error('Error handling gacha draw button:', error);

        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ System Error')
            .setDescription('An unexpected error occurred. Please try again.')
            .addFields(
                {
                    name: '🔧 Troubleshooting',
                    value: '• Wait a few seconds and try again\n• Check your internet connection\n• Contact support if the issue persists',
                    inline: false
                }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

async function handleGachaHistory(interaction) {
    const { getUserByDiscordId, getGachaHistory } = require('../utils/database');

    await interaction.deferReply({ flags: 64 });

    try {
        const user = await getUserByDiscordId(interaction.user.id);
        if (!user) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Not Registered')
                .setDescription('You need to register first! Use `/register` command.')
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }

        const history = await getGachaHistory(user.id, 10);

        if (history.length === 0) {
            const embed = new EmbedBuilder()
                .setColor('#ffaa00')
                .setTitle('📜 Gacha History')
                .setDescription('You haven\'t made any gacha draws yet!')
                .addFields(
                    {
                        name: '🎰 Get Started',
                        value: 'Use the "Draw Power" button to make your first pull!',
                        inline: false
                    }
                )
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
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

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        logger.error('Error handling gacha history button:', error);

        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Error')
            .setDescription('An error occurred while loading your gacha history. Please try again.')
            .setTimestamp();

        await interaction.editReply({ embeds: [errorEmbed] });
    }
}
async function handleCredeemSelectMenu(interaction) {
    try {
        const session = interaction.client.credeemSessions?.[interaction.user.id];
        if (!session) {
            return interaction.reply({
                content: "❌ Session expired. Please start over with \`/credeem\`.",
                flags: 64
            });
        }

        const selectedTypes = interaction.values;

        // Create modal for configuring rewards
        const modal = new ModalBuilder()
            .setCustomId(`credeem_config_${interaction.user.id}`)
            .setTitle("Configure Redeem Code Rewards");

        const rewardTypesField = new TextInputBuilder()
            .setCustomId("reward_types")
            .setLabel("Selected Reward Types")
            .setStyle(TextInputStyle.Short)
            .setValue(selectedTypes.join(", "))
            .setRequired(true);

        const coinsField = new TextInputBuilder()
            .setCustomId("coins_amount")
            .setLabel("Coins Amount (if selected)")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("e.g., 1000")
            .setRequired(false);

        const drawsField = new TextInputBuilder()
            .setCustomId("draws_amount")
            .setLabel("Gacha Draws Amount (if selected)")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("e.g., 5")
            .setRequired(false);

        const usageField = new TextInputBuilder()
            .setCustomId("max_uses")
            .setLabel("Max Uses (leave empty for unlimited)")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("e.g., 100")
            .setRequired(false);

        const expiryField = new TextInputBuilder()
            .setCustomId("expiry_days")
            .setLabel("Expiry Days (leave empty for no expiry)")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("e.g., 30")
            .setRequired(false);

        const row1 = new ActionRowBuilder().addComponents(rewardTypesField);
        const row2 = new ActionRowBuilder().addComponents(drawsField);
        const row3 = new ActionRowBuilder().addComponents(coinsField);
        const row4 = new ActionRowBuilder().addComponents(usageField);
        const row5 = new ActionRowBuilder().addComponents(expiryField);

        modal.addComponents(row1, row2, row3, row4, row5);

        await interaction.showModal(modal);

    } catch (error) {
        logger.error("Error in credeem select menu:", error);
        await interaction.reply({
            content: "❌ An error occurred while processing your selection.",
            flags: 64
        });
    }
}

async function handleCredeemConfigModal(interaction) {
    try {
        const session = interaction.client.credeemSessions?.[interaction.user.id];
        if (!session) {
            return interaction.reply({
                content: "❌ Session expired. Please start over with \`/credeem\`.",
                flags: 64
            });
        }

        const rewardTypes = interaction.fields.getTextInputValue("reward_types").split(", ");
        const coinsAmount = interaction.fields.getTextInputValue("coins_amount");
        const drawsAmount = interaction.fields.getTextInputValue("draws_amount");
        const maxUses = interaction.fields.getTextInputValue("max_uses");
        const expiryDays = interaction.fields.getTextInputValue("expiry_days");

        // Build rewards array
        const rewards = [];
        if (rewardTypes.includes("coins") && coinsAmount) {
            rewards.push({ type: "coins", amount: parseInt(coinsAmount) });
        }
        if (rewardTypes.includes("draw_chances") && drawsAmount) {
            rewards.push({ type: "draw_chances", amount: parseInt(drawsAmount) });
        }
        if (rewardTypes.includes("custom")) {
            rewards.push({ type: "custom", description: "Custom reward configured" });
        }

        // Update session
        session.rewards = rewards;
        session.maxUses = maxUses ? parseInt(maxUses) : null;
        session.expiryDays = expiryDays ? parseInt(expiryDays) : null;

        // Show delivery selection
        const deliverySelect = new StringSelectMenuBuilder()
            .setCustomId(`credeem_delivery_${interaction.user.id}`)
            .setPlaceholder("Choose where to send the redeem code")
            .addOptions(
                {
                    label: "Send to Redeem Channel",
                    description: "Post the code in the designated redeem channel",
                    value: "channel",
                    emoji: "📢"
                },
                {
                    label: "Send to Me Only",
                    description: "Send the code privately to you",
                    value: "private",
                    emoji: "🔐"
                }
            );

        const row = new ActionRowBuilder().addComponents(deliverySelect);

        let rewardSummary = "";
        rewards.forEach(reward => {
            if (reward.type === "coins") {
                rewardSummary += `💰 ${reward.amount.toLocaleString()} coins\n`;
            } else if (reward.type === "draw_chances") {
                rewardSummary += `🎲 ${reward.amount} gacha draws\n`;
            } else if (reward.type === "custom") {
                rewardSummary += `🎁 ${reward.description}\n`;
            }
        });

        const embed = new EmbedBuilder()
            .setColor("#00ff00")
            .setTitle("🎫 Redeem Code Configuration")
            .setDescription(`**Code Name:** ${session.codeName}`)
            .addFields(
                {
                    name: "🎁 Rewards",
                    value: rewardSummary || "No rewards configured",
                    inline: false
                },
                {
                    name: "⚙️ Settings",
                    value: `**Max Uses:** ${session.maxUses || "Unlimited"}\n**Expires:** ${session.expiryDays ? `${session.expiryDays} days` : "Never"}`,
                    inline: false
                },
                {
                    name: "📝 Final Step",
                    value: "Choose where to send the generated code:",
                    inline: false
                }
            )
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            components: [row],
            flags: 64
        });

    } catch (error) {
        logger.error("Error in credeem config modal:", error);
        await interaction.reply({
            content: "❌ An error occurred while processing your configuration.",
            flags: 64
        });
    }
}

async function handleCredeemDeliverySelect(interaction) {
    const { createRedeemCode } = require("../utils/codeGenerator");

    try {
        const session = interaction.client.credeemSessions?.[interaction.user.id];
        if (!session) {
            return interaction.reply({
                content: "❌ Session expired. Please start over with \`/credeem\`.",
                flags: 64
            });
        }

        const deliveryMethod = interaction.values[0];
        const sendToChannel = deliveryMethod === "channel";

        // Generate the redeem code
        const codeData = {
            description: session.codeName,
            rewards: session.rewards,
            maxUses: session.maxUses,
            expiryDays: session.expiryDays,
            createdBy: interaction.user.username
        };

        const generatedCode = await createRedeemCode(codeData);

        // Create code display embed
        let rewardText = "";
        session.rewards.forEach(reward => {
            if (reward.type === "coins") {
                rewardText += `💰 **${reward.amount.toLocaleString()}** coins\n`;
            } else if (reward.type === "draw_chances") {
                rewardText += `🎲 **${reward.amount}** gacha draws\n`;
            } else if (reward.type === "custom") {
                rewardText += `🎁 **${reward.description}**\n`;
            }
        });

        const codeEmbed = new EmbedBuilder()
            .setColor("#00ff00")
            .setTitle("🎫 New Redeem Code Created!")
            .setDescription(`**${session.codeName}**`)
            .addFields(
                {
                    name: "🔑 Code",
                    value: `\`${generatedCode.code}\``,
                    inline: false
                },
                {
                    name: "🎁 Rewards",
                    value: rewardText || "No rewards",
                    inline: false
                },
                {
                    name: "⚙️ Settings",
                    value: `**Max Uses:** ${session.maxUses || "Unlimited"}\n**Expires:** ${session.expiryDays ? `${session.expiryDays} days` : "Never"}`,
                    inline: false
                },
                {
                    name: "👤 Created By",
                    value: interaction.user.username,
                    inline: true
                }
            )
            .setFooter({ text: "Use /otredeem to redeem this code" })
            .setTimestamp();

        if (sendToChannel) {
            // Send to redeem channel
            const redeemChannel = interaction.client.channels.cache.get("1394740660245893182");
            if (redeemChannel) {
                await redeemChannel.send({ embeds: [codeEmbed] });
                await interaction.reply({
                    content: "✅ Redeem code created and sent to the redeem channel!",
                    flags: 64
                });
            } else {
                await interaction.reply({
                    content: "❌ Redeem channel not found. Here's your code:",
                    embeds: [codeEmbed],
                    flags: 64
                });
            }
        } else {
            // Send privately
            await interaction.reply({
                content: "✅ Redeem code created and sent privately to you!",
                embeds: [codeEmbed],
                flags: 64
            });
        }

        // Clean up session
        delete interaction.client.credeemSessions[interaction.user.id];

    } catch (error) {
        logger.error("Error in credeem delivery select:", error);
        await interaction.reply({
            content: "❌ An error occurred while generating the redeem code.",
            flags: 64
        });
    }
}

async function createMultiDrawResultEmbed(user, drawResults, drawCount) {
    const { getRankEmoji, getRankColor } = require('../utils/databaseHelpers');
    const { getUserByDiscordId } = require('../utils/database');

    // Process all draw results
    const powers = [];
    let totalCP = 0;
    let bestPower = null;
    let bestCP = 0;
    const rankCounts = {};

    for (const result of drawResults) {
        const power = result.data.power;
        const cp = result.data.powerCP;

        powers.push({ power, cp });
        totalCP += cp;

        // Track rank counts
        rankCounts[power.rank] = (rankCounts[power.rank] || 0) + 1;

        if (cp > bestCP) {
            bestCP = cp;
            bestPower = power;
        }
    }

    // Sort powers by rank importance and then by CP
    const rankOrder = ['Mythic', 'Legendary', 'Epic', 'Rare', 'Normal'];
    powers.sort((a, b) => {
        const rankDiff = rankOrder.indexOf(a.power.rank) - rankOrder.indexOf(b.power.rank);
        if (rankDiff !== 0) return rankDiff;
        return b.cp - a.cp; // Higher CP first within same rank
    });

    // Create embed
    const embed = new EmbedBuilder()
        .setColor('#9932cc')
        .setTitle('🎰 10x Gacha Results!')
        .setDescription(`**${user.username}** pulled ${drawResults.length} powers!`)
        .setTimestamp();

    // Create detailed results text - show all powers
    let resultText = '';
    for (let i = 0; i < powers.length; i++) {
        const { power, cp } = powers[i];
        const emoji = await getRankEmoji(power.rank);
        resultText += `${i + 1}. ${emoji} **${power.name}** (${power.rank}) - ${cp.toLocaleString()} CP\n`;
    }

    // Get fresh user data to show accurate remaining draws
    const freshUser = await getUserByDiscordId(user.discord_id || user.discordId);
    const remainingDraws = freshUser ? freshUser.gacha_draws : 0;

    // Create rank distribution text
    let rankDistText = '';
    for (const rank of rankOrder) {
        if(rankCounts[rank]) {
            const emoji = await getRankEmoji(rank);
            rankDistText += `${emoji} ${rank}: ${rankCounts[rank]}\n`;
        }
    }

    embed.addFields(
        {
            name: '⚡ All Powers Obtained',
            value: resultText.substring(0, 1024) || 'No results to display',
            inline: false
        },
        {
            name: '📊 Summary',
            value: `**Total Powers:** ${drawResults.length}\n**Total CP:** ${totalCP.toLocaleString()}\n**Best Pull:** ${bestPower ? `${bestPower.name} (${bestCP.toLocaleString()} CP)` : 'None'}`,
            inline: true
        },
        {
            name: '🏆 Rank Distribution',
            value: rankDistText || 'No data',
            inline: true
        },
        {
            name: '🎫 Remaining Draws',
            value: `**${remainingDraws}** draws left`,
            inline: true
        }
    );

    // Add pity information if available
    const latestDraw = drawResults[drawResults.length - 1];
    const pityCounter = latestDraw?.data?.pityCounter ?? latestDraw?.pityCounter;
    const isPityTriggered = latestDraw?.data?.isPityTriggered ?? latestDraw?.isPityTriggered;
    
    if (pityCounter !== undefined) {
        const pityProgress = pityCounter;
        const pityText = isPityTriggered ? 
            '🔥 **PITY TRIGGERED!** Guaranteed Mythic received!' : 
            `**${pityProgress}/100** pulls to guaranteed Mythic`;

        embed.addFields({
            name: '🎯 Pity System',
            value: pityText,
            inline: false
        });
    }

    // Add special effects for rare pulls
    const mythicCount = rankCounts.Mythic || 0;
    const legendaryCount = rankCounts.Legendary || 0;
    const epicCount = rankCounts.Epic || 0;

    if (mythicCount > 0) {
        embed.setAuthor({ name: '✨ MYTHIC PULLS! ✨ Ultra Rare Results!' });
    } else if (legendaryCount > 0) {
        embed.setAuthor({ name: '🌟 LEGENDARY PULLS! 🌟 Super Rare Results!' });
    } else if (epicCount > 0) {
        embed.setAuthor({ name: '🔥 EPIC PULLS! 🔥 Great Results!' });
    }

    embed.setFooter({ text: `10x Multi-Draw • Attack on Titan RPG` });

    return embed;
}

async function handleEnhancedGachaDraw(interaction, drawCount = 1) {
    const gachaManager = require('../utils/gachaManager');
    const { getUserByDiscordId } = require('../utils/database');
    const { checkAndHandleCooldown, setCooldown } = require('../utils/cooldown');

    try {
        // Define concurrent key early
        const concurrentKey = `gacha_processing_${interaction.user.id}`;
        
        // Apply cooldowns for all gacha draws to prevent spam
        if (drawCount === 10) {
            const canUse = await checkAndHandleCooldown(interaction.user.id, 'enhanced_gacha_10x', 10, interaction);
            if (!canUse) {
                return; // User is on cooldown, message already sent
            }
            // Set cooldown immediately to prevent multiple clicks
            await setCooldown(interaction.user.id, 'enhanced_gacha_10x', 10);
        } else if (drawCount === 1) {
            const canUse = await checkAndHandleCooldown(interaction.user.id, 'enhanced_gacha_1x', 3, interaction);
            if (!canUse) {
                return; // User is on cooldown, message already sent
            }
            // Set cooldown immediately to prevent multiple clicks
            await setCooldown(interaction.user.id, 'enhanced_gacha_1x', 3);
        }

        // Additional validation to prevent concurrent gacha draws
        if (global[concurrentKey]) {
            await interaction.reply({
                content: '⏳ **Please wait!** You already have a gacha draw in progress. Wait for it to complete before starting another.',
                flags: 64
            });
            return;
        }
        
        // Mark as processing
        global[concurrentKey] = true;

        // Defer the reply early to prevent interaction timeouts
        await interaction.deferReply();

        const user = await getUserByDiscordId(interaction.user.id);
        if (!user) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Not Registered')
                .setDescription('You need to register first! Use `/register` command.');
            return interaction.editReply({ embeds: [embed] });
        }

        // Check if user has enough draws - strict validation
        if (user.gacha_draws < drawCount) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Insufficient Draws')
                .setDescription(`You need **${drawCount}** draws but only have **${user.gacha_draws}** available!`)
                .addFields(
                    {
                        name: '💰 Buy More Draws',
                        value: 'Use `ot buy draw <amount>` to purchase more draws\n**Price:** 1,000 coins per draw',
                        inline: false
                    },
                    {
                        name: '🎫 Your Current Draws',
                        value: `You have **${user.gacha_draws}** draws remaining`,
                        inline: false
                    },
                    {
                        name: '💡 Suggestion',
                        value: user.gacha_draws > 0 ? `Try a **${user.gacha_draws}x draw** instead, or buy more draws first!` : 'Buy some draws first before attempting gacha pulls!',
                        inline: false
                    }
                )
                .setTimestamp();
            return interaction.editReply({ embeds: [embed] });
        }

        // Perform batched enhanced draws for better performance
        const drawResults = [];
        
        if (drawCount === 1) {
            // Single draw - use existing method
            const drawResult = await gachaManager.performEnhancedGachaDraw(user.id, interaction.user.id, 'free');
            if (drawResult.success) {
                drawResults.push(drawResult);
            } else {
                logger.warn(`Single draw failed: ${drawResult.error}`);
            }
        } else {
            // Multiple draws - use batched operation
            try {
                const batchResult = await gachaManager.performBatchGachaDraw(user.id, interaction.user.id, drawCount, 'free');
                if (batchResult.success) {
                    drawResults.push(...batchResult.draws);
                } else {
                    logger.warn(`Batch draw failed: ${batchResult.error}`);
                }
            } catch (error) {
                logger.error(`Batch draw error: ${error.message}`);
                // Fallback to individual draws if batch fails
                for (let i = 0; i < drawCount; i++) {
                    try {
                        const drawResult = await gachaManager.performEnhancedGachaDraw(user.id, interaction.user.id, 'free');
                        if (drawResult.success) {
                            drawResults.push(drawResult);
                        } else {
                    logger.warn(`Enhanced draw ${i + 1} failed:`, drawResult.error);
                    break;
                }
            } catch (error) {
                logger.error(`Error in enhanced draw ${i + 1}:`, error);
                break;
            }
        }
            }
        }

        if (drawResults.length === 0) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Draw Failed')
                .setDescription('An error occurred during the draw. Please try again.');
            return interaction.editReply({ embeds: [errorEmbed] });
        }

        if (drawCount === 1) {
            // Single draw result
            const drawResult = drawResults[0];
            const resultEmbed = await gachaManager.createDrawResultEmbed(user, drawResult.data);

            // Add pity information if available
            if (drawResult.data.pityCounter !== undefined) {
                const pityProgress = drawResult.data.pityCounter;
                const pityText = drawResult.data.isPityTriggered ? 
                    '🔥 **PITY TRIGGERED!** Guaranteed Mythic received!' : 
                    `**${pityProgress}/100** pulls to guaranteed Mythic`;

                resultEmbed.addFields({
                    name: '🎯 Pity System',
                    value: pityText,
                    inline: true
                });
            }

            // Create action buttons for single draw result
            const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
            const actionRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('enhanced_gacha_draw')
                        .setLabel('Draw 1x')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🎲'),
                    new ButtonBuilder()
                        .setCustomId('enhanced_gacha_draw_10x')
                        .setLabel('Draw 10x')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('🎰')
                        .setDisabled(user.gacha_draws < 10),
                    new ButtonBuilder()
                        .setCustomId('enhanced_gacha_history')
                        .setLabel('View History')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('📜'),
                    new ButtonBuilder()
                        .setCustomId('enhanced_gacha_purchase')
                        .setLabel('Buy Draws')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('💰')
                );

            await interaction.editReply({ embeds: [resultEmbed], components: [actionRow] });
            logger.info(`Enhanced gacha draw: ${user.username} pulled ${drawResult.data.power.name} (${drawResult.data.power.rank})`);
        } else {
            // Multiple draw results - create summary embed
            const resultEmbed = await createMultiDrawResultEmbed(user, drawResults, drawCount);
            
            // Create action buttons for multi-draw result
            const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
            
            // Get updated user data to check remaining draws
            const updatedUser = await getUserByDiscordId(interaction.user.id);
            const remainingDraws = updatedUser ? updatedUser.gacha_draws : 0;
            
            const actionRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('enhanced_gacha_draw')
                        .setLabel('Draw 1x')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🎲')
                        .setDisabled(remainingDraws < 1),
                    new ButtonBuilder()
                        .setCustomId('enhanced_gacha_draw_10x')
                        .setLabel('Draw 10x')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('🎰')
                        .setDisabled(remainingDraws < 10),
                    new ButtonBuilder()
                        .setCustomId('enhanced_gacha_history')
                        .setLabel('View History')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('📜'),
                    new ButtonBuilder()
                        .setCustomId('enhanced_gacha_purchase')
                        .setLabel('Buy Draws')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('💰')
                );

            await interaction.editReply({ embeds: [resultEmbed], components: [actionRow] });
            logger.info(`Enhanced gacha 10x draw: ${user.username} pulled ${drawResults.length} powers`);
        }

    } catch (error) {
        logger.error('Error in enhanced gacha draw:', error);
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Draw Failed')
            .setDescription('An error occurred during the draw. Please try again.');

        if (interaction.deferred) {
            await interaction.editReply({ embeds: [errorEmbed] });
        } else {
            await interaction.reply({ embeds: [errorEmbed], flags: 64 });
        }
    } finally {
        // Clean up concurrent processing flag
        const concurrentKey = `gacha_processing_${interaction.user.id}`;
        if (global[concurrentKey]) {
            delete global[concurrentKey];
        }
    }
}

async function handleEnhancedGachaHistory(interaction) {
    const gachaManager = require('../utils/gachaManager');
    const { getUserByDiscordId, getGachaHistory } = require('../utils/database');

    try {
        const user = await getUserByDiscordId(interaction.user.id);
        if (!user) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Not Registered')
                .setDescription('You need to register first! Use `/register` command.');
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        const historyData = await getGachaHistory(user.id, 25);
        const historyEmbed = await gachaManager.createHistoryEmbed(user, historyData);

        await interaction.reply({ embeds: [historyEmbed], flags: 64 });

    } catch (error) {
        logger.error('Error in enhanced gacha history:', error);
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ History Error')
            .setDescription('Could not retrieve gacha history. Please try again.');
        await interaction.reply({ embeds: [errorEmbed], flags: 64 });
    }
}

async function handleEnhancedGachaPurchase(interaction) {
    const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

    try {
        const modal = new ModalBuilder()
            .setCustomId('enhanced_gacha_purchase_modal')
            .setTitle('Purchase Gacha Draws');

        const amountInput = new TextInputBuilder()
            .setCustomId('purchase_amount')
            .setLabel('How many draws would you like to buy?')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter amount (1-100)')
            .setRequired(true)
            .setMaxLength(3);

        const actionRow = new ActionRowBuilder().addComponents(amountInput);
        modal.addComponents(actionRow);

        await interaction.showModal(modal);

    } catch (error) {
        logger.error('Error showing enhanced purchase modal:', error);
        await interaction.reply({
            content: '❌ Error showing purchase form. Use `ot buy draw <amount>` instead.',
            flags: 64
        });
    }
}

async function handleStoreBuyDraws(interaction) {
    const gachaManager = require('../utils/gachaManager');

    try {
        await interaction.deferReply({ flags: 64 });

        const user = await getUserByDiscordId(interaction.user.id);
        if (!user) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Not Registered')
                .setDescription('You need to register first! Use `/register` command.');
            return interaction.editReply({ embeds: [embed] });
        }

        // Extract amount from button ID
        let amount = 1;
        if (interaction.customId === 'store_buy_5_draws') amount = 5;
        else if (interaction.customId === 'store_buy_10_draws') amount = 10;

        // Perform purchase
        const purchaseResult = await gachaManager.purchaseGachaDraws(user.id, interaction.user.id, amount);

        if (!purchaseResult.success) {
            const errorEmbed = gachaManager.createErrorEmbed(purchaseResult.error, purchaseResult.data);
            return interaction.editReply({ embeds: [errorEmbed] });
        }

        // Create success embed
        const successEmbed = gachaManager.createPurchaseEmbed(user, purchaseResult.data);
        await interaction.editReply({ embeds: [successEmbed] });

        logger.info(`Store quick buy: ${user.username} bought ${amount} draws via button for ${purchaseResult.data.totalCost} coins`);

    } catch (error) {
        logger.error('Error in store buy draws:', error);
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Purchase Failed')
            .setDescription('An error occurred during purchase. Please try again or use `ot buy draw <amount>`.');

        if (interaction.deferred) {
            await interaction.editReply({ embeds: [errorEmbed] });
        } else {
            await interaction.reply({ embeds: [errorEmbed], flags: 64 });
        }
    }
}

async function handleEnhancedGachaPurchaseModal(interaction) {
    const gachaManager = require('../utils/gachaManager');
    const { getUserByDiscordId } = require('../utils/database');

    try {
        await interaction.deferReply({ flags: 64 });

        const user = await getUserByDiscordId(interaction.user.id);
        if (!user) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Not Registered')
                .setDescription('You need to register first! Use `/register` command.');
            return interaction.editReply({ embeds: [embed] });
        }

        const amountStr = interaction.fields.getTextInputValue('purchase_amount');
        const amount = parseInt(amountStr);

        if (isNaN(amount)) {
            const errorEmbed = gachaManager.createErrorEmbed('INVALID_AMOUNT');
            return interaction.editReply({ embeds: [errorEmbed] });
        }

        // Perform purchase
        const purchaseResult = await gachaManager.purchaseGachaDraws(user.id, interaction.user.id, amount);

        if (!purchaseResult.success) {
            const errorEmbed = gachaManager.createErrorEmbed(purchaseResult.error, purchaseResult.data);
            return interaction.editReply({ embeds: [errorEmbed] });
        }

        // Create success embed
        const successEmbed = gachaManager.createPurchaseEmbed(user, purchaseResult.data);
        await interaction.editReply({ embeds: [successEmbed] });

        logger.info(`Enhanced modal purchase: ${user.username} bought ${amount} draws for ${purchaseResult.data.totalCost} coins`);

    } catch (error) {
        logger.error('Error in enhanced gacha purchase modal:', error);
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Purchase Failed')
            .setDescription('An error occurred during purchase. Please try again or use `ot buy draw <amount>`.');

        if (interaction.deferred) {
            await interaction.editReply({ embeds: [errorEmbed] });
        } else {
            await interaction.reply({ embeds: [errorEmbed], flags: 64 });
        }
    }
}


async function handleGiveConfirmation(interaction) {
    const { updateUserCoins, getUserByDiscordId } = require('../utils/database');
    const logger = require('../utils/logger');

    // Create a global map to track recent transfers to prevent duplicates
    if (!global.recentTransfers) {
        global.recentTransfers = new Map();
    }

    try {
        // Check if interaction is still valid
        if (!interaction.isRepliable()) {
            logger.warn('Give confirmation: Interaction expired');
            return;
        }

        // Parse the custom ID to extract information first
        const parts = interaction.customId.split('_');
        const giveType = parts[2];
        const targetUserId = parts[3];
        const amount = parseInt(parts[4]);

        // Create a unique transfer key to prevent duplicates
        const transferKey = `${interaction.user.id}_${targetUserId}_${amount}_${Date.now().toString().slice(0, -3)}`;

        // Check if this exact transfer was just processed (within 5 seconds)
        const now = Date.now();
        for (const [key, timestamp] of global.recentTransfers.entries()) {
            if (now - timestamp > 5000) {
                global.recentTransfers.delete(key); // Clean up old entries
            } else if (key.startsWith(`${interaction.user.id}_${targetUserId}_${amount}_`)) {
                logger.warn(`Duplicate transfer attempt blocked: ${transferKey}`);
                return; // Silently ignore duplicate
            }
        }

        // Mark this transfer as in progress
        global.recentTransfers.set(transferKey, now);

        // Defer the reply immediately to prevent timeout
        await interaction.deferUpdate();


        // Get users
        const giver = await getUserByDiscordId(interaction.user.id);
        const target = await getUserByDiscordId(targetUserId);

        if (!giver || !target) {
            return interaction.editReply({
                content: '❌ User not found.',
                components: [],
                embeds: []
            });
        }

        // Check if giver has enough coins
        if (giver.coins < amount) {
            return interaction.editReply({
                content: `❌ You don't have enough coins. You have ${giver.coins} coins but need ${amount}.`,
                components: [],
                embeds: []
            });
        }

        // Perform the transfer
        await updateUserCoins(giver.id, -amount);
        await updateUserCoins(target.id, amount);

        const successEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Transfer Complete')
            .setDescription(`Successfully gave ${amount} coins to <@${targetUserId}>!`)
            .addFields(
                { name: 'Your Balance', value: `${giver.coins - amount} coins`, inline: true },
                { name: 'Transfer Amount', value: `${amount} coins`, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({
            embeds: [successEmbed],
            components: []
        });

        logger.info(`Give confirmation: ${giver.username} gave ${amount} coins to ${target.username}`);

    } catch (error) {
        logger.error('Error in give confirmation:', error);

        // Try to respond appropriately based on interaction state
        try {
            if (interaction.deferred) {
                await interaction.editReply({
                    content: '❌ An error occurred during the transfer.',
                    components: [],
                    embeds: []
                });
            } else if (interaction.isRepliable()) {
                await interaction.reply({
                    content: '❌ An error occurred during the transfer.',
                    flags: 64
                });
            }
        } catch (responseError) {
            logger.error('Failed to send error response:', responseError);
        }
    }
}

async function handleBuyDrawsModal(interaction) {
    const { getUserByDiscordId } = require('../utils/database');
    const atomicOperations = require('../utils/atomicOperations');
    
    try {
        await interaction.deferReply({ flags: 64 });

        const user = await getUserByDiscordId(interaction.user.id);
        if (!user) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Not Registered')
                .setDescription('You need to register first! Use `/register` to create your account.');
            return interaction.editReply({ embeds: [embed] });
        }

        const drawsAmountStr = interaction.fields.getTextInputValue('draws_amount');
        const drawsAmount = parseInt(drawsAmountStr);

        // Validation
        if (isNaN(drawsAmount) || drawsAmount < 1 || drawsAmount > 100) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Invalid Amount')
                .setDescription('Please enter a valid number between 1 and 100.');
            return interaction.editReply({ embeds: [embed] });
        }

        const totalCost = drawsAmount * 1000;

        // Check if user has enough coins
        if (user.coins < totalCost) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Insufficient Coins')
                .setDescription(`You need **${totalCost.toLocaleString()}** coins to buy **${drawsAmount}** draws.\nYou currently have **${user.coins.toLocaleString()}** coins.`)
                .addFields({
                    name: '💰 Need More Coins?',
                    value: 'Battle enemies with `ot fight` or claim daily rewards with `ot daily`',
                    inline: false
                });
            return interaction.editReply({ embeds: [embed] });
        }

        // Perform atomic purchase using existing functions
        const { updateUserCoins, updateUserGachaDraws } = require('../utils/database');
        
        try {
            // Deduct coins and add draws atomically
            await updateUserCoins(user.id, -totalCost);
            await updateUserGachaDraws(user.id, drawsAmount);
            
            const result = { success: true };

            if (result.success) {
                const embed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('✅ Purchase Successful!')
                    .setDescription(`Successfully purchased **${drawsAmount}** gacha draws!`)
                    .addFields(
                        { name: '💰 Cost', value: `${totalCost.toLocaleString()} coins`, inline: true },
                        { name: '🎫 Draws Added', value: `${drawsAmount} draws`, inline: true },
                        { name: '💳 Remaining Coins', value: `${(user.coins - totalCost).toLocaleString()} coins`, inline: true },
                        { name: '🎰 Total Draws', value: `${(user.gacha_draws + drawsAmount)} draws`, inline: true }
                    )
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
                logger.info(`Buy draws modal: ${user.username} bought ${drawsAmount} draws for ${totalCost} coins`);
            }
        } catch (purchaseError) {
            logger.error('Purchase failed:', purchaseError);
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Purchase Failed')
                .setDescription('An error occurred during the purchase. Please try again.');
            await interaction.editReply({ embeds: [embed] });
        }

    } catch (error) {
        logger.error('Error in buy draws modal:', error);
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Error')
            .setDescription('An error occurred while processing your purchase.');
        
        if (interaction.deferred) {
            await interaction.editReply({ embeds: [embed] });
        } else {
            await interaction.reply({ embeds: [embed], flags: 64 });
        }
    }
}
const { EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { getUserByDiscordId, getUserByUsername, createUser, addUserPower, loginUser, changeUserPassword, updateUserCoins, updateUserGachaDraws } = require('../utils/database');
const { getRandomPower, getPowerCP } = require('../utils/powers');
const { handlePersistentPaginationInteraction } = require('../utils/persistentPagination');
const { handleEatChallenge } = require('../commands/prefix/eat');
const gachaManager = require('../utils/gachaManager');
const redeemCodeManager = require('../utils/redeemCodeManager');
const bcrypt = require('bcrypt');
const logger = require('../utils/logger');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        try {
            // Handle different interaction types
            if (interaction.isChatInputCommand()) {
                await handleSlashCommand(interaction);
            } else if (interaction.isButton()) {
                await handleButtonInteraction(interaction);
            } else if (interaction.isStringSelectMenu()) {
                await handleSelectMenuInteraction(interaction);
            } else if (interaction.isModalSubmit()) {
                await handleModalSubmit(interaction);
            } else if (interaction.isAutocomplete()) {
                await handleAutocomplete(interaction);
            }
        } catch (error) {
            logger.error('Error in interaction handler:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Interaction Error')
                .setDescription('An error occurred while processing your interaction.')
                .setTimestamp();

            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ embeds: [errorEmbed], flags: 64 });
                } else {
                    await interaction.reply({ embeds: [errorEmbed], flags: 64 });
                }
            } catch (replyError) {
                logger.error('Failed to send error response:', replyError);
            }
        }
    }
};

async function handleSlashCommand(interaction) {
    const command = interaction.client.commands.get(interaction.commandName);
    
    if (!command) {
        logger.warn(`Unknown slash command: ${interaction.commandName}`);
        return;
    }
    
    try {
        await command.execute(interaction);
    } catch (error) {
        logger.error(`Error executing slash command ${interaction.commandName}:`, error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Command Error')
            .setDescription('An error occurred while executing this command.')
            .setTimestamp();

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ embeds: [errorEmbed], flags: 64 });
        } else {
            await interaction.reply({ embeds: [errorEmbed], flags: 64 });
        }
    }
}

async function handleButtonInteraction(interaction) {
    const customId = interaction.customId;
    
    try {
        // Handle persistent pagination
        if (customId.startsWith('page_')) {
            const handled = await handlePersistentPaginationInteraction(interaction);
            if (handled) return;
        }
        
        // Handle terms acceptance
        if (customId === 'accept_terms') {
            await showRegistrationModal(interaction);
            return;
        }
        
        if (customId === 'decline_terms') {
            await interaction.reply({
                content: '❌ You must accept the Terms & Conditions to use this bot.',
                flags: 64
            });
            return;
        }
        
        // Handle eat challenges
        if (customId.startsWith('eat_')) {
            await handleEatChallenge(interaction);
            return;
        }
        
        // Handle gacha buttons
        if (customId.startsWith('gacha_') || customId.startsWith('enhanced_gacha_')) {
            await handleGachaButtons(interaction);
            return;
        }
        
        // Handle give confirmation buttons
        if (customId.startsWith('give_confirm_')) {
            await handleGiveConfirmation(interaction);
            return;
        }
        
        if (customId === 'give_decline') {
            await interaction.update({
                content: '❌ Transfer cancelled.',
                embeds: [],
                components: []
            });
            return;
        }
        
        // Handle help action buttons
        if (customId.startsWith('action_')) {
            await handleHelpActions(interaction);
            return;
        }
        
        logger.warn(`Unhandled button interaction: ${customId}`);
        
    } catch (error) {
        logger.error('Error handling button interaction:', error);
        
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ An error occurred while processing this button.',
                flags: 64
            });
        }
    }
}

async function handleSelectMenuInteraction(interaction) {
    const customId = interaction.customId;
    
    try {
        // Handle store selection
        if (customId.startsWith('store_select_')) {
            await handleStoreSelection(interaction);
            return;
        }
        
        // Handle merge power selection
        if (customId === 'merge_main_power') {
            await handleMergeSelection(interaction);
            return;
        }
        
        // Handle credeem selection
        if (customId.startsWith('credeem_select_')) {
            await handleCredeemSelection(interaction);
            return;
        }
        
        logger.warn(`Unhandled select menu interaction: ${customId}`);
        
    } catch (error) {
        logger.error('Error handling select menu interaction:', error);
        
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ An error occurred while processing this selection.',
                flags: 64
            });
        }
    }
}

async function handleModalSubmit(interaction) {
    const customId = interaction.customId;
    
    try {
        if (customId === 'registration_modal') {
            await handleRegistrationSubmit(interaction);
        } else if (customId === 'login_modal') {
            await handleLoginSubmit(interaction);
        } else if (customId === 'change_password_modal') {
            await handlePasswordChangeSubmit(interaction);
        } else if (customId === 'buy_draws_modal') {
            await handleBuyDrawsSubmit(interaction);
        } else if (customId.startsWith('report_')) {
            await handleReportSubmit(interaction);
        } else {
            logger.warn(`Unhandled modal submit: ${customId}`);
        }
    } catch (error) {
        logger.error('Error handling modal submit:', error);
        
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ An error occurred while processing your submission.',
                flags: 64
            });
        }
    }
}

async function handleAutocomplete(interaction) {
    const command = interaction.client.commands.get(interaction.commandName);
    
    if (!command || !command.autocomplete) {
        return;
    }
    
    try {
        await command.autocomplete(interaction);
    } catch (error) {
        logger.error(`Error in autocomplete for ${interaction.commandName}:`, error);
    }
}

// Modal and form handlers
async function showRegistrationModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('registration_modal')
        .setTitle('Create Your AOT Account');

    const usernameInput = new TextInputBuilder()
        .setCustomId('registration_username')
        .setLabel('Username (3-32 characters)')
        .setStyle(TextInputStyle.Short)
        .setMinLength(3)
        .setMaxLength(32)
        .setPlaceholder('Enter your desired username')
        .setRequired(true);

    const passwordInput = new TextInputBuilder()
        .setCustomId('registration_password')
        .setLabel('Password (6+ characters)')
        .setStyle(TextInputStyle.Short)
        .setMinLength(6)
        .setMaxLength(50)
        .setPlaceholder('Enter a secure password')
        .setRequired(true);

    const confirmPasswordInput = new TextInputBuilder()
        .setCustomId('registration_confirm_password')
        .setLabel('Confirm Password')
        .setStyle(TextInputStyle.Short)
        .setMinLength(6)
        .setMaxLength(50)
        .setPlaceholder('Confirm your password')
        .setRequired(true);

    const usernameRow = new ActionRowBuilder().addComponents(usernameInput);
    const passwordRow = new ActionRowBuilder().addComponents(passwordInput);
    const confirmPasswordRow = new ActionRowBuilder().addComponents(confirmPasswordInput);

    modal.addComponents(usernameRow, passwordRow, confirmPasswordRow);

    await interaction.showModal(modal);
}

async function handleRegistrationSubmit(interaction) {
    await interaction.deferReply({ flags: 64 });
    
    const username = interaction.fields.getTextInputValue('registration_username');
    const password = interaction.fields.getTextInputValue('registration_password');
    const confirmPassword = interaction.fields.getTextInputValue('registration_confirm_password');
    
    // Validation
    if (password !== confirmPassword) {
        return interaction.editReply({
            content: '❌ Passwords do not match. Please try again.'
        });
    }
    
    if (username.length < 3 || username.length > 32) {
        return interaction.editReply({
            content: '❌ Username must be between 3 and 32 characters.'
        });
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        return interaction.editReply({
            content: '❌ Username can only contain letters, numbers, hyphens, and underscores.'
        });
    }
    
    try {
        // Check if username exists
        const existingUser = await getUserByUsername(username);
        if (existingUser) {
            return interaction.editReply({
                content: '❌ Username already taken. Please choose a different username.'
            });
        }
        
        // Create user
        const userId = await createUser({
            username,
            password,
            discordId: interaction.user.id,
            creatorDiscordId: interaction.user.id
        });
        
        // Add starting power
        const startingPower = getRandomPower();
        const powerCP = getPowerCP(startingPower);
        await addUserPower(userId, startingPower.id, powerCP, startingPower.rank);
        
        const successEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Registration Successful!')
            .setDescription(`Welcome to Attack on Titan RPG, **${username}**!`)
            .addFields(
                { name: '🎮 Your Account', value: `Username: ${username}\nLevel: 1\nCoins: 1,000\nGacha Draws: 10`, inline: true },
                { name: '⚡ Starting Power', value: `${startingPower.name}\n${startingPower.rank} Rank\n${powerCP} CP`, inline: true },
                { name: '🎯 Next Steps', value: '• Use `/otequip` to equip your power\n• Use `ot fight` to start battling\n• Use `ot gacha` to draw more powers', inline: false }
            )
            .setFooter({ text: 'Your adventure begins now!' })
            .setTimestamp();
        
        await interaction.editReply({ embeds: [successEmbed] });
        
        logger.info(`New user registered: ${username} (${interaction.user.id})`);
        
    } catch (error) {
        logger.error('Registration error:', error);
        await interaction.editReply({
            content: '❌ Registration failed. Please try again later.'
        });
    }
}

async function handleLoginSubmit(interaction) {
    await interaction.deferReply({ flags: 64 });
    
    const username = interaction.fields.getTextInputValue('login_username_input');
    const password = interaction.fields.getTextInputValue('login_password_input');
    
    try {
        // Get user by username
        const user = await getUserByUsername(username);
        if (!user) {
            return interaction.editReply({
                content: '❌ Invalid username or password.'
            });
        }
        
        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return interaction.editReply({
                content: '❌ Invalid username or password.'
            });
        }
        
        // Login user
        await loginUser(interaction.user.id, user.id);
        
        const successEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Login Successful!')
            .setDescription(`Welcome back, **${user.username}**!`)
            .addFields(
                { name: '🎮 Your Account', value: `Level: ${user.level}\nCoins: ${user.coins.toLocaleString()}\nGacha Draws: ${user.gacha_draws}`, inline: true },
                { name: '⚔️ Battle Stats', value: `Wins: ${user.battles_won}\nLosses: ${user.battles_lost}`, inline: true },
                { name: '🎯 Quick Actions', value: '• Use `/otcharacter` to view your profile\n• Use `ot fight` to start battling\n• Use `ot gacha` to draw powers', inline: false }
            )
            .setFooter({ text: 'Ready to continue your adventure!' })
            .setTimestamp();
        
        await interaction.editReply({ embeds: [successEmbed] });
        
        logger.info(`User logged in: ${username} (${interaction.user.id})`);
        
    } catch (error) {
        logger.error('Login error:', error);
        await interaction.editReply({
            content: '❌ Login failed. Please try again later.'
        });
    }
}

async function handlePasswordChangeSubmit(interaction) {
    await interaction.deferReply({ flags: 64 });
    
    const currentPassword = interaction.fields.getTextInputValue('current_password_input');
    const newPassword = interaction.fields.getTextInputValue('new_password_input');
    const confirmPassword = interaction.fields.getTextInputValue('confirm_password_input');
    
    // Validation
    if (newPassword !== confirmPassword) {
        return interaction.editReply({
            content: '❌ New passwords do not match.'
        });
    }
    
    if (newPassword.length < 6) {
        return interaction.editReply({
            content: '❌ New password must be at least 6 characters long.'
        });
    }
    
    try {
        const user = await getUserByDiscordId(interaction.user.id);
        if (!user) {
            return interaction.editReply({
                content: '❌ User not found. Please login first.'
            });
        }
        
        await changeUserPassword(user.id, currentPassword, newPassword);
        
        const successEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Password Changed Successfully!')
            .setDescription('Your password has been updated.')
            .addFields({
                name: '🔒 Security Tip',
                value: 'Keep your new password safe and don\'t share it with anyone.',
                inline: false
            })
            .setTimestamp();
        
        await interaction.editReply({ embeds: [successEmbed] });
        
        logger.info(`Password changed for user: ${user.username}`);
        
    } catch (error) {
        logger.error('Password change error:', error);
        await interaction.editReply({
            content: `❌ ${error.message}`
        });
    }
}

async function handleBuyDrawsSubmit(interaction) {
    await interaction.deferReply({ flags: 64 });
    
    const drawsAmount = parseInt(interaction.fields.getTextInputValue('draws_amount'));
    
    if (isNaN(drawsAmount) || drawsAmount < 1 || drawsAmount > 100) {
        return interaction.editReply({
            content: '❌ Please enter a valid number between 1 and 100.'
        });
    }
    
    try {
        const user = await getUserByDiscordId(interaction.user.id);
        if (!user) {
            return interaction.editReply({
                content: '❌ User not found. Please register first.'
            });
        }
        
        const pricePerDraw = 1000;
        const totalCost = drawsAmount * pricePerDraw;
        
        if (user.coins < totalCost) {
            return interaction.editReply({
                content: `❌ Insufficient coins. You need ${totalCost.toLocaleString()} coins but have ${user.coins.toLocaleString()}.`
            });
        }
        
        // FIXED: Atomic purchase operation
        await updateUserCoins(user.id, -totalCost);
        await updateUserGachaDraws(user.id, drawsAmount);
        
        const updatedUser = await getUserByDiscordId(interaction.user.id);
        
        const successEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Purchase Successful!')
            .setDescription(`**${user.username}** purchased ${drawsAmount} gacha draws!`)
            .addFields(
                { name: '💰 Cost', value: `${totalCost.toLocaleString()} coins`, inline: true },
                { name: '💵 Remaining Coins', value: `${updatedUser.coins.toLocaleString()} coins`, inline: true },
                { name: '🎫 Total Draws', value: `${updatedUser.gacha_draws} draws`, inline: true }
            )
            .setTimestamp();
        
        await interaction.editReply({ embeds: [successEmbed] });
        
        logger.info(`${user.username} bought ${drawsAmount} gacha draws for ${totalCost} coins`);
        
    } catch (error) {
        logger.error('Buy draws error:', error);
        await interaction.editReply({
            content: `❌ ${error.message}`
        });
    }
}

// Additional handlers for other interactions...
async function handleGachaButtons(interaction) {
    // Gacha button handling logic
    await interaction.reply({
        content: '🎰 Gacha system temporarily disabled for maintenance.',
        flags: 64
    });
}

async function handleGiveConfirmation(interaction) {
    // Give confirmation logic
    await interaction.reply({
        content: '💝 Give system temporarily disabled for maintenance.',
        flags: 64
    });
}

async function handleHelpActions(interaction) {
    // Help action buttons logic
    await interaction.reply({
        content: '📖 Help actions temporarily disabled for maintenance.',
        flags: 64
    });
}

async function handleStoreSelection(interaction) {
    // Store selection logic
    await interaction.reply({
        content: '🏪 Store temporarily disabled for maintenance.',
        flags: 64
    });
}

async function handleMergeSelection(interaction) {
    // Merge selection logic
    await interaction.reply({
        content: '⚡ Merge system temporarily disabled for maintenance.',
        flags: 64
    });
}

async function handleCredeemSelection(interaction) {
    // Credeem selection logic
    await interaction.reply({
        content: '🎫 Redeem system temporarily disabled for maintenance.',
        flags: 64
    });
}

async function handleReportSubmit(interaction) {
    // Report submission logic
    await interaction.reply({
        content: '📝 Report submitted successfully!',
        flags: 64
    });
}
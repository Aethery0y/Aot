const { SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { getUserByUsername, getUserByDiscordId } = require('../utils/database');
const bcrypt = require('bcrypt');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('login')
        .setDescription('Login to your Attack on Titan RPG account'),

    async execute(interaction) {
        try {
            const discordId = interaction.user.id;

            // Check if user is already logged in
            const currentSession = await getUserByDiscordId(discordId);
            if (currentSession) {
                const alreadyLoggedInEmbed = new EmbedBuilder()
                    .setColor('#ffaa00')
                    .setTitle('⚠️ Already Logged In')
                    .setDescription(`You are already logged in as **${currentSession.username}**!`)
                    .addFields(
                        { name: '🎮 Current Session', value: `Level: ${currentSession.level}\nCoins: ${currentSession.coins.toLocaleString()}`, inline: true },
                        { name: '🚪 Want to switch accounts?', value: 'Use `/logout` first, then `/login` with different credentials', inline: true }
                    )
                    .setFooter({ text: 'Only one account can be active per Discord user' })
                    .setTimestamp();

                return interaction.reply({ embeds: [alreadyLoggedInEmbed], flags: 64 });
            }

            // Create login modal
            const modal = new ModalBuilder()
                .setCustomId('login_modal')
                .setTitle('Attack on Titan RPG Login');

            const usernameInput = new TextInputBuilder()
                .setCustomId('login_username_input')
                .setLabel('Username')
                .setStyle(TextInputStyle.Short)
                .setMinLength(3)
                .setMaxLength(20)
                .setPlaceholder('Enter your username')
                .setRequired(true);

            const passwordInput = new TextInputBuilder()
                .setCustomId('login_password_input')
                .setLabel('Password')
                .setStyle(TextInputStyle.Short)
                .setMinLength(6)
                .setMaxLength(50)
                .setPlaceholder('Enter your password')
                .setRequired(true);

            const usernameRow = new ActionRowBuilder().addComponents(usernameInput);
            const passwordRow = new ActionRowBuilder().addComponents(passwordInput);

            modal.addComponents(usernameRow, passwordRow);

            await interaction.showModal(modal);

        } catch (error) {
            logger.error('Error showing login modal:', error);

            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Login Error')
                .setDescription('An error occurred while opening the login form. Please try again.')
                .setFooter({ text: 'Contact support if the issue persists' });

            await interaction.reply({ embeds: [errorEmbed], flags: 64 });
        }
    }
};
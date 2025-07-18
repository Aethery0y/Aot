const { SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { getUserByDiscordId } = require('../utils/database');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fpassword')
        .setDescription('Change your account password (only for account creators)'),

    async execute(interaction) {
        try {
            const discordId = interaction.user.id;

            // Check if user is logged in
            const currentSession = await getUserByDiscordId(discordId);
            if (!currentSession) {
                const notLoggedInEmbed = new EmbedBuilder()
                    .setColor('#ffaa00')
                    .setTitle('⚠️ Not Logged In')
                    .setDescription('You must be logged in to change your password.')
                    .addFields({
                        name: '🎮 Getting Started',
                        value: '• Use `/login` to access your account first\n• Only the original account creator can change the password',
                        inline: false
                    })
                    .setFooter({ text: 'Attack on Titan RPG' })
                    .setTimestamp();

                return interaction.reply({ embeds: [notLoggedInEmbed], flags: 64 });
            }

            // Check if the logged-in user is the original account creator
            if (currentSession.creator_discord_id !== discordId) {
                const notCreatorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('🔒 Access Denied')
                    .setDescription('Only the original account creator can change the password.')
                    .addFields({
                        name: '🛡️ Security Notice',
                        value: `You are logged into **${currentSession.username}**'s account, but you cannot change the password because you are not the original creator.`,
                        inline: false
                    })
                    .setFooter({ text: 'This security measure prevents unauthorized password changes' })
                    .setTimestamp();

                return interaction.reply({ embeds: [notCreatorEmbed], flags: 64 });
            }

            // Create password change modal
            const modal = new ModalBuilder()
                .setCustomId('change_password_modal')
                .setTitle('Change Account Password');

            const currentPasswordInput = new TextInputBuilder()
                .setCustomId('current_password_input')
                .setLabel('Current Password')
                .setStyle(TextInputStyle.Short)
                .setMinLength(6)
                .setMaxLength(50)
                .setPlaceholder('Enter your current password')
                .setRequired(true);

            const newPasswordInput = new TextInputBuilder()
                .setCustomId('new_password_input')
                .setLabel('New Password')
                .setStyle(TextInputStyle.Short)
                .setMinLength(6)
                .setMaxLength(50)
                .setPlaceholder('Enter your new password (6+ characters)')
                .setRequired(true);

            const confirmPasswordInput = new TextInputBuilder()
                .setCustomId('confirm_password_input')
                .setLabel('Confirm New Password')
                .setStyle(TextInputStyle.Short)
                .setMinLength(6)
                .setMaxLength(50)
                .setPlaceholder('Confirm your new password')
                .setRequired(true);

            const currentPasswordRow = new ActionRowBuilder().addComponents(currentPasswordInput);
            const newPasswordRow = new ActionRowBuilder().addComponents(newPasswordInput);
            const confirmPasswordRow = new ActionRowBuilder().addComponents(confirmPasswordInput);

            modal.addComponents(currentPasswordRow, newPasswordRow, confirmPasswordRow);

            await interaction.showModal(modal);

        } catch (error) {
            logger.error('Error showing password change modal:', error);

            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Password Change Error')
                .setDescription('An error occurred while opening the password change form. Please try again.')
                .setFooter({ text: 'Contact support if the issue persists' });

            await interaction.reply({ embeds: [errorEmbed], flags: 64 });
        }
    }
};
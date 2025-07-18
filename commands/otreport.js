const { SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { getUserByDiscordId } = require('../utils/database');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('otreport')
        .setDescription('Report bugs, issues, or problematic users')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type of report')
                .setRequired(true)
                .addChoices(
                    { name: 'Bug Report', value: 'bug' },
                    { name: 'User Report', value: 'user' },
                    { name: 'Exploit/Cheating', value: 'exploit' },
                    { name: 'Other Issue', value: 'other' }
                ))
        .addUserOption(option =>
            option.setName('reported_user')
                .setDescription('User to report (only for user reports)')
                .setRequired(false)),

    async execute(interaction) {
        try {
            const user = await getUserByDiscordId(interaction.user.id);
            if (!user) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Account Required')
                    .setDescription('You need to register an account first!')
                    .addFields(
                        { name: '📝 Register', value: 'Use `/register` to create a new account', inline: true },
                        { name: '🔑 Login', value: 'Use `/login` if you already have an account', inline: true }
                    )
                    .setTimestamp();

                return interaction.reply({ embeds: [embed], flags: 64 });
            }

            const reportType = interaction.options.getString('type');
            const reportedUser = interaction.options.getUser('reported_user');

            // Generate unique modal ID
            const modalId = `report_${reportType}_${Date.now()}`;
            
            // Create modal for detailed report
            const modal = new ModalBuilder()
                .setCustomId(modalId)
                .setTitle(`${getReportTitle(reportType)}`);

            const subjectInput = new TextInputBuilder()
                .setCustomId('report_subject')
                .setLabel('Subject/Title')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Brief description of the issue')
                .setRequired(true)
                .setMaxLength(100);

            const descriptionInput = new TextInputBuilder()
                .setCustomId('report_description')
                .setLabel('Detailed Description')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Provide as much detail as possible about the issue...')
                .setRequired(true)
                .setMaxLength(1000);

            const stepsInput = new TextInputBuilder()
                .setCustomId('report_steps')
                .setLabel('Steps to Reproduce (if applicable)')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('1. First step\n2. Second step\n3. What happened')
                .setRequired(false)
                .setMaxLength(500);

            const additionalInput = new TextInputBuilder()
                .setCustomId('report_additional')
                .setLabel('Additional Information & File URLs')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Upload files to Discord/Imgur and paste URLs here, error messages, or other relevant details')
                .setRequired(false)
                .setMaxLength(500);

            const firstActionRow = new ActionRowBuilder().addComponents(subjectInput);
            const secondActionRow = new ActionRowBuilder().addComponents(descriptionInput);
            const thirdActionRow = new ActionRowBuilder().addComponents(stepsInput);
            const fourthActionRow = new ActionRowBuilder().addComponents(additionalInput);

            modal.addComponents(firstActionRow, secondActionRow, thirdActionRow, fourthActionRow);

            await interaction.showModal(modal);

            // Store report data temporarily for when modal is submitted
            const reportData = {
                reporterId: interaction.user.id,
                reporterUsername: user.username,
                reportType: reportType,
                reportedUserId: reportedUser?.id || null,
                reportedUsername: reportedUser?.username || null,
                reportedDisplayName: reportedUser?.displayName || reportedUser?.username || null,
                timestamp: new Date().toISOString()
            };

            // Store in a temporary cache using the exact modal ID
            if (!global.pendingReports) global.pendingReports = new Map();
            global.pendingReports.set(modalId, reportData);

        } catch (error) {
            logger.error('Error in otreport command:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Error')
                .setDescription('An error occurred while processing your report. Please try again later.')
                .setTimestamp();

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [errorEmbed], flags: 64 });
            } else {
                await interaction.reply({ embeds: [errorEmbed], flags: 64 });
            }
        }
    }
};

function getReportTitle(type) {
    switch (type) {
        case 'bug': return 'Bug Report';
        case 'user': return 'User Report';
        case 'exploit': return 'Exploit/Cheating Report';
        case 'other': return 'General Issue Report';
        default: return 'Report';
    }
}
const { SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { getUserByDiscordId } = require('../utils/database');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('otbuydraws')
        .setDescription('Purchase gacha draws with coins'),
    async execute(interaction) {
        try {
            const user = await getUserByDiscordId(interaction.user.id);
            if (!user) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Not Registered')
                    .setDescription('You need to register first! Use `/register` to create your account.');
                return interaction.reply({ embeds: [embed], flags: 64 });
            }

            // Create modal for purchasing draws
            const modal = new ModalBuilder()
                .setCustomId('buy_draws_modal')
                .setTitle('Purchase Gacha Draws');

            const drawsInput = new TextInputBuilder()
                .setCustomId('draws_amount')
                .setLabel('Number of draws to purchase (1-100)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Enter number of draws (1000 coins each)')
                .setRequired(true)
                .setMinLength(1)
                .setMaxLength(3);

            const firstActionRow = new ActionRowBuilder().addComponents(drawsInput);
            modal.addComponents(firstActionRow);

            await interaction.showModal(modal);

        } catch (error) {
            logger.error('Error in otbuydraws command:', error);
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Error')
                .setDescription('An error occurred while processing your request.');
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [embed], flags: 64 });
            } else {
                await interaction.reply({ embeds: [embed], flags: 64 });
            }
        }
    },
};
const { SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { getUserByDiscordId, getUserByUsername, createUser, addUserPower } = require('../utils/database');
const { getRandomPower, getPowerCP } = require('../utils/powers');
const { getTermsAndConditionsEmbed, getTermsButtons } = require('../utils/termsAndConditions');
const bcrypt = require('bcrypt');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('register')
        .setDescription('Register as a new player in the Attack on Titan RPG'),

    async execute(interaction) {
        try {
            const discordId = interaction.user.id;

            // Check if user is already registered
            const existingUser = await getUserByDiscordId(discordId);
            if (existingUser) {
                const alreadyRegisteredEmbed = new EmbedBuilder()
                    .setColor('#ffaa00')
                    .setTitle('⚠️ Already Registered')
                    .setDescription(`You are already registered as **${existingUser.username}**!`)
                    .addFields(
                        { name: '🎮 Your Stats', value: `Level: ${existingUser.level}\nCoins: ${existingUser.coins.toLocaleString()}\nWins: ${existingUser.battles_won}`, inline: true },
                        { name: '🎯 Quick Start', value: '• Use `ot character` to view your profile\n• Use `ot draw` to get new powers\n• Use `ot battle` to start fighting!', inline: true }
                    )
                    .setFooter({ text: 'Welcome back to the world of Attack on Titan!' })
                    .setTimestamp();

                return interaction.reply({ embeds: [alreadyRegisteredEmbed], flags: 64 });
            }

            // Show Terms and Conditions first
            const termsEmbed = getTermsAndConditionsEmbed();
            const termsButtons = getTermsButtons();

            await interaction.reply({ 
                embeds: [termsEmbed], 
                components: [termsButtons], 
                flags: 64 
            });

        } catch (error) {
            logger.error('Error showing registration modal:', error);

            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Registration Error')
                .setDescription('An error occurred while opening the registration form. Please try again.')
                .setFooter({ text: 'Contact support if the issue persists' });

            await interaction.reply({ embeds: [errorEmbed], flags: 64 });
        }
    }
};
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const redeemCodeManager = require('../utils/redeemCodeManager');
const { pool } = require('../config/database');
const logger = require('../utils/logger');

// Simple code generator function
function generateUniqueCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 9; i++) {
        if (i === 3 || i === 6) result += '-';
        else result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

const REDEEM_CHANNEL_ID = '1394740660245893182';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('credeem')
        .setDescription('Create a new redeem code with rewards')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Name/description for the redeem code')
                .setRequired(true)
        ),

    async execute(interaction) {
        try {
            // Check if user has permission (you can add role checks here)
            const codeName = interaction.options.getString('name');
            
            // Initialize session data
            if (!interaction.client.credeemSessions) {
                interaction.client.credeemSessions = {};
            }
            
            interaction.client.credeemSessions[interaction.user.id] = {
                codeName: codeName,
                rewards: [],
                maxUses: null,
                expiresAt: null,
                sendToChannel: true
            };
            
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`credeem_select_${interaction.user.id}`)
                .setPlaceholder('Select reward types to add')
                .setMinValues(1)
                .setMaxValues(4)
                .addOptions(
                    {
                        label: 'Coins',
                        description: 'Add coin rewards',
                        value: 'coins',
                        emoji: '💰'
                    },
                    {
                        label: 'Gacha Draws',
                        description: 'Add gacha draw rewards',
                        value: 'draw_chances',
                        emoji: '🎲'
                    },
                    {
                        label: 'Powers',
                        description: 'Add specific power rewards',
                        value: 'powers',
                        emoji: '⚡'
                    },
                    {
                        label: 'Custom Reward',
                        description: 'Add custom reward description',
                        value: 'custom',
                        emoji: '🎁'
                    }
                );

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🎫 Create Redeem Code')
                .setDescription(`Creating code: **${codeName}**\n\nSelect the reward types you want to include:`)
                .addFields({
                    name: '📝 Next Steps',
                    value: '1. Select reward types\n2. Configure amounts and settings\n3. Set usage limits and expiry\n4. Choose delivery method\n5. Generate and publish code',
                    inline: false
                })
                .setFooter({ text: 'Select one or more reward types to continue' });

            await interaction.reply({
                embeds: [embed],
                components: [row],
                flags: 64
            });
            
        } catch (error) {
            logger.error('Error in credeem command:', error);
            await interaction.reply({
                content: '❌ An error occurred while creating the redeem code setup.',
                flags: 64
            });
        }
    }
};
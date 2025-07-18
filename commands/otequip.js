const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserByDiscordId, getUserPowers, equipPower } = require('../utils/database');
const { getRankEmoji } = require('../utils/powers');
const { determineRankByCP } = require('../utils/databaseHelpers');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('otequip')
        .setDescription('Equip a power from your inventory')
        .addStringOption(option =>
            option.setName('power')
                .setDescription('Select the power to equip')
                .setRequired(true)
                .setAutocomplete(true)
        ),

    async autocomplete(interaction) {
        try {
            const focusedValue = interaction.options.getFocused();
            const user = await getUserByDiscordId(interaction.user.id);
            
            if (!user) {
                return interaction.respond([]);
            }

            const userPowers = await getUserPowers(user.id);
            const choices = userPowers
                .filter(power => power.name.toLowerCase().includes(focusedValue.toLowerCase()))
                .slice(0, 25) // Discord limit
                .map(power => ({
                    name: `${power.name} (${power.rank} - ${power.combat_power} CP)`,
                    value: power.name
                }));

            await interaction.respond(choices);
        } catch (error) {
            logger.error('Error in aequip autocomplete:', error);
            await interaction.respond([]);
        }
    },

    async execute(interaction) {
        try {
            const user = await getUserByDiscordId(interaction.user.id);
            if (!user) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ User Not Found')
                    .setDescription('You need to register first! Use `/register` command.')
                    .setTimestamp();

                return interaction.reply({ embeds: [embed] });
            }

            // Defer the reply to prevent interaction timeout
            await interaction.deferReply();

            const powerName = interaction.options.getString('power');
            const userPowers = await getUserPowers(user.id);

            // Find the power by name (case-insensitive)
            const powerToEquip = userPowers.find(p => 
                p.name.toLowerCase() === powerName.toLowerCase()
            );

            if (!powerToEquip) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Power Not Found')
                    .setDescription(`You don't own a power named "**${powerName}**"`)
                    .addFields({
                        name: '💡 Available Powers',
                        value: userPowers.length > 0 
                            ? userPowers.slice(0, 10).map(p => `• ${p.name} (${p.rank})`).join('\n')
                            : 'No powers available. Use `ot draw` to get powers!',
                        inline: false
                    })
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            // Check if it's already equipped
            if (powerToEquip.user_power_id === user.equipped_power_id) {
                const embed = new EmbedBuilder()
                    .setColor('#ffaa00')
                    .setTitle('⚡ Already Equipped')
                    .setDescription(`**${powerToEquip.name}** is already equipped!`)
                    .addFields(
                        { name: '📊 Power Details', value: `**Rank:** ${getRankEmoji(powerToEquip.rank)} ${powerToEquip.rank}\n**CP:** ${powerToEquip.combat_power}`, inline: true }
                    )
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            // Equip the power (use user_power_id, not power_id)
            await equipPower(user.id, powerToEquip.user_power_id);

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('⚡ Power Equipped!')
                .setDescription(`**${user.username}** has equipped **${powerToEquip.name}**!`)
                .addFields(
                    { name: '🏆 Rank', value: `${getRankEmoji(powerToEquip.rank)} ${powerToEquip.rank}`, inline: true },
                    { name: '💪 Combat Power', value: powerToEquip.combat_power.toString(), inline: true },
                    { name: '📖 Description', value: powerToEquip.description, inline: false }
                )
                .setFooter({ text: 'You can now use this power in battles!' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

            logger.info(`${user.username} equipped power: ${powerToEquip.name}`);

        } catch (error) {
            logger.error('Error in otequip command:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Error')
                .setDescription('An error occurred while equipping the power.')
                .setTimestamp();

            // Handle different interaction states
            if (interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed] });
            } else if (!interaction.replied) {
                await interaction.reply({ embeds: [errorEmbed] });
            } else {
                await interaction.followUp({ embeds: [errorEmbed] });
            }
        }
    }
};
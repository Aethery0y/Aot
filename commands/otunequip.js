const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserByDiscordId, getUserPowers, unequipPower } = require('../utils/database');
const { getRankEmoji } = require('../utils/powers');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('otunequip')
        .setDescription('Unequip your currently equipped power')
        .addStringOption(option =>
            option.setName('power')
                .setDescription('Select the power to unequip (optional - will unequip current power if not specified)')
                .setRequired(false)
                .setAutocomplete(true)
        ),

    async autocomplete(interaction) {
        try {
            const user = await getUserByDiscordId(interaction.user.id);
            
            if (!user || !user.equipped_power_id) {
                return interaction.respond([]);
            }

            const userPowers = await getUserPowers(user.id);
            const equippedPower = userPowers.find(p => p.user_power_id === user.equipped_power_id);
            
            if (!equippedPower) {
                return interaction.respond([]);
            }

            const choices = [{
                name: `${equippedPower.name} (${equippedPower.rank} - ${equippedPower.combat_power} CP)`,
                value: equippedPower.name
            }];

            await interaction.respond(choices);
        } catch (error) {
            logger.error('Error in aunequip autocomplete:', error);
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
                    .setDescription('You need to register first using `/register`.')
                    .setTimestamp();
                
                return interaction.reply({ embeds: [embed] });
            }

            // Check if user has any equipped power
            if (!user.equipped_power_id) {
                const embed = new EmbedBuilder()
                    .setColor('#ffaa00')
                    .setTitle('⚠️ No Power Equipped')
                    .setDescription('You don\'t have any power equipped.')
                    .addFields({
                        name: '💡 Tip',
                        value: 'Use `/otequip` to equip a power from your inventory.',
                        inline: false
                    })
                    .setTimestamp();
                
                return interaction.reply({ embeds: [embed] });
            }

            // Get user's powers to find the currently equipped one
            const userPowers = await getUserPowers(user.id);
            const equippedPower = userPowers.find(power => power.user_power_id === user.equipped_power_id);

            if (!equippedPower) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Error')
                    .setDescription('Could not find your equipped power. Please try again.')
                    .setTimestamp();
                
                return interaction.reply({ embeds: [embed] });
            }

            // If power name is provided, check if it matches the equipped power
            const powerName = interaction.options.getString('power');
            if (powerName && equippedPower.name.toLowerCase() !== powerName.toLowerCase()) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Power Not Equipped')
                    .setDescription(`**${powerName}** is not your currently equipped power.`)
                    .addFields({
                        name: '⚡ Currently Equipped',
                        value: `${getRankEmoji(equippedPower.rank)} **${equippedPower.name}**`,
                        inline: false
                    })
                    .setTimestamp();
                
                return interaction.reply({ embeds: [embed] });
            }

            // Unequip the power
            await unequipPower(user.id);

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Power Unequipped!')
                .setDescription(`**${user.username}** has unequipped **${equippedPower.name}**`)
                .addFields(
                    { name: '🏆 Unequipped Power', value: `${getRankEmoji(equippedPower.rank)} ${equippedPower.name}`, inline: true },
                    { name: '💪 Combat Power', value: equippedPower.combat_power.toString(), inline: true },
                    { name: '💡 Next Steps', value: 'Use `/otequip` to equip another power before battling!', inline: false }
                )
                .setFooter({ text: 'You need to equip a power to participate in battles' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            logger.info(`${user.username} unequipped power: ${equippedPower.name}`);

        } catch (error) {
            logger.error('Error in aunequip command:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Error')
                .setDescription('An error occurred while unequipping the power.')
                .setTimestamp();

            await interaction.reply({ embeds: [errorEmbed] });
        }
    }
};
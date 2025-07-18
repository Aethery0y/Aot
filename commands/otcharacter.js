const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserByDiscordId, getUserPowers, getUserArenaRank } = require('../utils/database');
const { getRankEmoji } = require('../utils/powers');
const { determineRankByCP } = require('../utils/databaseHelpers');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('otcharacter')
        .setDescription('View character profile and stats')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to view profile for (optional)')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            const targetUser = interaction.options.getUser('user');
            const targetId = targetUser ? targetUser.id : interaction.user.id;
            const targetUsername = targetUser ? targetUser.username : interaction.user.username;

            const user = await getUserByDiscordId(targetId);
            if (!user) {
                return interaction.reply({
                    content: targetUser ? 
                        `❌ ${targetUser.username} needs to register first: \`/register\`` :
                        '❌ Register first: `/register`',
                    flags: 64
                });
            }

            // Get user's powers and arena rank
            const userPowers = await getUserPowers(user.id);
            const arenaRank = await getUserArenaRank(user.id);
            
            // CP display removed - focus on powers and gacha draws
            
            // Get equipped power details
            const equippedPower = userPowers.find(p => p.user_power_id === user.equipped_power_id);
            
            // Level system removed
            
            // Calculate win rate
            const totalBattles = user.battles_won + user.battles_lost;
            const winRate = totalBattles > 0 ? Math.round((user.battles_won / totalBattles) * 100) : 0;

            const embed = new EmbedBuilder()
                .setColor('#ff4444')
                .setTitle(`⚔️ ${user.username}`)
                .setDescription(`\`\`\`ansi\n[2;31m╔═══════════════════════════════════════════════════╗[0m\n[2;31m║[0m               [1;37mCharacter Profile[0m                 [2;31m║[0m\n[2;31m╚═══════════════════════════════════════════════════╝[0m\n\`\`\``)
                .addFields(
                    {
                        name: '💰 **Economy**',
                        value: `\`\`\`yaml\nCoins: ${user.coins.toLocaleString()}\nBanked: ${user.bank_balance.toLocaleString()}\nDraws: ${user.gacha_draws}\`\`\``,
                        inline: true
                    },
                    {
                        name: '⚔️ **Combat Stats**',
                        value: `\`\`\`yaml\nWins: ${user.battles_won}\nLosses: ${user.battles_lost}\nWin Rate: ${winRate}%\`\`\``,
                        inline: true
                    },
                    {
                        name: '📦 **Collection**',
                        value: `\`\`\`yaml\nPowers: ${userPowers.length}\nArena Rank: ${arenaRank ? `#${arenaRank}` : 'Unranked'}\`\`\``,
                        inline: true
                    }
                );

            // Add equipped power info
            if (equippedPower) {
                embed.addFields({
                    name: '⚡ **Equipped Power**',
                    value: `\`\`\`ansi\n[1;33m${getRankEmoji(equippedPower.rank)} ${equippedPower.name}[0m\n[1;36m${equippedPower.combat_power.toLocaleString()} CP[0m\n\`\`\``,
                    inline: false
                });
            } else {
                embed.addFields({
                    name: '⚡ **Equipped Power**',
                    value: '```ansi\n[1;31m❌ No power equipped[0m\n[2;37mUse /otequip to equip a power[0m\n```',
                    inline: false
                });
            }

            embed.setTimestamp()
                .setFooter({ text: 'Attack on Titan RPG | Use /otequip to change powers' });
            await interaction.reply({ embeds: [embed] });

            logger.info(`${interaction.user.username} viewed ${targetUser ? targetUser.username : 'their own'} character profile`);

        } catch (error) {
            logger.error('Error in acharacter command:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Error')
                .setDescription('An error occurred while fetching character information.')
                .setTimestamp();

            await interaction.reply({ embeds: [errorEmbed] });
        }
    }
};

function calculateLevelExp(level) {
    const { baseExp, expMultiplier } = require('../config/bot');
    return Math.floor(baseExp * Math.pow(expMultiplier, level - 1));
}
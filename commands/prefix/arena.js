const { EmbedBuilder } = require('discord.js');
const { getArenaRankings, getUserByDiscordId } = require('../../utils/database');
const { createPersistentPagination } = require('../../utils/persistentPagination');
const logger = require('../../utils/logger');
const config = require('../../config/bot');

module.exports = {
    name: 'arena',
    aliases: ['leaderboard', 'lb'],
    description: 'View the arena leaderboard',

    async execute(message, args) {
        try {
            // Get total rankings (up to 200)
            const rankings = await getArenaRankings(200);

            if (rankings.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor('#ffaa00')
                    .setTitle('🏟️ Arena Leaderboard')
                    .setDescription('No arena rankings yet! Be the first to battle and claim your rank!')
                    .addFields({
                        name: '⚔️ How to get ranked',
                        value: 'Use `ot battle @user` to challenge other players and earn your place in the arena!',
                        inline: false
                    })
                    .setTimestamp();

                return message.reply({ embeds: [embed] });
            }

            // Create persistent pagination for rankings
            const pagination = createPersistentPagination(
                rankings,
                config.ranksPerPage,
                (rankingPage, page, totalPages) => createArenaEmbed(rankingPage, page, rankings.length),
                message.author.id,
                'arena'
            );

            await message.reply({
                embeds: [pagination.embed],
                components: pagination.components
            });

            logger.info(`Arena leaderboard viewed by ${message.author.username} (${rankings.length} total players)`);

        } catch (error) {
            logger.error('Error in arena command:', error);
            message.reply('❌ An error occurred while fetching the arena leaderboard. Please try again later.');
        }
    }
};

function createArenaEmbed(rankings, page, totalPlayers) {
    const totalPages = Math.ceil(totalPlayers / config.ranksPerPage);
    const startRank = (page - 1) * config.ranksPerPage + 1;

    const embed = new EmbedBuilder()
        .setColor('#ffd700')
        .setTitle('🏟️ Arena Leaderboard')
        .setDescription(`**Top fighters in the Attack on Titan universe**\n\nPage ${page}/${totalPages} • Showing ranks ${startRank}-${Math.min(startRank + rankings.length - 1, totalPlayers)}`)
        .addFields({
            name: '📊 Total Ranked Players',
            value: totalPlayers.toString(),
            inline: true
        });

    if (rankings.length === 0) {
        embed.addFields({
            name: '📭 No Players',
            value: 'No players on this page.',
            inline: false
        });
    } else {
        let leaderboardText = '';
        
        rankings.forEach((player, index) => {
            const rank = startRank + index;
            const medal = getMedalEmoji(rank);
            const winRate = player.battles_won + player.battles_lost > 0 
                ? Math.round((player.battles_won / (player.battles_won + player.battles_lost)) * 100)
                : 0;

            const displayCP = player.equipped_power_cp || 0;
            const cpText = displayCP > 0 ? `${displayCP} CP` : '0 CP';
            
            leaderboardText += `${medal} **#${rank}** - **${player.username}**\n`;
            leaderboardText += `   📊 Level ${player.level} • 💪 ${cpText} • 🏆 ${winRate}% WR\n`;
            leaderboardText += `   ⚔️ ${player.battles_won}W/${player.battles_lost}L\n\n`;
        });

        embed.addFields({
            name: '🏆 Rankings',
            value: leaderboardText,
            inline: false
        });
    }

    // Daily rewards removed (CP purchasing discontinued)
    if (page === 1) {
        embed.addFields({
            name: '🎁 Competition Info',
            value: 'Fight in arena battles to climb the rankings!\nUse `ot battle @user` to challenge players.',
            inline: true
        });
    }

    embed.setFooter({ 
        text: 'Challenge players with "ot battle @user" • Rankings update after each battle' 
    })
    .setTimestamp();

    return embed;
}

function getMedalEmoji(rank) {
    switch(rank) {
        case 1: return '🥇';
        case 2: return '🥈';
        case 3: return '🥉';
        case 4:
        case 5: return '🏅';
        default: return '🔹';
    }
}

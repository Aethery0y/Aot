const { EmbedBuilder } = require('discord.js');
const { getUserByDiscordId, updateUserStats, getUserPowers, getUserByArenaRank, updateArenaRanking } = require('../../utils/database');
const { generateRandomEncounter, calculateBattleResult, calculateRewards, calculatePvPRewards } = require('../../utils/combat');
const logger = require('../../utils/logger');

module.exports = {
    name: 'afight',
    description: 'Fight against arena ranked players',
    cooldown: 8, // 8 seconds cooldown

    async execute(message, args) {
        try {
            const user = await getUserByDiscordId(message.author.id);
            if (!user) {
                return message.reply('❌ You need to register first! Use `/register` command.');
            }

            // Check if user has equipped power
            if (!user.equipped_power_id) {
                return message.reply('❌ You need to equip a power first! Use `/otequip` command.');
            }

            // Get equipped power
            const userPowers = await getUserPowers(user.id);
            const equippedPower = userPowers.find(p => p.user_power_id === user.equipped_power_id);

            if (!equippedPower) {
                return message.reply('❌ Your equipped power was not found. Please equip a power again.');
            }

            // Check if user provided target rank
            const targetRank = args[0];
            if (!targetRank) {
                const embed = new EmbedBuilder()
                    .setColor('#ffaa00')
                    .setTitle('🏟️ Arena Fight')
                    .setDescription('You need to specify a rank to challenge!')
                    .addFields(
                        { name: '📋 Usage', value: '`ot afight <rank>`', inline: false },
                        { name: '🎯 Examples', value: '`ot afight 1` - Challenge rank 1\n`ot afight 50` - Challenge rank 50', inline: false },
                        { name: '💡 Tip', value: 'Use `ot arena` to see current rankings', inline: false }
                    )
                    .setTimestamp();

                return message.reply({ embeds: [embed] });
            }

            // Validate and parse rank
            const rank = parseInt(targetRank);
            if (isNaN(rank) || rank < 1 || rank > 200) {
                return message.reply('❌ Invalid rank! Please specify a rank between 1 and 200.');
            }

            // Get target user by arena rank
            const targetUser = await getUserByArenaRank(rank);
            if (!targetUser) {
                return message.reply(`❌ No player found at rank ${rank}. Use \`ot arena\` to see available ranks.`);
            }

            // Check if user is trying to fight themselves
            if (targetUser.id === user.id) {
                return message.reply('❌ You cannot fight yourself in the arena!');
            }

            // Get target's equipped power
            const targetPowers = await getUserPowers(targetUser.id);
            const targetEquippedPower = targetPowers.find(p => p.user_power_id === targetUser.equipped_power_id);

            if (!targetEquippedPower) {
                return message.reply('❌ Target player does not have an equipped power.');
            }

            // Calculate total CP for both users
            const userTotalCP = equippedPower.combat_power + (user.bonus_cp || 0);
            const targetTotalCP = targetEquippedPower.combat_power + (targetUser.bonus_cp || 0);

            // Calculate battle result using PvP logic
            const battleResult = calculatePvPBattle(user, userTotalCP, targetUser, targetTotalCP);

            // Create battle embed
            const embed = new EmbedBuilder()
                .setColor(battleResult.victory ? '#00ff00' : '#ff0000')
                .setTitle(`🏟️ Arena Battle ${battleResult.victory ? 'Victory!' : 'Defeat!'}`)
                .setDescription(`**${user.username}** vs **${targetUser.username}** (Rank ${rank})`)
                .addFields(
                    { name: '👤 Your Power', value: `${equippedPower.name}\n${equippedPower.combat_power} CP + ${user.bonus_cp || 0} Bonus = ${userTotalCP} Total CP`, inline: true },
                    { name: '👤 Opponent Power', value: `${targetEquippedPower.name}\n${targetEquippedPower.combat_power} CP + ${targetUser.bonus_cp || 0} Bonus = ${targetTotalCP} Total CP`, inline: true },
                    { name: '⚔️ Battle Log', value: battleResult.log, inline: false }
                );

            if (battleResult.victory) {
                // Calculate rewards for arena victory
                const rewards = calculatePvPRewards(user, targetUser, true);

                // Update winner stats (exp system removed)
                await updateUserStats(user.id, {
                    coins: user.coins + rewards.coins,
                    battles_won: user.battles_won + 1
                });

                // Update loser stats
                await updateUserStats(targetUser.id, {
                    battles_lost: targetUser.battles_lost + 1
                });

                // Update arena rankings
                await updateArenaRanking(user.id, targetUser.id);

                embed.addFields(
                    { name: '🏆 Victory Rewards', value: `+${rewards.coins} coins`, inline: true },
                    { name: '📊 Arena Status', value: `You may have gained ranking!\nCheck with \`ot arena\``, inline: true },
                    { name: '💰 New Balance', value: `${user.coins + rewards.coins} coins`, inline: true }
                );

                logger.info(`Arena battle: ${user.username} defeated ${targetUser.username} (rank ${rank})`);
            } else {
                // Calculate rewards for arena defeat (reduced)
                const rewards = calculatePvPRewards(user, targetUser, false);

                // Update loser stats (exp system removed)
                await updateUserStats(user.id, {
                    coins: user.coins + rewards.coins,
                    battles_lost: user.battles_lost + 1
                });

                // Update winner stats
                await updateUserStats(targetUser.id, {
                    battles_won: targetUser.battles_won + 1
                });

                embed.addFields(
                    { name: '💔 Defeat Rewards', value: `+${rewards.coins} coins`, inline: true },
                    { name: '📊 Arena Status', value: `Your ranking unchanged\nKeep training!`, inline: true },
                    { name: '💰 New Balance', value: `${user.coins + rewards.coins} coins`, inline: true }
                );

                logger.info(`Arena battle: ${user.username} lost to ${targetUser.username} (rank ${rank})`);
            }

            // Add additional arena info
            embed.addFields(
                { name: '🏟️ Arena Info', value: `Use \`ot arena\` to view updated rankings`, inline: false }
            );

            await message.reply({ embeds: [embed] });

            // Set cooldown after arena fight
            const { setCooldownAfterSuccess } = require('../../utils/database');
            await setCooldownAfterSuccess(message.author.id, 'afight', 8);

        } catch (error) {
            logger.error('Error in afight command:', error);
            message.reply('❌ An error occurred during arena battle. Please try again later.');
        }
    }
};

// PvP battle calculation function
function calculatePvPBattle(challenger, challengerPower, target, targetPower) {
    // Pure CP-based battle - higher CP wins
    const victory = challengerPower > targetPower;
    const difference = Math.abs(challengerPower - targetPower);
    
    let log = `⚔️ **CP-Based Battle:**\n`;
    log += `${challenger.username}: ${challengerPower} CP\n`;
    log += `${target.username}: ${targetPower} CP\n\n`;
    
    if (victory) {
        log += `💪 ${challenger.username} overwhelms ${target.username} with superior power!`;
        if (difference > targetPower * 0.5) {
            log += `\n💥 **Dominant Victory!** The power difference was overwhelming!`;
        } else if (difference < targetPower * 0.1) {
            log += `\n😤 **Close Victory!** It was a narrow power advantage!`;
        }
    } else if (challengerPower === targetPower) {
        // Tie goes to defender
        log += `⚖️ ${target.username} successfully defends with equal power!`;
        log += `\n🛡️ **Equal Power Defense!** In a tie, the defender keeps their position!`;
    } else {
        log += `⚔️ ${target.username} successfully defends their arena position!`;
        if (difference > challengerPower * 0.5) {
            log += `\n🛡️ **Solid Defense!** ${target.username} easily repelled the challenge!`;
        } else if (difference < challengerPower * 0.1) {
            log += `\n🔥 **Narrow Defense!** ${challenger.username} nearly broke through!`;
        }
    }
    
    return {
        victory,
        log,
        challengerRoll: challengerPower,
        targetRoll: targetPower,
        difference
    };
}

function getRankEmoji(rank) {
    const emojis = {
        'Normal': '⚪',
        'Rare': '🔵',
        'Epic': '🟣',
        'Legendary': '🟡',
        'Mythic': '🔴',
        'Divine': '🟢',
        'Cosmic': '🟠',
        'Transcendent': '🔮',
        'Omnipotent': '⭐',
        'Absolute': '💫'
    };
    return emojis[rank] || '⚪';
}
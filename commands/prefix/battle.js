const { EmbedBuilder } = require('discord.js');
const { getUserByDiscordId, updateUserStats, getUserPowers, updateArenaRanking } = require('../../utils/database');
const { generateEncounter, calculateBattleResult, calculateRewards } = require('../../utils/combat');
const logger = require('../../utils/logger');

module.exports = {
    name: 'battle',
    description: 'Battle against titans, humans, or other players',
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

            // Handle both PvP battles and arena battles
            const target = args[0];
            
            if (!target) {
                return message.reply('❌ Please specify a target to battle!\n' + 
                    '🎯 **Examples:**\n' +
                    '• `ot battle @user` - Battle a specific user\n' +
                    '• `ot battle 5` - Battle arena rank 5\n' +
                    '💡 Use `ot fight` to battle against titans and humans!');
            }

            // PvP Battle only
            return await handlePvPBattle(message, user, target);

        } catch (error) {
            logger.error('Error in battle command:', error);
            message.reply('❌ An error occurred during battle. Please try again later.');
        }
    }
};

async function handlePvEBattle(message, user) {
    try {
        // Generate encounter based on user level and power
        const userPowers = await getUserPowers(user.id);
        const equippedPower = userPowers.find(p => p.user_power_id === user.equipped_power_id);

        if (!equippedPower) {
            return message.reply('❌ Your equipped power was not found. Please equip a power again.');
        }

        const encounter = await generateEncounter(equippedPower.rank);
        const battleResult = calculateBattleResult(user, equippedPower, encounter);

        const embed = new EmbedBuilder()
            .setColor(battleResult.victory ? '#00ff00' : '#ff0000')
            .setTitle(`⚔️ Battle ${battleResult.victory ? 'Victory!' : 'Defeat!'}`)
            .setDescription(`**${user.username}** vs **${encounter.name}**`)
            .addFields(
                { name: '👤 Your Power', value: `${equippedPower.name} (${equippedPower.combat_power} CP)`, inline: true },
                { name: '👹 Enemy', value: `${encounter.name} (${encounter.power} CP)`, inline: true },
                { name: '⚔️ Battle Log', value: battleResult.log, inline: false }
            );

        if (battleResult.victory) {
            const rewards = calculateRewards(encounter);

            // Update user stats (exp system removed)
            await updateUserStats(user.id, {
                coins: user.coins + rewards.coins,
                battles_won: user.battles_won + 1
            });

            embed.addFields(
                { name: '🏆 Rewards', value: `+${rewards.coins} coins`, inline: true }
            );
        } else {
            // Update battles lost
            await updateUserStats(user.id, {
                battles_lost: user.battles_lost + 1
            });

            embed.addFields(
                { name: '💔 Result', value: 'Better luck next time!', inline: true },
                { name: '💡 Tip', value: 'Try getting better powers!', inline: true }
            );
        }

        embed.setTimestamp();
        message.reply({ embeds: [embed] });

        logger.info(`${user.username} battled ${encounter.name} - ${battleResult.victory ? 'Victory' : 'Defeat'}`);

    } catch (error) {
        logger.error('Error in PvE battle:', error);
        throw error;
    }
}

async function handlePvPBattle(message, challenger, targetInput) {
    try {
        // Parse target (mention, user ID, or arena rank)
        let targetUser;

        if (targetInput.startsWith('<@')) {
            // Mention
            const targetId = targetInput.replace(/[<@!>]/g, '');
            targetUser = await getUserByDiscordId(targetId);
            if (!targetUser) {
                return message.reply('❌ User not found or not registered!');
            }
        } else if (targetInput.match(/^\d+$/)) {
            // Arena rank or user ID
            const number = parseInt(targetInput);
            if (number <= 200) {
                // Arena rank
                const { getUserByArenaRank } = require('../../utils/database');
                targetUser = await getUserByArenaRank(number);
                if (!targetUser) {
                    return message.reply(`❌ No player found at arena rank ${number}. Use \`ot arena\` to see available ranks.`);
                }
            } else {
                // User ID
                targetUser = await getUserByDiscordId(targetInput);
                if (!targetUser) {
                    return message.reply('❌ User not found or not registered!');
                }
            }
        } else {
            // Username
            const { getUserByUsername } = require('../../utils/database');
            targetUser = await getUserByUsername(targetInput);
            if (!targetUser) {
                return message.reply('❌ User not found or not registered!');
            }
        }

        if (!targetUser) {
            return message.reply('❌ Target user not found or not registered.');
        }

        if (targetUser.discord_id === challenger.discord_id) {
            return message.reply('❌ You cannot battle yourself!');
        }

        if (!targetUser.equipped_power_id) {
            return message.reply('❌ Target user does not have an equipped power.');
        }

        // Get both users' powers
        const challengerPowers = await getUserPowers(challenger.id);
        const targetPowers = await getUserPowers(targetUser.id);

        const challengerPower = challengerPowers.find(p => p.user_power_id === challenger.equipped_power_id);
        const targetPower = targetPowers.find(p => p.user_power_id === targetUser.equipped_power_id);

        // Debug logging
        logger.info(`Challenger equipped_power_id: ${challenger.equipped_power_id}, powers count: ${challengerPowers.length}`);
        logger.info(`Target equipped_power_id: ${targetUser.equipped_power_id}, powers count: ${targetPowers.length}`);
        
        if (challengerPowers.length > 0) {
            logger.info(`Challenger first power user_power_id: ${challengerPowers[0].user_power_id}`);
        }
        if (targetPowers.length > 0) {
            logger.info(`Target first power user_power_id: ${targetPowers[0].user_power_id}`);
        }

        // Check if both users have valid equipped powers
        if (!challengerPower) {
            return message.reply('❌ You don\'t have an equipped power or it couldn\'t be found. Use `/otequip` to equip a power first.');
        }

        if (!targetPower) {
            return message.reply('❌ Target user doesn\'t have a valid equipped power.');
        }

        // Calculate PvP battle result using proper CP values
        const challengerTotalCP = challengerPower.combat_power + (challenger.bonus_cp || 0);
        const targetTotalCP = targetPower.combat_power + (targetUser.bonus_cp || 0);
        
        const battleResult = calculatePvPBattle(challenger, challengerTotalCP, targetUser, targetTotalCP);

        const embed = new EmbedBuilder()
            .setColor(battleResult.victory ? '#00ff00' : '#ff0000')
            .setTitle('⚔️ Arena Battle Result!')
            .setDescription(`**${challenger.username}** vs **${targetUser.username}**`)
            .addFields(
                { name: '👤 Challenger', value: `${challengerPower.name}\n${challengerPower.combat_power} CP + ${challenger.bonus_cp || 0} Bonus = ${challengerTotalCP} Total CP`, inline: true },
                { name: '🎯 Defender', value: `${targetPower.name}\n${targetPower.combat_power} CP + ${targetUser.bonus_cp || 0} Bonus = ${targetTotalCP} Total CP`, inline: true },
                { name: '⚔️ Battle Result', value: battleResult.log, inline: false }
            );

        // Calculate rewards and compensation
        const winnerRewards = calculatePvPRewards(battleResult.winner, battleResult.loser, true);
        const loserCompensation = calculatePvPRewards(battleResult.loser, battleResult.winner, false);

        // Update stats and arena rankings (exp system removed)
        if (battleResult.victory) {
            // Challenger wins
            await updateUserStats(challenger.id, {
                coins: challenger.coins + winnerRewards.coins,
                battles_won: challenger.battles_won + 1
            });

            await updateUserStats(targetUser.id, {
                coins: targetUser.coins + loserCompensation.coins,
                battles_lost: targetUser.battles_lost + 1
            });

            // Update arena rankings - winner gets better rank
            await updateArenaRanking(challenger.id, targetUser.id);

            embed.addFields(
                { name: '🏆 Winner Rewards', value: `**${challenger.username}**: +${winnerRewards.coins} coins`, inline: false },
                { name: '💰 Loser Compensation', value: `**${targetUser.username}**: +${loserCompensation.coins} coins`, inline: false }
            );
        } else {
            // Target wins
            await updateUserStats(targetUser.id, {
                coins: targetUser.coins + winnerRewards.coins,
                battles_won: targetUser.battles_won + 1
            });

            await updateUserStats(challenger.id, {
                coins: challenger.coins + loserCompensation.coins,
                battles_lost: challenger.battles_lost + 1
            });

            // Update arena rankings - winner gets better rank
            await updateArenaRanking(targetUser.id, challenger.id);

            embed.addFields(
                { name: '🏆 Winner Rewards', value: `**${targetUser.username}**: +${winnerRewards.coins} coins`, inline: false },
                { name: '💰 Loser Compensation', value: `**${challenger.username}**: +${loserCompensation.coins} coins`, inline: false }
            );
        }

        embed.setTimestamp();
        message.reply({ embeds: [embed] });

        // Set cooldown after successful battle
        const { setCooldownAfterSuccess } = require('../../utils/database');
        await setCooldownAfterSuccess(message.author.id, 'battle', 8);

        logger.info(`PvP Battle: ${challenger.username} vs ${targetUser.username} - Winner: ${battleResult.winner.username}`);

    } catch (error) {
        logger.error('Error in PvP battle:', error);
        throw error;
    }
}

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
        log += `⚔️ ${target.username} successfully defends their position!`;
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
        difference,
        winner: victory ? challenger : target,
        loser: victory ? target : challenger
    };
}

function calculatePvPRewards(user, opponent, isWinner) {
    const baseExp = isWinner ? 150 : 5; // Minimal compensation for losers to mock them
    const baseCoins = isWinner ? 200 : 10; // Minimal compensation for losers to mock them

    // Scale based on opponent level
    const levelDiff = Math.max(1, opponent.level - user.level + 1);
    const expReward = Math.round(baseExp * levelDiff);
    const coinReward = Math.round(baseCoins * levelDiff);

    return {
        exp: expReward,
        coins: coinReward
    };
}
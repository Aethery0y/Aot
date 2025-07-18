const { EmbedBuilder } = require('discord.js');
const { getUserByDiscordId, updateUserStats, getUserPowers } = require('../../utils/database');
const { generateRandomEncounter, calculateBattleResult, calculateRewards } = require('../../utils/combat');
const { getRankEmoji } = require('../../utils/powers');
const logger = require('../../utils/logger');

module.exports = {
    name: 'fight',
    description: 'Fight against random titans, humans, and monsters',
    cooldown: 10, // 10 seconds cooldown

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

            // Use equipped power's CP for enemy matching (not total CP)
            const equippedCP = equippedPower.combat_power;

            // Handle rank-specific fights
            const targetRank = args[0];
            const validRanks = ['normal', 'rare', 'epic', 'legendary', 'mythic', 'divine', 'cosmic', 'transcendent', 'omnipotent', 'absolute'];
            
            let encounter;
            if (targetRank && validRanks.includes(targetRank.toLowerCase())) {
                // Capitalize the first letter for proper rank matching
                const properRank = targetRank.charAt(0).toUpperCase() + targetRank.slice(1).toLowerCase();
                encounter = await generateRandomEncounter(equippedCP, properRank);
            } else {
                encounter = await generateRandomEncounter(equippedCP);
            }



            // Calculate battle result
            const battleResult = calculateBattleResult(user, equippedPower, encounter);

            // Create battle embed
            const embed = new EmbedBuilder()
                .setColor(battleResult.victory ? '#00ff00' : '#ff0000')
                .setTitle(battleResult.victory ? '🏆 VICTORY!' : '💀 DEFEAT')
                .setDescription(`⚔️ vs ${encounter.name}\n${battleResult.log}`);

            if (battleResult.victory) {
                const rewards = calculateRewards(encounter);

                // Update user stats (exp system removed)
                await updateUserStats(user.id, {
                    coins: user.coins + rewards.coins,
                    battles_won: user.battles_won + 1
                });

                embed.setDescription(embed.data.description + `\n\n💰 +${rewards.coins} coins`);
            } else {
                // Update defeat count
                await updateUserStats(user.id, {
                    battles_lost: user.battles_lost + 1
                });

                embed.setDescription(embed.data.description + `\n\n💡 Train harder to get stronger!`);
            }

            embed.setTimestamp();

            await message.reply({ embeds: [embed] });

            // Set cooldown after successful fight
            const { setCooldownAfterSuccess } = require('../../utils/database');
            await setCooldownAfterSuccess(message.author.id, 'fight', 10);

            logger.info(`${user.username} fought ${encounter.name} (${encounter.rank}) - ${battleResult.victory ? 'Victory' : 'Defeat'}`);

        } catch (error) {
            logger.error('Error in fight command:', error);
            message.reply('❌ An error occurred during the fight. Please try again later.');
        }
    }
};


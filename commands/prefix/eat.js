const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getUserByDiscordId, getUserPowers, removePower, addUserPower, updateUserCoins } = require('../../utils/database');
const { getRankEmoji } = require('../../utils/powers');
const logger = require('../../utils/logger');

// Store active eat challenges
const activeChallenges = new Map();

module.exports = {
    name: 'eat',
    aliases: ['steal', 'devour'],
    description: 'Attempt to steal a power from another user',
    usage: 'ot eat @user',
    cooldown: 8, // 8 seconds cooldown
    handleEatChallenge,

    async execute(message, args) {
        try {
            const challenger = await getUserByDiscordId(message.author.id);
            if (!challenger) {
                return message.reply('❌ You need to register first! Use `/register` command.');
            }

            // Cooldown is now handled by the main event system

            // Get target user
            let targetUser = null;
            
            // Check for mentioned user
            if (message.mentions.users.size > 0) {
                targetUser = message.mentions.users.first();
            }
            // Check for replied message
            else if (message.reference) {
                const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
                targetUser = repliedMessage.author;
            }
            
            if (!targetUser) {
                return message.reply('❌ You need to mention a user or reply to their message!\nUsage: `ot eat @user` or reply to their message with `ot eat`');
            }

            if (targetUser.id === message.author.id) {
                return message.reply('❌ You cannot eat your own power!');
            }

            if (targetUser.bot) {
                return message.reply('❌ You cannot eat powers from bots!');
            }

            // Check if target is registered
            const target = await getUserByDiscordId(targetUser.id);
            if (!target) {
                return message.reply(`❌ ${targetUser.username} needs to register first!`);
            }

            // Check if challenger has an equipped power
            const challengerPowers = await getUserPowers(challenger.id);
            const challengerEquipped = challengerPowers.find(p => p.user_power_id === challenger.equipped_power_id);
            
            if (!challengerEquipped) {
                return message.reply('❌ You need to equip a power before you can challenge others! Use `/otequip` to equip a power.');
            }

            // Check if target has pending challenges
            if (activeChallenges.has(targetUser.id)) {
                return message.reply(`❌ ${targetUser.username} already has a pending eat challenge!`);
            }

            // Get target's equipped power
            const targetPowers = await getUserPowers(target.id);
            const equippedPower = targetPowers.find(p => p.user_power_id === target.equipped_power_id);
            
            if (!equippedPower) {
                return message.reply(`❌ ${targetUser.username} doesn't have any equipped power to steal!`);
            }

            // Calculate success probability based on levels, CP, rank, and luck
            const successChance = calculateEatSuccess(challenger, target, equippedPower);
            
            // Create challenge embed
            const challengeEmbed = new EmbedBuilder()
                .setColor('#ff6b6b')
                .setTitle('🍽️ Power Eating Challenge!')
                .setDescription(`**${message.author.username}** wants to eat **${targetUser.username}**'s power!`)
                .addFields(
                    {
                        name: '🎯 Target Power',
                        value: `${getRankEmoji(equippedPower.rank)} **${equippedPower.name}**\n${equippedPower.description}\n💪 **${equippedPower.combat_power.toLocaleString()}** CP`,
                        inline: true
                    },
                    {
                        name: '⚖️ Success Chance',
                        value: `**${successChance.toFixed(1)}%**`,
                        inline: true
                    },
                    {
                        name: '🎯 Based On',
                        value: `Level: ${challenger.level} vs ${target.level}\nCP: ${challenger.total_cp || 0} vs ${target.total_cp || 0}\nRank: ${equippedPower.rank}\nLuck: Random factor`,
                        inline: true
                    },
                    {
                        name: '⚠️ Stakes',
                        value: `**Success:** ${targetUser.username} loses their power\n**Failure:** ${message.author.username} loses their power`,
                        inline: false
                    }
                )
                .setFooter({ text: `${targetUser.username}, you have 60 seconds to respond!` })
                .setTimestamp();

            const acceptButton = new ButtonBuilder()
                .setCustomId(`eat_accept_${message.author.id}_${targetUser.id}`)
                .setLabel('Accept Challenge')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🍽️');

            const declineButton = new ButtonBuilder()
                .setCustomId(`eat_decline_${message.author.id}_${targetUser.id}`)
                .setLabel('Decline')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('❌');

            const row = new ActionRowBuilder().addComponents(acceptButton, declineButton);

            const challengeMessage = await message.reply({
                content: `${targetUser}, you have been challenged to a power eating contest!`,
                embeds: [challengeEmbed],
                components: [row]
            });

            // Store challenge data
            activeChallenges.set(targetUser.id, {
                challengerId: message.author.id,
                targetId: targetUser.id,
                messageId: challengeMessage.id,
                channelId: message.channel.id,
                successChance,
                targetPower: equippedPower,
                timestamp: Date.now()
            });

            // Auto-decline after 60 seconds
            setTimeout(async () => {
                if (activeChallenges.has(targetUser.id)) {
                    activeChallenges.delete(targetUser.id);
                    
                    const timeoutEmbed = new EmbedBuilder()
                        .setColor('#808080')
                        .setTitle('⏰ Challenge Expired')
                        .setDescription(`${targetUser.username} did not respond in time. The eat challenge has been cancelled.`)
                        .setTimestamp();

                    try {
                        await challengeMessage.edit({
                            embeds: [timeoutEmbed],
                            components: []
                        });
                    } catch (error) {
                        logger.error('Error updating expired eat challenge:', error);
                    }
                }
            }, 60000);

            // Challenge created successfully
            // Set cooldown after challenge sent
            const { setCooldownAfterSuccess } = require('../../utils/database');
            await setCooldownAfterSuccess(message.author.id, 'eat', 8);
            
            logger.info(`Eat challenge created: ${message.author.username} vs ${targetUser.username}`);

        } catch (error) {
            logger.error('Error in eat command:', error);
            message.reply('❌ An error occurred while creating the eat challenge. Please try again later.');
        }
    }
};

function calculateEatSuccess(challenger, target, targetPower) {
    // Base success rate: 50%
    let successRate = 50;
    
    // Level difference bonus/penalty (±2% per level difference)
    const levelDiff = challenger.level - target.level;
    successRate += levelDiff * 2;
    
    // CP difference bonus/penalty (±1% per 1000 CP difference)
    const challengerCP = challenger.total_cp || 0;
    const targetCP = target.total_cp || 0;
    const cpDiff = (challengerCP - targetCP) / 1000;
    successRate += cpDiff;
    
    // Power rank penalty (harder to steal higher rank powers)
    const rankPenalties = {
        'Normal': 0,
        'Rare': -5,
        'Epic': -10,
        'Legendary': -15,
        'Mythic': -20,
        'Divine': -25,
        'Cosmic': -30,
        'Transcendent': -35,
        'Omnipotent': -40,
        'Absolute': -45
    };
    successRate += rankPenalties[targetPower.rank] || 0;
    
    // Luck factor: ±10% random variation
    const luckFactor = (Math.random() - 0.5) * 20; // -10% to +10%
    successRate += luckFactor;
    
    // Ensure success rate is between 5% and 95%
    return Math.max(5, Math.min(95, successRate));
}

// Handle button interactions for eat challenges
async function handleEatChallenge(interaction) {
    const customIdParts = interaction.customId.split('_');
    const action = customIdParts[1]; // 'accept' or 'decline'
    const challengerId = customIdParts[2];
    const targetId = customIdParts[3];

    if (interaction.user.id !== targetId) {
        return interaction.reply({
            content: '❌ This challenge is not for you!',
            flags: 64
        });
    }

    const challengeData = activeChallenges.get(targetId);
    if (!challengeData) {
        return interaction.reply({
            content: '❌ This challenge has expired or is no longer valid.',
            flags: 64
        });
    }

    // Remove challenge from active list
    activeChallenges.delete(targetId);

    if (action === 'decline') {
        const declineEmbed = new EmbedBuilder()
            .setColor('#808080')
            .setTitle('❌ Challenge Declined')
            .setDescription(`${interaction.user.username} declined the eat challenge.`)
            .setTimestamp();

        await interaction.update({
            embeds: [declineEmbed],
            components: []
        });

        logger.info(`Eat challenge declined: ${challengerId} vs ${targetId}`);
        return;
    }

    // Challenge accepted - process the eating attempt
    await interaction.deferUpdate();
    
    try {
        const challenger = await getUserByDiscordId(challengerId);
        const target = await getUserByDiscordId(targetId);
        
        if (!challenger || !target) {
            throw new Error('User data not found');
        }

        // Get current powers
        const challengerPowers = await getUserPowers(challenger.id);
        const targetPowers = await getUserPowers(target.id);
        
        const challengerEquipped = challengerPowers.find(p => p.user_power_id === challenger.equipped_power_id);
        const targetEquipped = targetPowers.find(p => p.user_power_id === target.equipped_power_id);

        if (!challengerEquipped) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Challenge Failed')
                .setDescription(`${challenger.username} no longer has an equipped power! Please equip a power using \`/otequip\` before challenging others.`)
                .setTimestamp();

            await interaction.editReply({
                embeds: [errorEmbed],
                components: []
            });
            return;
        }

        if (!targetEquipped) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Challenge Failed')
                .setDescription(`${target.username} no longer has an equipped power to steal!`)
                .setTimestamp();

            await interaction.editReply({
                embeds: [errorEmbed],
                components: []
            });
            return;
        }

        // Determine success
        const roll = Math.random() * 100;
        const success = roll <= challengeData.successChance;

        let resultEmbed;

        if (success) {
            // Challenger wins - gets target's power, target loses it
            await removePower(targetEquipped.user_power_id);
            await addUserPower(challenger.id, targetEquipped.power_id, targetEquipped.combat_power);

            resultEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🍽️ Power Successfully Eaten!')
                .setDescription(`**${challenger.username}** successfully ate **${target.username}**'s power!`)
                .addFields(
                    {
                        name: '🎯 Stolen Power',
                        value: `${getRankEmoji(targetEquipped.rank)} **${targetEquipped.name}**\n💪 **${targetEquipped.combat_power.toLocaleString()}** CP`,
                        inline: true
                    },
                    {
                        name: '🎲 Roll Result',
                        value: `**${roll.toFixed(1)}%** (needed ≤ ${challengeData.successChance.toFixed(1)}%)`,
                        inline: true
                    }
                )
                .setFooter({ text: `${target.username} can now equip a different power` });

            logger.info(`Eat challenge success: ${challenger.username} ate ${target.username}'s ${targetEquipped.name}`);

        } else {
            // Challenger fails - loses their power, target gets coins
            const coinReward = Math.floor((target.level * 100) + (target.total_cp / 10));
            
            await removePower(challengerEquipped.user_power_id);
            await updateUserCoins(target.id, coinReward);

            resultEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('💥 Power Eating Failed!')
                .setDescription(`**${challenger.username}**'s attempt failed! **${target.username}** defended successfully!`)
                .addFields(
                    {
                        name: '💔 Lost Power',
                        value: `${getRankEmoji(challengerEquipped.rank)} **${challengerEquipped.name}**\n💪 **${challengerEquipped.combat_power.toLocaleString()}** CP`,
                        inline: true
                    },
                    {
                        name: '💰 Defender Reward',
                        value: `**${coinReward.toLocaleString()}** coins`,
                        inline: true
                    },
                    {
                        name: '🎲 Roll Result',
                        value: `**${roll.toFixed(1)}%** (needed ≤ ${challengeData.successChance.toFixed(1)}%)`,
                        inline: true
                    }
                )
                .setFooter({ text: `${challenger.username} can now equip a different power` });

            logger.info(`Eat challenge failed: ${challenger.username} lost ${challengerEquipped.name} to ${target.username}`);
        }

        await interaction.editReply({
            embeds: [resultEmbed],
            components: []
        });

    } catch (error) {
        logger.error('Error processing eat challenge:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Challenge Error')
            .setDescription('An error occurred while processing the eat challenge.')
            .setTimestamp();

        await interaction.editReply({
            embeds: [errorEmbed],
            components: []
        });
    }
}

module.exports.handleEatChallenge = handleEatChallenge;
module.exports.activeChallenges = activeChallenges;
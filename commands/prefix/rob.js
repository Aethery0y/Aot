const { EmbedBuilder } = require('discord.js');
const { getUserByDiscordId, getUserByUsername, updateUserCoins, getUserPowers } = require('../../utils/database');
const logger = require('../../utils/logger');

module.exports = {
    name: 'rob',
    aliases: ['steal'],
    description: 'Attempt to rob another player (luck and CP based)',
    cooldown: 8, // 8 seconds cooldown

    async execute(message, args) {
        try {
            const robber = await getUserByDiscordId(message.author.id);
            if (!robber) {
                return message.reply('❌ You need to register first! Use `/register` command.');
            }

            if (args.length === 0) {
                return message.reply('❌ Please specify who to rob. Usage: `ot rob @user` or `ot rob username`');
            }

            // Parse target
            let targetUser;
            const targetInput = args[0];

            if (targetInput.startsWith('<@')) {
                // Mention
                const targetId = targetInput.replace(/[<@!>]/g, '');
                targetUser = await getUserByDiscordId(targetId);
            } else {
                // Username
                targetUser = await getUserByUsername(targetInput);
            }

            if (!targetUser) {
                return message.reply('❌ Target user not found or not registered.');
            }

            if (targetUser.discord_id === robber.discord_id) {
                return message.reply('❌ You cannot rob yourself!');
            }

            // Check if target has money in wallet (bank money is safe)
            if (targetUser.coins < 100) {
                const embed = new EmbedBuilder()
                    .setColor('#ffaa00')
                    .setTitle('🎒 Empty Pockets')
                    .setDescription(`**${targetUser.username}** doesn't have enough coins to rob!`)
                    .addFields(
                        { name: '💰 Target\'s Wallet', value: `${targetUser.coins} coins`, inline: true },
                        { name: '💡 Tip', value: 'Targets need at least 100 coins to rob', inline: true }
                    )
                    .setFooter({ text: 'Find a richer target!' })
                    .setTimestamp();

                return message.reply({ embeds: [embed] });
            }

            // Get both users' combat powers
            const robberPowers = await getUserPowers(robber.id);
            const targetPowers = await getUserPowers(targetUser.id);

            const robberEquipped = robberPowers.find(p => p.user_power_id === robber.equipped_power_id);
            const targetEquipped = targetPowers.find(p => p.user_power_id === targetUser.equipped_power_id);

            const robberCP = robberEquipped ? robberEquipped.combat_power : 0;
            const targetCP = targetEquipped ? targetEquipped.combat_power : 0;

            // Calculate success chance based on CP difference and luck
            const cpDifference = robberCP - targetCP;
            let baseChance = 30; // Base 30% success rate

            // Adjust based on CP difference
            const cpBonus = Math.min(Math.max(cpDifference / 100, -20), 40); // -20% to +40% based on CP
            const finalChance = Math.max(5, Math.min(85, baseChance + cpBonus)); // Between 5% and 85%

            // Add some randomness
            const randomBonus = (Math.random() - 0.5) * 10; // ±5% random
            const successChance = Math.max(5, Math.min(85, finalChance + randomBonus));

            const success = Math.random() * 100 < successChance;

            let stolenAmount = 0;
            let penalty = 0;

            if (success) {
                // Successful robbery - steal 15-35% of target's wallet coins
                const stealPercentage = 0.15 + Math.random() * 0.2; // 15-35%
                stolenAmount = Math.floor(targetUser.coins * stealPercentage);
                stolenAmount = Math.min(stolenAmount, targetUser.coins); // Can't steal more than they have

                // Transfer coins
                await updateUserCoins(robber.id, stolenAmount);
                await updateUserCoins(targetUser.id, -stolenAmount);
            } else {
                // Failed robbery - robber pays penalty
                penalty = Math.floor(robber.coins * 0.1); // 10% penalty
                penalty = Math.min(penalty, robber.coins); // Can't pay more than they have
                penalty = Math.max(penalty, 50); // Minimum 50 coins penalty

                if (penalty > 0) {
                    await updateUserCoins(robber.id, -penalty);
                }
            }

            const embed = new EmbedBuilder()
                .setColor(success ? '#00ff00' : '#ff0000')
                .setTitle(success ? '🦹 Robbery Successful!' : '🚨 Robbery Failed!')
                .setDescription(`**${robber.username}** attempted to rob **${targetUser.username}**`)
                .addFields(
                    { name: '🎯 Robber Power', value: `${robberCP.toLocaleString()} CP`, inline: true },
                    { name: '🛡️ Target Power', value: `${targetCP.toLocaleString()} CP`, inline: true },
                    { name: '🎲 Success Chance', value: `${Math.round(successChance)}%`, inline: true }
                );

            if (success) {
                embed.addFields(
                    { name: '💰 Amount Stolen', value: `${stolenAmount.toLocaleString()} coins`, inline: true },
                    { name: '🎒 From Target\'s Wallet', value: `${targetUser.coins.toLocaleString()} → ${(targetUser.coins - stolenAmount).toLocaleString()}`, inline: true },
                    { name: '💎 Robber\'s New Balance', value: `${(robber.coins + stolenAmount).toLocaleString()} coins`, inline: true }
                );
                embed.setDescription(embed.data.description + '\n\n💰 **SUCCESS!** You made off with the loot!');
            } else {
                embed.addFields(
                    { name: '💸 Penalty Paid', value: `${penalty.toLocaleString()} coins`, inline: true },
                    { name: '🚨 Caught Red-Handed!', value: 'You got caught and had to pay a fine', inline: true },
                    { name: '💔 Robber\'s New Balance', value: `${(robber.coins - penalty).toLocaleString()} coins`, inline: true }
                );
                embed.setDescription(embed.data.description + '\n\n🚨 **CAUGHT!** The heist went wrong!');
            }

            embed.addFields({
                name: '🛡️ Protection Tips',
                value: '• Keep money in bank (`ot deposit`) to stay safe\n• Higher CP helps defend against robberies\n• Bank money cannot be stolen',
                inline: false
            })
            .setFooter({ text: 'Robbery has an 8-second cooldown • Bank your money for safety!' })
            .setTimestamp();

            message.reply({ embeds: [embed] });

            // Set cooldown after robbery attempt
            const { setCooldownAfterSuccess } = require('../../utils/database');
            await setCooldownAfterSuccess(message.author.id, 'rob', 8);

            // Send notification to target if they're online
            try {
                const targetMember = await message.guild.members.fetch(targetUser.discord_id);
                if (targetMember) {
                    const notificationEmbed = new EmbedBuilder()
                        .setColor(success ? '#ff0000' : '#00ff00')
                        .setTitle(success ? '🚨 You Were Robbed!' : '🛡️ Robbery Attempt Failed!')
                        .setDescription(`**${robber.username}** tried to rob you!`)
                        .addFields(
                            { name: success ? '💸 Lost' : '🛡️ Protected', 
                              value: success ? `${stolenAmount.toLocaleString()} coins` : 'Your coins are safe!', 
                              inline: true }
                        )
                        .setFooter({ text: 'Use "ot deposit" to protect your coins in the bank!' })
                        .setTimestamp();

                    targetMember.send({ embeds: [notificationEmbed] }).catch(() => {
                        // If DM fails, that's okay
                    });
                }
            } catch (error) {
                // If fetching member fails, that's okay
            }

            logger.info(`${robber.username} attempted to rob ${targetUser.username} - ${success ? `STOLE ${stolenAmount}` : `FAILED (penalty ${penalty})`}`);

        } catch (error) {
            logger.error('Error in rob command:', error);
            message.reply('❌ An error occurred during the robbery attempt. Please try again later.');
        }
    }
};
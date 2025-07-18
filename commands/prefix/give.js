const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getUserByDiscordId, getUserPowers, addUserPower, removePower } = require('../../utils/database');
const atomicOperations = require('../../utils/atomicOperations');
const { getRankEmoji } = require('../../utils/powers');
const logger = require('../../utils/logger');

module.exports = {
    name: 'give',
    description: 'Give a power or coins to another user',
    usage: 'ot give <@user> <power_name|coins> [amount]',
    cooldown: 10, // 10 seconds to prevent spam

    async execute(message, args) {
        try {
            // Check if user is registered
            const user = await getUserByDiscordId(message.author.id);
            if (!user) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Not Registered')
                    .setDescription('You need to register first using `/register`.')
                    .setTimestamp();

                return message.reply({ embeds: [embed] });
            }

            // Parse arguments
            if (args.length < 2) {
                const embed = new EmbedBuilder()
                    .setColor('#ffaa00')
                    .setTitle('⚠️ Invalid Usage')
                    .setDescription('**Usage:** `ot give <@user> <power_name|coins> [amount]`')
                    .addFields(
                        {
                            name: '📝 Examples',
                            value: '• `ot give @user Royal Blood` - Give a power\n• `ot give @user coins 1000` - Give coins',
                            inline: false
                        }
                    )
                    .setTimestamp();

                return message.reply({ embeds: [embed] });
            }

            // Get target user - handle various mention formats
            const targetMention = args[0];
            let targetUserId = targetMention.replace(/[<@!>]/g, '');

            // If not a mention, check if it's a raw user ID
            if (targetUserId === targetMention && !/^\d+$/.test(targetUserId)) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Invalid User')
                    .setDescription('Please mention a valid user or provide a valid user ID.')
                    .setTimestamp();

                return message.reply({ embeds: [embed] });
            }

            const targetUser = await getUserByDiscordId(targetUserId);

            if (!targetUser) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ User Not Found')
                    .setDescription('The mentioned user is not registered.')
                    .setTimestamp();

                return message.reply({ embeds: [embed] });
            }

            // Check if trying to give to self
            if (user.id === targetUser.id) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Cannot Give to Yourself')
                    .setDescription('You cannot give items to yourself.')
                    .setTimestamp();

                return message.reply({ embeds: [embed] });
            }

            const itemType = args[1].toLowerCase();

            // Handle coin transfer confirmation
            if (itemType === 'coins') {
                const amount = parseInt(args[2]);

                if (!amount || amount <= 0 || isNaN(amount)) {
                    const embed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('❌ Invalid Amount')
                        .setDescription('Please specify a valid positive amount of coins to give.')
                        .setTimestamp();

                    return message.reply({ embeds: [embed] });
                }

                // Get fresh user data for coin check
                const freshUser = await getUserByDiscordId(message.author.id);
                if (freshUser.coins < amount) {
                    const embed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('❌ Insufficient Coins')
                        .setDescription(`You don't have enough coins. You have **${freshUser.coins}** coins.`)
                        .setTimestamp();

                    return message.reply({ embeds: [embed] });
                }

                // Create confirmation embed for coins
                const confirmEmbed = new EmbedBuilder()
                    .setColor('#ffaa00')
                    .setTitle('💰 Confirm Coin Transfer')
                    .setDescription(`Are you sure you want to give **${amount.toLocaleString()}** coins to <@${targetUserId}>?`)
                    .addFields(
                        {
                            name: '👤 From',
                            value: `${message.author.tag}\nCurrent: ${freshUser.coins.toLocaleString()} coins\nAfter: ${(freshUser.coins - amount).toLocaleString()} coins`,
                            inline: true
                        },
                        {
                            name: '👤 To',
                            value: `<@${targetUserId}>\nCurrent: ${targetUser.coins.toLocaleString()} coins\nAfter: ${(targetUser.coins + amount).toLocaleString()} coins`,
                            inline: true
                        },
                        {
                            name: '⚠️ Warning',
                            value: 'This action cannot be undone. Make sure you trust the recipient.',
                            inline: false
                        }
                    )
                    .setFooter({ text: 'Click confirm to proceed or decline to cancel' })
                    .setTimestamp();

                // Create confirmation buttons
                const confirmRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`give_confirm_coins_${targetUserId}_${amount}`)
                            .setLabel('✅ Confirm Transfer')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId('give_decline')
                            .setLabel('❌ Decline')
                            .setStyle(ButtonStyle.Danger)
                    );

                return message.reply({ embeds: [confirmEmbed], components: [confirmRow] });
            }

            // Handle power transfer confirmation
            const powerName = args.slice(1).join(' ');
            const userPowers = await getUserPowers(user.id);
            const powerToGive = userPowers.find(p => p.name.toLowerCase() === powerName.toLowerCase());

            if (!powerToGive) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Power Not Found')
                    .setDescription(`You don't own a power named "**${powerName}**"`)
                    .addFields({
                        name: '💡 Your Powers',
                        value: userPowers.length > 0 
                            ? userPowers.slice(0, 10).map(p => `• ${p.name} (${p.rank})`).join('\n')
                            : 'No powers available.',
                        inline: false
                    })
                    .setTimestamp();

                return message.reply({ embeds: [embed] });
            }

            // Check if power is equipped
            if (user.equipped_power_id === powerToGive.user_power_id) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Cannot Give Equipped Power')
                    .setDescription('You cannot give away your currently equipped power. Unequip it first using `/otunequip`.')
                    .setTimestamp();

                return message.reply({ embeds: [embed] });
            }

            // Create confirmation embed for power
            const confirmEmbed = new EmbedBuilder()
                .setColor('#ffaa00')
                .setTitle('⚡ Confirm Power Transfer')
                .setDescription(`Are you sure you want to give **${powerToGive.name}** to <@${targetUserId}>?`)
                .addFields(
                    {
                        name: '⚡ Power Details',
                        value: `${getRankEmoji(powerToGive.rank)} **${powerToGive.name}**\n${powerToGive.rank} Rank • ${powerToGive.combat_power} CP`,
                        inline: false
                    },
                    {
                        name: '👤 From',
                        value: message.author.tag,
                        inline: true
                    },
                    {
                        name: '👤 To',
                        value: `<@${targetUserId}>`,
                        inline: true
                    },
                    {
                        name: '⚠️ Warning',
                        value: 'This action cannot be undone. The power will be permanently transferred.',
                        inline: false
                    }
                )
                .setFooter({ text: 'Click confirm to proceed or decline to cancel' })
                .setTimestamp();

            // Create confirmation buttons
            const confirmRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`give_confirm_power_${targetUserId}_${powerToGive.user_power_id}`)
                        .setLabel('✅ Confirm Transfer')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('give_decline')
                        .setLabel('❌ Decline')
                        .setStyle(ButtonStyle.Danger)
                );

            return message.reply({ embeds: [confirmEmbed], components: [confirmRow] });

        } catch (error) {
            logger.error('Error in give command:', error);

            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Error')
                .setDescription('An error occurred while processing the give command.')
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }
    }
};
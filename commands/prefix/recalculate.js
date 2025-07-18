
const { EmbedBuilder } = require('discord.js');
const { getUserByDiscordId, getUserPowers, updateUserPowerCP } = require('../../utils/database');
const { getPowerCP } = require('../../utils/powers');
const logger = require('../../utils/logger');

module.exports = {
    name: 'recalculate',
    aliases: ['recalc', 'fixcp'],
    description: 'Recalculate CP for all your powers with the updated scaling system',
    cooldown: 30, // 30 seconds to prevent spam

    async execute(message, args) {
        try {
            const user = await getUserByDiscordId(message.author.id);
            if (!user) {
                return message.reply('❌ You need to register first! Use `/register` command.');
            }

            const userPowers = await getUserPowers(user.id);
            if (!userPowers || userPowers.length === 0) {
                return message.reply('❌ You have no powers to recalculate!');
            }

            let updatedCount = 0;
            const updates = [];

            for (const userPower of userPowers) {
                const newCP = getPowerCP(userPower);
                if (newCP !== userPower.combat_power) {
                    await updateUserPowerCP(userPower.id, newCP);
                    updates.push({
                        name: userPower.name,
                        rank: userPower.rank,
                        oldCP: userPower.combat_power,
                        newCP: newCP
                    });
                    updatedCount++;
                }
            }

            if (updatedCount === 0) {
                return message.reply('✅ All your powers already have correct CP values!');
            }

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('⚡ Power CP Recalculation Complete!')
                .setDescription(`**${user.username}** recalculated ${updatedCount} power(s)`)
                .addFields({
                    name: '📊 Updated Powers',
                    value: updates.map(update => 
                        `${update.name} (${update.rank}): ${update.oldCP} → **${update.newCP}** CP`
                    ).join('\n'),
                    inline: false
                })
                .addFields({
                    name: '💡 What Changed',
                    value: '• Fixed CP scaling to properly reflect power ranks\n• Rare powers now have significantly more CP than Normal\n• All ranks now have proper minimum CP thresholds',
                    inline: false
                })
                .setFooter({ text: 'Your powers now have properly scaled combat power!' })
                .setTimestamp();

            message.reply({ embeds: [embed] });

            logger.info(`${user.username} recalculated ${updatedCount} powers`);

        } catch (error) {
            logger.error('Error in recalculate command:', error);
            message.reply('❌ An error occurred while recalculating powers. Please try again.');
        }
    }
};

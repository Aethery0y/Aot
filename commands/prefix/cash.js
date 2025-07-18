const { EmbedBuilder } = require('discord.js');
const { getUserByDiscordId } = require('../../utils/database');
const logger = require('../../utils/logger');

module.exports = {
    name: 'cash',
    aliases: ['coins', 'money', 'balance'],
    description: 'View your current cash balance',

    async execute(message, args) {
        try {
            const user = await getUserByDiscordId(message.author.id);
            if (!user) {
                return message.reply('❌ You need to register first! Use `/register` command.');
            }

            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('💰 Cash Balance')
                .setDescription(`**${user.username}**'s financial status`)
                .addFields(
                    { name: '💵 Wallet', value: `${user.coins.toLocaleString()} coins`, inline: true },
                    { name: '🏦 Bank', value: `${user.bank_balance.toLocaleString()} coins`, inline: true },
                    { name: '💎 Total Wealth', value: `${(user.coins + user.bank_balance).toLocaleString()} coins`, inline: true }
                )
                .addFields({
                    name: '💡 Financial Tips',
                    value: '• Use `ot deposit <amount>` to secure coins in bank\n• Bank money is safe from robberies\n• Win battles and gamble to earn more coins',
                    inline: false
                })
                .setFooter({ text: 'Use "ot bank" for banking commands • "ot bet/cf/slot/hr" for gambling • Today at ' + new Date().toLocaleTimeString() })
                .setTimestamp();

            message.reply({ embeds: [embed] });

            logger.info(`${user.username} checked cash balance: ${user.coins} wallet, ${user.bank_balance} bank`);

        } catch (error) {
            logger.error('Error in cash command:', error);
            message.reply('❌ An error occurred while fetching your cash balance. Please try again later.');
        }
    }
};

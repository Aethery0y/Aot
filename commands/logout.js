const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserByDiscordId, logoutUser } = require('../utils/database');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('logout')
        .setDescription('Logout from your current Attack on Titan RPG session'),

    async execute(interaction) {
        try {
            await interaction.deferReply({ flags: 64 });

            const discordId = interaction.user.id;

            // Check if user is logged in
            const currentSession = await getUserByDiscordId(discordId);
            if (!currentSession) {
                const notLoggedInEmbed = new EmbedBuilder()
                    .setColor('#ffaa00')
                    .setTitle('⚠️ Not Logged In')
                    .setDescription('You are not currently logged into any account.')
                    .addFields({
                        name: '🎮 Getting Started',
                        value: '• Use `/register` to create a new account\n• Use `/login` to access an existing account',
                        inline: false
                    })
                    .setFooter({ text: 'Attack on Titan RPG' })
                    .setTimestamp();

                return interaction.editReply({ embeds: [notLoggedInEmbed] });
            }

            // Logout user
            await logoutUser(discordId);

            const logoutEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Logged Out Successfully')
                .setDescription(`You have been logged out from **${currentSession.username}**'s account.`)
                .addFields(
                    { name: '📊 Session Summary', value: `Level: ${currentSession.level}\nCoins: ${currentSession.coins.toLocaleString()}\nBattles Won: ${currentSession.battles_won}`, inline: true },
                    { name: '🎮 Next Steps', value: '• Use `/login` to access another account\n• Use `/register` to create a new account\n• Your progress has been saved!', inline: true }
                )
                .setFooter({ text: 'Thank you for playing Attack on Titan RPG!' })
                .setTimestamp();

            logger.info(`User logged out: ${currentSession.username} (Discord: ${discordId})`);
            
            await interaction.editReply({ embeds: [logoutEmbed] });

        } catch (error) {
            logger.error('Error in logout command:', error);

            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Logout Failed')
                .setDescription('An error occurred during logout. Please try again.')
                .setFooter({ text: 'Contact support if the issue persists' });

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};
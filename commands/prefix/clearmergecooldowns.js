const { EmbedBuilder } = require('discord.js');
const { pool } = require('../../utils/database');
const logger = require('../../utils/logger');

module.exports = {
    name: 'clearmergecooldowns',
    description: 'Clear all merge cooldowns (admin only)',
    adminOnly: true,

    async execute(message, args) {
        try {
            // Check if user is admin (you can modify this check)
            if (!message.member.permissions.has('ADMINISTRATOR')) {
                return message.reply('❌ This command is for administrators only.');
            }

            const connection = await pool.getConnection();
            
            try {
                // Clear all merge cooldowns
                const [result] = await connection.execute(
                    'DELETE FROM cooldowns WHERE command_name = ? OR command_name LIKE ?',
                    ['merge_command', '%merge%']
                );
                
                const embed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('✅ Merge Cooldowns Cleared')
                    .setDescription(`Cleared ${result.affectedRows} merge cooldown entries`)
                    .addFields(
                        { name: '📊 Status', value: 'All users can now use merge command immediately', inline: false }
                    )
                    .setTimestamp();
                
                await message.reply({ embeds: [embed] });
                logger.info(`Admin ${message.author.username} cleared ${result.affectedRows} merge cooldowns`);
                
            } finally {
                connection.release();
            }
            
        } catch (error) {
            logger.error('Error clearing merge cooldowns:', error);
            message.reply('❌ An error occurred while clearing merge cooldowns.');
        }
    }
};
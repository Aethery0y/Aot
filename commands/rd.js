const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { pool } = require("../config/database");
const logger = require("../utils/logger");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("rd")
        .setDescription(
            "🔄 Reset User Data - Admin command to reset user progress while preserving bot data",
        )
        .addStringOption((option) =>
            option
                .setName("confirm")
                .setDescription('Select confirmation option to proceed')
                .setRequired(true)
                .addChoices(
                    { name: '❌ CANCEL - Do not reset user data', value: 'CANCEL' },
                    { name: '🔄 RESET_USER_DATA - Reset user progress only', value: 'RESET_USER_DATA' }
                ),
        ),

    async execute(interaction) {
        try {
            await interaction.deferReply({ flags: 64 });

            // Admin check - only allow specific Discord IDs
            const adminIds = ["1354098432930873457"]; // Replace with actual admin Discord IDs
            if (!adminIds.includes(interaction.user.id)) {
                const noPermissionEmbed = new EmbedBuilder()
                    .setColor("#ff0000")
                    .setTitle("❌ Access Denied")
                    .setDescription(
                        "You do not have permission to use this command.",
                    )
                    .setFooter({ text: "Super Admin Only Command" })
                    .setTimestamp();

                return interaction.editReply({ embeds: [noPermissionEmbed] });
            }

            const confirmation = interaction.options.getString("confirm");

            // Check confirmation
            if (confirmation !== "RESET_USER_DATA") {
                const confirmEmbed = new EmbedBuilder()
                    .setColor("#00ff00")
                    .setTitle("✅ User Data Reset Cancelled")
                    .setDescription(
                        'User data reset cancelled. All data remains intact.',
                    )
                    .addFields({
                        name: "💡 To proceed with user data reset",
                        value: "Select '🔄 RESET_USER_DATA - Reset user progress only' from the dropdown menu.",
                        inline: false,
                    })
                    .setFooter({ text: "Reset cancelled - All data is safe" })
                    .setTimestamp();

                return interaction.editReply({ embeds: [confirmEmbed] });
            }

            const connection = await pool.getConnection();

            try {
                await connection.beginTransaction();

                // Get statistics before deletion
                const [userCount] = await connection.execute(
                    "SELECT COUNT(*) as count FROM users",
                );
                const [powerCount] = await connection.execute(
                    "SELECT COUNT(*) as count FROM user_powers",
                );
                const [arenaCount] = await connection.execute(
                    "SELECT COUNT(*) as count FROM arena_rankings",
                );
                const [cooldownCount] = await connection.execute(
                    "SELECT COUNT(*) as count FROM command_cooldowns",
                );

                // Only delete user-related data, preserve powers and combat data
                await connection.execute("SET FOREIGN_KEY_CHECKS = 0");
                await connection.execute("DELETE FROM command_cooldowns");
                await connection.execute("DELETE FROM arena_rankings");
                await connection.execute("DELETE FROM user_powers");
                await connection.execute("DELETE FROM users");
                await connection.execute("SET FOREIGN_KEY_CHECKS = 1");

                await connection.commit();

                // Log the action
                logger.warn(
                    `Admin ${interaction.user.tag} (${interaction.user.id}) reset user data - Powers and combat data preserved`,
                );

                const successEmbed = new EmbedBuilder()
                    .setColor("#ffaa00")
                    .setTitle("🔄 USER DATA RESET COMPLETED")
                    .setDescription(
                        "**User progress has been reset while preserving bot functionality!**",
                    )
                    .addFields(
                        {
                            name: "🗑️ Reset Statistics",
                            value: `• Users: ${userCount[0].count}\n• User Powers: ${powerCount[0].count}\n• Arena Rankings: ${arenaCount[0].count}\n• Command Cooldowns: ${cooldownCount[0].count}`,
                            inline: false,
                        },
                        {
                            name: "✅ Preserved Data",
                            value: "• Powers table (all power definitions)\n• Combat encounters\n• Bot configuration\n• All core functionality intact",
                            inline: false,
                        },
                        {
                            name: "👤 Admin",
                            value: interaction.user.tag,
                            inline: true,
                        },
                    )
                    .setFooter({
                        text: "User data reset completed - Bot functionality preserved",
                    })
                    .setTimestamp();

                return interaction.editReply({ embeds: [successEmbed] });
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        } catch (error) {
            logger.error("Error in RD command:", error);

            const errorEmbed = new EmbedBuilder()
                .setColor("#ff0000")
                .setTitle("❌ User Data Reset Error")
                .setDescription(
                    "An error occurred during user data reset.",
                )
                .addFields(
                    {
                        name: "🔧 Error Details",
                        value: `\`\`\`${error.message}\`\`\``,
                        inline: false,
                    },
                    {
                        name: "⚠️ Status",
                        value: "User data may be partially reset. Bot functionality should remain intact.",
                        inline: false,
                    },
                )
                .setFooter({ text: "Check bot status and retry if needed" })
                .setTimestamp();

            return interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};

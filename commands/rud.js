const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { pool } = require("../config/database");
const logger = require("../utils/logger");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("rud")
        .setDescription(
            "🗑️ Remove User Database - Admin only command to delete a user from database",
        )
        .addStringOption((option) =>
            option
                .setName("username")
                .setDescription("Username to remove from database")
                .setRequired(true)
                .setAutocomplete(true),
        )
        .addStringOption((option) =>
            option
                .setName("confirm")
                .setDescription('Type "CONFIRM" to proceed with deletion')
                .setRequired(true)
                .addChoices(
                    { name: 'CONFIRM - I understand this will permanently delete the user', value: 'CONFIRM' },
                    { name: 'CANCEL - Do not proceed with deletion', value: 'CANCEL' }
                ),
        ),

    async autocomplete(interaction) {
        try {
            const focusedValue = interaction.options.getFocused();
            const connection = await pool.getConnection();
            
            try {
                const [users] = await connection.execute(
                    'SELECT username FROM users WHERE username LIKE ? LIMIT 25',
                    [`%${focusedValue}%`]
                );
                
                const choices = users.map(user => ({
                    name: user.username,
                    value: user.username
                }));
                
                await interaction.respond(choices);
            } finally {
                connection.release();
            }
        } catch (error) {
            logger.error('Error in RUD autocomplete:', error);
            await interaction.respond([]);
        }
    },

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
                    .setFooter({ text: "Admin Only Command" })
                    .setTimestamp();

                return interaction.editReply({ embeds: [noPermissionEmbed] });
            }

            const username = interaction.options.getString("username");
            const confirmation = interaction.options.getString("confirm");

            // Check confirmation
            if (confirmation !== "CONFIRM") {
                const confirmEmbed = new EmbedBuilder()
                    .setColor("#ffaa00")
                    .setTitle("⚠️ Deletion Cancelled")
                    .setDescription(
                        `User deletion cancelled. **${username}** remains in the database.`,
                    )
                    .addFields({
                        name: "💡 To proceed with deletion",
                        value: "Select 'CONFIRM - I understand this will permanently delete the user' from the dropdown menu.",
                        inline: false,
                    })
                    .setFooter({ text: "Deletion cancelled - No changes made" })
                    .setTimestamp();

                return interaction.editReply({ embeds: [confirmEmbed] });
            }

            const connection = await pool.getConnection();

            try {
                await connection.beginTransaction();

                // Get user data first
                const [userRows] = await connection.execute(
                    "SELECT * FROM users WHERE username = ?",
                    [username],
                );

                if (userRows.length === 0) {
                    const notFoundEmbed = new EmbedBuilder()
                        .setColor("#ffaa00")
                        .setTitle("⚠️ User Not Found")
                        .setDescription(
                            `No user found with username: **${username}**`,
                        )
                        .setFooter({ text: "Admin Command" })
                        .setTimestamp();

                    return interaction.editReply({ embeds: [notFoundEmbed] });
                }

                const user = userRows[0];

                // Delete from all related tables
                await connection.execute(
                    "DELETE FROM command_cooldowns WHERE user_id = ?",
                    [user.discord_id],
                );
                await connection.execute(
                    "DELETE FROM user_powers WHERE user_id = ?",
                    [user.id],
                );
                await connection.execute(
                    "DELETE FROM arena_rankings WHERE user_id = ?",
                    [user.id],
                );
                await connection.execute("DELETE FROM users WHERE id = ?", [
                    user.id,
                ]);

                await connection.commit();

                // Log the action
                logger.info(
                    `Admin ${interaction.user.tag} (${interaction.user.id}) deleted user: ${username} (${user.discord_id})`,
                );

                const successEmbed = new EmbedBuilder()
                    .setColor("#00ff00")
                    .setTitle("✅ User Deleted Successfully")
                    .setDescription(
                        `User **${username}** has been permanently removed from the database.`,
                    )
                    .addFields(
                        {
                            name: "🗑️ Deleted Data",
                            value: `• User: ${username} (${user.discord_id})\n• Level: ${user.level}\n• Coins: ${user.coins}\n• EXP: ${user.exp}\n• Battles Won: ${user.battles_won}\n• Battles Lost: ${user.battles_lost}`,
                            inline: false,
                        },
                        {
                            name: "👤 Admin",
                            value: interaction.user.tag,
                            inline: true,
                        },
                    )
                    .setFooter({ text: "Deletion completed successfully" })
                    .setTimestamp();

                return interaction.editReply({ embeds: [successEmbed] });
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        } catch (error) {
            logger.error("Error in RUD command:", error);

            const errorEmbed = new EmbedBuilder()
                .setColor("#ff0000")
                .setTitle("❌ Database Error")
                .setDescription(
                    "An error occurred while trying to delete the user.",
                )
                .addFields({
                    name: "🔧 Error Details",
                    value: `\`\`\`${error.message}\`\`\``,
                    inline: false,
                })
                .setFooter({ text: "Contact developer if this persists" })
                .setTimestamp();

            return interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};

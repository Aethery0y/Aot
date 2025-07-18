const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reporthelp')
        .setDescription('Learn how to include files and attachments in your reports'),

    async execute(interaction) {
        try {
            const helpEmbed = new EmbedBuilder()
                .setColor('#3498db')
                .setTitle('📎 How to Include Files in Reports')
                .setDescription('Learn how to attach screenshots, videos, and other files to your bug reports!')
                .addFields(
                    {
                        name: '📷 Screenshots & Images',
                        value: '**Method 1 (Recommended):** Upload image to Discord, right-click → "Copy Link", paste URL in report\n**Method 2:** Upload to [imgur.com](https://imgur.com) and copy direct link\n**Method 3:** Upload to [postimg.cc](https://postimg.cc) for permanent hosting',
                        inline: false
                    },
                    {
                        name: '⚠️ Modal Limitations',
                        value: 'Discord modals cannot accept file uploads directly. You must:\n• Upload files to external services first\n• Copy the direct link/URL\n• Paste the URL in the "Additional Information" field',
                        inline: false
                    },
                    {
                        name: '🎥 Videos & GIFs',
                        value: '1. Upload your video to Discord (under 8MB)\n2. Copy the link and paste it in your report\n\n**For larger files:** Use [streamable.com](https://streamable.com) or [gfycat.com](https://gfycat.com)',
                        inline: false
                    },
                    {
                        name: '📄 Text Files & Logs',
                        value: '1. Upload to [pastebin.com](https://pastebin.com) or [hastebin.com](https://hastebin.com)\n2. Copy the URL and include it in your report\n3. You can also paste small text directly in the description',
                        inline: false
                    },
                    {
                        name: '⚠️ Important Tips',
                        value: '• Never share passwords or personal information\n• Use direct links (not shortened URLs)\n• Include multiple angles for visual bugs\n• Describe what we should see in the files',
                        inline: false
                    },
                    {
                        name: '🛠️ Example Report with Files',
                        value: '**Subject:** Draw command shows wrong coins\n**Description:** After using ot draw, my coin count is incorrect\n**Additional Info:** \nScreenshot: https://discord.com/attachments/.../image.png\nConsole log: https://pastebin.com/xyz123\nExpected: 500 coins deducted, Actual: 1000 coins deducted',
                        inline: false
                    },
                    {
                        name: '🔧 Admin Response',
                        value: 'The admin will receive your report instantly and can:\n• Reply directly to your DMs\n• Mark reports as "Under Investigation"\n• Resolve issues and provide updates\n• View all attached files through the URLs you provide',
                        inline: false
                    }
                )
                .setFooter({ text: 'Use /otreport to submit reports with your attached files!' })
                .setTimestamp();

            await interaction.reply({ embeds: [helpEmbed], flags: 64 });

        } catch (error) {
            logger.error('Error in reporthelp command:', error);
            await interaction.reply({
                content: '❌ An error occurred while showing the help information.',
                flags: 64
            });
        }
    }
};
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');
const bugMonitor = require('../utils/bugMonitor');
const preventiveMaintenance = require('../utils/preventiveMaintenence');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('systemstatus')
        .setDescription('🔍 Admin only - View comprehensive system status and monitoring report')
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Action to perform')
                .setRequired(false)
                .addChoices(
                    { name: 'View Monitoring Report', value: 'monitoring' },
                    { name: 'Run Maintenance Check', value: 'maintenance' },
                    { name: 'System Overview', value: 'overview' }
                )),

    async execute(interaction) {
        try {
            await interaction.deferReply({ flags: 64 });

            // Admin check - only allow specific Discord IDs
            const adminIds = ["1354098432930873457"]; // Replace with actual admin Discord IDs
            if (!adminIds.includes(interaction.user.id)) {
                const noPermissionEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Access Denied')
                    .setDescription('You do not have permission to use this command.')
                    .setFooter({ text: 'Admin Only Command' })
                    .setTimestamp();

                return interaction.editReply({ embeds: [noPermissionEmbed] });
            }

            const action = interaction.options.getString('action') || 'overview';

            if (action === 'monitoring') {
                const monitoringReport = bugMonitor.createMonitoringReport();
                return interaction.editReply({ embeds: [monitoringReport] });
            }

            if (action === 'maintenance') {
                const maintenanceEmbed = new EmbedBuilder()
                    .setColor('#ff9900')
                    .setTitle('🔧 Running Maintenance Check...')
                    .setDescription('Please wait while the system performs a comprehensive maintenance check.')
                    .setTimestamp();

                await interaction.editReply({ embeds: [maintenanceEmbed] });

                try {
                    const result = await preventiveMaintenance.runMaintenanceCheck();
                    
                    const resultEmbed = new EmbedBuilder()
                        .setColor(result.issuesFound === 0 ? '#4CAF50' : '#ff9900')
                        .setTitle('✅ Maintenance Check Complete')
                        .setDescription(`Maintenance check completed successfully.`)
                        .addFields(
                            {
                                name: '📊 Results',
                                value: `Issues Found: ${result.issuesFound}\nIssues Fixed: ${result.issuesFixed}\nStatus: ${result.issuesFound === 0 ? 'All systems operational' : 'Issues detected and resolved'}`,
                                inline: false
                            }
                        );

                    if (result.issues && result.issues.length > 0) {
                        const issuesList = result.issues.slice(0, 5).join('\n');
                        resultEmbed.addFields({
                            name: '🔧 Issues Resolved',
                            value: issuesList,
                            inline: false
                        });
                    }

                    resultEmbed.setFooter({ text: 'Last run: ' + result.timestamp.toLocaleString() })
                            .setTimestamp();

                    return interaction.editReply({ embeds: [resultEmbed] });
                } catch (error) {
                    logger.error('Maintenance check failed:', error);
                    
                    const errorEmbed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('❌ Maintenance Check Failed')
                        .setDescription('An error occurred during the maintenance check.')
                        .addFields({
                            name: '🚨 Error Details',
                            value: `\`\`\`${error.message}\`\`\``,
                            inline: false
                        })
                        .setTimestamp();

                    return interaction.editReply({ embeds: [errorEmbed] });
                }
            }

            // Default overview action
            const stats = bugMonitor.getStats();
            const memUsage = process.memoryUsage();
            const uptime = process.uptime();

            const overviewEmbed = new EmbedBuilder()
                .setColor('#2196F3')
                .setTitle('🖥️ System Status Overview')
                .setDescription('Comprehensive system status and performance overview')
                .addFields(
                    {
                        name: '💻 System Resources',
                        value: `Memory Used: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB\nMemory Total: ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB\nUptime: ${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
                        inline: true
                    },
                    {
                        name: '📊 Bot Statistics',
                        value: `Commands Tracked: ${stats.totalCommands}\nMonitoring: ${stats.isMonitoring ? 'Active ✅' : 'Inactive ❌'}\nHealth: ${stats.systemHealth.toUpperCase()}`,
                        inline: true
                    },
                    {
                        name: '🔍 Monitoring Status',
                        value: `Bug Monitor: ${bugMonitor.isMonitoring ? 'Running' : 'Stopped'}\nMaintenance: ${preventiveMaintenance.lastMaintenanceRun ? 'Active' : 'Pending'}\nLast Check: ${preventiveMaintenance.lastMaintenanceRun ? preventiveMaintenance.lastMaintenanceRun.toLocaleTimeString() : 'Never'}`,
                        inline: false
                    }
                );

            // Add command performance summary
            const commandStats = Object.entries(stats.commands)
                .filter(([_, cmdStats]) => cmdStats.totalExecutions > 0)
                .sort((a, b) => b[1].totalExecutions - a[1].totalExecutions)
                .slice(0, 8);

            if (commandStats.length > 0) {
                const commandSummary = commandStats
                    .map(([cmd, cmdStats]) => `${cmd}: ${cmdStats.totalExecutions} (${cmdStats.errorRate}% errors)`)
                    .join('\n');

                overviewEmbed.addFields({
                    name: '⚡ Top Commands',
                    value: commandSummary,
                    inline: false
                });
            }

            overviewEmbed.setFooter({ text: 'Use /systemstatus monitoring for detailed monitoring report' })
                        .setTimestamp();

            return interaction.editReply({ embeds: [overviewEmbed] });

        } catch (error) {
            logger.error('Error in systemstatus command:', error);

            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ System Status Error')
                .setDescription('An error occurred while retrieving system status.')
                .addFields({
                    name: '🔧 Error Details',
                    value: `\`\`\`${error.message}\`\`\``,
                    inline: false
                })
                .setFooter({ text: 'Contact developer if this persists' })
                .setTimestamp();

            return interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};
require('dotenv').config();

module.exports = {
    token: process.env.DISCORD_TOKEN,
    prefix: 'ot ',
    embedColor: '#ff4444',
    maxLevel: 100,
    baseExp: 100,
    expMultiplier: 1.5,
    // CP purchasing removed
    dailyRewards: {
        1: 10000,
        2: 9000,
        3: 8000,
        4: 7000,
        5: 6000,
        6: 5000,
        7: 4000,
        8: 3000,
        9: 2000,
        10: 1000
    },
    paginationTimeout: 600000, // 10 minutes
    ranksPerPage: 10,
    adminId: '1354098432930873457', // Owner's Discord ID for admin notifications
    guildId: '931429251184484364', // Discord server ID
    reportsChannelId: '1394740400803287231', // Reports channel ID for fallback notifications

};

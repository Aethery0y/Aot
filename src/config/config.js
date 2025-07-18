require('dotenv').config();

const config = {
    // Discord Configuration
    discord: {
        token: process.env.DISCORD_TOKEN,
        clientId: process.env.DISCORD_CLIENT_ID,
        guildId: process.env.DISCORD_GUILD_ID,
        prefix: process.env.PREFIX || 'aot ',
        embedColor: '#FF4444',
        maxMessageLength: 2000
    },

    // Database Configuration
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 20,
        acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 60000,
        timeout: parseInt(process.env.DB_TIMEOUT) || 60000,
        reconnect: true,
        charset: 'utf8mb4'
    },

    // Redis Configuration
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB) || 0,
        keyPrefix: 'aot_bot:',
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3
    },

    // Security Configuration
    security: {
        jwtSecret: process.env.JWT_SECRET,
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
        maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
        lockoutDuration: parseInt(process.env.LOCKOUT_DURATION) || 900000, // 15 minutes
        sessionTimeout: parseInt(process.env.SESSION_TIMEOUT) || 86400000, // 24 hours
        rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 60000, // 1 minute
        rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 30
    },

    // Game Configuration
    game: {
        startingCoins: parseInt(process.env.STARTING_COINS) || 2000,
        startingDraws: parseInt(process.env.STARTING_DRAWS) || 15,
        maxLevel: parseInt(process.env.MAX_LEVEL) || 100,
        baseExp: parseInt(process.env.BASE_EXP) || 100,
        expMultiplier: parseFloat(process.env.EXP_MULTIPLIER) || 1.5,
        gachaDrawPrice: parseInt(process.env.GACHA_DRAW_PRICE) || 1000,
        maxGachaPurchase: parseInt(process.env.MAX_GACHA_PURCHASE) || 100,
        dailyRewardCoins: parseInt(process.env.DAILY_REWARD_COINS) || 500,
        battleCooldown: parseInt(process.env.BATTLE_COOLDOWN) || 10,
        gachaCooldown: parseInt(process.env.GACHA_COOLDOWN) || 5,
        dailyCooldown: parseInt(process.env.DAILY_COOLDOWN) || 86400 // 24 hours
    },

    // Monitoring Configuration
    monitoring: {
        healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000, // 30 seconds
        metricsRetention: parseInt(process.env.METRICS_RETENTION) || 86400000, // 24 hours
        alertThresholds: {
            memoryUsage: parseInt(process.env.MEMORY_THRESHOLD) || 512, // MB
            responseTime: parseInt(process.env.RESPONSE_TIME_THRESHOLD) || 5000, // ms
            errorRate: parseFloat(process.env.ERROR_RATE_THRESHOLD) || 0.05 // 5%
        }
    },

    // Logging Configuration
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5,
        maxSize: process.env.LOG_MAX_SIZE || '10m',
        datePattern: process.env.LOG_DATE_PATTERN || 'YYYY-MM-DD'
    },

    // Environment
    environment: process.env.NODE_ENV || 'development',
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production'
};

// Validate required configuration
const requiredEnvVars = [
    'DISCORD_TOKEN',
    'DB_HOST',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'JWT_SECRET'
];

for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
    }
}

module.exports = config;
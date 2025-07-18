const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ level, message, timestamp, stack }) => {
        if (stack) {
            return `[${timestamp}] ${level.toUpperCase()}: ${message}\n${stack}`;
        }
        return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    })
);

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    transports: [
        // Console transport
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                logFormat
            )
        }),
        
        // File transport for all logs
        new winston.transports.File({
            filename: path.join(logsDir, 'bot.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            format: logFormat
        }),
        
        // File transport for errors only
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            format: logFormat
        }),
        
        // File transport for command usage
        new winston.transports.File({
            filename: path.join(logsDir, 'commands.log'),
            level: 'info',
            maxsize: 5242880, // 5MB
            maxFiles: 3,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.printf(({ message, timestamp }) => {
                    return `[${timestamp}] ${message}`;
                })
            )
        })
    ],
    
    // Handle exceptions and rejections
    exceptionHandlers: [
        new winston.transports.File({
            filename: path.join(logsDir, 'exceptions.log'),
            maxsize: 5242880,
            maxFiles: 3
        })
    ],
    
    rejectionHandlers: [
        new winston.transports.File({
            filename: path.join(logsDir, 'rejections.log'),
            maxsize: 5242880,
            maxFiles: 3
        })
    ],
    
    exitOnError: false
});

// Add custom logging methods for specific bot events
logger.command = (username, command, details = '') => {
    logger.info(`COMMAND: ${username} used ${command} ${details}`.trim());
};

logger.battle = (attacker, defender, result, details = '') => {
    logger.info(`BATTLE: ${attacker} vs ${defender} - ${result} ${details}`.trim());
};

logger.economy = (username, action, amount, details = '') => {
    logger.info(`ECONOMY: ${username} ${action} ${amount} coins ${details}`.trim());
};

logger.arena = (username, action, details = '') => {
    logger.info(`ARENA: ${username} ${action} ${details}`.trim());
};

logger.power = (username, action, powerName, details = '') => {
    logger.info(`POWER: ${username} ${action} ${powerName} ${details}`.trim());
};

logger.gambling = (username, game, bet, result, details = '') => {
    logger.info(`GAMBLING: ${username} played ${game} with ${bet} coins - ${result} ${details}`.trim());
};

logger.security = (username, action, details = '') => {
    logger.warn(`SECURITY: ${username} ${action} ${details}`.trim());
};

logger.performance = (operation, duration, details = '') => {
    logger.debug(`PERFORMANCE: ${operation} took ${duration}ms ${details}`.trim());
};

// Log startup information
logger.info('Logger initialized successfully');
logger.info(`Log level: ${logger.level}`);
logger.info(`Logs directory: ${logsDir}`);

// Function to get log statistics
logger.getStats = () => {
    try {
        const stats = {};
        const logFiles = ['bot.log', 'error.log', 'commands.log', 'exceptions.log', 'rejections.log'];
        
        for (const file of logFiles) {
            const filePath = path.join(logsDir, file);
            if (fs.existsSync(filePath)) {
                const stat = fs.statSync(filePath);
                stats[file] = {
                    size: stat.size,
                    modified: stat.mtime,
                    sizeFormatted: formatBytes(stat.size)
                };
            } else {
                stats[file] = { exists: false };
            }
        }
        
        return stats;
    } catch (error) {
        logger.error('Error getting log statistics:', error);
        return {};
    }
};

// Function to clean old logs
logger.cleanOldLogs = (daysToKeep = 30) => {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        
        const files = fs.readdirSync(logsDir);
        let cleanedCount = 0;
        
        for (const file of files) {
            const filePath = path.join(logsDir, file);
            const stat = fs.statSync(filePath);
            
            if (stat.mtime < cutoffDate) {
                fs.unlinkSync(filePath);
                cleanedCount++;
                logger.info(`Cleaned old log file: ${file}`);
            }
        }
        
        logger.info(`Log cleanup completed: ${cleanedCount} files removed`);
        return cleanedCount;
    } catch (error) {
        logger.error('Error cleaning old logs:', error);
        return 0;
    }
};

// Utility function to format bytes
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Export logger
module.exports = logger;

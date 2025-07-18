const logger = require('./logger');

/**
 * Comprehensive Error Handling System
 * Provides centralized error management with consistent logging and user feedback
 */

class ErrorHandler {
    constructor() {
        this.errorCounts = new Map();
        this.maxErrorsPerHour = 10;
        this.criticalErrors = new Set(['DatabaseError', 'SecurityError', 'AuthenticationError']);
    }

    /**
     * Handle Discord command errors with user-friendly messages
     * @param {Error} error - The error object
     * @param {object} interaction - Discord interaction object
     * @param {string} context - Context where error occurred
     */
    async handleCommandError(error, interaction, context) {
        const errorId = this.generateErrorId();
        const userId = interaction.user?.id || 'unknown';
        
        // Log error with full context
        logger.error(`Command error in ${context}`, {
            errorId,
            userId,
            username: interaction.user?.username,
            commandName: interaction.commandName || 'unknown',
            guildId: interaction.guildId,
            channelId: interaction.channelId,
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack
            },
            timestamp: new Date().toISOString()
        });

        // Track error frequency
        this.trackError(userId, error.name);

        // Generate user-friendly error message
        const userMessage = this.generateUserErrorMessage(error, errorId);

        // Send error response to user
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: userMessage,
                    flags: 64
                });
            } else {
                await interaction.reply({
                    content: userMessage,
                    flags: 64
                });
            }
        } catch (replyError) {
            logger.error('Failed to send error message to user', {
                errorId,
                originalError: error.message,
                replyError: replyError.message
            });
        }

        // Handle critical errors
        if (this.criticalErrors.has(error.name)) {
            await this.handleCriticalError(error, context, errorId);
        }
    }

    /**
     * Handle database errors with retry logic
     * @param {Error} error - Database error
     * @param {Function} operation - Operation to retry
     * @param {number} retries - Number of retries remaining
     * @returns {Promise} Operation result or throws error
     */
    async handleDatabaseError(error, operation, retries = 3) {
        const errorId = this.generateErrorId();
        
        logger.error(`Database error`, {
            errorId,
            error: {
                name: error.name,
                message: error.message,
                code: error.code,
                sqlState: error.sqlState
            },
            retriesRemaining: retries,
            timestamp: new Date().toISOString()
        });

        // Handle specific database errors
        if (error.code === 'ECONNRESET' || error.code === 'PROTOCOL_CONNECTION_LOST') {
            if (retries > 0) {
                logger.info(`Retrying database operation, ${retries} retries remaining`);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
                return this.handleDatabaseError(error, operation, retries - 1);
            }
        }

        // For critical database errors, don't retry
        if (error.code === 'ER_ACCESS_DENIED_ERROR' || error.code === 'ER_BAD_DB_ERROR') {
            throw new Error('Database configuration error. Please contact administrator.');
        }

        // Generic database error
        throw new Error('Database temporarily unavailable. Please try again later.');
    }

    /**
     * Handle validation errors
     * @param {Array} validationErrors - Array of validation error messages
     * @param {string} context - Context where validation failed
     * @returns {string} User-friendly error message
     */
    handleValidationError(validationErrors, context) {
        const errorId = this.generateErrorId();
        
        logger.warn(`Validation error in ${context}`, {
            errorId,
            errors: validationErrors,
            timestamp: new Date().toISOString()
        });

        if (validationErrors.length === 1) {
            return `❌ ${validationErrors[0]}`;
        }

        return `❌ Multiple validation errors:\n${validationErrors.map(err => `• ${err}`).join('\n')}`;
    }

    /**
     * Handle rate limit errors
     * @param {string} userId - User ID
     * @param {string} action - Action being rate limited
     * @param {number} resetTime - When rate limit resets
     * @returns {string} User-friendly error message
     */
    handleRateLimitError(userId, action, resetTime) {
        const resetDate = new Date(resetTime);
        const timeUntilReset = Math.ceil((resetTime - Date.now()) / 1000);
        
        logger.warn(`Rate limit exceeded`, {
            userId,
            action,
            resetTime: resetDate.toISOString(),
            timeUntilReset
        });

        const minutes = Math.floor(timeUntilReset / 60);
        const seconds = timeUntilReset % 60;
        const timeString = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

        return `⏰ **Rate limit exceeded!**\n\nYou're doing that too quickly. Please wait **${timeString}** before trying again.\n\n*This helps keep the bot running smoothly for everyone.*`;
    }

    /**
     * Track error frequency for monitoring
     * @param {string} userId - User ID
     * @param {string} errorType - Type of error
     */
    trackError(userId, errorType) {
        const key = `${userId}:${errorType}`;
        const now = Date.now();
        const hourAgo = now - 3600000; // 1 hour ago

        if (!this.errorCounts.has(key)) {
            this.errorCounts.set(key, []);
        }

        const errorTimes = this.errorCounts.get(key);
        
        // Remove old errors (older than 1 hour)
        const recentErrors = errorTimes.filter(time => time > hourAgo);
        recentErrors.push(now);
        
        this.errorCounts.set(key, recentErrors);

        // Alert if user has too many errors
        if (recentErrors.length >= this.maxErrorsPerHour) {
            logger.warn(`User ${userId} has ${recentErrors.length} ${errorType} errors in the last hour`);
        }
    }

    /**
     * Handle critical errors that require immediate attention
     * @param {Error} error - Critical error
     * @param {string} context - Context where error occurred
     * @param {string} errorId - Error ID for tracking
     */
    async handleCriticalError(error, context, errorId) {
        logger.error(`CRITICAL ERROR in ${context}`, {
            errorId,
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack
            },
            timestamp: new Date().toISOString()
        });

        // In a production environment, you might want to:
        // - Send alerts to administrators
        // - Notify monitoring services
        // - Take protective measures
    }

    /**
     * Generate user-friendly error message
     * @param {Error} error - The error object
     * @param {string} errorId - Error ID for support
     * @returns {string} User-friendly error message
     */
    generateUserErrorMessage(error, errorId) {
        // Map specific errors to user-friendly messages
        const errorMessages = {
            'ValidationError': '❌ Invalid input. Please check your command and try again.',
            'DatabaseError': '❌ Database temporarily unavailable. Please try again in a moment.',
            'SecurityError': '❌ Security validation failed. Please contact an administrator.',
            'AuthenticationError': '❌ Authentication failed. Please register or login again.',
            'PermissionError': '❌ You don\'t have permission to perform this action.',
            'CooldownError': '⏰ You\'re on cooldown. Please wait before trying again.',
            'RateLimitError': '⏰ Rate limit exceeded. Please slow down and try again.',
            'NotFoundError': '❌ The requested resource was not found.',
            'ConfigurationError': '❌ Bot configuration error. Please contact an administrator.'
        };

        const userMessage = errorMessages[error.name] || 
                           '❌ An unexpected error occurred. Please try again later.';

        return `${userMessage}\n\n*Error ID: \`${errorId}\`*\n*If this persists, please contact support with this error ID.*`;
    }

    /**
     * Generate unique error ID for tracking
     * @returns {string} Unique error ID
     */
    generateErrorId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `ERR_${timestamp}_${random}`.toUpperCase();
    }

    /**
     * Wrap async functions with error handling
     * @param {Function} fn - Function to wrap
     * @param {string} context - Context for error logging
     * @returns {Function} Wrapped function
     */
    wrapAsync(fn, context) {
        return async (...args) => {
            try {
                return await fn(...args);
            } catch (error) {
                const errorId = this.generateErrorId();
                logger.error(`Error in wrapped function ${context}`, {
                    errorId,
                    error: {
                        name: error.name,
                        message: error.message,
                        stack: error.stack
                    },
                    arguments: args.length,
                    timestamp: new Date().toISOString()
                });
                throw error;
            }
        };
    }

    /**
     * Clean up old error tracking data
     */
    cleanup() {
        const now = Date.now();
        const hourAgo = now - 3600000; // 1 hour ago

        for (const [key, errorTimes] of this.errorCounts.entries()) {
            const recentErrors = errorTimes.filter(time => time > hourAgo);
            
            if (recentErrors.length === 0) {
                this.errorCounts.delete(key);
            } else {
                this.errorCounts.set(key, recentErrors);
            }
        }
    }
}

// Create singleton instance
const errorHandler = new ErrorHandler();

// Clean up error tracking data every 10 minutes
setInterval(() => {
    errorHandler.cleanup();
}, 600000);

module.exports = errorHandler;
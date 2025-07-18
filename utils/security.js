const logger = require('./logger');

/**
 * Comprehensive Security and Validation System
 * Protects against common vulnerabilities and ensures data integrity
 */

class SecurityManager {
    constructor() {
        this.rateLimitMap = new Map();
        this.suspiciousActivity = new Map();
        this.maxRequestsPerMinute = 60;
        this.suspiciousThreshold = 5;
    }

    /**
     * Sanitize user input to prevent XSS and injection attacks
     * @param {string} input - User input to sanitize
     * @returns {string} Sanitized input
     */
    sanitizeInput(input) {
        if (typeof input !== 'string') {
            return '';
        }

        return input
            .replace(/[<>]/g, '') // Remove HTML tags
            .replace(/['"]/g, '') // Remove quotes
            .replace(/[\\]/g, '') // Remove backslashes
            .replace(/[{}]/g, '') // Remove braces
            .replace(/[\[\]]/g, '') // Remove brackets
            .trim()
            .substring(0, 255); // Limit length
    }

    /**
     * Validate and sanitize numeric input
     * @param {*} value - Value to validate
     * @param {number} min - Minimum allowed value
     * @param {number} max - Maximum allowed value
     * @param {number} defaultValue - Default value if invalid
     * @returns {number} Validated number
     */
    validateNumber(value, min = 0, max = Number.MAX_SAFE_INTEGER, defaultValue = 0) {
        if (value === null || value === undefined || value === '') {
            return defaultValue;
        }

        let num;
        if (typeof value === 'string') {
            num = parseInt(value, 10);
        } else {
            num = Number(value);
        }

        if (isNaN(num) || !isFinite(num)) {
            return defaultValue;
        }

        return Math.max(min, Math.min(max, Math.floor(num)));
    }

    /**
     * Validate Discord ID format
     * @param {string} discordId - Discord ID to validate
     * @returns {boolean} True if valid
     */
    validateDiscordId(discordId) {
        if (!discordId || typeof discordId !== 'string') {
            return false;
        }
        
        // Discord IDs are 17-19 digit numbers
        return /^\d{17,19}$/.test(discordId);
    }

    /**
     * Validate username format
     * @param {string} username - Username to validate
     * @returns {object} Validation result
     */
    validateUsername(username) {
        if (!username || typeof username !== 'string') {
            return { valid: false, error: 'Username is required' };
        }

        const cleaned = this.sanitizeInput(username);
        
        if (cleaned.length < 3) {
            return { valid: false, error: 'Username must be at least 3 characters' };
        }

        if (cleaned.length > 32) {
            return { valid: false, error: 'Username must be 32 characters or less' };
        }

        if (!/^[a-zA-Z0-9_-]+$/.test(cleaned)) {
            return { valid: false, error: 'Username can only contain letters, numbers, hyphens, and underscores' };
        }

        return { valid: true, username: cleaned };
    }

    /**
     * Validate password strength
     * @param {string} password - Password to validate
     * @returns {object} Validation result
     */
    validatePassword(password) {
        if (!password || typeof password !== 'string') {
            return { valid: false, error: 'Password is required' };
        }

        if (password.length < 6) {
            return { valid: false, error: 'Password must be at least 6 characters' };
        }

        if (password.length > 128) {
            return { valid: false, error: 'Password must be 128 characters or less' };
        }

        return { valid: true };
    }

    /**
     * Rate limiting system
     * @param {string} userId - User ID
     * @param {string} action - Action being performed
     * @returns {object} Rate limit result
     */
    checkRateLimit(userId, action) {
        const key = `${userId}:${action}`;
        const now = Date.now();
        const windowMs = 60000; // 1 minute

        if (!this.rateLimitMap.has(key)) {
            this.rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
            return { allowed: true, remaining: this.maxRequestsPerMinute - 1 };
        }

        const data = this.rateLimitMap.get(key);
        
        if (now > data.resetTime) {
            // Reset window
            this.rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
            return { allowed: true, remaining: this.maxRequestsPerMinute - 1 };
        }

        data.count++;
        
        if (data.count > this.maxRequestsPerMinute) {
            this.logSuspiciousActivity(userId, action, 'Rate limit exceeded');
            return { 
                allowed: false, 
                remaining: 0, 
                resetTime: data.resetTime,
                error: 'Rate limit exceeded. Please wait before trying again.'
            };
        }

        return { allowed: true, remaining: this.maxRequestsPerMinute - data.count };
    }

    /**
     * Log suspicious activity
     * @param {string} userId - User ID
     * @param {string} action - Action performed
     * @param {string} reason - Reason for suspicion
     */
    logSuspiciousActivity(userId, action, reason) {
        const key = userId;
        const now = Date.now();

        if (!this.suspiciousActivity.has(key)) {
            this.suspiciousActivity.set(key, { count: 1, lastActivity: now, actions: [] });
        }

        const data = this.suspiciousActivity.get(key);
        data.count++;
        data.lastActivity = now;
        data.actions.push({ action, reason, timestamp: now });

        // Keep only last 10 actions
        if (data.actions.length > 10) {
            data.actions.shift();
        }

        logger.warn(`Suspicious activity detected`, {
            userId,
            action,
            reason,
            totalCount: data.count,
            timestamp: new Date(now).toISOString()
        });

        // Auto-ban if too many suspicious activities
        if (data.count >= this.suspiciousThreshold) {
            logger.error(`User ${userId} flagged for potential abuse`, {
                totalViolations: data.count,
                actions: data.actions
            });
        }
    }

    /**
     * Validate database query parameters
     * @param {object} params - Query parameters
     * @returns {object} Validation result
     */
    validateQueryParams(params) {
        const validated = {};
        const errors = [];

        for (const [key, value] of Object.entries(params)) {
            if (value === null || value === undefined) {
                continue;
            }

            switch (key) {
                case 'id':
                case 'user_id':
                case 'power_id':
                case 'code_id':
                    validated[key] = this.validateNumber(value, 1, Number.MAX_SAFE_INTEGER, null);
                    if (validated[key] === null) {
                        errors.push(`Invalid ${key}: must be a positive integer`);
                    }
                    break;

                case 'discord_id':
                    if (!this.validateDiscordId(value)) {
                        errors.push(`Invalid ${key}: must be a valid Discord ID`);
                    } else {
                        validated[key] = value;
                    }
                    break;

                case 'username':
                    const usernameResult = this.validateUsername(value);
                    if (!usernameResult.valid) {
                        errors.push(`Invalid ${key}: ${usernameResult.error}`);
                    } else {
                        validated[key] = usernameResult.username;
                    }
                    break;

                case 'level':
                    validated[key] = this.validateNumber(value, 1, 100, 1);
                    break;

                case 'exp':
                case 'coins':
                case 'bank_balance':
                    validated[key] = this.validateNumber(value, 0, Number.MAX_SAFE_INTEGER, 0);
                    break;

                case 'combat_power':
                    validated[key] = this.validateNumber(value, 1, 10000, 50);
                    break;

                case 'gacha_draws':
                    validated[key] = this.validateNumber(value, 0, 1000, 0);
                    break;

                default:
                    validated[key] = this.sanitizeInput(String(value));
            }
        }

        return { valid: errors.length === 0, errors, params: validated };
    }

    /**
     * Secure database operation wrapper
     * @param {Function} operation - Database operation
     * @param {object} params - Parameters
     * @param {string} userId - User ID for logging
     * @returns {Promise} Operation result
     */
    async secureDbOperation(operation, params, userId) {
        try {
            // Validate parameters
            const validation = this.validateQueryParams(params);
            if (!validation.valid) {
                throw new Error(`Parameter validation failed: ${validation.errors.join(', ')}`);
            }

            // Execute operation with validated parameters
            const result = await operation(validation.params);
            
            logger.info(`Database operation successful`, {
                userId,
                operation: operation.name,
                timestamp: new Date().toISOString()
            });

            return result;
        } catch (error) {
            logger.error(`Database operation failed`, {
                userId,
                operation: operation.name,
                error: error.message,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    /**
     * Clean up expired rate limits and suspicious activity data
     */
    cleanup() {
        const now = Date.now();
        const hourAgo = now - 3600000; // 1 hour

        // Clean rate limits
        for (const [key, data] of this.rateLimitMap.entries()) {
            if (now > data.resetTime) {
                this.rateLimitMap.delete(key);
            }
        }

        // Clean suspicious activity older than 1 hour
        for (const [key, data] of this.suspiciousActivity.entries()) {
            if (data.lastActivity < hourAgo) {
                this.suspiciousActivity.delete(key);
            }
        }
    }
}

// Create singleton instance
const securityManager = new SecurityManager();

// Run cleanup every 10 minutes
setInterval(() => {
    securityManager.cleanup();
}, 600000);

module.exports = securityManager;
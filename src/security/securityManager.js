const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { RateLimiterMemory, RateLimiterRedis } = require('rate-limiter-flexible');
const Joi = require('joi');
const crypto = require('crypto');
const logger = require('../utils/logger');
const config = require('../config/config');

class SecurityManager {
    constructor() {
        this.rateLimiters = new Map();
        this.suspiciousActivity = new Map();
        this.encryptionKey = crypto.scryptSync(config.security.jwtSecret, 'salt', 32);
        this.initializeRateLimiters();
    }

    initializeRateLimiters() {
        // Command rate limiter
        this.rateLimiters.set('command', new RateLimiterMemory({
            keyGenerator: (userId, commandName) => `${userId}:${commandName}`,
            points: 30, // Number of requests
            duration: 60, // Per 60 seconds
            blockDuration: 60 // Block for 60 seconds if exceeded
        }));

        // Login rate limiter
        this.rateLimiters.set('login', new RateLimiterMemory({
            points: 5, // 5 attempts
            duration: 900, // Per 15 minutes
            blockDuration: 900 // Block for 15 minutes
        }));

        // Registration rate limiter
        this.rateLimiters.set('register', new RateLimiterMemory({
            points: 3, // 3 attempts
            duration: 3600, // Per hour
            blockDuration: 3600 // Block for 1 hour
        }));

        // Transaction rate limiter
        this.rateLimiters.set('transaction', new RateLimiterMemory({
            points: 100, // 100 transactions
            duration: 60, // Per minute
            blockDuration: 300 // Block for 5 minutes
        }));
    }

    async checkRateLimit(type, key, points = 1) {
        const rateLimiter = this.rateLimiters.get(type);
        if (!rateLimiter) {
            return { allowed: true };
        }

        try {
            await rateLimiter.consume(key, points);
            return { allowed: true };
        } catch (rejRes) {
            const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
            return {
                allowed: false,
                retryAfter: secs,
                error: `Rate limit exceeded. Try again in ${secs} seconds.`
            };
        }
    }

    async hashPassword(password) {
        try {
            return await bcrypt.hash(password, config.security.bcryptRounds);
        } catch (error) {
            logger.error('Password hashing failed:', error);
            throw new Error('Password processing failed');
        }
    }

    async verifyPassword(password, hash) {
        try {
            return await bcrypt.compare(password, hash);
        } catch (error) {
            logger.error('Password verification failed:', error);
            return false;
        }
    }

    generateToken(payload, expiresIn = '24h') {
        try {
            return jwt.sign(payload, config.security.jwtSecret, { expiresIn });
        } catch (error) {
            logger.error('Token generation failed:', error);
            throw new Error('Token generation failed');
        }
    }

    verifyToken(token) {
        try {
            return jwt.verify(token, config.security.jwtSecret);
        } catch (error) {
            logger.error('Token verification failed:', error);
            return null;
        }
    }

    encrypt(text) {
        try {
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            return iv.toString('hex') + ':' + encrypted;
        } catch (error) {
            logger.error('Encryption failed:', error);
            throw new Error('Encryption failed');
        }
    }

    decrypt(encryptedText) {
        try {
            const textParts = encryptedText.split(':');
            const iv = Buffer.from(textParts.shift(), 'hex');
            const encrypted = textParts.join(':');
            const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (error) {
            logger.error('Decryption failed:', error);
            throw new Error('Decryption failed');
        }
    }

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
            .replace(/[;]/g, '') // Remove semicolons
            .trim()
            .substring(0, 1000); // Limit length
    }

    validateInput(data, schema) {
        try {
            const { error, value } = schema.validate(data, {
                abortEarly: false,
                stripUnknown: true
            });

            if (error) {
                const errors = error.details.map(detail => detail.message);
                return { valid: false, errors };
            }

            return { valid: true, data: value };
        } catch (error) {
            logger.error('Input validation failed:', error);
            return { valid: false, errors: ['Validation failed'] };
        }
    }

    // Validation schemas
    getValidationSchemas() {
        return {
            user: Joi.object({
                discord_id: Joi.string().pattern(/^\d{17,19}$/).required(),
                username: Joi.string().alphanum().min(3).max(32).required(),
                password: Joi.string().min(8).max(128).required(),
                creator_discord_id: Joi.string().pattern(/^\d{17,19}$/).required()
            }),

            power: Joi.object({
                name: Joi.string().min(1).max(100).required(),
                description: Joi.string().min(1).max(500).required(),
                rank: Joi.string().valid('Normal', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Divine', 'Cosmic', 'Transcendent', 'Omnipotent', 'Absolute').required(),
                base_cp: Joi.number().integer().min(1).max(1000000).required(),
                base_price: Joi.number().integer().min(1).max(10000000000).required()
            }),

            transaction: Joi.object({
                user_id: Joi.number().integer().min(1).required(),
                amount: Joi.number().integer().min(-1000000000).max(1000000000).required(),
                transaction_type: Joi.string().valid('coins_earned', 'coins_spent', 'power_obtained', 'power_lost', 'battle_reward', 'daily_reward', 'gacha_purchase').required(),
                description: Joi.string().max(500).optional()
            }),

            battle: Joi.object({
                attacker_id: Joi.number().integer().min(1).required(),
                defender_id: Joi.number().integer().min(1).required(),
                battle_type: Joi.string().valid('pve', 'pvp', 'arena').required()
            }),

            gacha: Joi.object({
                user_id: Joi.number().integer().min(1).required(),
                draw_count: Joi.number().integer().min(1).max(100).required(),
                draw_type: Joi.string().valid('free', 'paid').required()
            })
        };
    }

    logSecurityEvent(userId, action, details = {}, severity = 'low') {
        const securityEvent = {
            user_id: userId,
            action,
            details: JSON.stringify(details),
            severity,
            timestamp: new Date(),
            ip_address: details.ip || null,
            user_agent: details.userAgent || null
        };

        // Log to database (implement async)
        this.logSecurityEventToDatabase(securityEvent);

        // Log to application logs
        logger.warn(`Security Event [${severity.toUpperCase()}]: ${action}`, {
            userId,
            details,
            timestamp: securityEvent.timestamp
        });

        // Track suspicious activity
        this.trackSuspiciousActivity(userId, action, severity);
    }

    async logSecurityEventToDatabase(event) {
        try {
            const { executeQuery } = require('../database/connection');
            await executeQuery(
                'INSERT INTO security_logs (user_id, action, details, ip_address, user_agent, severity) VALUES (?, ?, ?, ?, ?, ?)',
                [event.user_id, event.action, event.details, event.ip_address, event.user_agent, event.severity]
            );
        } catch (error) {
            logger.error('Failed to log security event to database:', error);
        }
    }

    trackSuspiciousActivity(userId, action, severity) {
        if (!this.suspiciousActivity.has(userId)) {
            this.suspiciousActivity.set(userId, {
                count: 0,
                actions: [],
                firstSeen: Date.now(),
                lastSeen: Date.now()
            });
        }

        const activity = this.suspiciousActivity.get(userId);
        activity.count++;
        activity.lastSeen = Date.now();
        activity.actions.push({
            action,
            severity,
            timestamp: Date.now()
        });

        // Keep only last 20 actions
        if (activity.actions.length > 20) {
            activity.actions.shift();
        }

        // Alert on high-severity or frequent activity
        if (severity === 'critical' || activity.count >= 10) {
            this.alertAdministrators(userId, activity);
        }
    }

    alertAdministrators(userId, activity) {
        logger.error(`🚨 SECURITY ALERT: User ${userId} flagged for suspicious activity`, {
            totalViolations: activity.count,
            timespan: Date.now() - activity.firstSeen,
            recentActions: activity.actions.slice(-5)
        });

        // In production, this could send Discord notifications to admins
        // or integrate with external alerting systems
    }

    generateSecureId() {
        return crypto.randomBytes(16).toString('hex');
    }

    generateSecureCode(length = 12) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(crypto.randomInt(0, chars.length));
        }
        return result;
    }

    isUserSuspicious(userId) {
        const activity = this.suspiciousActivity.get(userId);
        if (!activity) return false;

        const recentActivity = activity.actions.filter(
            action => Date.now() - action.timestamp < 3600000 // Last hour
        );

        return recentActivity.length >= 5 || 
               recentActivity.some(action => action.severity === 'critical');
    }

    cleanupSuspiciousActivity() {
        const now = Date.now();
        const maxAge = 86400000; // 24 hours

        for (const [userId, activity] of this.suspiciousActivity.entries()) {
            if (now - activity.lastSeen > maxAge) {
                this.suspiciousActivity.delete(userId);
            }
        }
    }

    getSecurityStats() {
        return {
            suspiciousUsers: this.suspiciousActivity.size,
            rateLimiters: this.rateLimiters.size,
            totalSecurityEvents: Array.from(this.suspiciousActivity.values())
                .reduce((sum, activity) => sum + activity.count, 0)
        };
    }
}

const securityManager = new SecurityManager();

// Cleanup suspicious activity every hour
setInterval(() => {
    securityManager.cleanupSuspiciousActivity();
}, 3600000);

module.exports = {
    initializeSecurity: async () => {
        logger.info('🔒 Security manager initialized');
        return securityManager;
    },
    securityManager
};
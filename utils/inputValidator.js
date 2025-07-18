const logger = require('./logger');

/**
 * Comprehensive Input Validation System
 * Validates and sanitizes all user inputs before processing
 */

class InputValidator {
    constructor() {
        this.patterns = {
            discordId: /^\d{17,19}$/,
            username: /^[a-zA-Z0-9_-]{3,32}$/,
            password: /^.{8,128}$/,
            email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            alphanumeric: /^[a-zA-Z0-9]+$/,
            alphanumericWithSpaces: /^[a-zA-Z0-9 ]+$/,
            safeText: /^[a-zA-Z0-9 .,!?'-]+$/,
            hexColor: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
            url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/
        };

        this.sanitizers = {
            removeHtml: (input) => input.replace(/<[^>]*>/g, ''),
            removeScripts: (input) => input.replace(/<script[^>]*>.*?<\/script>/gi, ''),
            removeInjection: (input) => input.replace(/['"`;\\]/g, ''),
            trimWhitespace: (input) => input.trim(),
            normalizeSpaces: (input) => input.replace(/\s+/g, ' '),
            removeControlChars: (input) => input.replace(/[\x00-\x1F\x7F]/g, ''),
            removeEmojis: (input) => input.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, ''),
            escapeHtml: (input) => input
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;')
        };
    }

    /**
     * Validate Discord ID
     * @param {string} discordId - Discord ID to validate
     * @returns {boolean} Validation result
     */
    validateDiscordId(discordId) {
        if (!discordId || typeof discordId !== 'string') {
            return false;
        }
        return this.patterns.discordId.test(discordId);
    }

    /**
     * Validate username
     * @param {string} username - Username to validate
     * @returns {object} Validation result
     */
    validateUsername(username) {
        if (!username || typeof username !== 'string') {
            return { valid: false, error: 'Username is required' };
        }

        if (username.length < 3 || username.length > 32) {
            return { valid: false, error: 'Username must be between 3 and 32 characters' };
        }

        if (!this.patterns.username.test(username)) {
            return { valid: false, error: 'Username can only contain letters, numbers, hyphens, and underscores' };
        }

        return { valid: true, value: username };
    }

    /**
     * Validate password
     * @param {string} password - Password to validate
     * @returns {object} Validation result
     */
    validatePassword(password) {
        if (!password || typeof password !== 'string') {
            return { valid: false, error: 'Password is required' };
        }

        if (password.length < 8 || password.length > 128) {
            return { valid: false, error: 'Password must be between 8 and 128 characters' };
        }

        return { valid: true, value: password };
    }

    /**
     * Validate number within range
     * @param {any} value - Value to validate
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {object} Validation result
     */
    validateNumber(value, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) {
        const num = Number(value);
        
        if (isNaN(num) || !isFinite(num)) {
            return { valid: false, error: 'Invalid number format' };
        }

        if (num < min || num > max) {
            return { valid: false, error: `Number must be between ${min} and ${max}` };
        }

        return { valid: true, value: num };
    }

    /**
     * Validate integer within range
     * @param {any} value - Value to validate
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {object} Validation result
     */
    validateInteger(value, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) {
        const result = this.validateNumber(value, min, max);
        
        if (!result.valid) {
            return result;
        }

        if (!Number.isInteger(result.value)) {
            return { valid: false, error: 'Value must be an integer' };
        }

        return result;
    }

    /**
     * Validate string length
     * @param {string} value - String to validate
     * @param {number} minLength - Minimum length
     * @param {number} maxLength - Maximum length
     * @returns {object} Validation result
     */
    validateStringLength(value, minLength = 0, maxLength = 1000) {
        if (typeof value !== 'string') {
            return { valid: false, error: 'Value must be a string' };
        }

        if (value.length < minLength || value.length > maxLength) {
            return { valid: false, error: `String must be between ${minLength} and ${maxLength} characters` };
        }

        return { valid: true, value: value };
    }

    /**
     * Validate text with pattern
     * @param {string} value - Text to validate
     * @param {string} patternName - Pattern name from this.patterns
     * @returns {object} Validation result
     */
    validatePattern(value, patternName) {
        if (!value || typeof value !== 'string') {
            return { valid: false, error: 'Value is required' };
        }

        if (!this.patterns[patternName]) {
            return { valid: false, error: 'Invalid pattern name' };
        }

        if (!this.patterns[patternName].test(value)) {
            return { valid: false, error: `Value does not match required pattern: ${patternName}` };
        }

        return { valid: true, value: value };
    }

    /**
     * Sanitize input text
     * @param {string} input - Input to sanitize
     * @param {Array} sanitizers - Array of sanitizer names
     * @returns {string} Sanitized input
     */
    sanitizeInput(input, sanitizers = ['removeHtml', 'removeScripts', 'removeControlChars', 'trimWhitespace', 'normalizeSpaces']) {
        if (!input || typeof input !== 'string') {
            return '';
        }

        let sanitized = input;

        for (const sanitizerName of sanitizers) {
            if (this.sanitizers[sanitizerName]) {
                sanitized = this.sanitizers[sanitizerName](sanitized);
            }
        }

        return sanitized;
    }

    /**
     * Validate and sanitize command arguments
     * @param {Array} args - Arguments to validate
     * @returns {object} Validation result
     */
    validateCommandArgs(args) {
        if (!Array.isArray(args)) {
            return { valid: false, error: 'Arguments must be an array' };
        }

        const validatedArgs = [];
        const errors = [];

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            
            if (typeof arg === 'string') {
                const sanitized = this.sanitizeInput(arg);
                
                if (sanitized.length > 500) {
                    errors.push(`Argument ${i + 1} is too long (max 500 characters)`);
                    continue;
                }

                validatedArgs.push(sanitized);
            } else if (typeof arg === 'number') {
                const numResult = this.validateNumber(arg, -1000000, 1000000);
                if (!numResult.valid) {
                    errors.push(`Argument ${i + 1}: ${numResult.error}`);
                    continue;
                }
                validatedArgs.push(numResult.value);
            } else {
                errors.push(`Argument ${i + 1} has invalid type: ${typeof arg}`);
            }
        }

        if (errors.length > 0) {
            return { valid: false, errors };
        }

        return { valid: true, args: validatedArgs };
    }

    /**
     * Validate object properties
     * @param {object} obj - Object to validate
     * @param {object} schema - Validation schema
     * @returns {object} Validation result
     */
    validateObject(obj, schema) {
        if (!obj || typeof obj !== 'object') {
            return { valid: false, error: 'Object is required' };
        }

        const validated = {};
        const errors = [];

        for (const [key, rules] of Object.entries(schema)) {
            const value = obj[key];
            
            // Check if required
            if (rules.required && (value === undefined || value === null)) {
                errors.push(`${key} is required`);
                continue;
            }

            // Skip validation if optional and not provided
            if (!rules.required && (value === undefined || value === null)) {
                continue;
            }

            // Type validation
            if (rules.type && typeof value !== rules.type) {
                errors.push(`${key} must be of type ${rules.type}`);
                continue;
            }

            // String validations
            if (rules.type === 'string') {
                if (rules.minLength && value.length < rules.minLength) {
                    errors.push(`${key} must be at least ${rules.minLength} characters`);
                    continue;
                }
                
                if (rules.maxLength && value.length > rules.maxLength) {
                    errors.push(`${key} must be no more than ${rules.maxLength} characters`);
                    continue;
                }

                if (rules.pattern && !this.patterns[rules.pattern]?.test(value)) {
                    errors.push(`${key} does not match required pattern`);
                    continue;
                }

                // Sanitize string
                validated[key] = this.sanitizeInput(value, rules.sanitizers);
            }

            // Number validations
            else if (rules.type === 'number') {
                if (rules.min !== undefined && value < rules.min) {
                    errors.push(`${key} must be at least ${rules.min}`);
                    continue;
                }
                
                if (rules.max !== undefined && value > rules.max) {
                    errors.push(`${key} must be no more than ${rules.max}`);
                    continue;
                }

                if (rules.integer && !Number.isInteger(value)) {
                    errors.push(`${key} must be an integer`);
                    continue;
                }

                validated[key] = value;
            }

            // Array validations
            else if (rules.type === 'array') {
                if (!Array.isArray(value)) {
                    errors.push(`${key} must be an array`);
                    continue;
                }

                if (rules.minLength && value.length < rules.minLength) {
                    errors.push(`${key} must have at least ${rules.minLength} items`);
                    continue;
                }

                if (rules.maxLength && value.length > rules.maxLength) {
                    errors.push(`${key} must have no more than ${rules.maxLength} items`);
                    continue;
                }

                validated[key] = value;
            }

            // Default: just copy the value
            else {
                validated[key] = value;
            }
        }

        if (errors.length > 0) {
            return { valid: false, errors };
        }

        return { valid: true, data: validated };
    }

    /**
     * Validate email address
     * @param {string} email - Email to validate
     * @returns {object} Validation result
     */
    validateEmail(email) {
        if (!email || typeof email !== 'string') {
            return { valid: false, error: 'Email is required' };
        }

        if (email.length > 254) {
            return { valid: false, error: 'Email is too long' };
        }

        if (!this.patterns.email.test(email)) {
            return { valid: false, error: 'Invalid email format' };
        }

        return { valid: true, value: email.toLowerCase() };
    }

    /**
     * Validate URL
     * @param {string} url - URL to validate
     * @returns {object} Validation result
     */
    validateUrl(url) {
        if (!url || typeof url !== 'string') {
            return { valid: false, error: 'URL is required' };
        }

        if (!this.patterns.url.test(url)) {
            return { valid: false, error: 'Invalid URL format' };
        }

        return { valid: true, value: url };
    }

    /**
     * Validate hex color
     * @param {string} color - Color to validate
     * @returns {object} Validation result
     */
    validateHexColor(color) {
        if (!color || typeof color !== 'string') {
            return { valid: false, error: 'Color is required' };
        }

        if (!this.patterns.hexColor.test(color)) {
            return { valid: false, error: 'Invalid hex color format' };
        }

        return { valid: true, value: color.toLowerCase() };
    }

    /**
     * Validate common user input
     * @param {string} input - Input to validate
     * @param {object} options - Validation options
     * @returns {object} Validation result
     */
    validateUserInput(input, options = {}) {
        const {
            required = true,
            minLength = 1,
            maxLength = 1000,
            allowEmpty = false,
            sanitize = true,
            pattern = null
        } = options;

        if (!input && required && !allowEmpty) {
            return { valid: false, error: 'Input is required' };
        }

        if (!input && allowEmpty) {
            return { valid: true, value: '' };
        }

        if (typeof input !== 'string') {
            return { valid: false, error: 'Input must be a string' };
        }

        let value = input;

        if (sanitize) {
            value = this.sanitizeInput(value);
        }

        if (value.length < minLength) {
            return { valid: false, error: `Input must be at least ${minLength} characters` };
        }

        if (value.length > maxLength) {
            return { valid: false, error: `Input must be no more than ${maxLength} characters` };
        }

        if (pattern && !this.patterns[pattern]?.test(value)) {
            return { valid: false, error: 'Input does not match required pattern' };
        }

        return { valid: true, value };
    }

    /**
     * Get validation schema for common data types
     * @param {string} type - Data type (user, power, transaction, etc.)
     * @returns {object} Validation schema
     */
    getValidationSchema(type) {
        const schemas = {
            user: {
                discord_id: { type: 'string', required: true, pattern: 'discordId' },
                username: { type: 'string', required: true, minLength: 3, maxLength: 32, pattern: 'username' },
                password: { type: 'string', required: true, minLength: 8, maxLength: 128 },
                creator_discord_id: { type: 'string', required: true, pattern: 'discordId' }
            },
            power: {
                name: { type: 'string', required: true, minLength: 1, maxLength: 100 },
                description: { type: 'string', required: false, maxLength: 500 },
                rank: { type: 'string', required: true, pattern: 'alphanumeric' },
                base_cp: { type: 'number', required: true, min: 1, max: 1000000, integer: true },
                base_price: { type: 'number', required: true, min: 1, max: 1000000, integer: true }
            },
            transaction: {
                user_id: { type: 'number', required: true, min: 1, integer: true },
                amount: { type: 'number', required: true, min: -1000000, max: 1000000 },
                type: { type: 'string', required: true, pattern: 'alphanumeric' },
                description: { type: 'string', required: false, maxLength: 200 }
            },
            report: {
                user_id: { type: 'number', required: true, min: 1, integer: true },
                type: { type: 'string', required: true, pattern: 'alphanumeric' },
                title: { type: 'string', required: true, minLength: 5, maxLength: 100 },
                description: { type: 'string', required: true, minLength: 10, maxLength: 1000 }
            }
        };

        return schemas[type] || {};
    }

    /**
     * Log validation errors
     * @param {string} context - Context of validation
     * @param {object} errors - Validation errors
     */
    logValidationErrors(context, errors) {
        logger.warn(`Validation failed in ${context}`, {
            context,
            errors: Array.isArray(errors) ? errors : [errors],
            timestamp: new Date().toISOString()
        });
    }
}

// Create singleton instance
const inputValidator = new InputValidator();

module.exports = inputValidator;
const logger = require('./logger');

/**
 * Comprehensive Input Validation and Sanitization
 */

class ValidationManager {
    constructor() {
        this.patterns = {
            username: /^[a-zA-Z0-9_-]{3,32}$/,
            discordId: /^\d{17,19}$/,
            positiveInteger: /^\d+$/,
            safeText: /^[a-zA-Z0-9\s.,!?'-]{1,500}$/
        };
    }

    /**
     * Validate and sanitize username
     */
    validateUsername(username) {
        if (!username || typeof username !== 'string') {
            return { valid: false, error: 'Username is required' };
        }

        const trimmed = username.trim();
        
        if (trimmed.length < 3 || trimmed.length > 32) {
            return { valid: false, error: 'Username must be 3-32 characters' };
        }

        if (!this.patterns.username.test(trimmed)) {
            return { valid: false, error: 'Username can only contain letters, numbers, hyphens, and underscores' };
        }

        return { valid: true, value: trimmed };
    }

    /**
     * Validate Discord ID
     */
    validateDiscordId(discordId) {
        if (!discordId || typeof discordId !== 'string') {
            return { valid: false, error: 'Discord ID is required' };
        }

        if (!this.patterns.discordId.test(discordId)) {
            return { valid: false, error: 'Invalid Discord ID format' };
        }

        return { valid: true, value: discordId };
    }

    /**
     * Validate and sanitize amount (coins, etc.)
     */
    validateAmount(amount, min = 1, max = Number.MAX_SAFE_INTEGER) {
        let numAmount;
        
        if (typeof amount === 'string') {
            if (amount.toLowerCase() === 'all') {
                return { valid: true, value: 'all' };
            }
            numAmount = parseInt(amount, 10);
        } else {
            numAmount = Number(amount);
        }

        if (isNaN(numAmount) || !isFinite(numAmount)) {
            return { valid: false, error: 'Amount must be a valid number' };
        }

        if (numAmount < min) {
            return { valid: false, error: `Amount must be at least ${min}` };
        }

        if (numAmount > max) {
            return { valid: false, error: `Amount cannot exceed ${max.toLocaleString()}` };
        }

        if (!Number.isInteger(numAmount)) {
            return { valid: false, error: 'Amount must be a whole number' };
        }

        return { valid: true, value: numAmount };
    }

    /**
     * Validate password
     */
    validatePassword(password) {
        if (!password || typeof password !== 'string') {
            return { valid: false, error: 'Password is required' };
        }

        if (password.length < 6) {
            return { valid: false, error: 'Password must be at least 6 characters' };
        }

        if (password.length > 128) {
            return { valid: false, error: 'Password cannot exceed 128 characters' };
        }

        return { valid: true, value: password };
    }

    /**
     * Sanitize text input
     */
    sanitizeText(text, maxLength = 500) {
        if (!text || typeof text !== 'string') {
            return '';
        }

        return text
            .trim()
            .replace(/[<>]/g, '') // Remove HTML tags
            .replace(/['"]/g, '') // Remove quotes that could cause issues
            .substring(0, maxLength);
    }

    /**
     * Validate command arguments
     */
    validateCommandArgs(args, expectedTypes = []) {
        if (!Array.isArray(args)) {
            return { valid: false, error: 'Arguments must be an array' };
        }

        const validated = [];
        const errors = [];

        for (let i = 0; i < args.length && i < expectedTypes.length; i++) {
            const arg = args[i];
            const expectedType = expectedTypes[i];

            switch (expectedType) {
                case 'amount':
                    const amountResult = this.validateAmount(arg);
                    if (!amountResult.valid) {
                        errors.push(`Argument ${i + 1}: ${amountResult.error}`);
                    } else {
                        validated.push(amountResult.value);
                    }
                    break;

                case 'username':
                    const usernameResult = this.validateUsername(arg);
                    if (!usernameResult.valid) {
                        errors.push(`Argument ${i + 1}: ${usernameResult.error}`);
                    } else {
                        validated.push(usernameResult.value);
                    }
                    break;

                case 'text':
                    validated.push(this.sanitizeText(arg));
                    break;

                default:
                    validated.push(arg);
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            args: validated
        };
    }

    /**
     * Validate gambling bet
     */
    validateGamblingBet(amount, userCoins, minBet = 1, maxBet = null) {
        const amountResult = this.validateAmount(amount, minBet, maxBet || userCoins);
        
        if (!amountResult.valid) {
            return amountResult;
        }

        const betAmount = amountResult.value === 'all' ? userCoins : amountResult.value;

        if (betAmount > userCoins) {
            return {
                valid: false,
                error: `Insufficient coins. You have ${userCoins.toLocaleString()}, need ${betAmount.toLocaleString()}`
            };
        }

        if (betAmount < minBet) {
            return {
                valid: false,
                error: `Minimum bet is ${minBet} coins`
            };
        }

        return { valid: true, value: betAmount };
    }

    /**
     * Validate bank transaction
     */
    validateBankTransaction(amount, availableAmount, transactionType = 'transaction') {
        const amountResult = this.validateAmount(amount, 1);
        
        if (!amountResult.valid) {
            return amountResult;
        }

        const transactionAmount = amountResult.value === 'all' ? availableAmount : amountResult.value;

        if (transactionAmount > availableAmount) {
            return {
                valid: false,
                error: `Insufficient funds for ${transactionType}. Available: ${availableAmount.toLocaleString()}, Requested: ${transactionAmount.toLocaleString()}`
            };
        }

        if (transactionAmount <= 0) {
            return {
                valid: false,
                error: `No funds available for ${transactionType}`
            };
        }

        return { valid: true, value: transactionAmount };
    }
}

module.exports = new ValidationManager();
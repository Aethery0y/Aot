const logger = require('./logger');
const securityManager = require('./security');
const errorHandler = require('./errorHandler');
const performanceMonitor = require('./performanceMonitor');

/**
 * Secure Command Handler
 * Wraps command execution with comprehensive security, validation, and monitoring
 */

class SecureCommandHandler {
    constructor() {
        this.commandMetrics = new Map();
        this.maxExecutionTime = 30000; // 30 seconds
        this.rateLimitExceptions = ['help', 'register', 'login'];
    }

    /**
     * Execute a command with full security validation
     * @param {object} interaction - Discord interaction object
     * @param {object} command - Command object
     * @param {Array} args - Command arguments
     * @returns {Promise} Command execution result
     */
    async executeCommand(interaction, command, args = []) {
        const startTime = Date.now();
        const userId = interaction.user?.id;
        const commandName = interaction.commandName || command.name;
        const executionId = this.generateExecutionId();

        try {
            // Pre-execution validation
            await this.validateCommandExecution(interaction, command, args);

            // Rate limiting (skip for certain commands)
            if (!this.rateLimitExceptions.includes(commandName)) {
                const rateLimitResult = securityManager.checkRateLimit(userId, commandName);
                if (!rateLimitResult.allowed) {
                    throw new Error(rateLimitResult.error);
                }
            }

            // Log command execution start
            logger.info(`Executing command: ${commandName}`, {
                executionId,
                userId,
                username: interaction.user?.username,
                guildId: interaction.guildId,
                channelId: interaction.channelId,
                args: args.length
            });

            // Execute command with timeout
            const result = await this.executeWithTimeout(
                () => command.execute(interaction, args),
                this.maxExecutionTime,
                `Command ${commandName} execution timeout`
            );

            // Record successful execution
            const executionTime = Date.now() - startTime;
            performanceMonitor.recordCommandExecution(commandName, executionTime, true);
            
            this.recordCommandMetrics(commandName, executionTime, true);

            logger.info(`Command executed successfully: ${commandName}`, {
                executionId,
                userId,
                executionTime,
                success: true
            });

            return result;

        } catch (error) {
            // Record failed execution
            const executionTime = Date.now() - startTime;
            performanceMonitor.recordCommandExecution(commandName, executionTime, false);
            performanceMonitor.recordError(error.name, commandName);
            
            this.recordCommandMetrics(commandName, executionTime, false);

            // Handle error with user feedback
            await errorHandler.handleCommandError(error, interaction, commandName);

            logger.error(`Command execution failed: ${commandName}`, {
                executionId,
                userId,
                executionTime,
                error: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                }
            });

            throw error;
        }
    }

    /**
     * Validate command execution prerequisites
     * @param {object} interaction - Discord interaction object
     * @param {object} command - Command object
     * @param {Array} args - Command arguments
     */
    async validateCommandExecution(interaction, command, args) {
        // Basic interaction validation
        if (!interaction || !interaction.user) {
            throw new Error('Invalid interaction object');
        }

        // Command validation
        if (!command || !command.execute) {
            throw new Error('Invalid command object');
        }

        // User validation
        if (!securityManager.validateDiscordId(interaction.user.id)) {
            throw new Error('Invalid user ID');
        }

        // Guild validation (for guild-only commands)
        if (command.guildOnly && !interaction.guildId) {
            throw new Error('This command can only be used in a server');
        }

        // Permission validation
        if (command.permissions && interaction.member) {
            const hasPermission = command.permissions.every(permission => 
                interaction.member.permissions.has(permission)
            );
            
            if (!hasPermission) {
                throw new Error('You do not have permission to use this command');
            }
        }

        // Cooldown validation
        if (command.cooldown) {
            const cooldownResult = await this.checkCommandCooldown(
                interaction.user.id,
                command.name,
                command.cooldown
            );
            
            if (!cooldownResult.allowed) {
                throw new Error(cooldownResult.error);
            }
        }

        // Arguments validation
        if (args && args.length > 0) {
            await this.validateArguments(args, command.name);
        }
    }

    /**
     * Validate command arguments
     * @param {Array} args - Command arguments
     * @param {string} commandName - Command name for context
     */
    async validateArguments(args, commandName) {
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            
            // Basic sanitization
            if (typeof arg === 'string') {
                const sanitized = securityManager.sanitizeInput(arg);
                if (sanitized !== arg) {
                    logger.warn(`Sanitized argument in ${commandName}`, {
                        original: arg,
                        sanitized: sanitized,
                        position: i
                    });
                    args[i] = sanitized;
                }
            }
        }
    }

    /**
     * Check command cooldown
     * @param {string} userId - User ID
     * @param {string} commandName - Command name
     * @param {number} cooldownSeconds - Cooldown duration in seconds
     * @returns {object} Cooldown result
     */
    async checkCommandCooldown(userId, commandName, cooldownSeconds) {
        const key = `${userId}:${commandName}`;
        const now = Date.now();
        const cooldownMs = cooldownSeconds * 1000;

        if (!this.commandCooldowns) {
            this.commandCooldowns = new Map();
        }

        if (this.commandCooldowns.has(key)) {
            const lastExecution = this.commandCooldowns.get(key);
            const timeLeft = lastExecution + cooldownMs - now;
            
            if (timeLeft > 0) {
                const secondsLeft = Math.ceil(timeLeft / 1000);
                return {
                    allowed: false,
                    error: `Command is on cooldown. Please wait ${secondsLeft} seconds.`,
                    timeLeft: secondsLeft
                };
            }
        }

        this.commandCooldowns.set(key, now);
        return { allowed: true };
    }

    /**
     * Execute function with timeout
     * @param {Function} fn - Function to execute
     * @param {number} timeout - Timeout in milliseconds
     * @param {string} errorMessage - Error message on timeout
     * @returns {Promise} Function result
     */
    async executeWithTimeout(fn, timeout, errorMessage) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(errorMessage));
            }, timeout);

            Promise.resolve(fn())
                .then(result => {
                    clearTimeout(timer);
                    resolve(result);
                })
                .catch(error => {
                    clearTimeout(timer);
                    reject(error);
                });
        });
    }

    /**
     * Record command metrics
     * @param {string} commandName - Command name
     * @param {number} executionTime - Execution time in milliseconds
     * @param {boolean} success - Whether execution succeeded
     */
    recordCommandMetrics(commandName, executionTime, success) {
        if (!this.commandMetrics.has(commandName)) {
            this.commandMetrics.set(commandName, {
                totalExecutions: 0,
                successfulExecutions: 0,
                failedExecutions: 0,
                totalExecutionTime: 0,
                averageExecutionTime: 0,
                maxExecutionTime: 0,
                minExecutionTime: Infinity
            });
        }

        const metrics = this.commandMetrics.get(commandName);
        metrics.totalExecutions++;
        metrics.totalExecutionTime += executionTime;
        metrics.averageExecutionTime = metrics.totalExecutionTime / metrics.totalExecutions;
        metrics.maxExecutionTime = Math.max(metrics.maxExecutionTime, executionTime);
        metrics.minExecutionTime = Math.min(metrics.minExecutionTime, executionTime);

        if (success) {
            metrics.successfulExecutions++;
        } else {
            metrics.failedExecutions++;
        }
    }

    /**
     * Generate unique execution ID
     * @returns {string} Unique execution ID
     */
    generateExecutionId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `EXE_${timestamp}_${random}`.toUpperCase();
    }

    /**
     * Get command metrics
     * @param {string} commandName - Command name (optional)
     * @returns {object} Command metrics
     */
    getCommandMetrics(commandName) {
        if (commandName) {
            return this.commandMetrics.get(commandName) || null;
        }
        return Object.fromEntries(this.commandMetrics);
    }

    /**
     * Get system status metrics
     * @returns {object} System status metrics
     */
    getSystemHealth() {
        const totalCommands = Array.from(this.commandMetrics.values()).reduce(
            (sum, metrics) => sum + metrics.totalExecutions, 0
        );
        
        const totalFailures = Array.from(this.commandMetrics.values()).reduce(
            (sum, metrics) => sum + metrics.failedExecutions, 0
        );

        const overallSuccessRate = totalCommands > 0 ? 
            ((totalCommands - totalFailures) / totalCommands) * 100 : 100;

        const slowCommands = Array.from(this.commandMetrics.entries())
            .filter(([, metrics]) => metrics.averageExecutionTime > 5000)
            .map(([name, metrics]) => ({
                name,
                avgTime: metrics.averageExecutionTime,
                maxTime: metrics.maxExecutionTime
            }));

        return {
            totalCommands,
            totalFailures,
            overallSuccessRate,
            slowCommands,
            activeCooldowns: this.commandCooldowns ? this.commandCooldowns.size : 0,
            timestamp: Date.now()
        };
    }

    /**
     * Clean up expired cooldowns
     */
    cleanupCooldowns() {
        if (!this.commandCooldowns) return;

        const now = Date.now();
        const maxCooldown = 3600000; // 1 hour max cooldown cleanup

        for (const [key, timestamp] of this.commandCooldowns.entries()) {
            if (now - timestamp > maxCooldown) {
                this.commandCooldowns.delete(key);
            }
        }
    }
}

// Create singleton instance
const secureCommandHandler = new SecureCommandHandler();

// Clean up cooldowns every 10 minutes
setInterval(() => {
    secureCommandHandler.cleanupCooldowns();
}, 600000);

module.exports = secureCommandHandler;
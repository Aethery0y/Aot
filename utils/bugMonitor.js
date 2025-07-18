const logger = require('./logger');
const { EmbedBuilder } = require('discord.js');

/**
 * Bug Monitoring and Detection System
 * Actively monitors for potential issues and provides real-time alerts
 */

class BugMonitor {
    constructor() {
        this.errorPatterns = new Map();
        this.commandFailures = new Map();
        this.performanceMetrics = new Map();
        this.alertThresholds = {
            errorRate: 0.1, // 10% error rate
            responseTime: 5000, // 5 seconds
            memoryUsage: 512 * 1024 * 1024, // 512MB
            consecutiveFailures: 5
        };
        this.isMonitoring = false;
    }

    /**
     * Start continuous monitoring
     */
    startMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        logger.info('Bug monitoring system started');

        // Monitor every 30 seconds
        this.monitoringInterval = setInterval(() => {
            this.runHealthCheck();
        }, 30000);

        // Performance monitoring every 60 seconds
        this.performanceInterval = setInterval(() => {
            this.checkPerformanceMetrics();
        }, 60000);
    }

    /**
     * Stop monitoring
     */
    stopMonitoring() {
        if (!this.isMonitoring) return;
        
        this.isMonitoring = false;
        clearInterval(this.monitoringInterval);
        clearInterval(this.performanceInterval);
        logger.info('Bug monitoring system stopped');
    }

    /**
     * Track command execution for monitoring
     */
    trackCommandExecution(commandName, success, executionTime, error = null) {
        const now = Date.now();
        const timeWindow = 5 * 60 * 1000; // 5 minutes

        // Initialize command tracking if not exists
        if (!this.commandFailures.has(commandName)) {
            this.commandFailures.set(commandName, {
                total: 0,
                failures: 0,
                consecutive: 0,
                lastFailure: null,
                recentExecutions: [],
                coinIssues: 0,
                balanceErrors: 0
            });
        }

        const stats = this.commandFailures.get(commandName);
        stats.total++;
        
        // Clean old executions (older than 5 minutes)
        stats.recentExecutions = stats.recentExecutions.filter(
            exec => now - exec.timestamp < timeWindow
        );

        // Add current execution
        stats.recentExecutions.push({
            timestamp: now,
            success,
            executionTime,
            error: error?.message
        });

        if (success) {
            stats.consecutive = 0;
        } else {
            stats.failures++;
            stats.consecutive++;
            stats.lastFailure = now;
            
            // Track specific error types
            if (error?.message?.includes('coin') || error?.message?.includes('balance')) {
                stats.coinIssues++;
            }
            if (error?.message?.includes('Insufficient') || error?.message?.includes('negative')) {
                stats.balanceErrors++;
            }

            // Check for critical failure patterns
            this.checkCriticalFailures(commandName, stats);
        }

        // Track performance
        this.trackPerformance(commandName, executionTime);
    }

    /**
     * Check for critical failure patterns
     */
    checkCriticalFailures(commandName, stats) {
        // Alert on consecutive failures
        if (stats.consecutive >= this.alertThresholds.consecutiveFailures) {
            this.alertCriticalIssue(
                'consecutive_failures',
                `Command ${commandName} has failed ${stats.consecutive} times in a row`,
                {
                    commandName,
                    consecutiveFailures: stats.consecutive,
                    lastError: stats.recentExecutions[stats.recentExecutions.length - 1]?.error
                }
            );
        }

        // Alert on high error rate
        const recentFailures = stats.recentExecutions.filter(exec => !exec.success).length;
        const errorRate = recentFailures / stats.recentExecutions.length;
        
        if (errorRate > this.alertThresholds.errorRate && stats.recentExecutions.length >= 10) {
            this.alertCriticalIssue(
                'high_error_rate',
                `Command ${commandName} has ${Math.round(errorRate * 100)}% error rate`,
                {
                    commandName,
                    errorRate: Math.round(errorRate * 100),
                    recentFailures,
                    totalRecent: stats.recentExecutions.length
                }
            );
        }
    }

    /**
     * Track performance metrics
     */
    trackPerformance(commandName, executionTime) {
        if (!this.performanceMetrics.has(commandName)) {
            this.performanceMetrics.set(commandName, {
                totalTime: 0,
                count: 0,
                maxTime: 0,
                recentTimes: []
            });
        }

        const metrics = this.performanceMetrics.get(commandName);
        metrics.totalTime += executionTime;
        metrics.count++;
        metrics.maxTime = Math.max(metrics.maxTime, executionTime);
        
        // Keep only recent 100 execution times
        metrics.recentTimes.push(executionTime);
        if (metrics.recentTimes.length > 100) {
            metrics.recentTimes.shift();
        }

        // Alert on slow performance
        if (executionTime > this.alertThresholds.responseTime) {
            this.alertPerformanceIssue(commandName, executionTime);
        }
    }

    /**
     * Run comprehensive status check
     */
    async runHealthCheck() {
        try {
            const issues = [];

            // Check memory usage
            const memUsage = process.memoryUsage();
            if (memUsage.heapUsed > this.alertThresholds.memoryUsage) {
                issues.push({
                    type: 'memory',
                    severity: 'warning',
                    message: `High memory usage: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`
                });
            }

            // Check for error patterns
            const errorPatterns = this.detectErrorPatterns();
            issues.push(...errorPatterns);

            // Check database connectivity
            const dbHealth = await this.checkDatabaseHealth();
            if (!dbHealth.operational) {
                issues.push({
                    type: 'database',
                    severity: 'critical',
                    message: 'Database connectivity issues detected'
                });
            }

            // Log health status
            if (issues.length === 0) {
                logger.debug('System status check: All systems normal');
            } else {
                logger.warn(`System health check: ${issues.length} issue(s) detected`, issues);
            }

        } catch (error) {
            logger.error('Health check failed:', error);
        }
    }

    /**
     * Check database health
     */
    async checkDatabaseHealth() {
        try {
            const { pool } = require('../config/database');
            const connection = await pool.getConnection();
            
            // Simple query to test connectivity
            await connection.execute('SELECT 1');
            connection.release();
            
            return { healthy: true };
        } catch (error) {
            logger.error('Database health check failed:', error);
            return { healthy: false, error: error.message };
        }
    }

    /**
     * Check performance metrics
     */
    checkPerformanceMetrics() {
        for (const [commandName, metrics] of this.performanceMetrics) {
            const avgTime = metrics.totalTime / metrics.count;
            
            // Check if recent performance is degrading
            if (metrics.recentTimes.length >= 10) {
                const recentAvg = metrics.recentTimes.slice(-10).reduce((a, b) => a + b, 0) / 10;
                const overallAvg = metrics.totalTime / metrics.count;
                
                // Alert if recent performance is significantly worse
                if (recentAvg > overallAvg * 1.5 && recentAvg > 1000) {
                    this.alertPerformanceIssue(commandName, recentAvg, 'degradation');
                }
            }
        }
    }

    /**
     * Detect error patterns
     */
    detectErrorPatterns() {
        const issues = [];
        const now = Date.now();
        const timeWindow = 10 * 60 * 1000; // 10 minutes

        for (const [commandName, stats] of this.commandFailures) {
            const recentFailures = stats.recentExecutions.filter(
                exec => !exec.success && now - exec.timestamp < timeWindow
            );

            if (recentFailures.length >= 3) {
                issues.push({
                    type: 'error_pattern',
                    severity: 'warning',
                    message: `Command ${commandName} has ${recentFailures.length} failures in last 10 minutes`
                });
            }
        }

        return issues;
    }

    /**
     * Alert critical issue
     */
    alertCriticalIssue(type, message, details = {}) {
        logger.error(`CRITICAL ISSUE [${type}]: ${message}`, details);
        
        // You could extend this to send Discord notifications to admins
        // or integrate with external monitoring services
    }

    /**
     * Alert performance issue
     */
    alertPerformanceIssue(commandName, executionTime, type = 'slow') {
        const message = type === 'degradation' 
            ? `Command ${commandName} performance degraded (avg: ${Math.round(executionTime)}ms)`
            : `Command ${commandName} slow execution (${Math.round(executionTime)}ms)`;
            
        logger.warn(`PERFORMANCE ISSUE: ${message}`);
    }

    /**
     * Get monitoring statistics
     */
    getStats() {
        const stats = {
            isMonitoring: this.isMonitoring,
            totalCommands: this.commandFailures.size,
            systemHealth: 'good',
            memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            uptime: Math.round(process.uptime()),
            commands: {}
        };

        for (const [commandName, commandStats] of this.commandFailures) {
            const errorRate = commandStats.total > 0 
                ? Math.round((commandStats.failures / commandStats.total) * 100)
                : 0;
                
            stats.commands[commandName] = {
                totalExecutions: commandStats.total,
                failures: commandStats.failures,
                errorRate: errorRate,
                consecutiveFailures: commandStats.consecutive
            };
        }

        return stats;
    }

    /**
     * Create monitoring report embed
     */
    createMonitoringReport() {
        const stats = this.getStats();
        
        const embed = new EmbedBuilder()
            .setColor('#2196F3')
            .setTitle('🔍 System Monitoring Report')
            .setDescription('Current system health and performance metrics')
            .addFields(
                {
                    name: '💻 System Status',
                    value: `Status: ${stats.systemHealth.toUpperCase()}\nMemory: ${stats.memoryUsage}MB\nUptime: ${Math.floor(stats.uptime / 3600)}h ${Math.floor((stats.uptime % 3600) / 60)}m`,
                    inline: true
                },
                {
                    name: '📊 Command Stats',
                    value: `Total Commands: ${stats.totalCommands}\nMonitoring: ${stats.isMonitoring ? 'Active' : 'Inactive'}`,
                    inline: true
                }
            );

        // Add top failure commands if any
        const failingCommands = Object.entries(stats.commands)
            .filter(([_, cmdStats]) => cmdStats.errorRate > 5)
            .sort((a, b) => b[1].errorRate - a[1].errorRate)
            .slice(0, 5);

        if (failingCommands.length > 0) {
            const failureText = failingCommands
                .map(([cmd, cmdStats]) => `${cmd}: ${cmdStats.errorRate}% (${cmdStats.failures}/${cmdStats.totalExecutions})`)
                .join('\n');
                
            embed.addFields({
                name: '⚠️ Commands with Issues',
                value: failureText,
                inline: false
            });
        }

        embed.setFooter({ text: 'Bug monitoring system active' })
             .setTimestamp();

        return embed;
    }
}

module.exports = new BugMonitor();
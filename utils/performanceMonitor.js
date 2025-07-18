const logger = require('./logger');

/**
 * Performance Monitoring System
 * Tracks bot performance metrics and identifies bottlenecks
 */

class PerformanceMonitor {
    constructor() {
        this.metrics = {
            commandExecutions: new Map(),
            databaseQueries: new Map(),
            memoryUsage: [],
            responseTime: new Map(),
            errorRates: new Map()
        };
        
        this.startTime = Date.now();
        this.maxMetricAge = 3600000; // 1 hour
        this.cleanupInterval = 600000; // 10 minutes
        
        // Start monitoring
        this.startMonitoring();
    }

    /**
     * Start performance monitoring
     */
    startMonitoring() {
        // Monitor memory usage every 30 seconds
        setInterval(() => {
            this.recordMemoryUsage();
        }, 30000);

        // Cleanup old metrics every 10 minutes
        setInterval(() => {
            this.cleanupMetrics();
        }, this.cleanupInterval);
    }

    /**
     * Record command execution time
     * @param {string} commandName - Name of the command
     * @param {number} executionTime - Execution time in milliseconds
     * @param {boolean} success - Whether the command succeeded
     */
    recordCommandExecution(commandName, executionTime, success = true) {
        const now = Date.now();
        
        if (!this.metrics.commandExecutions.has(commandName)) {
            this.metrics.commandExecutions.set(commandName, {
                count: 0,
                totalTime: 0,
                successCount: 0,
                failureCount: 0,
                avgTime: 0,
                maxTime: 0,
                minTime: Infinity,
                recentExecutions: []
            });
        }

        const commandMetrics = this.metrics.commandExecutions.get(commandName);
        commandMetrics.count++;
        commandMetrics.totalTime += executionTime;
        commandMetrics.avgTime = commandMetrics.totalTime / commandMetrics.count;
        commandMetrics.maxTime = Math.max(commandMetrics.maxTime, executionTime);
        commandMetrics.minTime = Math.min(commandMetrics.minTime, executionTime);
        
        if (success) {
            commandMetrics.successCount++;
        } else {
            commandMetrics.failureCount++;
        }

        // Store recent executions for analysis
        commandMetrics.recentExecutions.push({
            timestamp: now,
            executionTime,
            success
        });

        // Keep only last 100 executions
        if (commandMetrics.recentExecutions.length > 100) {
            commandMetrics.recentExecutions.shift();
        }

        // Log slow commands
        if (executionTime > 5000) { // 5 seconds
            logger.warn(`Slow command execution detected`, {
                commandName,
                executionTime,
                success
            });
        }
    }

    /**
     * Record database query time
     * @param {string} queryType - Type of query (SELECT, INSERT, UPDATE, DELETE)
     * @param {number} executionTime - Query execution time in milliseconds
     * @param {boolean} success - Whether the query succeeded
     */
    recordDatabaseQuery(queryType, executionTime, success = true) {
        const now = Date.now();
        
        if (!this.metrics.databaseQueries.has(queryType)) {
            this.metrics.databaseQueries.set(queryType, {
                count: 0,
                totalTime: 0,
                successCount: 0,
                failureCount: 0,
                avgTime: 0,
                maxTime: 0,
                minTime: Infinity,
                recentQueries: []
            });
        }

        const queryMetrics = this.metrics.databaseQueries.get(queryType);
        queryMetrics.count++;
        queryMetrics.totalTime += executionTime;
        queryMetrics.avgTime = queryMetrics.totalTime / queryMetrics.count;
        queryMetrics.maxTime = Math.max(queryMetrics.maxTime, executionTime);
        queryMetrics.minTime = Math.min(queryMetrics.minTime, executionTime);
        
        if (success) {
            queryMetrics.successCount++;
        } else {
            queryMetrics.failureCount++;
        }

        // Store recent queries for analysis
        queryMetrics.recentQueries.push({
            timestamp: now,
            executionTime,
            success
        });

        // Keep only last 100 queries
        if (queryMetrics.recentQueries.length > 100) {
            queryMetrics.recentQueries.shift();
        }

        // Log slow queries
        if (executionTime > 1000) { // 1 second
            logger.warn(`Slow database query detected`, {
                queryType,
                executionTime,
                success
            });
        }
    }

    /**
     * Record memory usage
     */
    recordMemoryUsage() {
        const memoryUsage = process.memoryUsage();
        const timestamp = Date.now();
        
        this.metrics.memoryUsage.push({
            timestamp,
            heapUsed: memoryUsage.heapUsed,
            heapTotal: memoryUsage.heapTotal,
            rss: memoryUsage.rss,
            external: memoryUsage.external
        });

        // Keep only last 24 hours of memory data (2880 entries at 30-second intervals)
        if (this.metrics.memoryUsage.length > 2880) {
            this.metrics.memoryUsage.shift();
        }

        // Alert on high memory usage
        const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;
        if (memoryUsageMB > 500) { // 500MB threshold
            logger.warn(`High memory usage detected: ${memoryUsageMB.toFixed(2)}MB`);
        }
    }

    /**
     * Record response time for interactions
     * @param {string} interactionType - Type of interaction
     * @param {number} responseTime - Response time in milliseconds
     */
    recordResponseTime(interactionType, responseTime) {
        if (!this.metrics.responseTime.has(interactionType)) {
            this.metrics.responseTime.set(interactionType, {
                count: 0,
                totalTime: 0,
                avgTime: 0,
                maxTime: 0,
                minTime: Infinity,
                recentResponses: []
            });
        }

        const responseMetrics = this.metrics.responseTime.get(interactionType);
        responseMetrics.count++;
        responseMetrics.totalTime += responseTime;
        responseMetrics.avgTime = responseMetrics.totalTime / responseMetrics.count;
        responseMetrics.maxTime = Math.max(responseMetrics.maxTime, responseTime);
        responseMetrics.minTime = Math.min(responseMetrics.minTime, responseTime);

        responseMetrics.recentResponses.push({
            timestamp: Date.now(),
            responseTime
        });

        // Keep only last 100 responses
        if (responseMetrics.recentResponses.length > 100) {
            responseMetrics.recentResponses.shift();
        }

        // Log slow responses
        if (responseTime > 3000) { // 3 seconds
            logger.warn(`Slow response time detected`, {
                interactionType,
                responseTime
            });
        }
    }

    /**
     * Record error rate
     * @param {string} errorType - Type of error
     * @param {string} context - Context where error occurred
     */
    recordError(errorType, context) {
        const key = `${errorType}:${context}`;
        const now = Date.now();
        
        if (!this.metrics.errorRates.has(key)) {
            this.metrics.errorRates.set(key, {
                count: 0,
                recentErrors: []
            });
        }

        const errorMetrics = this.metrics.errorRates.get(key);
        errorMetrics.count++;
        errorMetrics.recentErrors.push({
            timestamp: now,
            errorType,
            context
        });

        // Keep only last 100 errors
        if (errorMetrics.recentErrors.length > 100) {
            errorMetrics.recentErrors.shift();
        }

        // Alert on high error rates
        const recentErrors = errorMetrics.recentErrors.filter(
            error => now - error.timestamp < 600000 // Last 10 minutes
        );

        if (recentErrors.length >= 10) {
            logger.error(`High error rate detected: ${recentErrors.length} ${errorType} errors in last 10 minutes`);
        }
    }

    /**
     * Get performance summary
     * @returns {object} Performance summary
     */
    getPerformanceSummary() {
        const uptime = Date.now() - this.startTime;
        const currentMemory = process.memoryUsage();
        
        // Calculate average response times
        const avgResponseTimes = {};
        for (const [type, metrics] of this.metrics.responseTime.entries()) {
            avgResponseTimes[type] = metrics.avgTime;
        }

        // Calculate command success rates
        const commandSuccessRates = {};
        for (const [command, metrics] of this.metrics.commandExecutions.entries()) {
            commandSuccessRates[command] = {
                successRate: (metrics.successCount / metrics.count) * 100,
                avgExecutionTime: metrics.avgTime,
                totalExecutions: metrics.count
            };
        }

        // Calculate database query success rates
        const dbSuccessRates = {};
        for (const [queryType, metrics] of this.metrics.databaseQueries.entries()) {
            dbSuccessRates[queryType] = {
                successRate: (metrics.successCount / metrics.count) * 100,
                avgExecutionTime: metrics.avgTime,
                totalQueries: metrics.count
            };
        }

        return {
            uptime,
            currentMemory: {
                heapUsed: Math.round(currentMemory.heapUsed / 1024 / 1024),
                heapTotal: Math.round(currentMemory.heapTotal / 1024 / 1024),
                rss: Math.round(currentMemory.rss / 1024 / 1024)
            },
            avgResponseTimes,
            commandSuccessRates,
            dbSuccessRates,
            totalErrors: Array.from(this.metrics.errorRates.values()).reduce((sum, metric) => sum + metric.count, 0)
        };
    }

    /**
     * Get detailed metrics for a specific command
     * @param {string} commandName - Name of the command
     * @returns {object} Detailed command metrics
     */
    getCommandMetrics(commandName) {
        return this.metrics.commandExecutions.get(commandName) || null;
    }

    /**
     * Get system status
     * @returns {object} Health status
     */
    getHealthStatus() {
        const memory = process.memoryUsage();
        const memoryUsageMB = memory.heapUsed / 1024 / 1024;
        const uptime = Date.now() - this.startTime;
        
        // Check for concerning metrics
        const warnings = [];
        
        if (memoryUsageMB > 400) {
            warnings.push(`High memory usage: ${memoryUsageMB.toFixed(2)}MB`);
        }
        
        // Check for slow commands
        for (const [command, metrics] of this.metrics.commandExecutions.entries()) {
            if (metrics.avgTime > 3000) {
                warnings.push(`Slow command: ${command} (${metrics.avgTime.toFixed(2)}ms avg)`);
            }
        }
        
        // Check for high error rates
        for (const [key, metrics] of this.metrics.errorRates.entries()) {
            const recentErrors = metrics.recentErrors.filter(
                error => Date.now() - error.timestamp < 600000 // Last 10 minutes
            );
            if (recentErrors.length >= 5) {
                warnings.push(`High error rate: ${key} (${recentErrors.length} errors in 10 min)`);
            }
        }

        return {
            status: warnings.length === 0 ? 'operational' : 'warning',
            uptime,
            memoryUsage: memoryUsageMB,
            warnings,
            timestamp: Date.now()
        };
    }

    /**
     * Clean up old metrics
     */
    cleanupMetrics() {
        const now = Date.now();
        const cutoff = now - this.maxMetricAge;

        // Clean up command executions
        for (const [command, metrics] of this.metrics.commandExecutions.entries()) {
            metrics.recentExecutions = metrics.recentExecutions.filter(
                execution => execution.timestamp > cutoff
            );
        }

        // Clean up database queries
        for (const [queryType, metrics] of this.metrics.databaseQueries.entries()) {
            metrics.recentQueries = metrics.recentQueries.filter(
                query => query.timestamp > cutoff
            );
        }

        // Clean up response times
        for (const [type, metrics] of this.metrics.responseTime.entries()) {
            metrics.recentResponses = metrics.recentResponses.filter(
                response => response.timestamp > cutoff
            );
        }

        // Clean up error rates
        for (const [key, metrics] of this.metrics.errorRates.entries()) {
            metrics.recentErrors = metrics.recentErrors.filter(
                error => error.timestamp > cutoff
            );
        }

        // Clean up memory usage (keep last 24 hours)
        this.metrics.memoryUsage = this.metrics.memoryUsage.filter(
            usage => usage.timestamp > now - 86400000
        );

        logger.info('Performance metrics cleanup completed');
    }

    /**
     * Export metrics for analysis
     * @returns {object} All metrics data
     */
    exportMetrics() {
        return {
            startTime: this.startTime,
            exportTime: Date.now(),
            metrics: {
                commandExecutions: Object.fromEntries(this.metrics.commandExecutions),
                databaseQueries: Object.fromEntries(this.metrics.databaseQueries),
                memoryUsage: this.metrics.memoryUsage,
                responseTime: Object.fromEntries(this.metrics.responseTime),
                errorRates: Object.fromEntries(this.metrics.errorRates)
            }
        };
    }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

module.exports = performanceMonitor;
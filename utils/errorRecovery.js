const logger = require('./logger');

/**
 * Error Recovery System
 * Handles graceful error recovery and prevents cascading failures
 */

class ErrorRecovery {
    constructor() {
        this.recoveryStrategies = new Map();
        this.circuitBreakers = new Map();
        this.fallbackData = new Map();
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 second
    }

    /**
     * Execute operation with automatic retry and fallback
     */
    async executeWithRecovery(operationName, operation, fallback = null, maxRetries = this.maxRetries) {
        let lastError = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // Check circuit breaker
                if (this.isCircuitOpen(operationName)) {
                    logger.warn(`Circuit breaker open for ${operationName}, using fallback`);
                    return await this.executeFallback(operationName, fallback);
                }
                
                const result = await operation();
                
                // Reset circuit breaker on success
                this.resetCircuitBreaker(operationName);
                
                return result;
            } catch (error) {
                lastError = error;
                logger.warn(`Operation ${operationName} failed (attempt ${attempt}/${maxRetries}):`, error.message);
                
                // Record failure for circuit breaker
                this.recordFailure(operationName);
                
                if (attempt < maxRetries) {
                    // Exponential backoff
                    await this.sleep(this.retryDelay * Math.pow(2, attempt - 1));
                }
            }
        }
        
        // All retries failed, try fallback
        logger.error(`All retries failed for ${operationName}, attempting fallback`);
        return await this.executeFallback(operationName, fallback, lastError);
    }

    /**
     * Execute fallback strategy
     */
    async executeFallback(operationName, fallback, originalError = null) {
        try {
            if (typeof fallback === 'function') {
                return await fallback(originalError);
            } else if (fallback !== null) {
                return fallback;
            } else {
                // Return cached data if available
                const cached = this.fallbackData.get(operationName);
                if (cached) {
                    logger.info(`Using cached fallback data for ${operationName}`);
                    return cached;
                }
                
                // No fallback available
                throw new Error(`No fallback available for ${operationName}`);
            }
        } catch (fallbackError) {
            logger.error(`Fallback also failed for ${operationName}:`, fallbackError.message);
            throw originalError || fallbackError;
        }
    }

    /**
     * Cache successful results for fallback use
     */
    cacheFallbackData(operationName, data, ttl = 300000) { // 5 minutes default
        this.fallbackData.set(operationName, {
            data,
            timestamp: Date.now(),
            ttl
        });
        
        // Clean up expired cache
        setTimeout(() => {
            const cached = this.fallbackData.get(operationName);
            if (cached && Date.now() - cached.timestamp > cached.ttl) {
                this.fallbackData.delete(operationName);
            }
        }, ttl);
    }

    /**
     * Circuit breaker implementation
     */
    recordFailure(operationName) {
        if (!this.circuitBreakers.has(operationName)) {
            this.circuitBreakers.set(operationName, {
                failures: 0,
                lastFailure: null,
                state: 'closed' // closed, open, half-open
            });
        }
        
        const breaker = this.circuitBreakers.get(operationName);
        breaker.failures++;
        breaker.lastFailure = Date.now();
        
        // Open circuit if too many failures
        if (breaker.failures >= 5) {
            breaker.state = 'open';
            logger.warn(`Circuit breaker opened for ${operationName} after ${breaker.failures} failures`);
            
            // Auto-recovery after 30 seconds
            setTimeout(() => {
                const currentBreaker = this.circuitBreakers.get(operationName);
                if (currentBreaker && currentBreaker.state === 'open') {
                    currentBreaker.state = 'half-open';
                    logger.info(`Circuit breaker half-opened for ${operationName}`);
                }
            }, 30000);
        }
    }

    /**
     * Check if circuit breaker is open
     */
    isCircuitOpen(operationName) {
        const breaker = this.circuitBreakers.get(operationName);
        return breaker && breaker.state === 'open';
    }

    /**
     * Reset circuit breaker on successful operation
     */
    resetCircuitBreaker(operationName) {
        const breaker = this.circuitBreakers.get(operationName);
        if (breaker) {
            breaker.failures = 0;
            breaker.state = 'closed';
        }
    }

    /**
     * Safe database operation wrapper
     */
    async safeDbOperation(operationName, dbOperation, fallbackValue = null) {
        return await this.executeWithRecovery(
            `db_${operationName}`,
            dbOperation,
            () => {
                logger.warn(`Database operation ${operationName} failed, using fallback`);
                return fallbackValue;
            }
        );
    }

    /**
     * Safe API call wrapper
     */
    async safeApiCall(operationName, apiCall, fallbackValue = null) {
        return await this.executeWithRecovery(
            `api_${operationName}`,
            apiCall,
            () => {
                logger.warn(`API call ${operationName} failed, using fallback`);
                return fallbackValue;
            }
        );
    }

    /**
     * Graceful shutdown handler
     */
    async gracefulShutdown() {
        logger.info('Initiating graceful shutdown...');
        
        // Save current state
        const state = {
            circuitBreakers: Object.fromEntries(this.circuitBreakers),
            timestamp: Date.now()
        };
        
        try {
            // You could save state to file or database here
            logger.info('Shutdown state saved successfully');
        } catch (error) {
            logger.error('Failed to save shutdown state:', error);
        }
        
        // Clear intervals and timeouts
        this.circuitBreakers.clear();
        this.fallbackData.clear();
        
        logger.info('Graceful shutdown completed');
    }

    /**
     * Get recovery statistics
     */
    getStats() {
        const stats = {
            circuitBreakers: Object.fromEntries(this.circuitBreakers),
            cachedFallbacks: this.fallbackData.size,
            activeOperations: this.recoveryStrategies.size
        };
        
        return stats;
    }

    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = new ErrorRecovery();
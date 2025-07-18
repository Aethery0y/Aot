const { pool } = require('../config/database');

const logger = require('./logger');

/**
 * Optimized query manager for high-performance database operations
 */
class QueryOptimizer {
    constructor() {
        this.preparedStatements = new Map();
        this.queryStats = new Map();
    }

    /**
     * Execute optimized query with performance tracking
     */
    async executeOptimized(sql, params = []) {
        const startTime = Date.now();
        
        try {
            // Execute query
            const [rows] = await pool.execute(sql, params);
            
            // Track performance
            const duration = Date.now() - startTime;
            this.trackQueryPerformance(sql, duration);
            
            if (duration > 1000) {
                logger.warn(`Slow query detected (${duration}ms): ${sql.substring(0, 100)}...`);
            }
            
            return rows;
            
        } catch (error) {
            logger.error(`Query failed: ${error.message}`, { sql, params });
            throw error;
        }
    }

    /**
     * Track query performance for optimization insights
     */
    trackQueryPerformance(sql, duration) {
        const queryType = sql.trim().split(' ')[0].toUpperCase();
        const stats = this.queryStats.get(queryType) || { count: 0, totalTime: 0, avgTime: 0 };
        
        stats.count++;
        stats.totalTime += duration;
        stats.avgTime = stats.totalTime / stats.count;
        
        this.queryStats.set(queryType, stats);
    }

    /**
     * Get performance statistics
     */
    getPerformanceStats() {
        return Object.fromEntries(this.queryStats);
    }

    /**
     * Batch execute multiple queries efficiently
     */
    async executeBatch(queries) {
        const startTime = Date.now();
        const results = [];
        
        try {
            for (const { sql, params, cacheKey, ttl } of queries) {
                const result = await this.executeOptimized(sql, params, cacheKey, ttl);
                results.push(result);
            }
            
            logger.performance(`Batch execution completed`, Date.now() - startTime);
            return results;
            
        } catch (error) {
            logger.error(`Batch execution failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Preload commonly accessed data into cache
     */
    async preloadCache() {
        logger.info('Starting cache preload...');
        
        try {
            // Preload all powers
            await this.executeOptimized(
                'SELECT * FROM powers ORDER BY rank, base_price',
                [],
                'all_powers',
                600000 // 10 minutes
            );
            
            // Preload rank configurations
            await this.executeOptimized(
                'SELECT * FROM power_rank_config ORDER BY min_cp',
                [],
                'rank_config',
                300000 // 5 minutes
            );
            
            logger.info('Cache preload completed successfully');
            
        } catch (error) {
            logger.error(`Cache preload failed: ${error.message}`);
        }
    }
}

// Create global optimizer instance
const queryOptimizer = new QueryOptimizer();

// Preload cache on startup
queryOptimizer.preloadCache();

module.exports = queryOptimizer;
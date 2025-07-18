const Redis = require('redis');
const logger = require('../utils/logger');
const config = require('../config/config');

class CacheManager {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.defaultTTL = 300; // 5 minutes
    }

    async initialize() {
        try {
            logger.info('🗄️ Initializing cache manager...');

            this.client = Redis.createClient({
                host: config.redis.host,
                port: config.redis.port,
                password: config.redis.password,
                db: config.redis.db,
                keyPrefix: config.redis.keyPrefix,
                retryDelayOnFailover: config.redis.retryDelayOnFailover,
                maxRetriesPerRequest: config.redis.maxRetriesPerRequest,
                lazyConnect: true
            });

            this.client.on('error', (error) => {
                logger.error('Redis error:', error);
                this.isConnected = false;
            });

            this.client.on('connect', () => {
                logger.info('✅ Redis connected');
                this.isConnected = true;
            });

            this.client.on('disconnect', () => {
                logger.warn('⚠️ Redis disconnected');
                this.isConnected = false;
            });

            await this.client.connect();
            
            // Test connection
            await this.client.ping();
            
            logger.info('✅ Cache manager initialized');
            
        } catch (error) {
            logger.error('❌ Cache initialization failed:', error);
            // Continue without cache if Redis is unavailable
            this.isConnected = false;
        }
    }

    async get(key) {
        if (!this.isConnected) return null;

        try {
            const value = await this.client.get(key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            logger.error(`Cache get failed for key ${key}:`, error);
            return null;
        }
    }

    async set(key, value, ttl = this.defaultTTL) {
        if (!this.isConnected) return false;

        try {
            await this.client.setEx(key, ttl, JSON.stringify(value));
            return true;
        } catch (error) {
            logger.error(`Cache set failed for key ${key}:`, error);
            return false;
        }
    }

    async del(key) {
        if (!this.isConnected) return false;

        try {
            await this.client.del(key);
            return true;
        } catch (error) {
            logger.error(`Cache delete failed for key ${key}:`, error);
            return false;
        }
    }

    async exists(key) {
        if (!this.isConnected) return false;

        try {
            const result = await this.client.exists(key);
            return result === 1;
        } catch (error) {
            logger.error(`Cache exists check failed for key ${key}:`, error);
            return false;
        }
    }

    async increment(key, amount = 1, ttl = this.defaultTTL) {
        if (!this.isConnected) return null;

        try {
            const result = await this.client.incrBy(key, amount);
            if (ttl > 0) {
                await this.client.expire(key, ttl);
            }
            return result;
        } catch (error) {
            logger.error(`Cache increment failed for key ${key}:`, error);
            return null;
        }
    }

    async getOrSet(key, fetchFunction, ttl = this.defaultTTL) {
        // Try to get from cache first
        let value = await this.get(key);
        
        if (value !== null) {
            return value;
        }

        // If not in cache, fetch and store
        try {
            value = await fetchFunction();
            if (value !== null && value !== undefined) {
                await this.set(key, value, ttl);
            }
            return value;
        } catch (error) {
            logger.error(`Cache getOrSet failed for key ${key}:`, error);
            return null;
        }
    }

    async invalidatePattern(pattern) {
        if (!this.isConnected) return false;

        try {
            const keys = await this.client.keys(pattern);
            if (keys.length > 0) {
                await this.client.del(keys);
            }
            return true;
        } catch (error) {
            logger.error(`Cache pattern invalidation failed for pattern ${pattern}:`, error);
            return false;
        }
    }

    async getUserData(discordId) {
        return await this.getOrSet(
            `user:${discordId}`,
            async () => {
                const { getUserByDiscordId } = require('../services/userService');
                return await getUserByDiscordId(discordId);
            },
            600 // 10 minutes
        );
    }

    async invalidateUserData(discordId) {
        await this.del(`user:${discordId}`);
        await this.invalidatePattern(`user:${discordId}:*`);
    }

    async getUserPowers(userId) {
        return await this.getOrSet(
            `user:${userId}:powers`,
            async () => {
                const { getUserPowers } = require('../services/powerService');
                return await getUserPowers(userId);
            },
            300 // 5 minutes
        );
    }

    async invalidateUserPowers(userId) {
        await this.del(`user:${userId}:powers`);
    }

    async getArenaRankings() {
        return await this.getOrSet(
            'arena:rankings',
            async () => {
                const { getArenaRankings } = require('../services/arenaService');
                return await getArenaRankings(200);
            },
            120 // 2 minutes
        );
    }

    async invalidateArenaRankings() {
        await this.del('arena:rankings');
    }

    async close() {
        if (this.client && this.isConnected) {
            await this.client.quit();
            logger.info('✅ Cache connections closed');
        }
    }

    isHealthy() {
        return this.isConnected;
    }

    async getStats() {
        if (!this.isConnected) {
            return { connected: false };
        }

        try {
            const info = await this.client.info();
            const keyCount = await this.client.dbSize();
            
            return {
                connected: true,
                keyCount,
                memory: this.parseRedisInfo(info, 'used_memory_human'),
                uptime: this.parseRedisInfo(info, 'uptime_in_seconds')
            };
        } catch (error) {
            logger.error('Failed to get cache stats:', error);
            return { connected: false, error: error.message };
        }
    }

    parseRedisInfo(info, key) {
        const lines = info.split('\r\n');
        const line = lines.find(l => l.startsWith(key + ':'));
        return line ? line.split(':')[1] : null;
    }
}

const cacheManager = new CacheManager();

module.exports = {
    initializeCache: () => cacheManager.initialize(),
    cacheManager,
    close: () => cacheManager.close()
};
const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

const dbConfig = {
    host: '217.21.91.253',
    user: 'u284410540_aether',
    database: 'u284410540_aethexiz',
    password: 'Aethexiz11122005#',
    waitForConnections: true,
    connectionLimit: 50, // Increased from 10 to 50
    queueLimit: 100, // Increased from 0 to 100
    multipleStatements: true,
    charset: 'utf8mb4',
    timezone: 'Z'
};

const pool = mysql.createPool(dbConfig);

module.exports = {
    pool,
    dbConfig
};

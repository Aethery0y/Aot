/**
 * Centralized Data Management
 * Main export for all data modules
 */

const powers = require('./powers');
const enemies = require('./enemies');
const responses = require('./responses');

module.exports = {
    ...powers,
    ...enemies,
    ...responses
};
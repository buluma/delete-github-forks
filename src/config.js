/**
 * Configuration loader
 *
 * Priority:
 * 1. Environment variables (GITHUB_API_URL, GITHUB_TOKEN, GITHUB_USERNAME)
 * 2. config.json file (if present)
 * 3. Sensible defaults
 */
let fileConfig = {};
try {
  fileConfig = require('./config.json');
} catch (e) {
  // config.json not found — that's okay, use env vars or defaults
}

module.exports = {
  api_url: process.env.GITHUB_API_URL || fileConfig.api_url || 'https://api.github.com',
  access_token: process.env.GITHUB_TOKEN || fileConfig.access_token || '',
  github_username: process.env.GITHUB_USERNAME || fileConfig.github_username || '',
};

// scripts/nba/config.js
import dotenv from 'dotenv';
dotenv.config();

export const BDL_CONFIG = {
  // Try to get from .env first, fallback to the string
  API_KEY: (process.env.BDL_API_KEY || '4fb66b96-1044-4635-9bcc-55b6b4668e07').trim(),
  BASE_URL: 'https://api.balldontlie.io/v1',
  TIMEOUT: 5000, // 5 seconds between requests for Free Tier safety
  SEASONS: [2024, 2025],
  CATEGORIES: ['pts', 'ast', 'reb', 'stl', 'blk']
};
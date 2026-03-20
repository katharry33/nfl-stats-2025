// scripts/nba/config.js
import dotenv from 'dotenv';
dotenv.config();

export const BDL_CONFIG = {
  // Try to get from .env first, fallback to the string
  API_KEY: (process.env.BDL_API_KEY || '0c0c5389-4aa3-4bae-ad6d-373c95591339').trim(),
  BASE_URL: 'https://api.balldontlie.io/v1',
  TIMEOUT: 5000, // 5 seconds between requests for Free Tier safety
  SEASONS: [2024, 2025],
  CATEGORIES: ['pts', 'ast', 'reb', 'stl', 'blk']
};
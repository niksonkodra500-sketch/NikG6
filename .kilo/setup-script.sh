#!/bin/bash
# Setup script for Kilo Agent Manager worktrees

cd "$WORKTREE_PATH"

# Install dependencies
npm ci --no-audit --no-fund

# Generate sample image for testing
node scripts/generate-sample.mjs

# Sync Capacitor (for Android development)
npx cap sync android

echo "Setup complete. Run 'npm run dev' to start the development server."
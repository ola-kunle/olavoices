#!/bin/bash

# Voice Analyzer ML Training Pipeline
# Usage: ADMIN_TOKEN=your-token ./train-ml-model.sh

set -e  # Exit on error

echo "🎯 Voice Analyzer ML Training Pipeline"
echo "======================================"
echo ""

# Check if ADMIN_TOKEN is set
if [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ Error: ADMIN_TOKEN environment variable not set"
  echo ""
  echo "Usage:"
  echo "  ADMIN_TOKEN=your-secret-token ./train-ml-model.sh"
  echo ""
  exit 1
fi

# Check if Node.js dependencies are installed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
  echo ""
fi

# Step 1: Check data readiness
echo "Step 1: Checking data readiness..."
echo "-----------------------------------"
node check-data-readiness.js

# Check if training-data.json was created
if [ ! -f "training-data.json" ]; then
  echo ""
  echo "❌ Not enough data yet. Exiting."
  echo ""
  echo "Current status: Less than 500 samples collected"
  echo "Come back when you have more feedback data!"
  exit 0
fi

echo ""
echo "✅ Data is ready for ML training!"
echo ""

# Confirm before proceeding
read -p "Continue with training? This will take 2-5 minutes. (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Training cancelled."
  exit 0
fi

# Step 2: Train model
echo ""
echo "Step 2: Training model on real data..."
echo "-----------------------------------"
node train-voice-model-v2.js

# Check if model was created
if [ ! -d "voice-classifier-v2" ]; then
  echo ""
  echo "❌ Model training failed. Check logs above."
  exit 1
fi

echo ""
echo "✅ Model training complete!"
echo ""

# Step 3: Copy to production (optional)
read -p "Deploy model to production directory? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo ""
  echo "Step 3: Deploying model..."
  echo "-----------------------------------"

  # Create production model directory if it doesn't exist
  mkdir -p ../../voice-classifier-v2

  # Copy model files
  cp -r voice-classifier-v2/* ../../voice-classifier-v2/

  echo "✅ Model files copied to production directory"
  echo ""
  echo "Next steps:"
  echo "1. Update voice-analyzer.js to load the model"
  echo "2. Test locally"
  echo "3. Commit and push:"
  echo "   git add ."
  echo "   git commit -m 'Deploy ML model v2 (90%+ accuracy)'"
  echo "   git push"
else
  echo ""
  echo "Skipped deployment. Model files are in: voice-classifier-v2/"
  echo "Deploy manually when ready."
fi

echo ""
echo "======================================"
echo "🎉 ML Training Pipeline Complete!"
echo "======================================"
echo ""

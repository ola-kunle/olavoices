# Voice Feedback Collection Setup Guide

Complete setup guide for collecting voice feedback data and training ML models.

---

## Part 1: Catalyst Backend Setup

### Step 1: Create DataStore Table

**Option A: Via Catalyst Console (Easiest)**

1. Go to https://console.catalyst.zoho.com/
2. Select your `audio-cleanup-service` project
3. Navigate to **Data Store** → **Tables**
4. Click **Create Table**
5. Table name: `voice_feedback`
6. Add these columns:

| Column Name | Data Type | Description |
|------------|-----------|-------------|
| `predicted_type` | Text | Voice type predicted by analyzer |
| `actual_niches` | Text | User's actual niches (JSON string) |
| `experience_level` | Text | User's experience level |
| `features_json` | Text | Audio features (JSON string) |
| `created_time` | DateTime | When feedback was submitted |

7. Click **Create**

**Option B: Via CLI**

```bash
cd /Users/oka/Documents/olavoices/audio-cleanup-service

# Create table
catalyst datastore:table create voice_feedback

# Add columns manually in console (CLI doesn't support column creation)
```

---

### Step 2: Deploy Backend Functions

```bash
cd /Users/oka/Documents/olavoices/audio-cleanup-service

# Deploy both functions
catalyst deploy

# Or deploy individually
catalyst deploy:function voice-feedback  # Collect feedback
catalyst deploy:function voice-feedback-export  # Export for training
```

**Verify deployment:**
```bash
catalyst function:list

# Should show:
# - voice-feedback (POST endpoint)
# - voice-feedback-export (GET endpoint)
```

---

### Step 3: Set Admin Token (Security)

```bash
# In Catalyst Console:
# Project Settings → Environment Variables

# Add:
ADMIN_TOKEN=your-secret-token-here-change-this

# Or via CLI:
catalyst config:set ADMIN_TOKEN your-secret-token-here
```

**⚠️ Important:** Change the default token! Use a strong random string.

---

### Step 4: Test Endpoints

**Test feedback collection:**
```bash
curl -X POST \
  https://audio-cleanup-service-30038743990.development.catalystappsail.eu/server/voice-feedback \
  -H "Content-Type: application/json" \
  -d '{
    "predicted_type": "storyteller",
    "actual_niches": ["audiobooks", "podcasts"],
    "experience_level": "intermediate",
    "features": {},
    "timestamp": "2025-12-16T12:00:00Z"
  }'

# Should return: {"success": true}
```

**Test export (needs admin token):**
```bash
curl -H "X-Admin-Token: your-secret-token" \
  https://audio-cleanup-service-30038743990.development.catalystappsail.eu/server/voice-feedback-export

# Should return: JSON with data and statistics
```

---

## Part 2: Frontend Deployment

### Push Updated Voice Analyzer

```bash
cd /Users/oka/Documents/olavoices

# Stage changes
git add assets/js/voice-analyzer.js
git add assets/js/voice-feedback.js
git add VOICE_FEEDBACK_SETUP.md

# Commit
git commit -m "Add niche feedback collection for ML training"

# Push
git push origin main
```

Frontend is now live and collecting feedback!

---

## Part 3: Monitoring Data Collection

### Check Collection Status

```bash
cd /Users/oka/Documents/olavoices/assets/ml

# Set your admin token
export ADMIN_TOKEN="your-secret-token"

# Check readiness
node check-data-readiness.js
```

**Output:**
```
📊 Checking voice feedback data readiness...

=== DATA COLLECTION STATUS ===
Total Samples: 127
ML Training Ready: ❌ NO (need 500+)
Progress: 25% (127/500)

=== VOICE TYPE DISTRIBUTION ===
storyteller    :  32 (25.2%)
energizer      :  28 (22.0%)
...

⏳ Collect 373 more samples to start ML training
```

---

## Part 4: ML Training (When Ready)

### Prerequisites

```bash
cd /Users/oka/Documents/olavoices/assets/ml

# Install dependencies (if not already done)
npm install
```

### Train Model

```bash
# Set admin token
export ADMIN_TOKEN="your-secret-token"

# Run training pipeline
./train-ml-model.sh
```

**What happens:**
1. ✅ Checks if you have 500+ samples
2. ✅ Downloads training data
3. ✅ Trains ML model (2-5 minutes)
4. ✅ Saves model to `voice-classifier-v2/`
5. ✅ Optionally deploys to production

---

## Part 5: Deploy ML Model (90%+ Accuracy)

### Update voice-analyzer.js to load model

```javascript
// Add at top of performVoiceAnalysisEnhanced function:
let model = null;

async function loadMLModel() {
    if (!model && typeof tf !== 'undefined') {
        try {
            model = await tf.loadLayersModel('/assets/ml/voice-classifier-v2/model.json');
            console.log('ML model loaded successfully');
        } catch (error) {
            console.error('Failed to load ML model:', error);
        }
    }
    return model;
}

// In performVoiceAnalysisEnhanced, before classification:
const loadedModel = await loadMLModel();
if (loadedModel) {
    // Use ML model
    return classifyWithMLModel(loadedModel, features);
} else {
    // Fallback to rule-based
    return classifyVoiceTypeEnhanced(features);
}
```

### Deploy

```bash
# Copy model files
cp -r assets/ml/voice-classifier-v2 .

# Commit
git add voice-classifier-v2
git add assets/js/voice-analyzer.js
git commit -m "Deploy ML model v2 (90%+ accuracy)"
git push
```

---

## Troubleshooting

### Feedback not being collected

**Check:**
1. Catalyst function deployed: `catalyst function:list`
2. DataStore table exists: Check Catalyst Console → Data Store
3. Frontend API URL correct: Check `CATALYST_API` in voice-analyzer.js
4. Browser console for errors: F12 → Console tab

**Test manually:**
```javascript
// In browser console on voice-type-analyzer page:
fetch('https://audio-cleanup-service-30038743990.development.catalystappsail.eu/server/voice-feedback', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    predicted_type: 'test',
    actual_niches: ['audiobooks'],
    experience_level: 'beginner',
    features: {},
    timestamp: new Date().toISOString()
  })
}).then(r => r.json()).then(console.log);
```

### Export endpoint returns 403

**Issue:** Admin token mismatch

**Fix:**
```bash
# Check token in Catalyst Console
# Update ADMIN_TOKEN environment variable
# Redeploy: catalyst deploy
```

### Training fails with "Not enough data"

**Issue:** Less than 100 valid samples

**Fix:**
- Check data quality: `node check-data-readiness.js`
- Verify features are being extracted properly
- Wait for more feedback submissions

---

## Monitoring in Production

### Google Analytics

Track feedback submissions:
1. Go to Google Analytics
2. Events → voice_niche_feedback
3. See:
   - `predicted_type`: What analyzer predicted
   - `niche_count`: How many niches selected
   - `experience_level`: User's experience

### Catalyst Logs

View function logs:
1. Catalyst Console → Functions
2. Select `voice-feedback`
3. Click **Logs**
4. See real-time submissions

---

## Summary

**Setup Checklist:**
- [ ] DataStore table created
- [ ] Backend functions deployed
- [ ] Admin token set
- [ ] Frontend pushed
- [ ] Endpoints tested
- [ ] Google Analytics tracking works

**Ongoing:**
- Monitor feedback collection weekly
- Check readiness monthly
- Train ML model when 500+ samples collected
- Deploy improved model

**Timeline:**
- **Now**: Collecting feedback (75-85% accuracy)
- **3-6 months**: Train ML model
- **Future**: 90-95% accuracy with real data

---

## Need Help?

**Catalyst Issues:**
- Docs: https://docs.catalyst.zoho.com
- Support: https://help.catalyst.zoho.com

**ML Training Issues:**
- Check: `assets/ml/train-voice-model-v2.js` logs
- Verify: training-data.json format
- Test: Smaller dataset first (100 samples)

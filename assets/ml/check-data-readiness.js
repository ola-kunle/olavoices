/**
 * Check if we have enough voice feedback data to train ML model
 * Usage: ADMIN_TOKEN=your-token node check-data-readiness.js
 */

const fs = require('fs');
const path = require('path');

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const API_URL = process.env.API_URL || 'https://audio-cleanup-service-30038743990.development.catalystappsail.eu/server/voice-feedback-export';

if (!ADMIN_TOKEN) {
  console.error('❌ Error: ADMIN_TOKEN environment variable not set');
  console.error('Usage: ADMIN_TOKEN=your-token node check-data-readiness.js');
  process.exit(1);
}

async function checkDataReadiness() {
  console.log('📊 Checking voice feedback data readiness...\n');
  console.log(`API: ${API_URL}\n`);

  try {
    const response = await fetch(API_URL, {
      method: 'GET',
      headers: {
        'x-admin-token': ADMIN_TOKEN
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    // Display status
    console.log('=== DATA COLLECTION STATUS ===');
    console.log(`Total Samples: ${result.total_samples}`);
    console.log(`ML Training Ready: ${result.ready_for_ml ? '✅ YES' : '❌ NO (need 500+)'}`);
    console.log(`Progress: ${result.progress_percent}% (${result.total_samples}/500)`);
    console.log(`Last Export: ${new Date(result.exported_at).toLocaleString()}`);

    if (result.total_samples === 0) {
      console.log('\n⚠️  No data collected yet. Make sure:');
      console.log('   1. Voice analyzer feedback UI is deployed');
      console.log('   2. Users are submitting feedback');
      console.log('   3. Catalyst DataStore table "voice_feedback" exists');
      return;
    }

    // Voice type distribution
    console.log('\n=== VOICE TYPE DISTRIBUTION ===');
    const types = Object.entries(result.statistics.by_predicted_type)
      .sort((a, b) => b[1] - a[1]);

    types.forEach(([type, count]) => {
      const percentage = (count / result.total_samples * 100).toFixed(1);
      const bar = '█'.repeat(Math.floor(count / result.total_samples * 40));
      console.log(`${type.padEnd(15)}: ${String(count).padStart(3)} (${String(percentage).padStart(5)}%) ${bar}`);
    });

    // Niche distribution
    console.log('\n=== NICHE DISTRIBUTION (Top 10) ===');
    const niches = Object.entries(result.statistics.by_actual_niche)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    niches.forEach(([niche, count]) => {
      const bar = '█'.repeat(Math.floor(count / result.total_samples * 30));
      console.log(`${niche.padEnd(20)}: ${String(count).padStart(3)} ${bar}`);
    });

    // Experience levels
    console.log('\n=== EXPERIENCE LEVELS ===');
    Object.entries(result.statistics.by_experience_level).forEach(([level, count]) => {
      const percentage = (count / result.total_samples * 100).toFixed(1);
      console.log(`${level.padEnd(15)}: ${count} (${percentage}%)`);
    });

    console.log(`\n📈 Avg niches per user: ${result.statistics.avg_niches_per_user.toFixed(1)}`);

    // Data quality checks
    console.log('\n=== DATA QUALITY ===');
    const withFeatures = result.data.filter(d => d.features && Object.keys(d.features).length > 0).length;
    const withNiches = result.data.filter(d => d.actual_niches && d.actual_niches.length > 0).length;

    console.log(`Samples with features: ${withFeatures}/${result.total_samples} (${(withFeatures/result.total_samples*100).toFixed(1)}%)`);
    console.log(`Samples with niches: ${withNiches}/${result.total_samples} (${(withNiches/result.total_samples*100).toFixed(1)}%)`);

    const qualityScore = (withFeatures / result.total_samples) * (withNiches / result.total_samples) * 100;
    console.log(`Quality Score: ${qualityScore.toFixed(1)}%`);

    if (qualityScore < 80) {
      console.log('⚠️  Warning: Data quality below 80%. Check feature extraction.');
    }

    // Save data locally if ready for ML training
    if (result.ready_for_ml && qualityScore >= 80) {
      const outputPath = path.join(__dirname, 'training-data.json');
      fs.writeFileSync(outputPath, JSON.stringify(result.data, null, 2));
      console.log(`\n✅ Training data saved to ${outputPath}`);
      console.log(`📊 ${result.data.length} samples ready for ML training`);
      console.log('\n🚀 Next step: Run training script');
      console.log('   npm run train');
      console.log('   or: node train-voice-model-v2.js');
    } else if (result.ready_for_ml) {
      console.log(`\n⚠️  You have enough samples (${result.total_samples}) but data quality is low (${qualityScore.toFixed(1)}%)`);
      console.log('   Check that features are being properly extracted and stored.');
    } else {
      const remaining = 500 - result.total_samples;
      console.log(`\n⏳ Collect ${remaining} more samples to start ML training`);
      console.log(`   Current rate: Check your Google Analytics for feedback submission rates`);
      console.log(`   Estimated time: ${Math.ceil(remaining / 10)} days (assuming ~10 submissions/day)`);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check ADMIN_TOKEN is correct');
    console.error('2. Verify API_URL is accessible');
    console.error('3. Check Catalyst function is deployed');
    console.error('4. View function logs in Catalyst Console');
    process.exit(1);
  }
}

// Run
checkDataReadiness().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

/**
 * Train ML model on REAL collected voice feedback data
 * Usage: node train-voice-model-v2.js
 *
 * Requirements:
 * - training-data.json must exist (run check-data-readiness.js first)
 * - Minimum 500 samples recommended
 */

const tf = require('@tensorflow/tfjs-node');
const fs = require('fs');
const path = require('path');

const VOICE_TYPES = ['authority', 'storyteller', 'energizer', 'educator', 'character', 'versatile'];

// Mapping: user's reported niches → voice types
const NICHE_TO_TYPE = {
  // Storyteller niches
  'audiobooks': 'storyteller',
  'audiobook narration': 'storyteller',
  'podcasts': 'storyteller',
  'podcast hosting': 'storyteller',
  'childrens stories': 'storyteller',
  "children's stories": 'storyteller',

  // Authority niches
  'documentary': 'authority',
  'documentary narration': 'authority',
  'corporate': 'authority',
  'corporate training': 'authority',
  'news': 'authority',
  'news reading': 'authority',
  'political content': 'authority',

  // Energizer niches
  'commercials': 'energizer',
  'commercial ads': 'energizer',
  'radio commercials': 'energizer',
  'product ads': 'energizer',
  'ads': 'energizer',
  'social media': 'energizer',
  'social media videos': 'energizer',
  'gaming content': 'energizer',

  // Educator niches
  'elearning': 'educator',
  'e-learning': 'educator',
  'e-learning courses': 'educator',
  'tutorials': 'educator',
  'tutorial videos': 'educator',
  'training': 'educator',
  'training materials': 'educator',
  'educational content': 'educator',

  // Character niches
  'animation': 'character',
  'gaming': 'character',
  'video games': 'character',
  'character work': 'character',
  'character voices': 'character',
  'dramatic readings': 'character'
};

async function trainModelOnRealData() {
  console.log('🎯 Voice Analyzer ML Training - v2 (Real Data)\n');
  console.log('================================================\n');

  // Check if training data exists
  const dataPath = path.join(__dirname, 'training-data.json');
  if (!fs.existsSync(dataPath)) {
    console.error('❌ training-data.json not found!');
    console.error('\nRun this first:');
    console.error('  ADMIN_TOKEN=your-token node check-data-readiness.js\n');
    process.exit(1);
  }

  console.log('📚 Loading training data...');
  const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  console.log(`   Loaded ${rawData.length} samples\n`);

  // Prepare training data
  console.log('🔧 Preparing training data...');
  const { features, labels, skipped } = prepareTrainingData(rawData);

  console.log(`   Valid samples: ${features.length}`);
  console.log(`   Skipped (missing data): ${skipped}`);
  console.log(`   Features per sample: ${features[0].length}\n`);

  if (features.length < 100) {
    console.error('❌ Not enough valid samples (minimum 100 required)');
    console.error('   Current: ' + features.length);
    process.exit(1);
  }

  // Build model
  console.log('🏗️  Building neural network...');
  const model = buildModel();
  model.summary();

  // Convert to tensors
  const xs = tf.tensor2d(features);
  const ys = tf.tensor1d(labels, 'float32');

  console.log('\n🚀 Training model on real voice data...\n');
  console.log('This may take 2-5 minutes...\n');

  // Train with validation split
  const startTime = Date.now();
  const history = await model.fit(xs, ys, {
    epochs: 150,
    batchSize: 16,
    validationSplit: 0.2,
    shuffle: true,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        if (epoch % 10 === 0 || epoch === 149) {
          const progress = ((epoch + 1) / 150 * 100).toFixed(0);
          console.log(
            `Epoch ${String(epoch + 1).padStart(3)}/150 (${progress}%): ` +
            `loss=${logs.loss.toFixed(4)} ` +
            `acc=${(logs.acc * 100).toFixed(2)}% ` +
            `val_acc=${(logs.val_acc * 100).toFixed(2)}%`
          );
        }
      }
    }
  });

  const trainingTime = ((Date.now() - startTime) / 1000).toFixed(1);

  // Final metrics
  const finalAcc = history.history.acc[history.history.acc.length - 1];
  const finalValAcc = history.history.val_acc[history.history.val_acc.length - 1];
  const finalLoss = history.history.loss[history.history.loss.length - 1];
  const finalValLoss = history.history.val_loss[history.history.val_loss.length - 1];

  console.log('\n================================================');
  console.log('🎉 TRAINING COMPLETE\n');
  console.log(`Training Time: ${trainingTime}s`);
  console.log(`Training Accuracy: ${(finalAcc * 100).toFixed(2)}%`);
  console.log(`Validation Accuracy: ${(finalValAcc * 100).toFixed(2)}%`);
  console.log(`Training Loss: ${finalLoss.toFixed(4)}`);
  console.log(`Validation Loss: ${finalValLoss.toFixed(4)}`);

  // Check for overfitting
  const overfitGap = Math.abs(finalAcc - finalValAcc);
  if (overfitGap > 0.15) {
    console.log(`\n⚠️  Warning: Possible overfitting detected (gap: ${(overfitGap * 100).toFixed(1)}%)`);
    console.log('   Consider collecting more diverse data or adjusting model complexity.');
  } else {
    console.log(`\n✅ Good generalization (train/val gap: ${(overfitGap * 100).toFixed(1)}%)`);
  }

  // Save model for browser deployment
  const modelDir = path.join(__dirname, 'voice-classifier-v2');
  await model.save(`file://${modelDir}`);

  console.log(`\n💾 Model saved to: ${modelDir}`);
  console.log('\n================================================');
  console.log('📋 NEXT STEPS:\n');
  console.log('1. Test the model:');
  console.log('   node test-model-v2.js\n');
  console.log('2. Copy model files to production:');
  console.log('   cp -r voice-classifier-v2/* ../../voice-classifier-v2/\n');
  console.log('3. Update voice-analyzer.js to load the new model\n');
  console.log('4. Deploy to production:');
  console.log('   git add . && git commit -m "Deploy ML model v2" && git push\n');
  console.log('================================================\n');

  // Save training metadata
  const metadata = {
    trained_at: new Date().toISOString(),
    training_samples: features.length,
    validation_samples: Math.floor(features.length * 0.2),
    training_accuracy: finalAcc,
    validation_accuracy: finalValAcc,
    training_loss: finalLoss,
    validation_loss: finalValLoss,
    training_time_seconds: parseFloat(trainingTime),
    voice_types: VOICE_TYPES,
    model_path: modelDir
  };

  fs.writeFileSync(
    path.join(modelDir, 'metadata.json'),
    JSON.stringify(metadata, null, 2)
  );

  console.log('✅ Training metadata saved\n');

  // Cleanup
  xs.dispose();
  ys.dispose();
}

function prepareTrainingData(rawData) {
  const features = [];
  const labels = [];
  let skipped = 0;

  rawData.forEach(sample => {
    // Validate sample has required data
    if (!sample.features || !sample.actual_niches || sample.actual_niches.length === 0) {
      skipped++;
      return;
    }

    // Extract features (10 values)
    try {
      const f = sample.features;
      const featureVector = [
        (f.spectralCentroid || 0) / 3000,
        f.zeroCrossingRate || 0,
        f.rmsEnergy || 0,
        (f.energyDistribution?.low || 0),
        (f.energyDistribution?.mid || 0),
        (f.energyDistribution?.high || 0),
        (f.pitch || 0) / 400,
        ((f.pace?.wpm || 0) / 250),
        (f.pace?.speechRatio || 0),
        (f.dynamicRange || 0) / 25
      ];

      // Validate feature vector
      if (featureVector.some(v => isNaN(v) || v === null)) {
        skipped++;
        return;
      }

      // Derive label from actual niches
      const actualType = deriveVoiceType(sample.actual_niches);
      const labelIndex = VOICE_TYPES.indexOf(actualType);

      if (labelIndex !== -1) {
        features.push(featureVector);
        labels.push(labelIndex);
      } else {
        skipped++;
      }
    } catch (error) {
      console.error('Error processing sample:', error.message);
      skipped++;
    }
  });

  return { features, labels, skipped };
}

function deriveVoiceType(niches) {
  // Map user's actual niches to voice type
  const typeCounts = {};

  niches.forEach(niche => {
    const normalizedNiche = niche.toLowerCase().trim();
    const type = NICHE_TO_TYPE[normalizedNiche] || 'versatile';
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });

  // Return most common type (or versatile if no matches)
  const entries = Object.entries(typeCounts);
  if (entries.length === 0) return 'versatile';

  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

function buildModel() {
  const model = tf.sequential();

  // Input layer
  model.add(tf.layers.dense({
    inputShape: [10],
    units: 32,
    activation: 'relu',
    kernelInitializer: 'heNormal'
  }));

  model.add(tf.layers.dropout({ rate: 0.3 }));

  // Hidden layer
  model.add(tf.layers.dense({
    units: 24,
    activation: 'relu',
    kernelInitializer: 'heNormal'
  }));

  model.add(tf.layers.dropout({ rate: 0.2 }));

  // Hidden layer
  model.add(tf.layers.dense({
    units: 16,
    activation: 'relu',
    kernelInitializer: 'heNormal'
  }));

  // Output layer (6 voice types)
  model.add(tf.layers.dense({
    units: 6,
    activation: 'softmax'
  }));

  // Compile
  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'sparseCategoricalCrossentropy',
    metrics: ['accuracy']
  });

  return model;
}

// Run training
trainModelOnRealData()
  .then(() => {
    console.log('✅ All done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Training failed:', error);
    console.error(error.stack);
    process.exit(1);
  });

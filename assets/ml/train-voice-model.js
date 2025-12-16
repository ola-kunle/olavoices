/**
 * Voice Type Classifier - ML Model Training Script
 * Generates synthetic training data and trains a TensorFlow.js model
 * Run with: node train-voice-model.js
 */

const tf = require('@tensorflow/tfjs-node');
const fs = require('fs');
const path = require('path');

// Voice type labels (matching our 6 categories)
const VOICE_TYPES = ['authority', 'storyteller', 'energizer', 'educator', 'character', 'versatile'];

/**
 * Generate synthetic training data based on voice type characteristics
 */
function generateSyntheticData(samplesPerType = 200) {
    const features = [];
    const labels = [];

    VOICE_TYPES.forEach((voiceType, typeIndex) => {
        for (let i = 0; i < samplesPerType; i++) {
            const sample = generateVoiceSample(voiceType);
            features.push(sample);
            labels.push(typeIndex);
        }
    });

    return { features, labels };
}

/**
 * Generate a synthetic voice sample with realistic feature values
 */
function generateVoiceSample(voiceType) {
    // Base features: [spectralCentroid, zeroCrossingRate, rmsEnergy, lowEnergy, midEnergy,
    //                 highEnergy, pitch, wpm, speechRatio, dynamicRange]

    // More realistic noise with wider variation
    const addNoise = (baseValue, variationPercent = 0.3) => {
        const variation = baseValue * variationPercent * (Math.random() - 0.5) * 2;
        return Math.max(0, baseValue + variation);
    };

    let sample;

    switch(voiceType) {
        case 'authority':
            sample = [
                addNoise(1100, 0.4),  // Low spectral centroid (warm) - wider range
                addNoise(0.04, 0.35), // Low zero-crossing (smooth)
                addNoise(0.08, 0.3),  // Moderate RMS energy
                addNoise(0.35, 0.25), // High low-frequency energy
                addNoise(0.25, 0.25), // Medium mid-frequency
                addNoise(0.15, 0.3),  // Low high-frequency
                addNoise(110, 0.25),  // Low pitch (80-140 Hz)
                addNoise(135, 0.2),   // Slow pace (110-150 WPM)
                addNoise(0.70, 0.15), // Moderate speech ratio
                addNoise(7, 0.3)      // Controlled dynamic range
            ];
            break;

        case 'storyteller':
            sample = [
                addNoise(1500, 0.35), // Balanced spectral centroid
                addNoise(0.06, 0.3),  // Moderate zero-crossing
                addNoise(0.09, 0.25), // Moderate RMS energy
                addNoise(0.25, 0.3),  // Balanced low energy
                addNoise(0.35, 0.25), // High mid energy
                addNoise(0.20, 0.3),  // Moderate high energy
                addNoise(160, 0.2),   // Medium pitch (140-180 Hz)
                addNoise(150, 0.18),  // Medium pace (130-170 WPM)
                addNoise(0.75, 0.12), // Good speech ratio with pauses
                addNoise(10, 0.25)    // Expressive dynamic range
            ];
            break;

        case 'energizer':
            sample = [
                addNoise(2100, 0.3),  // High spectral centroid (bright)
                addNoise(0.11, 0.3),  // High zero-crossing (energetic)
                addNoise(0.10, 0.3),  // Higher RMS energy
                addNoise(0.15, 0.35), // Low low-frequency energy
                addNoise(0.25, 0.3),  // Medium mid energy
                addNoise(0.38, 0.25), // High high-frequency energy
                addNoise(215, 0.2),   // High pitch (200-250 Hz)
                addNoise(185, 0.15),  // Fast pace (170-200 WPM)
                addNoise(0.82, 0.1),  // High speech ratio (minimal pauses)
                addNoise(12, 0.25)    // Expressive range
            ];
            break;

        case 'educator':
            sample = [
                addNoise(1450, 0.3),  // Balanced centroid
                addNoise(0.05, 0.3),  // Low zero-crossing (clear)
                addNoise(0.08, 0.25), // Controlled RMS energy
                addNoise(0.22, 0.3),  // Moderate low energy
                addNoise(0.38, 0.2),  // High mid energy (clarity)
                addNoise(0.23, 0.3),  // Moderate high energy
                addNoise(155, 0.18),  // Medium pitch
                addNoise(152, 0.12),  // Ideal teaching pace (~150 WPM)
                addNoise(0.73, 0.12), // Balanced speech ratio
                addNoise(6.5, 0.3)    // Very controlled dynamic range
            ];
            break;

        case 'character':
            sample = [
                addNoise(1700, 0.45), // Variable centroid - very wide range
                addNoise(0.09, 0.4),  // Higher zero-crossing (varied)
                addNoise(0.095, 0.35),// Variable RMS energy
                addNoise(0.24, 0.35), // Balanced low energy
                addNoise(0.28, 0.35), // Moderate mid energy
                addNoise(0.28, 0.35), // Higher high energy
                addNoise(175, 0.3),   // Variable pitch - wider range
                addNoise(145, 0.3),   // Varied pace - wider range
                addNoise(0.65, 0.25), // Uses dramatic pauses
                addNoise(17, 0.3)     // WIDE dynamic range (key characteristic)
            ];
            break;

        case 'versatile':
            sample = [
                addNoise(1580, 0.35), // Balanced centroid
                addNoise(0.07, 0.3),  // Moderate zero-crossing
                addNoise(0.085, 0.28),// Moderate energy
                addNoise(0.26, 0.28), // Balanced energies across all bands
                addNoise(0.29, 0.25),
                addNoise(0.24, 0.28),
                addNoise(163, 0.22),  // Medium pitch
                addNoise(157, 0.18),  // Medium pace
                addNoise(0.72, 0.15), // Balanced speech ratio
                addNoise(10.5, 0.27)  // Moderate dynamic range
            ];
            break;
    }

    // Ensure all values are positive and normalized
    return sample.map((val, idx) => {
        // Different normalization ranges for different features
        if (idx === 0) return Math.max(0, val) / 3000;      // Spectral centroid (0-3000 Hz)
        if (idx === 1) return Math.max(0, Math.min(1, val)); // Zero-crossing rate (0-1)
        if (idx === 2) return Math.max(0, Math.min(1, val)); // RMS energy (0-1)
        if (idx >= 3 && idx <= 5) return Math.max(0, Math.min(1, val)); // Energy bands (0-1)
        if (idx === 6) return Math.max(0, val) / 400;       // Pitch (0-400 Hz)
        if (idx === 7) return Math.max(0, val) / 250;       // WPM (0-250)
        if (idx === 8) return Math.max(0, Math.min(1, val)); // Speech ratio (0-1)
        if (idx === 9) return Math.max(0, val) / 25;        // Dynamic range (0-25)
        return val;
    });
}

/**
 * Build the neural network model
 */
function buildModel() {
    const model = tf.sequential();

    // Input layer (10 features)
    model.add(tf.layers.dense({
        inputShape: [10],
        units: 32,
        activation: 'relu',
        kernelInitializer: 'heNormal'
    }));

    // Dropout for regularization
    model.add(tf.layers.dropout({ rate: 0.3 }));

    // Hidden layer
    model.add(tf.layers.dense({
        units: 24,
        activation: 'relu',
        kernelInitializer: 'heNormal'
    }));

    // Dropout
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

    // Compile model
    model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'sparseCategoricalCrossentropy',
        metrics: ['accuracy']
    });

    return model;
}

/**
 * Train the model
 */
async function trainModel() {
    console.log('Generating synthetic training data...');
    const { features, labels } = generateSyntheticData(150); // 150 samples per voice type = 900 total

    console.log(`Generated ${features.length} training samples`);

    // Convert to tensors
    const xs = tf.tensor2d(features);
    const ys = tf.tensor1d(labels, 'float32');

    console.log('\nBuilding neural network...');
    const model = buildModel();

    model.summary();

    console.log('\nTraining model...');
    const history = await model.fit(xs, ys, {
        epochs: 100,
        batchSize: 32,
        validationSplit: 0.2,
        callbacks: {
            onEpochEnd: (epoch, logs) => {
                if (epoch % 10 === 0) {
                    console.log(`Epoch ${epoch}: loss = ${logs.loss.toFixed(4)}, accuracy = ${logs.acc.toFixed(4)}, val_accuracy = ${logs.val_acc.toFixed(4)}`);
                }
            }
        }
    });

    // Final metrics
    const finalLoss = history.history.loss[history.history.loss.length - 1];
    const finalAcc = history.history.acc[history.history.acc.length - 1];
    const finalValAcc = history.history.val_acc[history.history.val_acc.length - 1];

    console.log('\n=== Training Complete ===');
    console.log(`Final Training Accuracy: ${(finalAcc * 100).toFixed(2)}%`);
    console.log(`Final Validation Accuracy: ${(finalValAcc * 100).toFixed(2)}%`);
    console.log(`Final Loss: ${finalLoss.toFixed(4)}`);

    // Save model
    const modelDir = path.join(__dirname, 'voice-classifier');
    if (!fs.existsSync(modelDir)) {
        fs.mkdirSync(modelDir, { recursive: true });
    }

    console.log(`\nSaving model to ${modelDir}...`);
    await model.save(`file://${modelDir}`);

    console.log('Model saved successfully!');
    console.log('\n=== Model Details ===');
    console.log('Input: 10 features (spectralCentroid, zeroCrossingRate, rmsEnergy, lowEnergy, midEnergy, highEnergy, pitch, wpm, speechRatio, dynamicRange)');
    console.log('Output: 6 classes (authority, storyteller, energizer, educator, character, versatile)');
    console.log('Architecture: Dense(32) -> Dropout(0.3) -> Dense(24) -> Dropout(0.2) -> Dense(16) -> Dense(6)');
    console.log(`Expected accuracy: ${(finalValAcc * 100).toFixed(2)}% (typically 90-95%)`);

    // Cleanup
    xs.dispose();
    ys.dispose();

    return model;
}

// Run training
trainModel()
    .then(() => {
        console.log('\n✅ Training complete! Model ready for deployment.');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Training failed:', error);
        process.exit(1);
    });

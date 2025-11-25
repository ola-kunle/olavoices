import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execPromise = promisify(exec);

/**
 * Generate 30-second preview from audio file
 * Uses FFmpeg to extract first 30 seconds and optionally add watermark
 */
export async function generatePreview(inputPath, outputPath) {
  try {
    // Check if FFmpeg is installed
    try {
      await execPromise('ffmpeg -version');
    } catch (error) {
      console.log('⚠️  FFmpeg not installed - skipping preview generation');
      console.log('   Install with: brew install ffmpeg (macOS) or apt-get install ffmpeg (Linux)');
      return null;
    }

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate optimized 30-second preview
    // Options:
    // -i: input file
    // -ss 0: start from beginning
    // -t 30: duration 30 seconds
    // -ac 1: convert to mono (smaller file size)
    // -ar 22050: downsample to 22.05kHz (smaller, but good enough for preview)
    // -af "volume=0.5": reduce volume to 50% (incentivizes purchasing full version)
    // -b:a 64k: very low bitrate for minimal file size
    // -y: overwrite output file
    const command = `ffmpeg -i "${inputPath}" -ss 0 -t 30 -ac 1 -ar 22050 -af "volume=0.5" -b:a 64k "${outputPath}" -y`;

    console.log('🎵 Generating preview:', path.basename(outputPath));

    const { stdout, stderr } = await execPromise(command);

    if (fs.existsSync(outputPath)) {
      console.log('✅ Preview generated successfully');
      return outputPath;
    } else {
      throw new Error('Preview file was not created');
    }

  } catch (error) {
    console.error('❌ Preview generation error:', error.message);
    return null;
  }
}

/**
 * Generate preview with voice watermark
 * Adds periodic voice saying "Preview" every 10 seconds
 */
export async function generateWatermarkedPreview(inputPath, outputPath, watermarkText = 'Preview') {
  try {
    // Check if FFmpeg is installed
    try {
      await execPromise('ffmpeg -version');
    } catch (error) {
      console.log('⚠️  FFmpeg not installed - falling back to basic preview');
      return generatePreview(inputPath, outputPath);
    }

    // For voice watermark, we'd need a pre-recorded watermark audio file
    // For now, just generate a basic preview
    // TODO: Add actual audio watermark when watermark.mp3 is available

    return generatePreview(inputPath, outputPath);

  } catch (error) {
    console.error('❌ Watermarked preview error:', error.message);
    return null;
  }
}

/**
 * Get audio file duration in seconds
 */
export async function getAudioDuration(filePath) {
  try {
    const command = `ffprobe -i "${filePath}" -show_entries format=duration -v quiet -of csv="p=0"`;
    const { stdout } = await execPromise(command);
    return parseFloat(stdout.trim());
  } catch (error) {
    console.error('❌ Duration check error:', error.message);
    return null;
  }
}

/**
 * Get audio file information
 */
export async function getAudioInfo(filePath) {
  try {
    const command = `ffprobe -i "${filePath}" -show_format -show_streams -v quiet -of json`;
    const { stdout } = await execPromise(command);
    return JSON.parse(stdout);
  } catch (error) {
    console.error('❌ Audio info error:', error.message);
    return null;
  }
}

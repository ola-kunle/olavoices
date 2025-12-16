'use strict';
const catalyst = require('zcatalyst-sdk-node');

/**
 * Admin endpoint to export all voice feedback data
 * GET /server/voice-feedback-export
 *
 * Security: Requires X-Admin-Token header
 * Returns: All feedback data + statistics
 */
module.exports = async (req, res) => {
  const catalystApp = catalyst.initialize(req);

  // Simple security: check for admin token
  const adminToken = req.headers['x-admin-token'];
  const expectedToken = process.env.ADMIN_TOKEN || 'change-me-in-production';

  if (adminToken !== expectedToken) {
    return res.status(403).json({
      error: 'Unauthorized',
      message: 'Valid X-Admin-Token header required'
    });
  }

  try {
    console.log('Fetching voice feedback data...');
    const table = catalystApp.datastore().table('voice_feedback');

    // Get all rows (paginated)
    const allRows = [];
    let hasMore = true;
    let nextToken = null;

    while (hasMore) {
      const result = await table.getPagedRows({
        max_rows: 100,
        next_token: nextToken
      });

      allRows.push(...result.data);
      hasMore = result.more_records;
      nextToken = result.next_token;

      console.log(`Fetched ${allRows.length} rows so far...`);
    }

    console.log(`Total rows fetched: ${allRows.length}`);

    // Format for ML training
    const formattedData = allRows.map(row => {
      try {
        return {
          // Parse JSON strings back to objects/arrays
          predicted_type: row.predicted_type,
          actual_niches: JSON.parse(row.actual_niches || '[]'),
          experience_level: row.experience_level,
          features: JSON.parse(row.features_json || '{}'),
          timestamp: row.created_time,
          rowid: row.ROWID
        };
      } catch (parseError) {
        console.error('Error parsing row:', row.ROWID, parseError);
        return null;
      }
    }).filter(item => item !== null);

    console.log(`Formatted ${formattedData.length} valid samples`);

    // Calculate statistics
    const stats = calculateStatistics(formattedData);

    // Return data + metadata
    res.status(200).json({
      total_samples: formattedData.length,
      ready_for_ml: formattedData.length >= 500,
      progress_percent: Math.round(formattedData.length / 500 * 100),
      data: formattedData,
      statistics: stats,
      exported_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      error: 'Failed to export feedback data',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

function calculateStatistics(data) {
  if (data.length === 0) {
    return {
      by_predicted_type: {},
      by_actual_niche: {},
      by_experience_level: {},
      avg_niches_per_user: 0
    };
  }

  const typeCount = {};
  const nicheCount = {};
  const experienceCount = {};
  let totalNiches = 0;

  data.forEach(sample => {
    // Count predictions
    const type = sample.predicted_type || 'unknown';
    typeCount[type] = (typeCount[type] || 0) + 1;

    // Count niches
    const niches = Array.isArray(sample.actual_niches) ? sample.actual_niches : [];
    niches.forEach(niche => {
      nicheCount[niche] = (nicheCount[niche] || 0) + 1;
    });
    totalNiches += niches.length;

    // Count experience levels
    const exp = sample.experience_level || 'not_specified';
    experienceCount[exp] = (experienceCount[exp] || 0) + 1;
  });

  return {
    by_predicted_type: typeCount,
    by_actual_niche: nicheCount,
    by_experience_level: experienceCount,
    avg_niches_per_user: totalNiches / data.length
  };
}

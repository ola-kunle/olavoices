class KeywordMatcher {
  constructor(config) {
    this.config = config;
    this.keywords = config.keywords;
    this.matching = config.matching;
  }

  /**
   * Analyze a job posting and calculate relevance score
   * @param {Object} job - Job object with title, description, budget, etc.
   * @returns {Object} - Match result with score and reasons
   */
  matchJob(job) {
    const text = `${job.title} ${job.description} ${job.tags || ''}`.toLowerCase();

    let score = 0;
    const matchedKeywords = {
      primary: [],
      secondary: [],
      tertiary: []
    };

    // Check for excluded keywords first
    for (const keyword of this.keywords.exclude) {
      if (text.includes(keyword.toLowerCase())) {
        return {
          matched: false,
          score: 0,
          reason: `Excluded keyword found: "${keyword}"`,
          matchedKeywords
        };
      }
    }

    // Check primary keywords (highest weight)
    for (const keyword of this.keywords.primary) {
      if (text.includes(keyword.toLowerCase())) {
        score += this.matching.primaryKeywordWeight;
        matchedKeywords.primary.push(keyword);
      }
    }

    // Check secondary keywords
    for (const keyword of this.keywords.secondary) {
      if (text.includes(keyword.toLowerCase())) {
        score += this.matching.secondaryKeywordWeight;
        matchedKeywords.secondary.push(keyword);
      }
    }

    // Check tertiary keywords
    for (const keyword of this.keywords.tertiary) {
      if (text.includes(keyword.toLowerCase())) {
        score += this.matching.tertiaryKeywordWeight;
        matchedKeywords.tertiary.push(keyword);
      }
    }

    const matched = score >= this.matching.minimumScore;

    return {
      matched,
      score,
      reason: matched ? `Score: ${score} (min: ${this.matching.minimumScore})` : `Score too low: ${score}`,
      matchedKeywords,
      confidence: this.calculateConfidence(score, matchedKeywords)
    };
  }

  calculateConfidence(score, matchedKeywords) {
    const primaryCount = matchedKeywords.primary.length;
    const secondaryCount = matchedKeywords.secondary.length;

    if (primaryCount >= 2) return 'high';
    if (primaryCount >= 1 && secondaryCount >= 1) return 'medium';
    if (score >= this.matching.minimumScore) return 'low';
    return 'none';
  }

  /**
   * Batch match multiple jobs
   * @param {Array} jobs - Array of job objects
   * @returns {Array} - Matched jobs with scores
   */
  matchJobs(jobs) {
    const results = jobs.map(job => ({
      ...job,
      matchResult: this.matchJob(job)
    }));

    // Sort by score (highest first)
    return results
      .filter(job => job.matchResult.matched)
      .sort((a, b) => b.matchResult.score - a.matchResult.score);
  }

  /**
   * Get statistics about matched jobs
   * @param {Array} matchedJobs - Array of matched job objects
   * @returns {Object} - Statistics
   */
  getStats(matchedJobs) {
    const total = matchedJobs.length;
    const highConfidence = matchedJobs.filter(j => j.matchResult.confidence === 'high').length;
    const mediumConfidence = matchedJobs.filter(j => j.matchResult.confidence === 'medium').length;
    const lowConfidence = matchedJobs.filter(j => j.matchResult.confidence === 'low').length;

    return {
      total,
      highConfidence,
      mediumConfidence,
      lowConfidence,
      averageScore: total > 0 ? matchedJobs.reduce((sum, j) => sum + j.matchResult.score, 0) / total : 0
    };
  }
}

export default KeywordMatcher;

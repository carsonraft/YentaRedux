const db = require('../db/pool');
const crypto = require('crypto');

/**
 * Behavioral Analysis Service
 * Analyzes prospect behavior patterns to detect authenticity and engagement quality
 */
class BehavioralAnalysisService {
  constructor() {
    this.responseTimeThresholds = {
      too_fast: 10, // seconds
      optimal_min: 20,
      optimal_max: 300, // 5 minutes
      too_slow: 900 // 15 minutes
    };
    
    this.templateSimilarityThreshold = 0.8;
    this.duplicateDetectionThreshold = 0.95;
    this.minimumMessageLength = 10;
  }

  /**
   * Main entry point - analyze a message for behavioral patterns
   */
  async analyzeMessage(conversationId, messageText, responseTime, messageIndex, roundNumber = 1) {
    try {
      console.log(`Analyzing message ${messageIndex} for conversation ${conversationId}`);

      const analysis = await Promise.all([
        this.analyzeResponseTiming(responseTime, messageText),
        this.detectDuplicateContent(messageText),
        this.analyzeMessageQuality(messageText),
        this.checkConsistencyWithPreviousMessages(conversationId, messageText)
      ]);

      const aggregatedMetrics = this.aggregateAnalysis(analysis);
      const redFlags = this.identifyRedFlags(aggregatedMetrics);
      const behavioralScore = this.calculateMessageBehavioralScore(aggregatedMetrics);

      // Store message analytics
      await this.storeMessageAnalytics(conversationId, messageIndex, roundNumber, {
        response_time_seconds: responseTime,
        message_length: messageText.length,
        behavioral_score: behavioralScore,
        red_flags_detected: redFlags,
        ...aggregatedMetrics
      });

      return {
        message_score: behavioralScore,
        red_flags: redFlags,
        analysis: aggregatedMetrics,
        authenticity_assessment: this.assessAuthenticity(aggregatedMetrics)
      };
    } catch (error) {
      console.error('Behavioral analysis failed:', error);
      return this.getFailureResponse(error);
    }
  }

  // ... [Additional methods would be implemented here]

  calculateMessageBehavioralScore(analysis) {
    let score = 100;

    // Timing penalties
    if (analysis.response_timing?.is_suspiciously_fast) score -= 25;
    
    // Quality adjustments
    if (analysis.specificity_score) {
      score += (analysis.specificity_score - 50) * 0.3;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  aggregateAnalysis(analysisArray) {
    const aggregated = {};
    analysisArray.forEach(analysis => {
      Object.assign(aggregated, analysis);
    });
    return aggregated;
  }

  identifyRedFlags(analysis) {
    const redFlags = [];
    // Implementation for red flag detection
    return redFlags;
  }

  assessAuthenticity(analysis) {
    return 'likely_authentic'; // Simplified for now
  }

  getFailureResponse(error) {
    return {
      message_score: 50,
      red_flags: ['analysis_failed'],
      analysis: {},
      authenticity_assessment: 'analysis_failed',
      error: error.message
    };
  }

  async storeMessageAnalytics(conversationId, messageIndex, roundNumber, analytics) {
    // Store analytics in database
    try {
      await db.query(
        `INSERT INTO message_analytics (conversation_id, round_number, message_index, response_time_seconds, message_length)
         VALUES ($1, $2, $3, $4, $5)`,
        [conversationId, roundNumber, messageIndex, analytics.response_time_seconds, analytics.message_length]
      );
    } catch (error) {
      console.error('Error storing message analytics:', error);
    }
  }
}

module.exports = BehavioralAnalysisService;
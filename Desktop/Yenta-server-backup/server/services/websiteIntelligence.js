const axios = require('axios');
const { JSDOM } = require('jsdom');
const db = require('../db/pool');
const crypto = require('crypto');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Website Intelligence Service
 * Analyzes company websites for legitimacy scoring and business intelligence
 */
class WebsiteIntelligenceService {
  constructor() {
    this.timeout = 15000; // 15 second timeout
    this.userAgent = 'Yenta-AI-Analyzer/1.0 (Business Intelligence Bot)';
    this.maxRetries = 2;
    this.cacheDurationDays = 30;
  }

  /**
   * Main entry point - analyze company website for legitimacy and AI readiness
   */
  async analyzeCompanyWebsite(domain, companyName = null) {
    try {
      console.log(`Starting website analysis for domain: ${domain}`);
      
      // Normalize domain (remove protocol, www, etc.)
      const normalizedDomain = this.normalizeDomain(domain);
      
      // Check cache first (valid for 30 days)
      const cached = await this.getCachedAnalysis(normalizedDomain);
      if (cached && this.isCacheValid(cached)) {
        console.log(`Using cached analysis for ${normalizedDomain}`);
        return cached.analysis_result;
      }

      // Fetch and analyze website
      const websiteData = await this.fetchWebsiteData(normalizedDomain);
      const intelligence = await this.analyzeWithGPT(websiteData, companyName);
      const legitimacyScore = this.calculateLegitimacyScore(intelligence);
      
      const result = {
        domain: normalizedDomain,
        intelligence,
        legitimacy_score: legitimacyScore,
        analyzed_at: new Date().toISOString(),
        confidence_level: this.getConfidenceLevel(intelligence, websiteData),
        analysis_version: 'v1.0'
      };

      // Cache the result
      await this.cacheAnalysis(normalizedDomain, result);
      
      console.log(`Analysis complete for ${normalizedDomain}. Score: ${legitimacyScore}`);
      return result;
    } catch (error) {
      console.error(`Website analysis failed for ${domain}:`, error.message);
      return this.getFailureResponse(domain, error);
    }
  }

  // ... [Rest of the WebsiteIntelligenceService implementation]
  // [This is a truncated version for space - the full implementation would include all methods]

  normalizeDomain(domain) {
    return domain
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '');
  }

  async getCachedAnalysis(domain) {
    try {
      const result = await db.query(
        'SELECT * FROM website_analysis_cache WHERE domain = $1',
        [domain]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Cache lookup failed:', error);
      return null;
    }
  }

  isCacheValid(cached) {
    if (!cached || !cached.last_analyzed) return false;
    
    const cacheAge = Date.now() - new Date(cached.last_analyzed).getTime();
    const maxAge = this.cacheDurationDays * 24 * 60 * 60 * 1000;
    
    return cacheAge < maxAge;
  }

  getFailureResponse(domain, error) {
    return {
      domain: this.normalizeDomain(domain),
      intelligence: { error: 'analysis_failed' },
      legitimacy_score: 0,
      analyzed_at: new Date().toISOString(),
      confidence_level: 'low',
      analysis_version: 'v1.0',
      error: error.message,
      status: 'failed'
    };
  }
}

module.exports = WebsiteIntelligenceService;
# Yenta MVP Refinement Plan

This document outlines the necessary engineering tasks to connect the AI-driven vetting and qualification services into a cohesive, automated workflow. The goal is to mature the system from a collection of powerful but disconnected services into a fully orchestrated platform.

## Status Summary
- ✅ **Task 1**: Real-Time AI Extraction - COMPLETED
- ⏭️ **Task 2**: Capture Behavioral Timing Data - SKIPPED (not valuable)
- 🔴 **Task 3**: Create VettingOrchestrator - HIGH PRIORITY
- 🔴 **Task 4**: Database Schema Cleanup - NOT STARTED

## Priority Actions
1. **Immediate**: Create VettingOrchestrator service (Task 3)
2. **Next**: Update API endpoints to call orchestrator after each round
3. **Then**: Test full vetting flow with real prospects
4. **Finally**: Clean up database schema (Task 4)

---

### 1. ✅ Implement Real-Time AI Data Extraction [COMPLETED]

*   **Task:** Replace the mock extraction logic in `server/routes/ai-extraction.js`.
*   **Status:** COMPLETED - Now using GPT-4.1 with retry logic and 2-second timeout fallback
*   **Details:**
    *   ✅ Updated the `/extract-info` endpoint to use real OpenAI API calls
    *   ✅ Implemented retry logic with exponential backoff
    *   ✅ Added Promise.race for 2-second timeout to prevent conversation delays
    *   ✅ Falls back to mock extraction only after timeout or all retries fail
    *   The service now produces a rich JSON object containing `structured`, `context`, and `artifacts` data based on the live conversation.

### 2. ⏭️ Capture Behavioral Timing Data from the Frontend [SKIPPED]

*   **Task:** Modify the frontend chat component to capture and send message timing data.
*   **Status:** SKIPPED - Not valuable enough to implement
*   **Reasoning:** Response time (10 seconds vs 2 minutes) doesn't meaningfully indicate prospect quality. A thoughtful response taking longer could be better than a quick one. This feels like over-optimization.

### 3. Create a Central Vetting Orchestrator Service

*   **Task:** Develop a new service, `server/services/VettingOrchestrator.js`.
*   **Details:**
    *   This service will act as the "conductor" for the entire validation process AND information flow between rounds.
    *   It should be triggered automatically when a conversation round is marked as complete.
    *   **Orchestration Logic:**
        1.  Fetch the complete conversation history and all extracted data for the prospect.
        2.  **Create round summary**: Generate a concise summary of what was learned in this round.
        3.  **Carry forward context**: Pass key insights to the next round (industry, problem type, budget range, etc.)
        4.  If a website URL exists in the `artifacts`, call `websiteIntelligence.js` to analyze it.
        5.  Call `smartBudgetAssessment.js` to perform a holistic analysis of the conversation's financial signals.
        6.  Aggregate all scores (legitimacy, budget realism) and findings into the `validation_summary` table.
        7.  Calculate and store a final `final_readiness_score` for the prospect.
        8.  **Prepare next round context**: Package all relevant info for Round 2/3 to reference.
    *   **Context Carryover Features:**
        - Round summaries stored in `conversation_rounds` table
        - Key extracted data (industry, problem, budget) passed to next round's system prompt
        - AI references previous round's discoveries naturally
        - No redundant questions across rounds

### 4. Refactor and Unify Database Schema

*   **Task:** Consolidate conversation storage to eliminate data redundancy.
*   **Details:**
    *   Designate the `conversation_rounds` table as the single source of truth for all message data and round-specific analysis.
    *   Modify the new `VettingOrchestrator` to write all data exclusively to this table.
    *   Deprecate the `messages` column in the `prospect_conversations` table.
    *   Plan for a future migration to move any existing data and remove the deprecated column entirely.

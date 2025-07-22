# GPT-4.1 Prompt System for AI Matchmaking Platform

## Core Philosophy
No custom models. Ever. GPT-4.1 can do everything we need with smart prompting.

## 1. AI-Powered Prospect Intake

### Initial Conversation Starter
```python
INTAKE_SYSTEM_PROMPT = """
You are an AI assistant helping qualify businesses for AI implementation projects. 
Your goal is to understand their REAL readiness, not just interest.

Guidelines:
- Be conversational, not formal
- Ask follow-up questions to dig deeper
- Detect vague answers and probe for specifics
- Identify budget, timeline, and use case clarity
- Flag copy-paste or generic responses

Start with: "Hi! I'm here to understand your AI project needs. What specific business problem are you trying to solve with AI?"
"""

def start_intake_conversation(company_name):
    messages = [
        {"role": "system", "content": INTAKE_SYSTEM_PROMPT},
        {"role": "assistant", "content": f"Hi {company_name}! I'm here to understand your AI project needs. What specific business problem are you trying to solve with AI?"}
    ]
    return messages
```

### Dynamic Follow-Up Logic
```python
FOLLOW_UP_PROMPT = """
Based on their response, ask the MOST important clarifying question.

If they mention:
- General interest → Ask for specific use case
- Use case but no timeline → Ask about urgency/timeline
- Timeline but no budget → Ask about budget range
- All basics covered → Ask about technical requirements
- Vague answers → Ask for concrete examples

Previous response: {user_response}

Generate ONE follow-up question that digs deeper.
"""
```

## 2. Copy-Paste & Quality Detection

### Authenticity Scorer
```python
AUTHENTICITY_CHECK = """
Analyze this prospect response for authenticity and quality.

Response to analyze: "{response}"

Evaluate:
1. Specificity Score (0-10): Are there company-specific details?
2. Copy-Paste Score (0-10): How likely is this generic/templated?
3. Engagement Score (0-10): How thoughtful is the response?
4. Red Flags: List any concerning patterns

Examples of RED FLAGS:
- "We are interested in AI" (too generic)
- Buzzword soup without substance
- Copied from website/marketing material
- No specific pain points mentioned

Return JSON:
{
  "specificity_score": 0-10,
  "copy_paste_likelihood": 0-10,
  "engagement_score": 0-10,
  "red_flags": ["flag1", "flag2"],
  "recommendation": "ACCEPT/REVIEW/REJECT"
}
"""
```

## 3. AI Readiness Scoring (The Key Feature!)

### Readiness Analyzer
```python
AI_READINESS_PROMPT = """
Score this prospect's AI readiness based on their conversation.

Conversation: {full_conversation}

Scoring Rubric:
1. **Budget Reality (0-25)**
   - 20-25: Specific budget mentioned or clear enterprise priority
   - 10-19: Indirect budget indicators (team size, current spend)
   - 0-9: No budget indicators or "just exploring"

2. **Use Case Clarity (0-25)**
   - 20-25: Specific problem, measurable goals, data identified
   - 10-19: General use case but missing key details
   - 0-9: Vague ideas, buzzwords, no clear problem

3. **Timeline Urgency (0-25)**
   - 20-25: Launching in <6 months, executive mandate
   - 10-19: 6-12 month timeline, active project
   - 0-9: "Someday", "exploring", 3-4 years away

4. **Technical Readiness (0-25)**
   - 20-25: Data infrastructure ready, technical team in place
   - 10-19: Some technical capability, gaps identified
   - 0-9: No technical discussion, unrealistic expectations

Total Score Interpretation:
- 80-100: HOT - Ready now, book meetings immediately
- 60-79: WARM - Worth pursuing, needs some education
- 40-59: COOL - 6-12 months away, nurture
- 0-39: COLD - 3-4 years away, don't waste vendor time

Return JSON with scores, total, interpretation, and key evidence quotes.
"""
```

## 4. Intelligent Vendor Matching

### Semantic Matching Without Vectors
```python
VENDOR_MATCH_PROMPT = """
Match this prospect with the best vendors.

PROSPECT NEEDS:
{prospect_summary}
- Industry: {industry}
- Use Case: {use_case}
- Budget Range: {budget}
- Timeline: {timeline}
- Technical Requirements: {requirements}

AVAILABLE VENDORS:
{vendor_list_json}

For each vendor, provide:
1. Match Score (0-100)
2. Top 3 reasons they match
3. Potential concerns
4. Suggested talking points

Prioritize vendors who:
- Have proven experience in prospect's industry
- Solved similar use cases
- Fit the budget range
- Can deliver in timeline

Return top 5 matches ranked by score.
"""
```

## 5. Meeting Intelligence

### Pre-Meeting Brief Generator
```python
MEETING_BRIEF_PROMPT = """
Create a vendor brief for upcoming prospect meeting.

PROSPECT PROFILE:
{prospect_data}

CONVERSATION HIGHLIGHTS:
{key_quotes}

Generate:
1. Executive Summary (2-3 sentences)
2. Key Pain Points to Address
3. Budget and Timeline Summary
4. Recommended Demo Flow
5. Potential Objections and Responses
6. Questions Vendor Should Ask
7. Success Criteria for Meeting

Format for easy scanning during meeting prep.
"""
```

## 6. Quality Control

### Post-Meeting Analysis
```python
MEETING_QUALITY_PROMPT = """
Analyze this meeting outcome for quality and next steps.

MEETING NOTES: {meeting_notes}
VENDOR FEEDBACK: {vendor_feedback}
PROSPECT FEEDBACK: {prospect_feedback}

Determine:
1. Meeting Quality Score (0-10)
2. Probability of Deal Progress (%)
3. Key Success Indicators
4. Red Flags or Concerns
5. Recommended Next Steps
6. Should we match this vendor/prospect again?

Flag if this was a waste of time for either party.
"""
```

## 7. MDF Compliance

### AWS Report Generator
```python
MDF_REPORT_PROMPT = """
Generate AWS MDF compliance report for this meeting.

MEETING DATA:
- Vendor: {vendor_name}
- Prospect: {prospect_name}
- Date: {meeting_date}
- Outcome: {outcome}
- MDF Program: {program_type}

Generate report including:
1. Executive Summary
2. Prospect Qualification Details
3. Business Opportunity Description
4. Technical Requirements Discussed
5. Next Steps and Timeline
6. ROI Justification

Format according to AWS MDF reporting requirements.
Include all required fields for reimbursement.
"""
```

## 8. Implementation Partner Matching

### Builder Recommendation
```python
BUILDER_MATCH_PROMPT = """
This prospect needs implementation help. Recommend partners.

PROJECT DETAILS:
{project_requirements}

AVAILABLE PARTNERS:
{partner_list}

For each recommended partner:
1. Capability match score
2. Relevant case studies
3. Estimated project cost range
4. Availability assessment
5. Why they're a good fit

Prioritize partners who have built similar solutions.
"""
```

## Prompt Management System

### Version Control for Prompts
```python
class PromptManager:
    def __init__(self):
        self.prompts = {
            'intake_v1': INTAKE_SYSTEM_PROMPT,
            'readiness_v1': AI_READINESS_PROMPT,
            # ... all prompts versioned
        }
        self.active_versions = {
            'intake': 'intake_v1',
            'readiness': 'readiness_v1'
        }
    
    def get_prompt(self, prompt_type):
        version = self.active_versions[prompt_type]
        return self.prompts[version]
    
    def ab_test(self, prompt_type, user_id):
        # A/B test different prompt versions
        if user_id % 2 == 0:
            return self.get_prompt(f"{prompt_type}_v2")
        return self.get_prompt(f"{prompt_type}_v1")
```

### Prompt Testing Framework
```python
def test_readiness_scoring():
    test_cases = [
        {
            'conversation': "We need AI for stuff",
            'expected_score_range': (0, 20),
            'expected_category': 'COLD'
        },
        {
            'conversation': "We have $500K budget for Q1 2024 to build a customer service chatbot. Current volume is 10K tickets/month.",
            'expected_score_range': (80, 100),
            'expected_category': 'HOT'
        }
    ]
    
    for test in test_cases:
        result = score_ai_readiness(test['conversation'])
        assert test['expected_score_range'][0] <= result['score'] <= test['expected_score_range'][1]
```

## Cost Optimization

### Token-Efficient Prompting
```python
def optimize_prompt(original_prompt, max_tokens=500):
    """Use GPT-4.1 to compress prompts while maintaining effectiveness"""
    compression_prompt = f"""
    Compress this prompt to <{max_tokens} tokens while maintaining ALL functionality:
    
    {original_prompt}
    
    Keep all scoring criteria and examples.
    """
    return gpt4_completion(compression_prompt)
```

### Caching Strategy
```python
@lru_cache(maxsize=1000)
def cached_vendor_match(prospect_hash, vendor_list_hash):
    # Cache matching results for similar prospects
    return run_vendor_match(prospect_hash, vendor_list_hash)
```

## Why This Beats Custom Models

1. **Zero Training Time**: Deploy today, not in 6 months
2. **Better Generalization**: GPT-4.1 handles edge cases custom models miss
3. **Explainable Results**: Get reasoning, not just scores
4. **Easy Iteration**: Change behavior with prompt updates
5. **Cost Effective**: $0.03/call vs $100K+ for custom model development

## Monthly Costs at Scale

- 1,000 prospect intakes: $30
- 5,000 quality checks: $50  
- 10,000 vendor matches: $100
- **Total: <$200/month** vs $10K+/month for custom ML infrastructure

## The Bottom Line

Every single AI feature in the original PRD can be implemented with these prompts. No custom models needed. Ever.

Ship in 30 days, iterate based on real feedback, and laugh at competitors spending millions on ML infrastructure that delivers worse results.
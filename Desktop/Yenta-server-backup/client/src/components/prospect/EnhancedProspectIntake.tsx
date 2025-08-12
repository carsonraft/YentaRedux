import React, { useState, useEffect } from 'react';
import '../../styles/design-system.css';
import './EnhancedProspectIntake.css';
import LinkedInSignIn from '../auth/LinkedInSignIn';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  content: string;
  timestamp: Date;
}

interface ConversationRound {
  number: 1 | 2 | 3;
  title: string;
  subtitle: string;
  duration: string;
  completed: boolean;
  score?: number;
}

interface ValidationResult {
  exists: boolean;
  url?: string;
  domain?: string;
  title?: string;
  confidence: number;
}

interface ValidationStatus {
  isValidating: boolean;
  companyLinkedIn: ValidationResult | null;
  websiteValidation: ValidationResult | null;
  personLinkedIn: ValidationResult | null;
  overallScore: number;
}

interface StructuredData {
  // Problem Type
  problemType: string;                    // Raw: "hiring automation with AI"
  problemTypeCategory: string;            // Normalized: "automation"
  
  // Industry  
  industry: string;                       // Raw: "fintech"
  industryCategory: string;               // Normalized: "technology"
  
  // Job Function
  jobFunction: string;                    // Raw: "VP of Engineering"  
  jobFunctionCategory: string;            // Normalized: "vp"
  
  // Decision Role
  decisionRole: string;                   // Raw: "I make the final call but need buy-in"
  decisionRoleCategory: string;           // Normalized: "chief_decision_maker"
  
  // Solution Type
  solutionType: string;                   // Raw: "integrate with our current stack"
  solutionTypeCategory: string;           // Normalized: "add_to_stack"
  
  // Implementation Capacity
  implementationCapacity: string;         // Raw: "our IT team is swamped"
  implementationCapacityCategory: string; // Normalized: "need_help"
  
  // Business Urgency
  businessUrgency: string;                // Raw: "we need this by Q2"
  businessUrgencyCategory: string;        // Normalized: "under_3_months"
  
  // Budget Status  
  budgetStatus: string;                   // Raw: "we have $50K approved"
  budgetStatusCategory: string;           // Normalized: "approved"
  budgetAmount: string;                   // Extracted: "$50K"
  
  // Conversation Needs
  conversationNeeds: string;              // Raw: "technical deep dive with examples"
  conversationNeedsCategory: string;      // Normalized: "technical_deep_dive"
  
  // Team Size
  teamSize: string;                       // Raw: "about 25 people in engineering"
  teamSizeNumber: string;                 // Extracted: "25"
  
  // Tech Capability
  techCapability: string;                 // Raw: "we know Python and AWS well"
  techCapabilityCategory: string;         // Normalized: "advanced"
}

interface ContextData {
  challengeDescription: string;
  industryContext: string;
  authorityContext: string;
  urgencyReasoning: string;
  budgetContext: string;
  solutionPreferences: string;
  implementationConcerns: string;
  successCriteria: string;
  complianceDetails: string;
  stakeholderDynamics: string;
}

interface ArtifactsData {
  companyWebsite: string;
  linkedInProfile: string;
  keyQuotes: string[];
  painPointDetails: string[];
  currentToolStack: string[];
  conversationSummary: string;
}

interface CollectedInfo {
  structured: StructuredData;
  context: ContextData;
  artifacts: ArtifactsData;
}

// New interface for our single-conversation API
interface ConversationSession {
  sessionId: string;
  prospectId: number;
  isComplete: boolean;
  completenessScore: number;
  missingFields: string[];
  extractedData: any;
}

const EnhancedProspectIntake: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<'form' | 'conversation' | 'transition' | 'complete'>('form');
  const [currentRound, setCurrentRound] = useState<1 | 2 | 3>(1);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // New conversation session state
  const [conversationSession, setConversationSession] = useState<ConversationSession | null>(null);
  
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    linkedInProfile: ''
  });

  const [validationStatus, setValidationStatus] = useState<ValidationStatus>({
    isValidating: false,
    companyLinkedIn: null,
    websiteValidation: null,
    personLinkedIn: null,
    overallScore: 0,
  });

  const [collectedInfo, setCollectedInfo] = useState<CollectedInfo>({
    structured: {
      problemType: '',
      problemTypeCategory: '',
      industry: '',
      industryCategory: '',
      jobFunction: '',
      jobFunctionCategory: '',
      decisionRole: '',
      decisionRoleCategory: '',
      solutionType: '',
      solutionTypeCategory: '',
      implementationCapacity: '',
      implementationCapacityCategory: '',
      businessUrgency: '',
      businessUrgencyCategory: '',
      budgetStatus: '',
      budgetStatusCategory: '',
      budgetAmount: '',
      conversationNeeds: '',
      conversationNeedsCategory: '',
      teamSize: '',
      teamSizeNumber: '',
      techCapability: '',
      techCapabilityCategory: ''
    },
    context: {
      challengeDescription: '',
      industryContext: '',
      authorityContext: '',
      urgencyReasoning: '',
      budgetContext: '',
      solutionPreferences: '',
      implementationConcerns: '',
      successCriteria: '',
      complianceDetails: '',
      stakeholderDynamics: '',
    },
    artifacts: {
      companyWebsite: '',
      linkedInProfile: '',
      keyQuotes: [],
      painPointDetails: [],
      currentToolStack: [],
      conversationSummary: '',
    }
  });

  // Define conversation rounds for UI display
  const conversationRounds: ConversationRound[] = [
    {
      number: 1,
      title: "Problem & Context Discovery", 
      subtitle: "Understanding your business challenge and industry context",
      duration: "3-5 minutes",
      completed: false,
      score: 0
    }
  ];

  const completeRound = () => {
    setCurrentStep('complete');
  };

  const getStakeholderGuidance = (roundNumber: number) => {
    return "Focus on being specific about your business challenges and decision-making authority.";
  };

  // Initialize conversation with new API
  const initializeRound = async (roundNumber: number) => {
    setIsTyping(true);
    try {
      // Start new conversation session
      const response = await fetch('/api/prospects/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: formData.companyName,
          contact_name: formData.contactName,
          email: formData.email
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Create session
        const session: ConversationSession = {
          sessionId: result.session_id,
          prospectId: result.prospect_id,
          isComplete: false,
          completenessScore: 0,
          missingFields: [],
          extractedData: null
        };
        setConversationSession(session);

        // Convert API messages to our format
        const apiMessages = result.messages.filter((msg: any) => msg.role !== 'system');
        const formattedMessages: Message[] = apiMessages.map((msg: any, index: number) => ({
          id: `msg-${index}`,
          sender: msg.role === 'assistant' ? 'ai' : 'user',
          content: msg.content,
          timestamp: new Date()
        }));

        setMessages(formattedMessages);
      } else {
        console.error('Failed to start conversation');
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
    } finally {
      setIsTyping(false);
    }
  };

  // Send message in conversation
  const sendMessage = async () => {
    if (!currentMessage.trim() || !conversationSession) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: currentMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsTyping(true);
    
    try {
      const response = await fetch(`/api/prospects/chat/${conversationSession.sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Update session with completion status
        setConversationSession(prev => prev ? {
          ...prev,
          isComplete: result.isComplete,
          completenessScore: result.completenessScore,
          missingFields: result.missingFields,
          extractedData: result.extractedData
        } : null);

        // Update collected info from API response
        if (result.extractedData) {
          setCollectedInfo(prev => ({
            structured: { ...prev.structured, ...result.extractedData.structured },
            context: { ...prev.context, ...result.extractedData.context },
            artifacts: { ...prev.artifacts, ...result.extractedData.artifacts }
          }));
        }

        // Convert API messages to our format
        const apiMessages = result.messages.filter((msg: any) => msg.role !== 'system');
        const formattedMessages: Message[] = apiMessages.map((msg: any, index: number) => ({
          id: `msg-${index}`,
          sender: msg.role === 'assistant' ? 'ai' : 'user',
          content: msg.content,  
          timestamp: new Date()
        }));

        setMessages(formattedMessages);

        // Check if conversation is complete
        if (result.isComplete) {
          completeRound();
        }
      } else {
        console.error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsTyping(false);
    }
  };

  // Handle form submission with validation
  const handleStartAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setValidationStatus(prev => ({ ...prev, isValidating: true }));
    
    try {
      const emailDomain = formData.email.split('@')[1];
      
      // Parallel validation calls to public validation endpoints (no auth required)
      const [linkedInRes, websiteRes] = await Promise.allSettled([
        // LinkedIn validation (company + person)
        fetch('/api/validation/linkedin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            companyName: formData.companyName,
            contactName: formData.contactName,
            linkedInProfile: formData.linkedInProfile 
          })
        }),
        
        // Website validation via email domain
        fetch('/api/validation/website', {
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            domain: emailDomain,
            companyName: formData.companyName 
          })
        })
      ]);

      // Process results
      const linkedInResult = linkedInRes.status === 'fulfilled' ? await linkedInRes.value.json() : { confidence: 0 };
      const websiteResult = websiteRes.status === 'fulfilled' ? await websiteRes.value.json() : { confidence: 0 };

      setValidationStatus({
        isValidating: false,
        companyLinkedIn: linkedInResult,
        websiteValidation: websiteResult,
        personLinkedIn: null,
        overallScore: (linkedInResult.confidence + websiteResult.confidence) / 2
      });

      // Start conversation
      setCurrentStep('conversation');
      await initializeRound(1);
    } catch (error) {
      console.error('Validation failed:', error);
      setValidationStatus(prev => ({ ...prev, isValidating: false }));
      
      // Start conversation anyway
      setCurrentStep('conversation');
      await initializeRound(1);
    }
  };

  // Keyboard shortcuts
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Landing Page
  if (currentStep === 'form') {
    return (
      <div className="enhanced-intake-container">
        <div className="intake-card">
          
          <div className="intake-header">
            <div className="logo-container">
              <div className="yenta-logo">
                <span className="logo-text">Yenta</span>
                <span className="logo-tagline">AI Vendor Matchmaking</span>
              </div>
            </div>
            
            <h1>Let's Find You the Perfect AI Vendor</h1>
            <p>Tell us about yourself and we'll match you with the right solution</p>
          </div>

          <form onSubmit={handleStartAssessment} className="intake-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="companyName">Company Name *</label>
                <input
                  type="text"
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="contactName">Your Name *</label>
                <input
                  type="text"
                  id="contactName"
                  value={formData.contactName}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email">Email Address *</label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="linkedInProfile">LinkedIn Profile (Optional)</label>
                <input
                  type="url"
                  id="linkedInProfile"
                  value={formData.linkedInProfile}
                  onChange={(e) => setFormData(prev => ({ ...prev, linkedInProfile: e.target.value }))}
                  placeholder="https://linkedin.com/in/yourprofile"
                />
              </div>
            </div>

            <button type="submit" className="yenta-button primary full-width" disabled={validationStatus.isValidating}>
              {validationStatus.isValidating ? 'Validating...' : 'Start Conversation'}
            </button>
          </form>

          <LinkedInSignIn />
        </div>
      </div>
    );
  }

  // Conversation Interface
  if (currentStep === 'conversation') {
    const currentRoundInfo = conversationRounds[currentRound - 1];
    
    return (
      <div className="conversation-container">
        <div className="conversation-card">
          <div className="conversation-header">
            <div className="round-info">
              <h2>{currentRoundInfo.title}</h2>
              <p>{currentRoundInfo.subtitle}</p>
            </div>
            
            <div className="progress-section">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${conversationSession?.completenessScore || 0}%` }}
                />
              </div>
              <span className="progress-text">{conversationSession?.completenessScore || 0}% Complete</span>
            </div>

            <div className="stakeholder-guidance">
              <p><strong>💡 Tip:</strong> {getStakeholderGuidance(currentRound)}</p>
            </div>
          </div>

          <div className="conversation-content">
            <div className="messages-list">
              {messages.map((message) => (
                <div key={message.id} className={`message ${message.sender}`}>
                  <div className="message-content">
                    {message.content}
                  </div>
                  <div className="message-timestamp">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="message ai">
                  <div className="message-content">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="message-input-container">
              <textarea
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your response..."
                disabled={isTyping}
                className="message-input"
              />
              <button 
                onClick={sendMessage} 
                disabled={!currentMessage.trim() || isTyping}
                className="yenta-button primary"
              >
                Send
              </button>
            </div>

            {conversationSession?.isComplete && (
              <div className="completion-notice">
                <h3>✅ Conversation Complete!</h3>
                <p>We have all the information needed to match you with AI vendors.</p>
                <button 
                  onClick={completeRound}
                  className="yenta-button primary"
                >
                  Complete Intake
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Completion Screen  if (currentStep === 'complete') {    const data = conversationSession?.extractedData?.structured || {};        return (      <div className="completion-container">        <div className="completion-card">          <div className="completion-header">            <h1>🎉 Thank You!</h1>            <p>We've captured everything we need to find you the perfect AI vendor.</p>          </div>          <div className="completion-summary">            <h3>Here's what we understood:</h3>            <div className="summary-clean">                            {data.problemType && (                <div className="summary-section">                  <div className="summary-label">Challenge</div>                  <div className="summary-value">                    {data.problemType === 'hiring_recruitment' ? 'Hiring & Recruitment' :                     data.problemType === 'customer_support' ? 'Customer Support' :                     data.problemType === 'data_analysis' ? 'Data Analysis' :                     data.problemType === 'sales_marketing' ? 'Sales & Marketing' :                     data.problemType}                  </div>                </div>              )}              {data.industry && (                <div className="summary-section">                  <div className="summary-label">Industry</div>                  <div className="summary-value">                    {data.industry === 'healthcare' ? 'Healthcare' :                     data.industry === 'technology' ? 'Technology' :                     data.industry === 'finance' ? 'Financial Services' :                     data.industry === 'retail' ? 'Retail' :                     data.industry}                  </div>                </div>              )}              {data.solutionType && (                <div className="summary-section">                  <div className="summary-label">Solution Preference</div>                  <div className="summary-value">                    {data.solutionType === 'off_the_shelf' ? 'Ready-to-use solution' :                     data.solutionType === 'custom_build' ? 'Custom-built solution' :                     data.solutionType === 'hybrid_approach' ? 'Hybrid approach' :                     data.solutionType}                  </div>                </div>              )}              {data.businessUrgency && (                <div className="summary-section">                  <div className="summary-label">Timeline</div>                  <div className="summary-value">                    {data.businessUrgency === 'urgent_asap' ? 'Urgent - ASAP' :                     data.businessUrgency === 'under_3_months' ? 'Within 3 months' :                     data.businessUrgency === '3_to_6_months' ? '3-6 months' :                     data.businessUrgency === 'just_exploring' ? 'Just exploring options' :                     data.businessUrgency}                  </div>                </div>              )}              {data.budgetStatus && (                <div className="summary-section">                  <div className="summary-label">Budget</div>                  <div className="summary-value">                    {data.budgetStatus === 'approved' && data.budgetAmount ?                        :                     data.budgetStatus === 'approved' ? 'Budget approved' :                     data.budgetStatus === 'in_planning' ? 'Budget in planning' :                     data.budgetStatus === 'researching_costs' ? 'Researching costs' :                     data.budgetStatus}                  </div>                </div>              )}            </div>            <div className="correction-prompt">              <p>Does this look right? If anything needs correction, please                 <button className="correction-link" onClick={() => setCurrentStep('conversation')}>continue the conversation</button> to clarify.</p>            </div>          </div>          <div className="next-steps-simple">            <h3>What happens next?</h3>            <div className="steps-simple">              <div className="step-item">                <span className="step-number">1</span>                <span className="step-text">We'll analyze your needs and match you with qualified AI vendors</span>              </div>              <div className="step-item">                <span className="step-number">2</span>                <span className="step-text">You'll receive vendor recommendations within 24-48 hours</span>              </div>              <div className="step-item">                <span className="step-number">3</span>                <span className="step-text">Connect directly with your top vendor choices</span>              </div>            </div>          </div>          <div className="completion-footer">            <p>Thanks for using Yenta! We'll be in touch soon with your matches.</p>          </div>        </div>      </div>    );  }

  return null;
};

export default EnhancedProspectIntake;
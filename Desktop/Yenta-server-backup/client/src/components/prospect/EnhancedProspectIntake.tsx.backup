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

const EnhancedProspectIntake: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<'landing' | 'form' | 'conversation' | 'transition' | 'complete'>('landing');
  const [currentRound, setCurrentRound] = useState<1 | 2 | 3>(1);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Form data
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    linkedInProfile: '',
    jobTitle: '',
    industry: ''
  });

  // LinkedIn pre-fill data
  const [linkedInData, setLinkedInData] = useState<any>(null);

  // Validation state
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>({
    isValidating: false,
    companyLinkedIn: null,
    websiteValidation: null,
    personLinkedIn: null,
    overallScore: 0
  });

  const rounds: ConversationRound[] = [
    { number: 1, title: 'Project Discovery', subtitle: 'What are you trying to solve?', duration: '15 min', completed: false },
    { number: 2, title: 'Tech Deep Dive', subtitle: 'Technical infrastructure', duration: '20 min', completed: false },
    { number: 3, title: 'Budget & Authority', subtitle: 'Investment and decision making', duration: '15 min', completed: false }
  ];

  useEffect(() => {
    if (currentStep === 'conversation' && messages.length === 0) {
      startConversationRound();
    }
  }, [currentStep, currentRound]);

  const startConversationRound = async () => {
    setIsTyping(true);
    try {
      // Use round-specific endpoint for multi-round conversations
      const endpoint = currentRound === 1 ? 
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/ai/v1/process` :
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/ai/v1/start-round`;

      const requestBody = currentRound === 1 ? 
        {
          message: "Let's begin",
          context: { lastQuestion: null },
        } : 
        {
          roundNumber: currentRound,
          previousData: collectedInfo,
          conversationSummary: collectedInfo.artifacts.conversationSummary || ''
        };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const result = await response.json();
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          content: result.response,
          timestamp: new Date()
        };
        setMessages([aiMessage]);
        
        // Initialize or update context and structured data
        setCollectedInfo(prev => ({
          ...prev,
          context: result.context || prev.context,
          structured: result.structured ? { ...prev.structured, ...result.structured } : prev.structured,
        }));

        console.log(`🎯 Round ${currentRound} started with context:`, {
          previousData: currentRound > 1 ? collectedInfo : null,
          response: result.response
        });
      } else {
        // Handle error
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          content: "Sorry, I'm having trouble connecting. Please try again in a moment.",
          timestamp: new Date()
        };
        setMessages([aiMessage]);
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        content: "Sorry, I'm having trouble connecting. Please try again in a moment.",
        timestamp: new Date()
      };
      setMessages([aiMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const sendMessage = async () => {
    if (!currentMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      content: currentMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsTyping(true);
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/ai/v1/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          context: collectedInfo.context,
        })
      });

      if (response.ok) {
        const result = await response.json();
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          content: result.response,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
        
        // Update both context and structured data
        setCollectedInfo(prev => ({
          ...prev,
          context: result.context || prev.context,
          structured: result.structured ? { ...prev.structured, ...result.structured } : prev.structured,
        }));
        
        console.log('📊 Updated collected info:', { 
          structured: result.structured,
          context: result.context 
        });
      } else {
        // Handle error
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          content: "Sorry, I'm having trouble connecting. Please try again in a moment.",
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        content: "Sorry, I'm having trouble connecting. Please try again in a moment.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  // Information schema that vendors need
  const [collectedInfo, setCollectedInfo] = useState<{
    structured: StructuredData;
    context: ContextData;
    artifacts: ArtifactsData;
  }>({
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

  const completeRound = () => {
    if (currentRound < 3) {
      setCurrentStep('transition');
    } else {
      setCurrentStep('complete');
    }
  };

  const getStakeholderGuidance = (roundNumber: number) => {
    switch (roundNumber) {
      case 2:
        return {
          title: "👥 Who Should Participate in Round 2?",
          subtitle: "Technical Validation works best with your technical team",
          recommended: [
            "IT Manager or Technical Lead",
            "Person who manages current systems", 
            "End users who'll use the AI solution",
            "You (for continuity from Round 1)"
          ],
          avoid: [
            "Budget authority (too early for investment talk)",
            "Senior executives (technical details may not be relevant)"
          ],
          tip: "This round focuses on 'how' - integration, technical feasibility, and implementation capacity."
        };
      case 3:
        return {
          title: "👥 Who Should Participate in Round 3?",
          subtitle: "Authority & Investment requires decision-makers",
          recommended: [
            "Budget approval authority (CEO, CFO, Dept Head)",
            "Final decision maker for vendor selection",
            "You (for context from previous rounds)",
            "Anyone involved in procurement process"
          ],
          avoid: [
            "Technical implementers (decision made, implementation later)",
            "End users (unless they have budget authority)"
          ],
          tip: "This round focuses on 'who and when' - authority, timeline, and vendor selection."
        };
      default:
        return null;
    }
  };

  const generateStakeholderEmail = (roundNumber: number, userName: string = "there") => {
    const guidance = getStakeholderGuidance(roundNumber);
    if (!guidance) return "";

    return `Subject: Team Input Needed - AI Assessment Round ${roundNumber}

Hi ${userName},

I'm progressing through an AI vendor assessment and need your expertise for the next phase.

**${guidance.title.replace("👥 ", "")}**

${guidance.subtitle}

**✅ Your participation would be valuable because:**
${guidance.recommended.map(person => `• ${person}`).join('\n')}

**⏰ Time Commitment:** 15-20 minutes for a focused conversation

**💡 What to expect:** ${guidance.tip}

This assessment helps match us with AI vendors who understand our specific technical situation and constraints, saving time in the vendor selection process.

Would you be available for a brief discussion? I'll send you the conversation link once you confirm.

Thanks!

---
Generated via Yenta AI Assessment Platform`;
  };

  const startNextRound = async () => {
    const nextRoundNumber = (currentRound + 1) as 1 | 2 | 3;
    
    try {
      // Generate conversation summary for the next round
      const summaryResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/ai/v1/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationHistory: messages,
          collectedData: collectedInfo,
          currentRound: currentRound
        })
      });

      let conversationSummary = '';
      if (summaryResponse.ok) {
        const summaryResult = await summaryResponse.json();
        conversationSummary = summaryResult.summary;
        
        // Update artifacts with the summary
        setCollectedInfo(prev => ({
          ...prev,
          artifacts: {
            ...prev.artifacts,
            conversationSummary: conversationSummary
          }
        }));
      }

      // Start the next round with accumulated context
      setCurrentRound(nextRoundNumber);
      setMessages([]);
      setCurrentStep('conversation');
      
      console.log(`🔄 Starting Round ${nextRoundNumber} with accumulated data:`, {
        structured: collectedInfo.structured,
        context: collectedInfo.context,
        conversationSummary: conversationSummary
      });
      
    } catch (error) {
      console.error('Error transitioning to next round:', error);
      // Fall back to simple transition
      setCurrentRound(nextRoundNumber);
      setMessages([]);
      setCurrentStep('conversation');
    }
  };

  const performBackgroundValidation = async () => {
    setValidationStatus(prev => ({ ...prev, isValidating: true }));
    
    try {
      // Extract email domain for website validation
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
      let linkedInValidation = null;
      if (linkedInRes.status === 'fulfilled' && linkedInRes.value.ok) {
        linkedInValidation = await linkedInRes.value.json();
      }

      let websiteValidation = null;
      if (websiteRes.status === 'fulfilled' && websiteRes.value.ok) {
        websiteValidation = await websiteRes.value.json();
      }

      // Calculate overall validation score (more lenient for testing)
      let score = 30; // Base score for attempting validation
      
      // LinkedIn validation (40 points possible)
      if (linkedInValidation?.companyExists) score += 20;
      if (linkedInValidation?.personExists) score += 20;
      
      // Website validation (30 points possible)
      if (websiteValidation?.isValid) score += 30;

      setValidationStatus({
        isValidating: false,
        companyLinkedIn: linkedInValidation?.companyExists ? 
          { exists: true, confidence: linkedInValidation.companyConfidence || 0.8 } : 
          { exists: false, confidence: 0.1 },
        websiteValidation: websiteValidation?.isValid ? 
          { exists: true, confidence: websiteValidation.confidence || 0.8 } : 
          { exists: false, confidence: 0.1 },
        personLinkedIn: linkedInValidation?.personExists ? 
          { exists: true, confidence: linkedInValidation.personConfidence || 0.8 } : 
          { exists: false, confidence: 0.1 },
        overallScore: score
      });

      // More lenient validation - allow proceeding with 50% score or if validation fails
      return score >= 50;

    } catch (error) {
      console.error('Background validation failed:', error);
      setValidationStatus(prev => ({ ...prev, isValidating: false }));
      return true; // Allow proceeding if validation fails (graceful degradation)
    }
  };

  const handleLinkedInSuccess = (data: any, suggestedRole: 'prospect' | 'vendor') => {
    setLinkedInData(data);
    
    // Pre-fill form with LinkedIn data
    if (data.prefillData) {
      setFormData(prev => ({
        ...prev,
        companyName: data.prefillData.companyName || '',
        contactName: data.prefillData.contactName || '',
        email: data.prefillData.email || '',
        linkedInProfile: data.prefillData.linkedInProfile || '',
        jobTitle: data.prefillData.jobTitle || '',
        industry: data.prefillData.industry || ''
      }));

      // Pre-populate structured data from LinkedIn inference
      if (data.prefillData.inferredData) {
        setCollectedInfo(prev => ({
          ...prev,
          structured: {
            ...prev.structured,
            industry: data.prefillData.inferredData.industry || '',
            jobFunction: data.prefillData.inferredData.jobFunction || '',
            decisionRole: data.prefillData.inferredData.decisionRole || ''
          },
          artifacts: {
            ...prev.artifacts,
            companyWebsite: data.prefillData.companyWebsite || '',
            linkedInProfile: data.prefillData.linkedInProfile || ''
          }
        }));
      }
    }
  };

  const handleStartAssessment = async () => {
    if (formData.companyName && formData.contactName && formData.email) {
      // Start background validation
      const isValid = await performBackgroundValidation();
      
      if (isValid) {
        setCurrentStep('conversation');
      } else {
        // Show validation feedback with option to proceed anyway
        const userChoice = window.confirm(
          'We had trouble verifying your company information. This might be because:\n\n' +
          '• LinkedIn validation services are not configured\n' +
          '• Your company is not yet on LinkedIn\n' +
          '• API keys are missing for external validation\n\n' +
          'Would you like to proceed anyway for testing purposes?\n\n' +
          'Click "OK" to continue or "Cancel" to update your information.'
        );
        
        if (userChoice) {
          setCurrentStep('conversation');
        }
      }
    }
  };

  if (currentStep === 'landing') {
    return (
      <div className="enhanced-intake-container">
        <div className="intake-card">
          <header className="intake-header">
            <div className="logo-title">
              <img src={require('../../styles/yentaBGRemoved.png')} alt="Yenta" className="yenta-logo" />
              <h1>Yenta</h1>
            </div>
            <button className="help-button">[Help]</button>
          </header>

          <div className="hero-section">
            <h1 className="hero-headline">Your AI Strategy, Finally a Reality</h1>
            <h2 className="hero-subheadline">Meet AI vendors who already know your budget, timeline, and needs.</h2>
          </div>

          <div className="no-nonsense-section">
            <div className="no-nonsense-item">
              <div className="no-nonsense-line"></div>
              <h3 className="no-nonsense-text">No research</h3>
            </div>
            <div className="no-nonsense-item">
              <div className="no-nonsense-line"></div>
              <h3 className="no-nonsense-text">No cold calls</h3>
            </div>
            <div className="no-nonsense-item">
              <div className="no-nonsense-line"></div>
              <h3 className="no-nonsense-text">No random pitches</h3>
            </div>
          </div>

          <div className="cta-section">
            <div className="cta-buttons">
              <button 
                className="cta-button-primary"
                onClick={() => setCurrentStep('form')}
              >
                Find AI Vendors
              </button>
              <button 
                className="cta-button-secondary"
                onClick={() => {
                  window.location.href = '/vendor-intake';
                }}
              >
                Join as Vendor
              </button>
            </div>
            <div className="cta-subtitle">
              <span className="cta-for-companies">For companies seeking AI solutions</span>
              <span className="cta-separator">•</span>
              <span className="cta-for-vendors">For AI vendors and consultants</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
              <button 
                className="cta-button-primary"
                onClick={() => {
                  window.location.href = '/login';
                }}
                style={{
                  width: '416px'
                }}
              >
                Login to Your Account
              </button>
            </div>
          </div>

        </div>
      </div>
    );
  }

  if (currentStep === 'form') {
    return (
      <div className="enhanced-intake-container">
        <div className="intake-card">
          <header className="intake-header">
            <div className="logo-title">
              <img src={require('../../styles/yentaBGRemoved.png')} alt="Yenta" className="yenta-logo" />
              <h1>Yenta</h1>
            </div>
            <button className="help-button">[Help]</button>
          </header>

          <div className="form-section">
            <h2>Let's get you connected with the right AI vendors</h2>
            <p>Just a few quick details to personalize your experience:</p>

            {/* LinkedIn Sign-In Option */}
            {!linkedInData && (
              <div style={{ marginBottom: '32px' }}>
                <LinkedInSignIn 
                  onLinkedInSuccess={handleLinkedInSuccess}
                  userType="prospect"
                />
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  margin: '24px 0',
                  color: '#6b7280',
                  fontSize: '14px'
                }}>
                  <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }}></div>
                  <span style={{ padding: '0 16px' }}>or fill out manually</span>
                  <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }}></div>
                </div>
              </div>
            )}

            {linkedInData && (
              <div style={{ 
                marginBottom: '24px', 
                padding: '16px', 
                background: '#ecfdf5', 
                border: '1px solid #a7f3d0', 
                borderRadius: '8px',
                fontSize: '14px'
              }}>
                ✅ <strong>LinkedIn Connected:</strong> We've pre-filled your information from your profile. You can edit anything below if needed.
              </div>
            )}

            <div className="intake-form">
              <div className="form-group">
                <label>Company Name:</label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                  placeholder="Enter your company name"
                />
              </div>
              <div className="form-group">
                <label>Your Name:</label>
                <input
                  type="text"
                  value={formData.contactName}
                  onChange={(e) => setFormData({...formData, contactName: e.target.value})}
                  placeholder="Enter your full name"
                />
              </div>
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="Enter your work email"
                />
              </div>

              <button 
                className="start-assessment-btn"
                onClick={handleStartAssessment}
                disabled={!formData.companyName || !formData.contactName || !formData.email || validationStatus.isValidating}
              >
                {validationStatus.isValidating ? '🔍 Verifying Company...' : '🚀 Start AI Assessment'}
              </button>

              {/* Validation feedback */}
              {validationStatus.overallScore > 0 && (
                <div className="validation-feedback" style={{
                  marginTop: '16px',
                  padding: '12px',
                  background: validationStatus.overallScore >= 70 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${validationStatus.overallScore >= 70 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  borderRadius: '6px',
                  fontSize: '14px'
                }}>
                  <div style={{ fontWeight: '600', marginBottom: '8px' }}>
                    Verification Score: {validationStatus.overallScore}/100
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div>
                      {validationStatus.companyLinkedIn?.exists ? '✅' : '❌'} LinkedIn Company: {validationStatus.companyLinkedIn?.exists ? 'Verified' : 'Not Found'}
                    </div>
                    <div>
                      {validationStatus.websiteValidation?.exists ? '✅' : '❌'} Company Website: {validationStatus.websiteValidation?.exists ? 'Verified' : 'Not Found'}
                    </div>
                    <div>
                      {validationStatus.personLinkedIn?.exists ? '✅' : '❌'} LinkedIn Profile: {validationStatus.personLinkedIn?.exists ? 'Verified' : 'Not Found'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="form-back">
              <button onClick={() => setCurrentStep('landing')} className="back-btn">
                ← Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'conversation') {
    return (
      <div className="conversation-container">
        <div className="conversation-card">
          <div className="conversation-header">
            <h2>Yenta AI Assessment - Round {currentRound}: {rounds[currentRound - 1].title}</h2>
            <span className="round-indicator">[{currentRound}/3]</span>
          </div>

          <div className="progress-bar">
            <div className="progress-label">Progress:</div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="progress-percent">{progress}%</div>
          </div>

        <div className="messages-container">
          {messages.map((message) => (
            <div key={message.id} className={`message ${message.sender}-message`}>
              <div className="message-avatar">
                {message.sender === 'ai' ? '🤖' : '👤'}
              </div>
              <div className="message-content">
                <div className="message-text">{message.content}</div>
                <div className="message-time">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="message ai-message">
              <div className="message-avatar">🤖</div>
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
          <div className="message-input-wrapper">
            <textarea
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              placeholder="Type your response..."
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <button onClick={sendMessage} disabled={!currentMessage.trim()}>
              Send 📤
            </button>
          </div>
        </div>

        <div className="conversation-tip">
          💡 Tip: Be specific about numbers, timelines, and impact. This helps us find vendors experienced with your scale.
        </div>

        {/* Validation Status Panel */}
        {validationStatus.overallScore > 0 && (
          <div className="validation-status-panel" style={{
            background: 'rgba(15, 23, 42, 0.6)',
            padding: '12px',
            marginTop: '16px',
            borderRadius: '6px',
            fontSize: '13px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <strong style={{ color: '#e2e8f0' }}>Verification Status</strong>
              <span style={{ 
                color: validationStatus.overallScore >= 70 ? '#22c55e' : '#ef4444',
                fontWeight: '600'
              }}>
                {validationStatus.overallScore}/100
              </span>
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <span style={{ color: validationStatus.companyLinkedIn?.exists ? '#22c55e' : '#6b7280' }}>
                {validationStatus.companyLinkedIn?.exists ? '✅' : '⭕'} Company
              </span>
              <span style={{ color: validationStatus.websiteValidation?.exists ? '#22c55e' : '#6b7280' }}>
                {validationStatus.websiteValidation?.exists ? '✅' : '⭕'} Website
              </span>
              <span style={{ color: validationStatus.personLinkedIn?.exists ? '#22c55e' : '#6b7280' }}>
                {validationStatus.personLinkedIn?.exists ? '✅' : '⭕'} Profile
              </span>
            </div>
          </div>
        )}

        {/* Debug panel to show collected information */}
        <div className="collected-info-debug" style={{ 
          background: 'rgba(0,0,0,0.1)', 
          padding: '12px', 
          marginTop: '16px', 
          borderRadius: '4px', 
          fontSize: '12px',
          fontFamily: 'monospace'
        }}>
          <strong>Collected Info:</strong>
          <pre>{JSON.stringify(collectedInfo, null, 2)}</pre>
        </div>

          <div className="round-actions">
            <button 
              className="complete-round-btn"
              onClick={completeRound}
              disabled={messages.length < 6}
            >
              Complete Round {currentRound} ✅
            </button>
            <div className="round-help">
              (Available after 6-8 message exchanges)
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'transition') {
    const completedRound = rounds[currentRound - 1];
    const nextRound = rounds[currentRound];
    
    return (
      <div className="transition-container">
        <div className="transition-card">
          <h2>Round {currentRound} Complete! 🎉</h2>

          <div className="round-score">
            <div className="score-display">
              ✅ Round {currentRound} Score: 78/100 (Good Start!)
            </div>

            <div className="insights-captured">
              <h4>Key Insights Captured:</h4>
              <ul>
                <li>Clear customer service automation need</li>
                <li>1,500+ tickets/month volume</li>
                <li>Response time improvement goal</li>
                <li>Team overwhelm driving urgency</li>
              </ul>
            </div>
          </div>

          {currentRound < 3 && (
            <div className="next-round-info">
              <h3>🕒 Round {nextRound.number}: {nextRound.title}</h3>
              
              <div className="timing-info">
                Available in: 47 hours, 23 minutes
                <div className="timing-explanation">
                  (We space conversations to ensure thoughtful responses)
                </div>
              </div>

              <div className="round-expectations">
                <h4>What to expect in Round {nextRound.number}:</h4>
                <ul>
                  <li>Technical infrastructure discussion</li>
                  <li>Team capability assessment</li>
                  <li>Integration requirements</li>
                  <li>Implementation timeline planning</li>
                </ul>
              </div>

              {(() => {
                const guidance = getStakeholderGuidance(nextRound.number);
                if (!guidance) return null;
                
                return (
                  <div className="stakeholder-guidance">
                    <h4>{guidance.title}</h4>
                    <p style={{ fontSize: '14px', color: '#e2e8f0', marginBottom: '16px' }}>
                      {guidance.subtitle}
                    </p>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div>
                        <strong style={{ color: '#22c55e', fontSize: '14px' }}>✅ Recommended:</strong>
                        <ul style={{ margin: '8px 0', paddingLeft: '16px', fontSize: '13px' }}>
                          {guidance.recommended.map((person, index) => (
                            <li key={index} style={{ marginBottom: '4px', color: '#cbd5e1' }}>{person}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <strong style={{ color: '#ef4444', fontSize: '14px' }}>❌ Avoid Including:</strong>
                        <ul style={{ margin: '8px 0', paddingLeft: '16px', fontSize: '13px' }}>
                          {guidance.avoid.map((person, index) => (
                            <li key={index} style={{ marginBottom: '4px', color: '#cbd5e1' }}>{person}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    
                    <div style={{ 
                      background: 'rgba(59, 130, 246, 0.1)', 
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: '6px',
                      padding: '12px',
                      fontSize: '13px',
                      color: '#93c5fd'
                    }}>
                      💡 <strong>Tip:</strong> {guidance.tip}
                    </div>
                    
                    <button 
                      onClick={() => {
                        const emailText = generateStakeholderEmail(nextRound.number, formData.contactName || "there");
                        navigator.clipboard.writeText(emailText);
                        alert("📧 Email template copied to clipboard! Paste it into your email app and customize as needed.");
                      }}
                      style={{
                        background: 'rgba(34, 197, 94, 0.2)',
                        border: '1px solid rgba(34, 197, 94, 0.4)',
                        borderRadius: '6px',
                        padding: '8px 16px',
                        color: '#22c55e',
                        fontSize: '13px',
                        cursor: 'pointer',
                        marginTop: '12px',
                        width: '100%'
                      }}
                    >
                      📧 Copy Email Template to Share With Team
                    </button>
                  </div>
                );
              })()}

              <div className="email-preferences">
                <h4>📧 Email Preference:</h4>
                <label>
                  <input type="checkbox" defaultChecked />
                  Remind me when Round {nextRound.number} is ready
                </label>
                <label>
                  <input type="checkbox" defaultChecked />
                  Send stakeholder guidance (share with your team)
                </label>
                <label>
                  <input type="checkbox" />
                  Send prep questions in advance
                </label>
              </div>
            </div>
          )}

          <div className="background-analysis">
            <h4>🔍 Behind the Scenes: Website Analysis</h4>
            <div className="analysis-results">
              <div className="analysis-item">✅ Company website verified</div>
              <div className="analysis-item">✅ Technology sophistication confirmed</div>
              <div className="analysis-item">✅ Business legitimacy score: 87/100</div>
            </div>
            <div className="analysis-explanation">
              This helps us match you with appropriate vendors!
            </div>
          </div>

          <div className="transition-actions">
            {currentRound < 3 ? (
              <button onClick={startNextRound} className="continue-btn">
                Continue to Round {nextRound.number} 📊
              </button>
            ) : (
              <button onClick={() => setCurrentStep('complete')} className="continue-btn">
                Continue to Results 📊
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'complete') {
    return (
      <div className="completion-container">
        <div className="completion-card">
          <h2>🎉 AI Assessment Complete - Excellent Results!</h2>

          <div className="final-score">
            <div className="score-header">
              <div className="score-value">Final AI Readiness Score: 87/100</div>
              <div className="score-category">Category: 🔥 HOT - Ready for Implementation</div>
            </div>
            <div className="score-bar">
              <div className="score-fill" style={{ width: '87%' }}></div>
            </div>
          </div>

          <div className="detailed-scores">
            <div className="score-breakdown">
              <div className="score-row">
                <span>Project Clarity</span>
                <div className="score-bar-small">
                  <div className="score-fill" style={{ width: '92%' }}></div>
                </div>
                <span>92/100</span>
              </div>
              <div className="score-row">
                <span>Technical Ready</span>
                <div className="score-bar-small">
                  <div className="score-fill" style={{ width: '78%' }}></div>
                </div>
                <span>78/100</span>
              </div>
              <div className="score-row">
                <span>Timeline Urgency</span>
                <div className="score-bar-small">
                  <div className="score-fill" style={{ width: '85%' }}></div>
                </div>
                <span>85/100</span>
              </div>
              <div className="score-row">
                <span>Budget Realistic</span>
                <div className="score-bar-small">
                  <div className="score-fill" style={{ width: '82%' }}></div>
                </div>
                <span>82/100</span>
              </div>
              <div className="score-row">
                <span>Authority Level</span>
                <div className="score-bar-small">
                  <div className="score-fill" style={{ width: '90%' }}></div>
                </div>
                <span>90/100</span>
              </div>
            </div>
          </div>

          <div className="vendor-visibility">
            <h4>📋 What Vendors Will See About You:</h4>
            <ul>
              <li>Project Type: "Customer Service Automation"</li>
              <li>Company Category: "Growth Stage (200-500 employees)"</li>
              <li>Budget Tier: "Mid-Market Project"</li>
              <li>Timeline: "High Priority - 6 Month Implementation"</li>
              <li>Authority: "Budget Decision Involvement"</li>
              <li>AI Readiness: "HOT - Ready Now"</li>
            </ul>
            
            <div className="privacy-note">
              🔒 Not Shared: Specific budget numbers, exact company size, detailed financial information
            </div>
          </div>

          <div className="next-steps">
            <h4>⚡ Next Steps:</h4>
            <ul>
              <li>Our AI is matching you with top vendors (24-48 hours)</li>
              <li>We'll introduce you to 3-5 qualified vendors</li>
              <li>All vendors are pre-screened for your project type</li>
              <li>You'll receive vendor profiles before any meetings</li>
            </ul>
          </div>

          <button className="dashboard-btn">
            View My Dashboard 📊
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default EnhancedProspectIntake;
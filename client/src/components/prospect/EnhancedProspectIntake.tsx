import React, { useState, useEffect } from 'react';
import '../../styles/design-system.css';
import './EnhancedProspectIntake.css';

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
    email: ''
  });

  // Validation state
  const [validationStatus, setValidationStatus] = useState({
    isValidating: false,
    companyLinkedIn: null, // { exists: boolean, url: string, confidence: number }
    websiteValidation: null, // { exists: boolean, domain: string, confidence: number }
    personLinkedIn: null, // { exists: boolean, title: string, confidence: number }
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

  const startConversationRound = () => {
    const welcomeMessages = {
      1: `Hi ${formData.companyName}! Let's start by understanding your specific AI project needs. What business problem are you trying to solve with AI?`,
      2: `Great progress! Now let's dive into the technical details. Tell me about your current technology infrastructure and team capabilities.`,
      3: `Excellent! For our final conversation, let's discuss investment levels and decision-making process. This helps us match you with appropriate vendors.`
    };

    const aiMessage: Message = {
      id: Date.now().toString(),
      sender: 'ai',
      content: welcomeMessages[currentRound],
      timestamp: new Date()
    };

    setMessages([aiMessage]);
    setProgress(currentRound === 1 ? 10 : currentRound === 2 ? 40 : 70);
  };

  const extractInformationFromMessage = (userMessage: string) => {
    const lowerMessage = userMessage.toLowerCase();
    
    // Extract problem type if not already set
    if (!collectedInfo.problemType) {
      if (lowerMessage.includes('time') || lowerMessage.includes('employee') || lowerMessage.includes('timesheet')) {
        setCollectedInfo(prev => ({ ...prev, problemType: 'time_tracking' }));
      } else if (lowerMessage.includes('customer') || lowerMessage.includes('support') || lowerMessage.includes('service')) {
        setCollectedInfo(prev => ({ ...prev, problemType: 'customer_support' }));
      } else if (lowerMessage.includes('finance') || lowerMessage.includes('money') || lowerMessage.includes('expense') || lowerMessage.includes('budget')) {
        setCollectedInfo(prev => ({ ...prev, problemType: 'financial_management' }));
      }
    }
    
    // Extract team size numbers
    const teamSizeMatch = userMessage.match(/(\d+)\s*(people|employees|users|team|staff)/i);
    if (teamSizeMatch && !collectedInfo.teamSize) {
      setCollectedInfo(prev => ({ ...prev, teamSize: teamSizeMatch[1] }));
    }
    
    // Extract budget ranges
    const budgetMatch = userMessage.match(/\$?([\d,]+)k?|\$?([\d,]+),000/i);
    if (budgetMatch && !collectedInfo.budgetRange) {
      setCollectedInfo(prev => ({ ...prev, budgetRange: userMessage }));
    }
    
    // Extract timeline urgency
    if (lowerMessage.includes('urgent') || lowerMessage.includes('asap') || lowerMessage.includes('immediately')) {
      setCollectedInfo(prev => ({ ...prev, timeline: 'urgent' }));
    } else if (lowerMessage.includes('month') && !collectedInfo.timeline) {
      setCollectedInfo(prev => ({ ...prev, timeline: userMessage }));
    }
    
    // Extract website URLs
    const websiteMatch = userMessage.match(/(https?:\/\/[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/i);
    if (websiteMatch && !collectedInfo.companyWebsite) {
      let website = websiteMatch[0];
      if (!website.startsWith('http')) {
        website = 'https://' + website;
      }
      setCollectedInfo(prev => ({ ...prev, companyWebsite: website }));
    }
    
    // Extract LinkedIn profile URLs
    const linkedInMatch = userMessage.match(/linkedin\.com\/in\/[a-zA-Z0-9-]+/i);
    if (linkedInMatch && !collectedInfo.linkedInProfile) {
      setCollectedInfo(prev => ({ ...prev, linkedInProfile: `https://${linkedInMatch[0]}` }));
    }
    
    // Extract current process info (if it's a longer explanation)
    if (userMessage.length > 50 && !collectedInfo.currentProcess) {
      setCollectedInfo(prev => ({ ...prev, currentProcess: userMessage }));
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
    
    // Extract information from user message
    extractInformationFromMessage(currentMessage);
    
    setCurrentMessage('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = generateAIResponse(userMessage.content, messages.length);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        content: aiResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
      setProgress(prev => Math.min(prev + 10, currentRound === 1 ? 35 : currentRound === 2 ? 65 : 95));
    }, 1500);
  };

  // Information schema that vendors need
  const [collectedInfo, setCollectedInfo] = useState({
    // Round 1: Problem Discovery
    problemType: '', // e.g., "time tracking", "customer support", "financial management"
    problemScope: '', // company size impact, scale
    currentProcess: '', // what they're doing now
    painPoints: [], // specific issues they're facing
    companyWebsite: '', // company website URL
    
    // Round 2: Technical Context  
    teamSize: '', // number of people affected
    techStack: [], // current tools/systems
    techCapability: '', // technical comfort level
    integrationNeeds: '', // what needs to connect
    linkedInProfile: '', // LinkedIn profile for case studies
    
    // Round 3: Business Context
    budgetRange: '', // investment level
    timeline: '', // urgency/timeline
    decisionMakers: [], // who's involved in decision
    successMetrics: '' // what defines success
  });

  const generateAIResponse = (userMessage: string, messageCount: number): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    // Round 1: Problem Discovery - Fill problem context
    if (currentRound === 1) {
      // Determine what info we still need for Round 1
      const needsProblemType = !collectedInfo.problemType;
      const needsCurrentProcess = !collectedInfo.currentProcess;
      const needsPainPoints = collectedInfo.painPoints.length === 0;
      const needsScope = !collectedInfo.problemScope;
      const needsWebsite = !collectedInfo.companyWebsite;
      
      if (needsProblemType) {
        // First, identify the core problem type
        if (lowerMessage.includes('time') || lowerMessage.includes('employee') || lowerMessage.includes('track')) {
          // Update state with problem type
          return "Got it - time tracking. What's your current process for tracking employee time?";
        }
        if (lowerMessage.includes('customer') || lowerMessage.includes('support') || lowerMessage.includes('service')) {
          return "Customer support - understood. What's your current support setup and volume?";
        }
        if (lowerMessage.includes('finance') || lowerMessage.includes('money') || lowerMessage.includes('expense')) {
          return "Financial management - got it. What financial processes are you looking to improve?";
        }
        return "What specific business process or challenge are you looking to solve with AI?";
      }
      
      if (needsCurrentProcess) {
        return "How are you handling this currently, and where does that process break down?";
      }
      
      if (needsPainPoints) {
        return "What are the biggest problems with your current approach?";
      }
      
      if (needsScope) {
        return "How many people or transactions does this affect on a typical day/week?";
      }
      
      if (needsWebsite) {
        return "What's your company website? This helps us understand your business better.";
      }
      
      return "What would success look like if this problem was solved?";
    }
    
    // Round 2: Technical Context - Fill technical requirements
    if (currentRound === 2) {
      const needsTechStack = collectedInfo.techStack.length === 0;
      const needsTeamSize = !collectedInfo.teamSize;
      const needsTechCapability = !collectedInfo.techCapability;
      const needsLinkedIn = !collectedInfo.linkedInProfile;
      
      if (needsTechStack) {
        return "What software tools and systems does your team currently use?";
      }
      
      if (needsTeamSize) {
        return "How many people would be using or affected by this solution?";
      }
      
      if (needsTechCapability) {
        return "How comfortable is your team with new technology - do you typically need plug-and-play solutions or can you handle some setup?";
      }
      
      if (needsLinkedIn) {
        return "Mind sharing your LinkedIn profile? It helps us find relevant case studies and similar implementations.";
      }
      
      return "Any specific integration requirements or technical constraints I should know about?";
    }
    
    // Round 3: Business Context - Fill business requirements  
    if (currentRound === 3) {
      const needsBudget = !collectedInfo.budgetRange;
      const needsTimeline = !collectedInfo.timeline;
      const needsDecisionMakers = collectedInfo.decisionMakers.length === 0;
      
      if (needsBudget) {
        return "What budget range are you working with for this project?";
      }
      
      if (needsTimeline) {
        return "What's your timeline - is this urgent or more of a future planning exercise?";
      }
      
      if (needsDecisionMakers) {
        return "Who else would be involved in evaluating and choosing a vendor?";
      }
      
      return "Perfect. I have what I need to match you with relevant vendors.";
    }
    
    return "Could you tell me more about that?";
  };

  const completeRound = () => {
    if (currentRound < 3) {
      setCurrentStep('transition');
    } else {
      setCurrentStep('complete');
    }
  };

  const startNextRound = () => {
    setCurrentRound((prev) => (prev + 1) as 1 | 2 | 3);
    setMessages([]);
    setCurrentStep('conversation');
  };

  const performBackgroundValidation = async () => {
    setValidationStatus(prev => ({ ...prev, isValidating: true }));
    
    try {
      // Extract email domain for website validation
      const emailDomain = formData.email.split('@')[1];
      
      // Parallel validation calls to existing backend services
      const [companyLinkedInRes, websiteRes, personLinkedInRes] = await Promise.allSettled([
        // LinkedIn company lookup
        fetch('/api/vetting/linkedin-company', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ companyName: formData.companyName })
        }),
        
        // Website validation via email domain
        fetch('/api/vetting/website-intelligence', {
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domain: emailDomain })
        }),
        
        // LinkedIn person search
        fetch('/api/vetting/linkedin-person', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: formData.contactName, 
            company: formData.companyName 
          })
        })
      ]);

      // Process results
      let companyLinkedIn = null;
      if (companyLinkedInRes.status === 'fulfilled' && companyLinkedInRes.value.ok) {
        companyLinkedIn = await companyLinkedInRes.value.json();
      }

      let websiteValidation = null;
      if (websiteRes.status === 'fulfilled' && websiteRes.value.ok) {
        websiteValidation = await websiteRes.value.json();
      }

      let personLinkedIn = null;
      if (personLinkedInRes.status === 'fulfilled' && personLinkedInRes.value.ok) {
        personLinkedIn = await personLinkedInRes.value.json();
      }

      // Calculate overall validation score
      let score = 0;
      if (companyLinkedIn?.exists) score += 40;
      if (websiteValidation?.exists) score += 30;
      if (personLinkedIn?.exists) score += 30;

      setValidationStatus({
        isValidating: false,
        companyLinkedIn,
        websiteValidation,
        personLinkedIn,
        overallScore: score
      });

      return score >= 70; // Require 70% validation score to proceed

    } catch (error) {
      console.error('Background validation failed:', error);
      setValidationStatus(prev => ({ ...prev, isValidating: false }));
      return true; // Allow proceeding if validation fails (graceful degradation)
    }
  };

  const handleStartAssessment = async () => {
    if (formData.companyName && formData.contactName && formData.email) {
      // Start background validation
      const isValid = await performBackgroundValidation();
      
      if (isValid) {
        setCurrentStep('conversation');
      } else {
        // Could add validation feedback UI here
        alert('We had trouble verifying your company information. Please check that your company name and email are correct.');
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
                  // TODO: Navigate to vendor registration flow
                  console.log('Navigate to vendor registration');
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

              <div className="email-preferences">
                <h4>📧 Email Preference:</h4>
                <label>
                  <input type="checkbox" defaultChecked />
                  Remind me when Round {nextRound.number} is ready
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
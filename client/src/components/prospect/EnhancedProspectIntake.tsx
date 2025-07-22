import React, { useState, useEffect } from 'react';
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
  const [currentStep, setCurrentStep] = useState<'landing' | 'conversation' | 'transition' | 'complete'>('landing');
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

  const generateAIResponse = (userMessage: string, messageCount: number): string => {
    // Simplified AI response logic - in real implementation, this would call the OpenAI service
    const responses = {
      1: [
        "That's a great use case! Can you tell me more about your current support volume? How many tickets per month are you handling?",
        "Interesting challenge. What methods have you tried so far to address this issue?",
        "I see the urgency. What would success look like for you in 6 months?"
      ],
      2: [
        "Thanks for those details. What technology stack is your team currently using?",
        "That infrastructure sounds solid. How comfortable is your team with API integrations?",
        "Good foundation. What's your experience with previous automation projects?"
      ],
      3: [
        "I appreciate the transparency. Based on your company size, typical projects range from $150K-$400K. Does this align with your expectations?",
        "That timeline makes sense. Who else would be involved in the final decision-making process?",
        "Perfect. This helps us match you with vendors who have experience in your investment range."
      ]
    };

    const roundResponses = responses[currentRound] || responses[1];
    return roundResponses[Math.min(messageCount % roundResponses.length, roundResponses.length - 1)];
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

  const handleStartAssessment = () => {
    if (formData.companyName && formData.contactName && formData.email) {
      setCurrentStep('conversation');
    }
  };

  if (currentStep === 'landing') {
    return (
      <div className="enhanced-intake-container">
        <div className="intake-card">
          <header className="intake-header">
            <h1>🤖 Yenta AI Matchmaker</h1>
            <button className="help-button">[Help]</button>
          </header>

          <div className="hero-section">
            <h2>🎯 Find Your Perfect AI Vendor in 3 Conversations</h2>
            
            <div className="trust-indicators">
              <span className="trust-item">🔒 Privacy First</span>
              <span className="trust-item">🎯 AI-Powered</span>
              <span className="trust-item">⚡ 5-Min Setup</span>
            </div>
          </div>

          <div className="process-overview">
            <h3>How Our Enhanced Matching Works:</h3>
            <div className="rounds-preview">
              {rounds.map((round) => (
                <div key={round.number} className="round-preview">
                  <div className="round-number">Round {round.number}</div>
                  <div className="round-title">{round.title}</div>
                  <div className="round-duration">{round.duration}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="benefits-list">
            <div className="benefit-item">✅ Your budget details stay private</div>
            <div className="benefit-item">✅ Only meet pre-qualified vendors</div>
            <div className="benefit-item">✅ AI verifies company legitimacy</div>
          </div>

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
              disabled={!formData.companyName || !formData.contactName || !formData.email}
            >
              🚀 Start AI Assessment
            </button>
          </div>

          <div className="ai-quote">
            "I'll guide you through 3 focused conversations over the next few days to understand your AI needs and match you with the perfect vendors."
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'conversation') {
    return (
      <div className="conversation-container">
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
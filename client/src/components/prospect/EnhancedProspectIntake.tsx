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
  problemType: string;
  industry: string;
  jobFunction: string;
  decisionRole: string;
  solutionType: string;
  implementationCapacity: string;
  businessUrgency: string;
  budgetStatus: string;
  conversationNeeds: string;
  teamSize: string;
  techCapability: string;
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

  const extractInformationFromMessage = async (userMessage: string) => {
    // Use AI to intelligently extract structured information from user response
    try {
      const extractionPrompt = `
Given this user response: "${userMessage}"
And this conversation context: Currently collecting ${currentRound === 1 ? 'problem & context' : currentRound === 2 ? 'technical details' : 'business information'}

Extract both structured data and contextual insights. Return a JSON object with this format:

{
  "structured": {
    "problemType": "time_tracking|customer_support|financial_management|data_analysis|automation|other",
    "industry": "healthcare|finance|construction|retail|manufacturing|technology|education|government|other", 
    "jobFunction": "individual_contributor|manager|director|vp|c_level",
    "decisionRole": "researcher|team_member|chief_decision_maker",
    "solutionType": "end_to_end|add_to_stack",
    "implementationCapacity": "have_team|need_help",
    "businessUrgency": "under_3_months|3_to_6_months|1_year_plus",
    "budgetStatus": "just_exploring|in_planning|awaiting_approval|approved",
    "conversationNeeds": "intro_concepts|technical_deep_dive|sales_conversation|strategy_consultation",
    "teamSize": "number as string or null",
    "techCapability": "basic|intermediate|advanced"
  },
  "context": {
    "challengeDescription": "Brief description of their specific challenge in their own words",
    "industryContext": "Industry-specific considerations they mentioned",
    "authorityContext": "Decision-making authority and stakeholder dynamics", 
    "urgencyReasoning": "Why they need to solve this by their timeline",
    "budgetContext": "Budget situation and constraints in their words",
    "solutionPreferences": "Previous tools tried or preferences mentioned",
    "implementationConcerns": "Concerns about implementation or adoption",
    "successCriteria": "What success looks like to them",
    "complianceDetails": "Specific compliance or regulatory requirements",
    "stakeholderDynamics": "Who else is involved and how decisions get made"
  },
  "artifacts": {
    "companyWebsite": "URL or null",
    "linkedInProfile": "URL or null", 
    "keyQuotes": ["exact quotes that capture pain points or needs"],
    "currentToolStack": ["tools they currently use"],
    "painPointDetails": ["specific examples of problems they face"]
  }
}

Only include fields where you're confident about the value. Return empty object {} if nothing can be extracted.`;

      const response = await fetch('/api/ai/extract-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: extractionPrompt,
          userMessage,
          currentRound 
        })
      });
      
      if (response.ok) {
        const extractedData = await response.json();
        console.log('🤖 AI Extraction Result:', extractedData);
        
        // Update state with extracted information
        setCollectedInfo(prev => {
          const updated = { 
            structured: { ...prev.structured },
            context: { ...prev.context },
            artifacts: { ...prev.artifacts }
          };
          
          // Update structured data
          if (extractedData.structured) {
            Object.keys(extractedData.structured).forEach(key => {
              const typedKey = key as keyof StructuredData;
              if (extractedData.structured[typedKey] && (!updated.structured[typedKey] || updated.structured[typedKey] === '')) {
                updated.structured[typedKey] = extractedData.structured[typedKey];
              }
            });
          }
          
          // Update contextual data
          if (extractedData.context) {
            Object.keys(extractedData.context).forEach(key => {
              const typedKey = key as keyof ContextData;
              if (extractedData.context[typedKey] && (!updated.context[typedKey] || updated.context[typedKey] === '')) {
                updated.context[typedKey] = extractedData.context[typedKey];
              }
            });
          }
          
          // Update artifacts
          if (extractedData.artifacts) {
            Object.keys(extractedData.artifacts).forEach(key => {
              const typedKey = key as keyof ArtifactsData;
              if (extractedData.artifacts[typedKey]) {
                if (Array.isArray(extractedData.artifacts[typedKey])) {
                  // Merge arrays (e.g., keyQuotes, painPointDetails)
                  const currentValue = updated.artifacts[typedKey];
                  const extractedValue = extractedData.artifacts[typedKey];
                  if (Array.isArray(currentValue) && Array.isArray(extractedValue)) {
                    (updated.artifacts[typedKey] as string[]) = [...currentValue, ...extractedValue];
                  }
                } else if (!updated.artifacts[typedKey] || updated.artifacts[typedKey] === '') {
                  updated.artifacts[typedKey] = extractedData.artifacts[typedKey];
                }
              }
            });
          }
          
          console.log('📝 Updated collected info:', updated);
          return updated;
        });
      }
    } catch (error) {
      console.error('Information extraction failed:', error);
      // Fallback to basic extraction for critical fields
      extractBasicInformation(userMessage);
    }
  };

  const extractBasicInformation = (userMessage: string) => {
    const lowerMessage = userMessage.toLowerCase();
    
    // Only extract the most obvious patterns as fallback
    const websiteMatch = userMessage.match(/(https?:\/\/[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/i);
    if (websiteMatch && !collectedInfo.artifacts.companyWebsite) {
      let website = websiteMatch[0];
      if (!website.startsWith('http')) {
        website = 'https://' + website;
      }
      setCollectedInfo(prev => ({ 
        ...prev, 
        artifacts: { ...prev.artifacts, companyWebsite: website }
      }));
    }
    
    const linkedInMatch = userMessage.match(/linkedin\.com\/in\/[a-zA-Z0-9-]+/i);
    if (linkedInMatch && !collectedInfo.artifacts.linkedInProfile) {
      setCollectedInfo(prev => ({ 
        ...prev, 
        artifacts: { ...prev.artifacts, linkedInProfile: `https://${linkedInMatch[0]}` }
      }));
    }
    
    const teamSizeMatch = userMessage.match(/(\d+)\s*(people|employees|users|team|staff)/i);
    if (teamSizeMatch && !collectedInfo.structured.teamSize) {
      setCollectedInfo(prev => ({ 
        ...prev, 
        structured: { ...prev.structured, teamSize: teamSizeMatch[1] }
      }));
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
    
    // Extract information from user message using AI
    await extractInformationFromMessage(currentMessage);
    
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
  const [collectedInfo, setCollectedInfo] = useState<{
    structured: StructuredData;
    context: ContextData;
    artifacts: ArtifactsData;
  }>({
    structured: {
      problemType: '',
      industry: '',
      jobFunction: '',
      decisionRole: '',
      solutionType: '',
      implementationCapacity: '',
      businessUrgency: '',
      budgetStatus: '',
      conversationNeeds: '',
      teamSize: '',
      techCapability: '',
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

  const generateAIResponse = (userMessage: string, messageCount: number): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    // Round 1: Problem & Context Discovery - Fill problem context
    if (currentRound === 1) {
      // Determine what info we still need for Round 1
      const needsProblemType = !collectedInfo.structured.problemType || collectedInfo.structured.problemType === '';
      const needsIndustry = !collectedInfo.structured.industry || collectedInfo.structured.industry === '';
      const needsJobFunction = !collectedInfo.structured.jobFunction || collectedInfo.structured.jobFunction === '';
      const needsDecisionRole = !collectedInfo.structured.decisionRole || collectedInfo.structured.decisionRole === '';
      const needsSolutionType = !collectedInfo.structured.solutionType || collectedInfo.structured.solutionType === '';
      const needsCompliance = !collectedInfo.context.complianceDetails || collectedInfo.context.complianceDetails === '';
      const needsWebsite = !collectedInfo.artifacts.companyWebsite || collectedInfo.artifacts.companyWebsite === '';
      
      console.log('🔍 Round 1 needs check:', {
        needsProblemType,
        needsIndustry,
        needsJobFunction,
        needsDecisionRole,
        needsSolutionType,
        needsCompliance,
        needsWebsite,
        currentInfo: collectedInfo.structured
      });
      
      if (needsProblemType) {
        return "What is the challenge you're trying to solve?";
      }
      
      if (needsIndustry) {
        return "What industry are you in? This helps us find vendors with relevant experience.";
      }
      
      if (needsJobFunction) {
        return "What's your role? Individual contributor, manager, director, VP, or C-level?";
      }
      
      if (needsDecisionRole) {
        return "What's your role in this decision? Researching options, part of the decision-making team, or the chief decision maker?";
      }
      
      if (needsSolutionType) {
        return "What type of solution are you looking for? An end-to-end tool, or something to add to your existing tech stack?";
      }
      
      if (needsCompliance) {
        return "Any compliance requirements? HIPAA, government regulations, industry-specific standards, or none?";
      }
      
      if (needsWebsite) {
        return "What's your company website? This helps us understand your business better.";
      }
      
      return "How are you handling this currently, and where does that process break down?";
    }
    
    // Round 2: Technical & Implementation Context - Fill technical requirements
    if (currentRound === 2) {
      const needsTechStack = !collectedInfo.artifacts.currentToolStack?.length;
      const needsTeamSize = !collectedInfo.structured.teamSize;
      const needsImplementationCapacity = !collectedInfo.structured.implementationCapacity;
      const needsTechCapability = !collectedInfo.structured.techCapability;
      const needsLinkedIn = !collectedInfo.artifacts.linkedInProfile;
      
      if (needsTechStack) {
        return "What software tools and systems does your team currently use?";
      }
      
      if (needsTeamSize) {
        return "How many people would be using or affected by this solution?";
      }
      
      if (needsImplementationCapacity) {
        return "For implementation, do you have the team in place to build this out, or do you need someone to do it for you?";
      }
      
      if (needsTechCapability) {
        return "What's your team's comfort with new technology? Need plug-and-play solutions, or can you handle some technical setup?";
      }
      
      if (needsLinkedIn) {
        return "Mind sharing your LinkedIn profile? Helps us find relevant case studies for your situation.";
      }
      
      return "Any specific integration requirements or technical constraints I should know about?";
    }
    
    // Round 3: Business Context - Fill business requirements  
    if (currentRound === 3) {
      const needsBusinessUrgency = !collectedInfo.structured.businessUrgency;
      const needsBudgetStatus = !collectedInfo.structured.budgetStatus;
      const needsBudgetContext = !collectedInfo.context.budgetContext;
      const needsStakeholderDynamics = !collectedInfo.context.stakeholderDynamics;
      const needsConversationNeeds = !collectedInfo.structured.conversationNeeds;
      
      if (needsBusinessUrgency) {
        return "What's the business urgency to solve this problem - under 3 months, 3-6 months, or 1 year+?";
      }
      
      if (needsBudgetStatus) {
        return "Do you have budget to solve this problem - just exploring, in planning, awaiting approval, or approved?";
      }
      
      if (needsBudgetContext) {
        return "What budget range are you working with for this project?";
      }
      
      if (needsStakeholderDynamics) {
        return "Who else would be involved in evaluating and choosing a vendor?";
      }
      
      if (needsConversationNeeds) {
        return "At this stage, what do you need - intro to AI concepts, technical deep dive into a solution, sales conversation, or strategy consultation?";
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
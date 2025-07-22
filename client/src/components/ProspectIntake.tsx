import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

interface ConversationState {
  sessionId: string | null;
  messages: Message[];
  isLoading: boolean;
  isComplete: boolean;
  readinessScore?: number;
  category?: string;
  summary?: string;
}

const ProspectIntake: React.FC = () => {
  const [state, setState] = useState<ConversationState>({
    sessionId: null,
    messages: [],
    isLoading: false,
    isComplete: false
  });
  
  const [currentMessage, setCurrentMessage] = useState('');
  const [companyInfo, setCompanyInfo] = useState({
    company_name: '',
    contact_name: '',
    email: ''
  });
  
  const [showCompanyForm, setShowCompanyForm] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [state.messages]);

  const startConversation = async () => {
    if (!companyInfo.company_name.trim()) {
      alert('Please enter your company name');
      return;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await axios.post(`${API_BASE}/prospects/start`, companyInfo);
      
      setState(prev => ({
        ...prev,
        sessionId: response.data.session_id,
        messages: response.data.messages,
        isLoading: false
      }));
      
      setShowCompanyForm(false);
    } catch (error) {
      console.error('Failed to start conversation:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      alert('Failed to start conversation. Please try again.');
    }
  };

  const sendMessage = async () => {
    if (!currentMessage.trim() || !state.sessionId || state.isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: currentMessage,
      timestamp: new Date().toISOString()
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true
    }));

    setCurrentMessage('');

    try {
      const response = await axios.post(
        `${API_BASE}/prospects/chat/${state.sessionId}`,
        { message: currentMessage }
      );

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date().toISOString()
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isLoading: false
      }));

    } catch (error) {
      console.error('Failed to send message:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      alert('Failed to send message. Please try again.');
    }
  };

  const completeConversation = async () => {
    if (!state.sessionId) return;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await axios.post(`${API_BASE}/prospects/complete/${state.sessionId}`);
      
      setState(prev => ({
        ...prev,
        isComplete: true,
        readinessScore: response.data.readiness_score,
        category: response.data.category,
        summary: response.data.summary,
        isLoading: false
      }));

    } catch (error) {
      console.error('Failed to complete conversation:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      alert('Failed to complete assessment. Please try again.');
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'HOT': return 'text-red-600 bg-red-100';
      case 'WARM': return 'text-orange-600 bg-orange-100';
      case 'COOL': return 'text-blue-600 bg-blue-100';
      case 'COLD': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryMessage = (category: string, score: number) => {
    switch (category) {
      case 'HOT':
        return "🔥 Excellent! You're ready for AI implementation. We'll connect you with our best vendors who can help you get started immediately.";
      case 'WARM':
        return "⚡ Great potential! You have a solid foundation. We'll match you with vendors who can help address any remaining questions.";
      case 'COOL':
        return "🌱 Good start! You're on the right track but may need some additional planning. We'll connect you with vendors who excel at project development.";
      case 'COLD':
        return "🎯 Thanks for your interest! While you're still in early planning stages, we'll keep you updated on AI best practices and re-engage when you're ready.";
      default:
        return "✅ Assessment complete! We'll review your needs and get back to you soon.";
    }
  };

  if (showCompanyForm) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center mb-6">
          <Bot className="mx-auto h-12 w-12 text-blue-600 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900">AI Readiness Assessment</h2>
          <p className="text-gray-600 mt-2">Let's understand your AI project needs</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company Name *
            </label>
            <input
              type="text"
              value={companyInfo.company_name}
              onChange={(e) => setCompanyInfo(prev => ({ ...prev, company_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Your Company"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Name
            </label>
            <input
              type="text"
              value={companyInfo.contact_name}
              onChange={(e) => setCompanyInfo(prev => ({ ...prev, contact_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email (optional)
            </label>
            <input
              type="email"
              value={companyInfo.email}
              onChange={(e) => setCompanyInfo(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="john@company.com"
            />
          </div>

          <button
            onClick={startConversation}
            disabled={state.isLoading || !companyInfo.company_name.trim()}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {state.isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Starting...
              </>
            ) : (
              <>
                <Bot className="h-4 w-4 mr-2" />
                Start AI Assessment
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-4 text-center">
          Your information is private and will only be shared with matched vendors upon your consent.
        </p>
      </div>
    );
  }

  if (state.isComplete) {
    return (
      <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center mb-6">
          <CheckCircle className="mx-auto h-16 w-16 text-green-600 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900">Assessment Complete!</h2>
        </div>

        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">AI Readiness Score</h3>
            <div className="flex items-center">
              <span className="text-3xl font-bold text-gray-900 mr-2">
                {state.readinessScore}/100
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(state.category || '')}`}>
                {state.category}
              </span>
            </div>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${state.readinessScore}%` }}
            ></div>
          </div>

          <p className="text-gray-700 mb-4">
            {getCategoryMessage(state.category || '', state.readinessScore || 0)}
          </p>

          {state.summary && (
            <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500">
              <h4 className="font-semibold text-gray-900 mb-2">AI Assessment Summary</h4>
              <p className="text-gray-700">{state.summary}</p>
            </div>
          )}
        </div>

        <div className="text-center space-y-4">
          <p className="text-gray-600">
            {state.category === 'HOT' || state.category === 'WARM' 
              ? "We'll connect you with qualified AI vendors within 24 hours."
              : "We'll keep you updated on AI best practices and opportunities."
            }
          </p>
          
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700"
          >
            Start New Assessment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-lg">
      <div className="border-b pb-4 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">AI Project Assessment</h2>
          <div className="text-sm text-gray-500">
            Session: {state.sessionId?.slice(-8)}
          </div>
        </div>
        <p className="text-gray-600 mt-1">
          Tell us about your AI project needs. Our AI will assess your readiness and match you with the right vendors.
        </p>
      </div>

      {/* Messages */}
      <div className="h-96 overflow-y-auto mb-6 space-y-4 bg-gray-50 rounded-lg p-4">
        {state.messages
          .filter(msg => msg.role !== 'system')
          .map((message, index) => (
            <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex items-start space-x-2 max-w-xs lg:max-w-md ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                <div className={`flex-shrink-0 ${message.role === 'user' ? 'bg-blue-600' : 'bg-gray-600'} rounded-full p-2`}>
                  {message.role === 'user' ? 
                    <User className="h-4 w-4 text-white" /> : 
                    <Bot className="h-4 w-4 text-white" />
                  }
                </div>
                <div className={`rounded-lg px-4 py-2 ${
                  message.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white border border-gray-200'
                }`}>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            </div>
          ))}
        
        {state.isLoading && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-2">
              <div className="bg-gray-600 rounded-full p-2">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <input
            type="text"
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type your response..."
            disabled={state.isLoading}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>
        
        <button
          onClick={sendMessage}
          disabled={!currentMessage.trim() || state.isLoading}
          className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="h-5 w-5" />
        </button>
        
        {state.messages.length >= 6 && ( // Allow completion after a few exchanges
          <button
            onClick={completeConversation}
            disabled={state.isLoading}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Complete Assessment
          </button>
        )}
      </div>

      <p className="text-xs text-gray-500 mt-4 text-center">
        Our AI is analyzing your responses to provide the best vendor matches. All conversations are confidential.
      </p>
    </div>
  );
};

export default ProspectIntake;
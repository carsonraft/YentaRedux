import React, { useState } from 'react';
import '../../styles/memphis.css';

interface VendorProfile {
  targetCompanySize: {
    employeeRange: string[];
    revenueRange: string[];
  };
  targetTitles: string[];
  geography: {
    regions: string[];
    countries: string[];
    timezones: string[];
    remote: boolean;
  };
  industries: string[];
  solutionTypes: string[];
  cloudProviders: string[];
  implementationModels: string[];
  projectUrgency: string[];
  budgetRanges: string[];
  complianceExpertise: string[];
}

const VendorIntake: React.FC = () => {
  const [profile, setProfile] = useState<VendorProfile>({
    targetCompanySize: { employeeRange: [], revenueRange: [] },
    targetTitles: [],
    geography: { regions: [], countries: [], timezones: [], remote: true },
    industries: [],
    solutionTypes: [],
    cloudProviders: [],
    implementationModels: [],
    projectUrgency: [],
    budgetRanges: [],
    complianceExpertise: []
  });
  
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    mdfBudget: '',
    website: '',
    linkedinCompany: '',
    teamSize: '',
    description: ''
  });
  
  const [caseStudies, setCaseStudies] = useState([
    { title: '', description: '', outcome: '', clientIndustry: '' }
  ]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const companyEmployeeSizes = [
    { value: '1-10', label: '1-10 employees (Startup)' },
    { value: '11-50', label: '11-50 employees (Small Business)' },
    { value: '51-200', label: '51-200 employees (Mid-Market)' },
    { value: '201-1000', label: '201-1,000 employees (Enterprise)' },
    { value: '1000+', label: '1,000+ employees (Large Enterprise)' }
  ];

  const teamSizeOptions = [
    { value: '1-2', label: '1-2 people (Solo/Duo)' },
    { value: '3-5', label: '3-5 people (Small Team)' },
    { value: '6-10', label: '6-10 people (Medium Team)' },
    { value: '11-25', label: '11-25 people (Large Team)' },
    { value: '26-50', label: '26-50 people (Department)' },
    { value: '50+', label: '50+ people (Enterprise)' }
  ];

  const revenueRanges = [
    { value: 'startup', label: 'Pre-Revenue/Startup' },
    { value: '1m-10m', label: '$1M - $10M Annual Revenue' },
    { value: '10m-100m', label: '$10M - $100M Annual Revenue' },
    { value: '100m-1b', label: '$100M - $1B Annual Revenue' },
    { value: '1b+', label: '$1B+ Annual Revenue' }
  ];

  const titleLevels = [
    { value: 'individual_contributor', label: 'Individual Contributors (Analysts, Specialists)' },
    { value: 'manager', label: 'Managers' },
    { value: 'director', label: 'Directors' },
    { value: 'vp', label: 'VPs (Vice Presidents)' },
    { value: 'c_level', label: 'C-Level (CEO, CTO, CFO)' }
  ];

  const geographies = [
    { value: 'north_america', label: 'North America' },
    { value: 'europe', label: 'Europe' },
    { value: 'asia_pacific', label: 'Asia Pacific' },
    { value: 'latin_america', label: 'Latin America' },
    { value: 'middle_east_africa', label: 'Middle East & Africa' }
  ];

  const industries = [
    { value: 'healthcare', label: 'Healthcare & Life Sciences' },
    { value: 'finance', label: 'Financial Services' },
    { value: 'construction', label: 'Construction & Real Estate' },
    { value: 'retail', label: 'Retail & E-commerce' },
    { value: 'manufacturing', label: 'Manufacturing' },
    { value: 'technology', label: 'Technology & Software' },
    { value: 'education', label: 'Education' },
    { value: 'government', label: 'Government & Public Sector' }
  ];

  const solutionTypes = [
    { value: 'end_to_end', label: 'End-to-end solutions (Complete product)' },
    { value: 'add_to_stack', label: 'Tools/SaaS for building solutions' },
    { value: 'both', label: 'Both types of solutions' }
  ];

  const cloudProviders = [
    { value: 'aws', label: 'Amazon Web Services (AWS)' },
    { value: 'azure', label: 'Microsoft Azure' },
    { value: 'gcp', label: 'Google Cloud Platform' },
    { value: 'on_premise', label: 'On-Premise Solutions' },
    { value: 'hybrid', label: 'Hybrid Cloud' }
  ];

  const handleSubmit = async () => {
    // Validate required fields
    const requiredFields = ['companyName', 'contactName', 'email', 'phone', 'mdfBudget'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);
    
    if (missingFields.length > 0) {
      setSubmitStatus('error');
      setErrorMessage(`Please fill in required fields: ${missingFields.join(', ')}`);
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setSubmitStatus('error');
      setErrorMessage('Please enter a valid email address');
      return;
    }
    
    // Validate MDF budget
    const budget = parseFloat(formData.mdfBudget);
    if (isNaN(budget) || budget <= 0) {
      setSubmitStatus('error');
      setErrorMessage('MDF budget must be a positive number');
      return;
    }
    
    setIsLoading(true);
    setSubmitStatus('idle');
    
    try {
      const requestBody = {
        companyName: formData.companyName,
        contactName: formData.contactName,
        email: formData.email,
        phone: formData.phone,
        mdfBudget: budget,
        website: formData.website,
        linkedinCompany: formData.linkedinCompany,
        teamSize: formData.teamSize,
        description: formData.description,
        caseStudies: caseStudies.filter(cs => cs.title.trim() || cs.description.trim()),
        targetingPreferences: profile
      };
      
      console.log('Submitting vendor profile:', requestBody);
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/vendors/intake`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSubmitStatus('success');
        console.log('Vendor profile created:', data);
      } else {
        setSubmitStatus('error');
        setErrorMessage(data.error || 'Failed to create vendor profile');
      }
    } catch (error) {
      console.error('Submit error:', error);
      setSubmitStatus('error');
      setErrorMessage('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleMultiSelect = (field: string, value: string, subField?: string) => {
    setProfile(prev => {
      const updated = { ...prev };
      if (subField) {
        const currentArray = (updated as any)[field][subField] || [];
        if (currentArray.includes(value)) {
          (updated as any)[field][subField] = currentArray.filter((item: string) => item !== value);
        } else {
          (updated as any)[field][subField] = [...currentArray, value];
        }
      } else {
        const currentArray = (updated as any)[field] || [];
        if (currentArray.includes(value)) {
          (updated as any)[field] = currentArray.filter((item: string) => item !== value);
        } else {
          (updated as any)[field] = [...currentArray, value];
        }
      }
      return updated;
    });
  };

  return (
    <div className="memphis-card" style={{ 
      maxWidth: '800px', 
      margin: '40px auto',
    }}>
      <h1 className="memphis-title">Vendor Profile Setup</h1>
      <p className="memphis-subtitle">Help us match you with the right prospects by telling us about your ideal customers</p>
      
      {/* Company Information Section */}
      <section style={{ marginBottom: '32px', padding: '16px', background: '#f8fafc', borderRadius: '6px' }}>
        <h3>Company Information</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Company Name *</label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
              className="memphis-input"
              placeholder="Your company name"
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Contact Name *</label>
            <input
              type="text"
              value={formData.contactName}
              onChange={(e) => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
              style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
              placeholder="Your full name"
            />
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
              placeholder="your.email@company.com"
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Phone *</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
              placeholder="(555) 123-4567"
            />
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Website URL</label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
              style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
              placeholder="https://yourcompany.com"
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>LinkedIn Company Page</label>
            <input
              type="url"
              value={formData.linkedinCompany}
              onChange={(e) => setFormData(prev => ({ ...prev, linkedinCompany: e.target.value }))}
              style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
              placeholder="https://linkedin.com/company/yourcompany"
            />
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Team Size</label>
            <select
              value={formData.teamSize}
              onChange={(e) => setFormData(prev => ({ ...prev, teamSize: e.target.value }))}
              style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
            >
              <option value="">Select team size</option>
              {teamSizeOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>MDF Budget (USD) *</label>
            <input
              type="number"
              value={formData.mdfBudget}
              onChange={(e) => setFormData(prev => ({ ...prev, mdfBudget: e.target.value }))}
              style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
              placeholder="50000"
              min="0"
            />
            <small style={{ display: 'block', color: '#6b7280', marginTop: '4px' }}>Marketing Development Fund budget available</small>
          </div>
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Company Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', minHeight: '80px' }}
            placeholder="Brief description of your company and AI/tech capabilities..."
            rows={3}
          />
        </div>
      </section>

      {/* Company Size Targeting */}
      <fieldset style={{ 
        marginBottom: '32px', 
        padding: '24px', 
        border: '2px solid #FFD4A3', 
        borderRadius: '16px', 
        background: 'rgba(255, 212, 163, 0.1)' 
      }}>
        <legend style={{ 
          padding: '0 16px', 
          fontWeight: '700', 
          fontSize: '20px', 
          color: '#FF6B4A',
          background: 'white'
        }}>
          Target Company Size
        </legend>
        
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ marginBottom: '12px', color: '#4b5563' }}>By Employee Count:</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '8px' }}>
            {companyEmployeeSizes.map(size => (
              <label key={size.value} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                padding: '8px', 
                background: 'white', 
                borderRadius: '4px',
                border: '1px solid #d1d5db'
              }}>
                <input 
                  type="checkbox"
                  checked={profile.targetCompanySize.employeeRange.includes(size.value)}
                  onChange={() => handleMultiSelect('targetCompanySize', size.value, 'employeeRange')}
                  style={{ marginRight: '8px' }}
                />
                {size.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <h4 style={{ marginBottom: '12px', color: '#4b5563' }}>By Revenue Range:</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '8px' }}>
            {revenueRanges.map(range => (
              <label key={range.value} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                padding: '8px', 
                background: 'white', 
                borderRadius: '4px',
                border: '1px solid #d1d5db'
              }}>
                <input 
                  type="checkbox"
                  checked={profile.targetCompanySize.revenueRange.includes(range.value)}
                  onChange={() => handleMultiSelect('targetCompanySize', range.value, 'revenueRange')}
                  style={{ marginRight: '8px' }}
                />
                {range.label}
              </label>
            ))}
          </div>
        </div>
      </fieldset>

      {/* Title Level Targeting */}
      <fieldset style={{ 
        marginBottom: '32px', 
        padding: '20px', 
        border: '2px solid #e5e7eb', 
        borderRadius: '8px', 
        background: '#f9fafb' 
      }}>
        <legend style={{ 
          padding: '0 12px', 
          fontWeight: '600', 
          fontSize: '18px', 
          color: '#374151' 
        }}>
          Target Decision Makers
        </legend>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '8px' }}>
          {titleLevels.map(title => (
            <label key={title.value} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              padding: '12px', 
              background: 'white', 
              borderRadius: '4px',
              border: '1px solid #d1d5db'
            }}>
              <input 
                type="checkbox"
                checked={profile.targetTitles.includes(title.value)}
                onChange={() => handleMultiSelect('targetTitles', title.value)}
                style={{ marginRight: '8px' }}
              />
              {title.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Geography */}
      <fieldset style={{ 
        marginBottom: '32px', 
        padding: '20px', 
        border: '2px solid #e5e7eb', 
        borderRadius: '8px', 
        background: '#f9fafb' 
      }}>
        <legend style={{ 
          padding: '0 12px', 
          fontWeight: '600', 
          fontSize: '18px', 
          color: '#374151' 
        }}>
          Geographic Coverage
        </legend>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '8px' }}>
          {geographies.map(geo => (
            <label key={geo.value} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              padding: '12px', 
              background: 'white', 
              borderRadius: '4px',
              border: '1px solid #d1d5db'
            }}>
              <input 
                type="checkbox"
                checked={profile.geography.regions.includes(geo.value)}
                onChange={() => handleMultiSelect('geography', geo.value, 'regions')}
                style={{ marginRight: '8px' }}
              />
              {geo.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Industries */}
      <section style={{ marginBottom: '32px' }}>
        <h3>What industries do you specialize in?</h3>
        {industries.map(industry => (
          <label key={industry.value} style={{ display: 'block', marginBottom: '8px' }}>
            <input 
              type="checkbox"
              checked={profile.industries.includes(industry.value)}
              onChange={() => handleMultiSelect('industries', industry.value)}
              style={{ marginRight: '8px' }}
            />
            {industry.label}
          </label>
        ))}
      </section>

      {/* Solution Types */}
      <section style={{ marginBottom: '32px' }}>
        <h3>What type of solutions do you provide?</h3>
        {solutionTypes.map(type => (
          <label key={type.value} style={{ display: 'block', marginBottom: '8px' }}>
            <input 
              type="checkbox"
              checked={profile.solutionTypes.includes(type.value)}
              onChange={() => handleMultiSelect('solutionTypes', type.value)}
              style={{ marginRight: '8px' }}
            />
            {type.label}
          </label>
        ))}
      </section>

      {/* Cloud Providers */}
      <section style={{ marginBottom: '32px' }}>
        <h3>Which cloud providers do you work with?</h3>
        {cloudProviders.map(provider => (
          <label key={provider.value} style={{ display: 'block', marginBottom: '8px' }}>
            <input 
              type="checkbox"
              checked={profile.cloudProviders.includes(provider.value)}
              onChange={() => handleMultiSelect('cloudProviders', provider.value)}
              style={{ marginRight: '8px' }}
            />
            {provider.label}
          </label>
        ))}
      </section>

      {/* Case Studies Section */}
      <section style={{ marginBottom: '32px', padding: '16px', background: '#f8fafc', borderRadius: '6px' }}>
        <h3>Case Studies & Portfolio</h3>
        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
          Share 1-3 recent projects that demonstrate your AI capabilities. These help prospects understand your expertise.
        </p>
        
        {caseStudies.map((caseStudy, index) => (
          <div key={index} style={{ 
            border: '1px solid #d1d5db', 
            borderRadius: '6px', 
            padding: '16px', 
            marginBottom: '16px',
            background: 'white'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, color: '#374151' }}>Case Study {index + 1}</h4>
              {caseStudies.length > 1 && (
                <button
                  onClick={() => setCaseStudies(prev => prev.filter((_, i) => i !== index))}
                  style={{
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Remove
                </button>
              )}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '13px' }}>Project Title</label>
                <input
                  type="text"
                  value={caseStudy.title}
                  onChange={(e) => {
                    const newCaseStudies = [...caseStudies];
                    newCaseStudies[index].title = e.target.value;
                    setCaseStudies(newCaseStudies);
                  }}
                  style={{ width: '100%', padding: '6px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px' }}
                  placeholder="e.g., AI-Powered Customer Support Chatbot"
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '13px' }}>Client Industry</label>
                <input
                  type="text"
                  value={caseStudy.clientIndustry}
                  onChange={(e) => {
                    const newCaseStudies = [...caseStudies];
                    newCaseStudies[index].clientIndustry = e.target.value;
                    setCaseStudies(newCaseStudies);
                  }}
                  style={{ width: '100%', padding: '6px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px' }}
                  placeholder="e.g., Healthcare, Finance, etc."
                />
              </div>
            </div>
            
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '13px' }}>Project Description</label>
              <textarea
                value={caseStudy.description}
                onChange={(e) => {
                  const newCaseStudies = [...caseStudies];
                  newCaseStudies[index].description = e.target.value;
                  setCaseStudies(newCaseStudies);
                }}
                style={{ width: '100%', padding: '6px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px', minHeight: '60px' }}
                placeholder="Brief description of the problem you solved and approach used..."
                rows={2}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '13px' }}>Results & Outcome</label>
              <textarea
                value={caseStudy.outcome}
                onChange={(e) => {
                  const newCaseStudies = [...caseStudies];
                  newCaseStudies[index].outcome = e.target.value;
                  setCaseStudies(newCaseStudies);
                }}
                style={{ width: '100%', padding: '6px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px', minHeight: '60px' }}
                placeholder="Measurable results (e.g., 40% reduction in response time, $200K cost savings, etc.)"
                rows={2}
              />
            </div>
          </div>
        ))}
        
        {caseStudies.length < 3 && (
          <button
            onClick={() => setCaseStudies(prev => [...prev, { title: '', description: '', outcome: '', clientIndustry: '' }])}
            style={{
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            + Add Another Case Study
          </button>
        )}
      </section>

      {/* Submit Status Display */}
      {submitStatus === 'success' && (
        <div style={{ 
          background: '#dcfce7', 
          border: '1px solid #22c55e', 
          borderRadius: '6px', 
          padding: '12px', 
          marginBottom: '16px',
          color: '#15803d'
        }}>
          ✅ Vendor profile created successfully! You can now start receiving prospect matches.
        </div>
      )}
      
      {submitStatus === 'error' && (
        <div style={{ 
          background: '#fee2e2', 
          border: '1px solid #ef4444', 
          borderRadius: '6px', 
          padding: '12px', 
          marginBottom: '16px',
          color: '#dc2626'
        }}>
          ❌ Error: {errorMessage}
        </div>
      )}

      <button 
        style={{
          background: isLoading ? '#9ca3af' : '#2563eb',
          color: 'white',
          padding: '12px 24px',
          border: 'none',
          borderRadius: '6px',
          fontSize: '16px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          opacity: isLoading ? 0.7 : 1
        }}
        onClick={handleSubmit}
        disabled={isLoading}
      >
        {isLoading ? 'Saving...' : 'Save Vendor Profile'}
      </button>

      {/* Debug display */}
      <div style={{ marginTop: '32px', padding: '16px', background: '#f3f4f6', borderRadius: '6px' }}>
        <h4>Current Profile (Debug):</h4>
        <pre style={{ fontSize: '12px', overflow: 'auto' }}>
          {JSON.stringify(profile, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default VendorIntake;
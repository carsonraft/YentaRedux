import React, { useState, useEffect } from 'react';
import '../../styles/dashboard.css';

interface VendorProfile {
  id?: string;
  company_name: string;
  website?: string;
  description?: string;
  capabilities?: {
    technical_skills: string[];
    industry_expertise: string[];
    service_types: string[];
  };
  industries?: string[];
  typical_deal_size?: string;
  case_studies?: Array<{
    title: string;
    industry: string;
    challenge: string;
    solution: string;
    results: string;
  }>;
  logo_url?: string;
  email?: string;
}

export const VendorProfile: React.FC = () => {
  const [profile, setProfile] = useState<VendorProfile>({
    company_name: '',
    website: '',
    description: '',
    capabilities: {
      technical_skills: [],
      industry_expertise: [],
      service_types: []
    },
    industries: [],
    typical_deal_size: '',
    case_studies: [],
    logo_url: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newSkill, setNewSkill] = useState('');
  const [newIndustry, setNewIndustry] = useState('');
  const [newServiceType, setNewServiceType] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/vendors/profile`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProfile({
          ...data.vendor,
          capabilities: data.vendor.capabilities || {
            technical_skills: [],
            industry_expertise: [],
            service_types: []
          },
          industries: data.vendor.industries || [],
          case_studies: data.vendor.case_studies || []
        });
      } else if (response.status === 404) {
        // Profile doesn't exist yet, keep defaults
      } else {
        setError('Failed to fetch profile');
      }
    } catch (err) {
      setError('Network error while fetching profile');
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(`${process.env.REACT_APP_API_URL}/vendors/profile`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profile)
      });

      if (response.ok) {
        setSuccess('Profile saved successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error?.message || 'Failed to save profile');
      }
    } catch (err) {
      setError('Network error while saving profile');
    } finally {
      setSaving(false);
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !profile.capabilities?.technical_skills.includes(newSkill.trim())) {
      setProfile(prev => ({
        ...prev,
        capabilities: {
          ...prev.capabilities!,
          technical_skills: [...prev.capabilities!.technical_skills, newSkill.trim()]
        }
      }));
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setProfile(prev => ({
      ...prev,
      capabilities: {
        ...prev.capabilities!,
        technical_skills: prev.capabilities!.technical_skills.filter(s => s !== skill)
      }
    }));
  };

  const addIndustryExpertise = () => {
    if (newIndustry.trim() && !profile.capabilities?.industry_expertise.includes(newIndustry.trim())) {
      setProfile(prev => ({
        ...prev,
        capabilities: {
          ...prev.capabilities!,
          industry_expertise: [...prev.capabilities!.industry_expertise, newIndustry.trim()]
        }
      }));
      setNewIndustry('');
    }
  };

  const removeIndustryExpertise = (industry: string) => {
    setProfile(prev => ({
      ...prev,
      capabilities: {
        ...prev.capabilities!,
        industry_expertise: prev.capabilities!.industry_expertise.filter(i => i !== industry)
      }
    }));
  };

  const addServiceType = () => {
    if (newServiceType.trim() && !profile.capabilities?.service_types.includes(newServiceType.trim())) {
      setProfile(prev => ({
        ...prev,
        capabilities: {
          ...prev.capabilities!,
          service_types: [...prev.capabilities!.service_types, newServiceType.trim()]
        }
      }));
      setNewServiceType('');
    }
  };

  const removeServiceType = (service: string) => {
    setProfile(prev => ({
      ...prev,
      capabilities: {
        ...prev.capabilities!,
        service_types: prev.capabilities!.service_types.filter(s => s !== service)
      }
    }));
  };

  const addCaseStudy = () => {
    setProfile(prev => ({
      ...prev,
      case_studies: [
        ...prev.case_studies!,
        {
          title: '',
          industry: '',
          challenge: '',
          solution: '',
          results: ''
        }
      ]
    }));
  };

  const updateCaseStudy = (index: number, field: string, value: string) => {
    setProfile(prev => ({
      ...prev,
      case_studies: prev.case_studies!.map((cs, i) => 
        i === index ? { ...cs, [field]: value } : cs
      )
    }));
  };

  const removeCaseStudy = (index: number) => {
    setProfile(prev => ({
      ...prev,
      case_studies: prev.case_studies!.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return (
      <div className="content-card">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Loading profile...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' }}>
          Vendor Profile Management
        </h2>
        <p style={{ color: '#6b7280' }}>
          Manage your company profile to improve AI matching with qualified prospects
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#dcfce7',
          border: '1px solid #16a34a',
          borderRadius: '6px',
          color: '#16a34a',
          marginBottom: '1.5rem'
        }}>
          {success}
        </div>
      )}

      {error && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#fef2f2',
          border: '1px solid #dc2626',
          borderRadius: '6px',
          color: '#dc2626',
          marginBottom: '1.5rem'
        }}>
          {error}
        </div>
      )}

      <form onSubmit={saveProfile}>
        {/* Basic Information */}
        <div className="content-card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#111827' }}>
            Basic Information
          </h3>
          
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '0.875rem', 
                fontWeight: '500', 
                color: '#374151', 
                marginBottom: '0.5rem' 
              }}>
                Company Name *
              </label>
              <input
                type="text"
                value={profile.company_name}
                onChange={(e) => setProfile(prev => ({ ...prev, company_name: e.target.value }))}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '0.875rem', 
                fontWeight: '500', 
                color: '#374151', 
                marginBottom: '0.5rem' 
              }}>
                Website
              </label>
              <input
                type="url"
                value={profile.website || ''}
                onChange={(e) => setProfile(prev => ({ ...prev, website: e.target.value }))}
                placeholder="https://yourcompany.com"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '0.875rem', 
                fontWeight: '500', 
                color: '#374151', 
                marginBottom: '0.5rem' 
              }}>
                Company Description
              </label>
              <textarea
                value={profile.description || ''}
                onChange={(e) => setProfile(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                placeholder="Describe your company's AI/technology services, mission, and unique value proposition..."
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  resize: 'vertical'
                }}
              />
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '0.875rem', 
                fontWeight: '500', 
                color: '#374151', 
                marginBottom: '0.5rem' 
              }}>
                Typical Deal Size
              </label>
              <select
                value={profile.typical_deal_size || ''}
                onChange={(e) => setProfile(prev => ({ ...prev, typical_deal_size: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  backgroundColor: 'white'
                }}
              >
                <option value="">Select typical deal size</option>
                <option value="$5K-$25K">$5K - $25K</option>
                <option value="$25K-$100K">$25K - $100K</option>
                <option value="$100K-$500K">$100K - $500K</option>
                <option value="$500K-$1M">$500K - $1M</option>
                <option value="$1M+">$1M+</option>
              </select>
            </div>
          </div>
        </div>

        {/* Technical Skills */}
        <div className="content-card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#111827' }}>
            Technical Skills & Capabilities
          </h3>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              fontWeight: '500', 
              color: '#374151', 
              marginBottom: '0.5rem' 
            }}>
              Add Technical Skill
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                placeholder="e.g., Machine Learning, Computer Vision, NLP"
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem'
                }}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
              />
              <button
                type="button"
                onClick={addSkill}
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Add
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {profile.capabilities?.technical_skills.map((skill, index) => (
              <span
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  backgroundColor: '#dbeafe',
                  color: '#1d4ed8',
                  borderRadius: '6px',
                  fontSize: '0.875rem'
                }}
              >
                {skill}
                <button
                  type="button"
                  onClick={() => removeSkill(skill)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#1d4ed8',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    padding: 0
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          {/* Industry Expertise */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              fontWeight: '500', 
              color: '#374151', 
              marginBottom: '0.5rem' 
            }}>
              Add Industry Expertise
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={newIndustry}
                onChange={(e) => setNewIndustry(e.target.value)}
                placeholder="e.g., Healthcare, Financial Services, Manufacturing"
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem'
                }}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addIndustryExpertise())}
              />
              <button
                type="button"
                onClick={addIndustryExpertise}
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#16a34a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Add
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {profile.capabilities?.industry_expertise.map((industry, index) => (
              <span
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  backgroundColor: '#dcfce7',
                  color: '#166534',
                  borderRadius: '6px',
                  fontSize: '0.875rem'
                }}
              >
                {industry}
                <button
                  type="button"
                  onClick={() => removeIndustryExpertise(industry)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#166534',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    padding: 0
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          {/* Service Types */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              fontWeight: '500', 
              color: '#374151', 
              marginBottom: '0.5rem' 
            }}>
              Add Service Type
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={newServiceType}
                onChange={(e) => setNewServiceType(e.target.value)}
                placeholder="e.g., Consulting, Implementation, Training, Support"
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem'
                }}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addServiceType())}
              />
              <button
                type="button"
                onClick={addServiceType}
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#ea580c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Add
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {profile.capabilities?.service_types.map((service, index) => (
              <span
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  backgroundColor: '#fed7aa',
                  color: '#c2410c',
                  borderRadius: '6px',
                  fontSize: '0.875rem'
                }}
              >
                {service}
                <button
                  type="button"
                  onClick={() => removeServiceType(service)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#c2410c',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    padding: 0
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Case Studies */}
        <div className="content-card" style={{ marginBottom: '2rem' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#111827' }}>
              Case Studies
            </h3>
            <button
              type="button"
              onClick={addCaseStudy}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              + Add Case Study
            </button>
          </div>

          {profile.case_studies?.map((caseStudy, index) => (
            <div
              key={index}
              style={{
                padding: '1.5rem',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                marginBottom: '1rem'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem'
              }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '500', color: '#111827' }}>
                  Case Study {index + 1}
                </h4>
                <button
                  type="button"
                  onClick={() => removeCaseStudy(index)}
                  style={{
                    color: '#dc2626',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  Remove
                </button>
              </div>

              <div style={{ display: 'grid', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '0.75rem', 
                      fontWeight: '500', 
                      color: '#374151', 
                      marginBottom: '0.25rem' 
                    }}>
                      Title
                    </label>
                    <input
                      type="text"
                      value={caseStudy.title}
                      onChange={(e) => updateCaseStudy(index, 'title', e.target.value)}
                      placeholder="Project title"
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '0.75rem', 
                      fontWeight: '500', 
                      color: '#374151', 
                      marginBottom: '0.25rem' 
                    }}>
                      Industry
                    </label>
                    <input
                      type="text"
                      value={caseStudy.industry}
                      onChange={(e) => updateCaseStudy(index, 'industry', e.target.value)}
                      placeholder="Client industry"
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '0.75rem', 
                    fontWeight: '500', 
                    color: '#374151', 
                    marginBottom: '0.25rem' 
                  }}>
                    Challenge
                  </label>
                  <textarea
                    value={caseStudy.challenge}
                    onChange={(e) => updateCaseStudy(index, 'challenge', e.target.value)}
                    placeholder="What challenge did the client face?"
                    rows={2}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '0.875rem',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '0.75rem', 
                    fontWeight: '500', 
                    color: '#374151', 
                    marginBottom: '0.25rem' 
                  }}>
                    Solution
                  </label>
                  <textarea
                    value={caseStudy.solution}
                    onChange={(e) => updateCaseStudy(index, 'solution', e.target.value)}
                    placeholder="How did you solve it?"
                    rows={2}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '0.875rem',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '0.75rem', 
                    fontWeight: '500', 
                    color: '#374151', 
                    marginBottom: '0.25rem' 
                  }}>
                    Results
                  </label>
                  <textarea
                    value={caseStudy.results}
                    onChange={(e) => updateCaseStudy(index, 'results', e.target.value)}
                    placeholder="What were the measurable outcomes?"
                    rows={2}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '0.875rem',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>
            </div>
          ))}

          {profile.case_studies?.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              color: '#6b7280',
              border: '2px dashed #d1d5db',
              borderRadius: '8px'
            }}>
              No case studies added yet. Click "Add Case Study" to showcase your successful projects.
            </div>
          )}
        </div>

        {/* Save Button */}
        <div style={{ textAlign: 'center' }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '1rem 2rem',
              backgroundColor: saving ? '#6b7280' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: '500'
            }}
          >
            {saving ? 'Saving Profile...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default VendorProfile;
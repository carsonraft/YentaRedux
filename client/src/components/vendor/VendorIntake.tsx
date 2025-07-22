import React, { useState } from 'react';

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

  const companyEmployeeSizes = [
    { value: '1-10', label: '1-10 employees (Startup)' },
    { value: '11-50', label: '11-50 employees (Small Business)' },
    { value: '51-200', label: '51-200 employees (Mid-Market)' },
    { value: '201-1000', label: '201-1,000 employees (Enterprise)' },
    { value: '1000+', label: '1,000+ employees (Large Enterprise)' }
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
    <div className="vendor-intake-container" style={{ 
      padding: '40px', 
      maxWidth: '800px', 
      margin: '0 auto',
      background: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
    }}>
      <h1>Vendor Profile Setup</h1>
      <p>Help us match you with the right prospects by telling us about your ideal customers:</p>

      {/* Company Size Targeting */}
      <section style={{ marginBottom: '32px' }}>
        <h3>What size companies do you want to target?</h3>
        
        <h4>By Employee Count:</h4>
        {companyEmployeeSizes.map(size => (
          <label key={size.value} style={{ display: 'block', marginBottom: '8px' }}>
            <input 
              type="checkbox"
              checked={profile.targetCompanySize.employeeRange.includes(size.value)}
              onChange={() => handleMultiSelect('targetCompanySize', size.value, 'employeeRange')}
              style={{ marginRight: '8px' }}
            />
            {size.label}
          </label>
        ))}

        <h4>By Revenue Range:</h4>
        {revenueRanges.map(range => (
          <label key={range.value} style={{ display: 'block', marginBottom: '8px' }}>
            <input 
              type="checkbox"
              checked={profile.targetCompanySize.revenueRange.includes(range.value)}
              onChange={() => handleMultiSelect('targetCompanySize', range.value, 'revenueRange')}
              style={{ marginRight: '8px' }}
            />
            {range.label}
          </label>
        ))}
      </section>

      {/* Title Level Targeting */}
      <section style={{ marginBottom: '32px' }}>
        <h3>What title levels do you prefer to work with?</h3>
        {titleLevels.map(title => (
          <label key={title.value} style={{ display: 'block', marginBottom: '8px' }}>
            <input 
              type="checkbox"
              checked={profile.targetTitles.includes(title.value)}
              onChange={() => handleMultiSelect('targetTitles', title.value)}
              style={{ marginRight: '8px' }}
            />
            {title.label}
          </label>
        ))}
      </section>

      {/* Geography */}
      <section style={{ marginBottom: '32px' }}>
        <h3>What geographies do you serve?</h3>
        {geographies.map(geo => (
          <label key={geo.value} style={{ display: 'block', marginBottom: '8px' }}>
            <input 
              type="checkbox"
              checked={profile.geography.regions.includes(geo.value)}
              onChange={() => handleMultiSelect('geography', geo.value, 'regions')}
              style={{ marginRight: '8px' }}
            />
            {geo.label}
          </label>
        ))}
      </section>

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

      <button 
        style={{
          background: '#2563eb',
          color: 'white',
          padding: '12px 24px',
          border: 'none',
          borderRadius: '6px',
          fontSize: '16px',
          cursor: 'pointer'
        }}
        onClick={() => console.log('Vendor profile:', profile)}
      >
        Save Vendor Profile
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
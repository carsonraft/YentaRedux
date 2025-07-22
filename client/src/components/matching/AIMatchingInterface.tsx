import React, { useState } from 'react';

interface ProspectProfile {
  structured: {
    problemType: string;
    industry: string;
    jobFunction: string;
    businessUrgency: string;
    budgetStatus: string;
    solutionType: string;
    teamSize: string;
  };
  context: {
    challengeDescription: string;
    urgencyReasoning: string;
    budgetContext: string;
    authorityContext: string;
  };
  validation: {
    overallScore: number;
    companyLinkedIn: boolean;
    websiteValidation: boolean;
    personLinkedIn: boolean;
  };
}

interface VendorProfile {
  companyName: string;
  industries: string[];
  targetTitles: string[];
  solutionTypes: string[];
  targetCompanySize: {
    employeeRange: string[];
    revenueRange: string[];
  };
  geography: {
    regions: string[];
  };
}

interface Match {
  vendorId: string;
  prospectId: string;
  matchScore: number;
  matchReasons: string[];
  concerns: string[];
  recommendedAction: string;
}

const AIMatchingInterface: React.FC = () => {
  const [prospects] = useState<ProspectProfile[]>([
    {
      structured: {
        problemType: 'time_tracking',
        industry: 'healthcare',
        jobFunction: 'c_level',
        businessUrgency: 'under_3_months',
        budgetStatus: 'approved',
        solutionType: 'end_to_end',
        teamSize: '50'
      },
      context: {
        challengeDescription: 'Manual timesheet approvals taking too much management time',
        urgencyReasoning: 'HIPAA audit coming up in Q2',
        budgetContext: '$50K approved, could go higher for right solution',
        authorityContext: 'CTO but needs finance buy-in'
      },
      validation: {
        overallScore: 85,
        companyLinkedIn: true,
        websiteValidation: true,
        personLinkedIn: true
      }
    }
  ]);

  const [vendors] = useState<VendorProfile[]>([
    {
      companyName: 'TimeFlow Solutions',
      industries: ['healthcare', 'finance'],
      targetTitles: ['c_level', 'director'],
      solutionTypes: ['end_to_end'],
      targetCompanySize: {
        employeeRange: ['11-50', '51-200'],
        revenueRange: ['1m-10m', '10m-100m']
      },
      geography: {
        regions: ['north_america']
      }
    },
    {
      companyName: 'BuildFlow API',
      industries: ['technology', 'healthcare'],
      targetTitles: ['manager', 'director'],
      solutionTypes: ['add_to_stack'],
      targetCompanySize: {
        employeeRange: ['51-200', '201-1000'],
        revenueRange: ['10m-100m']
      },
      geography: {
        regions: ['north_america', 'europe']
      }
    }
  ]);

  const calculateMatchScore = (prospect: ProspectProfile, vendor: VendorProfile): Match => {
    let score = 0;
    const reasons: string[] = [];
    const concerns: string[] = [];

    // Industry match (25 points)
    if (vendor.industries.includes(prospect.structured.industry)) {
      score += 25;
      reasons.push(`Industry expertise in ${prospect.structured.industry}`);
    } else {
      concerns.push(`No direct ${prospect.structured.industry} experience`);
    }

    // Title level match (20 points)
    if (vendor.targetTitles.includes(prospect.structured.jobFunction)) {
      score += 20;
      reasons.push(`Targets ${prospect.structured.jobFunction} decision makers`);
    } else {
      concerns.push(`Doesn't typically work with ${prospect.structured.jobFunction} level`);
    }

    // Solution type match (20 points)
    if (vendor.solutionTypes.includes(prospect.structured.solutionType)) {
      score += 20;
      reasons.push(`Provides ${prospect.structured.solutionType.replace('_', '-')} solutions`);
    } else {
      concerns.push(`Solution type mismatch: prospect wants ${prospect.structured.solutionType}`);
    }

    // Company size match (15 points)
    const teamSize = parseInt(prospect.structured.teamSize);
    let sizeMatch = false;
    vendor.targetCompanySize.employeeRange.forEach(range => {
      if (
        (range === '1-10' && teamSize <= 10) ||
        (range === '11-50' && teamSize >= 11 && teamSize <= 50) ||
        (range === '51-200' && teamSize >= 51 && teamSize <= 200) ||
        (range === '201-1000' && teamSize >= 201 && teamSize <= 1000) ||
        (range === '1000+' && teamSize > 1000)
      ) {
        sizeMatch = true;
      }
    });
    if (sizeMatch) {
      score += 15;
      reasons.push(`Company size (${teamSize} employees) fits vendor's target market`);
    } else {
      concerns.push(`Company size (${teamSize} employees) outside vendor's usual range`);
    }

    // Urgency bonus (10 points)
    if (prospect.structured.businessUrgency === 'under_3_months') {
      score += 10;
      reasons.push('High urgency project - immediate revenue opportunity');
    }

    // Budget status bonus (10 points)
    if (prospect.structured.budgetStatus === 'approved') {
      score += 10;
      reasons.push('Budget already approved - ready to buy');
    }

    // Determine recommended action
    let recommendedAction = '';
    if (score >= 70) {
      recommendedAction = 'STRONG MATCH - Introduce immediately';
    } else if (score >= 50) {
      recommendedAction = 'GOOD MATCH - Review and consider introduction';
    } else if (score >= 30) {
      recommendedAction = 'WEAK MATCH - Proceed with caution';
    } else {
      recommendedAction = 'POOR MATCH - Do not introduce';
    }

    return {
      vendorId: vendor.companyName,
      prospectId: 'prospect-1',
      matchScore: score,
      matchReasons: reasons,
      concerns: concerns,
      recommendedAction: recommendedAction
    };
  };

  const generateMatches = (): Match[] => {
    const matches: Match[] = [];
    prospects.forEach(prospect => {
      vendors.forEach(vendor => {
        const match = calculateMatchScore(prospect, vendor);
        matches.push(match);
      });
    });
    return matches.sort((a, b) => b.matchScore - a.matchScore);
  };

  const matches = generateMatches();

  return (
    <div style={{ 
      padding: '40px', 
      maxWidth: '1200px', 
      margin: '0 auto',
      background: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
    }}>
      <h1>AI Matching Interface</h1>
      <p>Intelligent vendor-prospect matching with confidence scoring</p>

      {/* Prospect Summary */}
      <div style={{ marginBottom: '32px', padding: '16px', background: '#f0f9ff', borderRadius: '8px' }}>
        <h3>Current Prospect</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <strong>Profile:</strong>
            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
              <li>{prospects[0].structured.industry} industry</li>
              <li>{prospects[0].structured.jobFunction.replace('_', ' ')} level</li>
              <li>{prospects[0].structured.teamSize} employees</li>
              <li>{prospects[0].structured.businessUrgency.replace('_', ' ')} urgency</li>
              <li>{prospects[0].structured.budgetStatus.replace('_', ' ')} budget</li>
            </ul>
          </div>
          <div>
            <strong>Context:</strong>
            <p style={{ margin: '8px 0', fontSize: '14px' }}>
              "{prospects[0].context.challengeDescription}"
            </p>
            <p style={{ margin: '8px 0', fontSize: '14px' }}>
              <em>Urgency: {prospects[0].context.urgencyReasoning}</em>
            </p>
          </div>
        </div>
        <div style={{ marginTop: '16px' }}>
          <strong>Validation Score: </strong>
          <span style={{ 
            color: prospects[0].validation.overallScore >= 70 ? '#059669' : '#dc2626',
            fontWeight: 'bold'
          }}>
            {prospects[0].validation.overallScore}/100
          </span>
          {prospects[0].validation.companyLinkedIn && ' ✅ LinkedIn'}
          {prospects[0].validation.websiteValidation && ' ✅ Website'}
          {prospects[0].validation.personLinkedIn && ' ✅ Profile'}
        </div>
      </div>

      {/* Matches */}
      <div>
        <h3>Vendor Matches</h3>
        {matches.map((match, index) => (
          <div 
            key={index}
            style={{ 
              marginBottom: '24px', 
              padding: '20px', 
              border: '1px solid #e5e7eb', 
              borderRadius: '8px',
              borderLeft: `4px solid ${
                match.matchScore >= 70 ? '#10b981' : 
                match.matchScore >= 50 ? '#f59e0b' : 
                match.matchScore >= 30 ? '#ef4444' : '#6b7280'
              }`
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: 0 }}>{match.vendorId}</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ 
                  fontSize: '24px', 
                  fontWeight: 'bold',
                  color: match.matchScore >= 70 ? '#10b981' : 
                         match.matchScore >= 50 ? '#f59e0b' : 
                         match.matchScore >= 30 ? '#ef4444' : '#6b7280'
                }}>
                  {match.matchScore}%
                </span>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  background: match.matchScore >= 70 ? '#d1fae5' : 
                             match.matchScore >= 50 ? '#fef3c7' : 
                             match.matchScore >= 30 ? '#fee2e2' : '#f3f4f6',
                  color: match.matchScore >= 70 ? '#065f46' : 
                         match.matchScore >= 50 ? '#92400e' : 
                         match.matchScore >= 30 ? '#991b1b' : '#374151'
                }}>
                  {match.recommendedAction.split(' - ')[0]}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <strong style={{ color: '#059669' }}>✅ Match Reasons:</strong>
                <ul style={{ margin: '8px 0', paddingLeft: '20px', fontSize: '14px' }}>
                  {match.matchReasons.map((reason, i) => (
                    <li key={i} style={{ marginBottom: '4px' }}>{reason}</li>
                  ))}
                </ul>
              </div>
              
              {match.concerns.length > 0 && (
                <div>
                  <strong style={{ color: '#dc2626' }}>⚠️ Concerns:</strong>
                  <ul style={{ margin: '8px 0', paddingLeft: '20px', fontSize: '14px' }}>
                    {match.concerns.map((concern, i) => (
                      <li key={i} style={{ marginBottom: '4px' }}>{concern}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div style={{ marginTop: '16px', padding: '12px', background: '#f9fafb', borderRadius: '6px' }}>
              <strong>Recommendation: </strong>
              <span style={{ fontStyle: 'italic' }}>{match.recommendedAction}</span>
            </div>

            <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
              <button style={{
                background: match.matchScore >= 50 ? '#10b981' : '#6b7280',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: match.matchScore >= 50 ? 'pointer' : 'not-allowed',
                opacity: match.matchScore >= 50 ? 1 : 0.5
              }}>
                Introduce to Vendor
              </button>
              <button style={{
                background: 'transparent',
                color: '#374151',
                border: '1px solid #d1d5db',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}>
                Manual Review
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AIMatchingInterface;
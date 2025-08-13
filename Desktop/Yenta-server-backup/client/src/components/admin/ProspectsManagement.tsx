import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/dashboard.css';

interface Prospect {
  id: string;
  session_id: string;
  company_name: string;
  contact_name: string;
  email: string;
  industry?: string;
  company_size?: string;
  created_at: string;
  readiness_score?: number;
  readiness_category?: string;
  ai_summary?: string;
}

export const ProspectsManagement: React.FC = () => {
  const navigate = useNavigate();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof Prospect>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchProspects();
  }, []);

  const fetchProspects = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/prospects/list`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProspects(data.prospects || []);
      } else {
        setError('Failed to fetch prospects');
      }
    } catch (err) {
      setError('Network error while fetching prospects');
    } finally {
      setLoading(false);
    }
  };

  const getReadinessColor = (category: string) => {
    switch (category) {
      case 'HOT': return '#dc2626';
      case 'WARM': return '#ea580c';
      case 'COOL': return '#0891b2';
      case 'COLD': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getReadinessIcon = (category: string) => {
    switch (category) {
      case 'HOT': return '🔥';
      case 'WARM': return '⚡';
      case 'COOL': return '❄️';
      case 'COLD': return '🧊';
      default: return '❓';
    }
  };

  const filteredAndSortedProspects = prospects
    .filter(prospect => {
      if (filterCategory !== 'all' && prospect.readiness_category !== filterCategory) {
        return false;
      }
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          prospect.company_name?.toLowerCase().includes(term) ||
          prospect.contact_name?.toLowerCase().includes(term) ||
          prospect.email?.toLowerCase().includes(term) ||
          prospect.industry?.toLowerCase().includes(term)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      const compareResult = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return sortDirection === 'asc' ? compareResult : -compareResult;
    });

  const handleSort = (field: keyof Prospect) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCategoryStats = () => {
    const stats = prospects.reduce((acc, p) => {
      const category = p.readiness_category || 'unknown';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      total: prospects.length,
      hot: stats.HOT || 0,
      warm: stats.WARM || 0,
      cool: stats.COOL || 0,
      cold: stats.COLD || 0
    };
  };

  const stats = getCategoryStats();

  if (loading) {
    return (
      <div className="content-card">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Loading prospects...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-card">
        <div style={{ textAlign: 'center', padding: '2rem', color: '#dc2626' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Error</div>
          <div>{error}</div>
          <button 
            onClick={fetchProspects}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' }}>
          Prospect Management
        </h2>
        <p style={{ color: '#6b7280' }}>
          Review and manage all prospect conversations and AI readiness assessments
        </p>
      </div>

      {/* Stats Cards */}
      <div className="dashboard-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-icon blue">👥</div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Prospects</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">🔥</div>
          <div className="stat-value">{stats.hot}</div>
          <div className="stat-label">Hot Leads</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow">⚡</div>
          <div className="stat-value">{stats.warm}</div>
          <div className="stat-label">Warm Leads</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon gray">❄️</div>
          <div className="stat-value">{stats.cool + stats.cold}</div>
          <div className="stat-label">Cool/Cold</div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="content-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '300px' }}>
            <input
              type="text"
              placeholder="Search prospects by company, contact, email, or industry..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem'
              }}
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.875rem',
              backgroundColor: 'white'
            }}
          >
            <option value="all">All Categories</option>
            <option value="HOT">🔥 Hot Leads</option>
            <option value="WARM">⚡ Warm Leads</option>
            <option value="COOL">❄️ Cool Leads</option>
            <option value="COLD">🧊 Cold Leads</option>
          </select>
          <button
            onClick={fetchProspects}
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
            Refresh
          </button>
        </div>
      </div>

      {/* Prospects Table */}
      <div className="content-card">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th 
                  style={{ textAlign: 'left', padding: '1rem 0.5rem', cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('company_name')}
                >
                  Company {sortField === 'company_name' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  style={{ textAlign: 'left', padding: '1rem 0.5rem', cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('contact_name')}
                >
                  Contact {sortField === 'contact_name' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  style={{ textAlign: 'left', padding: '1rem 0.5rem', cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('readiness_score')}
                >
                  AI Score {sortField === 'readiness_score' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th style={{ textAlign: 'left', padding: '1rem 0.5rem' }}>Category</th>
                <th 
                  style={{ textAlign: 'left', padding: '1rem 0.5rem', cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('created_at')}
                >
                  Date {sortField === 'created_at' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th style={{ textAlign: 'center', padding: '1rem 0.5rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedProspects.map((prospect) => (
                <tr 
                  key={prospect.id}
                  style={{ borderBottom: '1px solid #e5e7eb' }}
                >
                  <td style={{ padding: '1rem 0.5rem' }}>
                    <div style={{ fontWeight: '500', color: '#111827' }}>
                      {prospect.company_name || 'Unknown Company'}
                    </div>
                    {prospect.industry && (
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {prospect.industry}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '1rem 0.5rem' }}>
                    <div style={{ color: '#111827' }}>
                      {prospect.contact_name || 'Unknown'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {prospect.email}
                    </div>
                  </td>
                  <td style={{ padding: '1rem 0.5rem' }}>
                    {prospect.readiness_score ? (
                      <div style={{
                        fontSize: '1.25rem',
                        fontWeight: 'bold',
                        color: getReadinessColor(prospect.readiness_category || '')
                      }}>
                        {prospect.readiness_score}/100
                      </div>
                    ) : (
                      <span style={{ color: '#6b7280' }}>Not scored</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem 0.5rem' }}>
                    {prospect.readiness_category ? (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <span style={{ fontSize: '1.25rem' }}>
                          {getReadinessIcon(prospect.readiness_category)}
                        </span>
                        <span style={{
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          color: getReadinessColor(prospect.readiness_category)
                        }}>
                          {prospect.readiness_category}
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: '#6b7280' }}>Pending</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem 0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                    {formatDate(prospect.created_at)}
                  </td>
                  <td style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                    <button
                      onClick={() => navigate(`/conversation/${prospect.session_id}`)}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.75rem'
                      }}
                    >
                      View Chat
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredAndSortedProspects.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
              {searchTerm || filterCategory !== 'all' ? 
                'No prospects match your filters' : 
                'No prospects found'
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProspectsManagement;
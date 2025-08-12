import React, { useState, useEffect } from 'react';
import '../../styles/dashboard.css';

interface MDFAllocation {
  id: string;
  cloud_provider: 'aws' | 'gcp' | 'azure';
  allocation_amount: string;
  used_amount: string;
  remaining_amount: string;
  allocation_period: string;
  program_name: string;
  created_at: string;
  expires_at?: string;
}

interface MDFTransaction {
  id: string;
  amount: string;
  status: 'pending' | 'approved' | 'rejected';
  invoice_number?: string;
  notes?: string;
  created_at: string;
  cloud_provider: string;
  program_name: string;
  meeting_date?: string;
  prospect_company?: string;
}

export const MDFBudgetDashboard: React.FC = () => {
  const [allocations, setAllocations] = useState<MDFAllocation[]>([]);
  const [transactions, setTransactions] = useState<MDFTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAllocation, setSelectedAllocation] = useState<string | null>(null);

  useEffect(() => {
    fetchMDFData();
  }, []);

  const fetchMDFData = async () => {
    try {
      setLoading(true);
      
      // Fetch allocations and transactions in parallel
      const [allocationsResponse, transactionsResponse] = await Promise.all([
        fetch(`${process.env.REACT_APP_API_URL}/mdf/allocations`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }),
        fetch(`${process.env.REACT_APP_API_URL}/mdf/transactions`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
      ]);

      if (allocationsResponse.ok && transactionsResponse.ok) {
        const allocationsData = await allocationsResponse.json();
        const transactionsData = await transactionsResponse.json();
        
        setAllocations(allocationsData.allocations || []);
        setTransactions(transactionsData.transactions || []);
      } else {
        setError('Failed to fetch MDF data');
      }
    } catch (err) {
      setError('Network error while fetching MDF data');
    } finally {
      setLoading(false);
    }
  };

  const getCloudProviderColor = (provider: string) => {
    switch (provider) {
      case 'aws': return '#ff9900';
      case 'gcp': return '#4285f4';
      case 'azure': return '#0078d4';
      default: return '#6b7280';
    }
  };

  const getCloudProviderIcon = (provider: string) => {
    switch (provider) {
      case 'aws': return '☁️';
      case 'gcp': return '🌐';
      case 'azure': return '🔷';
      default: return '☁️';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#16a34a';
      case 'pending': return '#eab308';
      case 'rejected': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return '✅';
      case 'pending': return '⏳';
      case 'rejected': return '❌';
      default: return '❓';
    }
  };

  const calculateUtilization = (used: string, total: string) => {
    const usedNum = parseFloat(used);
    const totalNum = parseFloat(total);
    return totalNum > 0 ? Math.round((usedNum / totalNum) * 100) : 0;
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(parseFloat(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getTotalStats = () => {
    const totals = allocations.reduce((acc, allocation) => {
      const allocated = parseFloat(allocation.allocation_amount);
      const used = parseFloat(allocation.used_amount);
      const remaining = parseFloat(allocation.remaining_amount);
      
      return {
        allocated: acc.allocated + allocated,
        used: acc.used + used,
        remaining: acc.remaining + remaining
      };
    }, { allocated: 0, used: 0, remaining: 0 });

    return {
      ...totals,
      utilization: totals.allocated > 0 ? Math.round((totals.used / totals.allocated) * 100) : 0,
      totalTransactions: transactions.length,
      pendingTransactions: transactions.filter(t => t.status === 'pending').length
    };
  };

  const stats = getTotalStats();

  if (loading) {
    return (
      <div className="content-card">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Loading MDF data...</div>
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
            onClick={fetchMDFData}
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
          MDF Budget Dashboard
        </h2>
        <p style={{ color: '#6b7280' }}>
          Track your Market Development Fund allocations and utilization across cloud providers
        </p>
      </div>

      {/* Summary Stats */}
      <div className="dashboard-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-icon blue">💰</div>
          <div className="stat-value">{formatCurrency(stats.allocated.toString())}</div>
          <div className="stat-label">Total Allocated</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">📊</div>
          <div className="stat-value">{formatCurrency(stats.used.toString())}</div>
          <div className="stat-label">Used</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow">🏦</div>
          <div className="stat-value">{formatCurrency(stats.remaining.toString())}</div>
          <div className="stat-label">Remaining</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">📈</div>
          <div className="stat-value">{stats.utilization}%</div>
          <div className="stat-label">Utilization</div>
        </div>
      </div>

      {/* MDF Allocations */}
      <div className="content-card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#111827' }}>
          MDF Allocations by Cloud Provider
        </h3>
        
        {allocations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
            No MDF allocations found. Contact your partner manager to set up MDF funding.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {allocations.map((allocation) => {
              const utilization = calculateUtilization(allocation.used_amount, allocation.allocation_amount);
              
              return (
                <div
                  key={allocation.id}
                  style={{
                    padding: '1.5rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    borderLeft: `4px solid ${getCloudProviderColor(allocation.cloud_provider)}`
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '2rem', alignItems: 'start' }}>
                    <div>
                      {/* Header */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        marginBottom: '1rem'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem 1rem',
                          backgroundColor: getCloudProviderColor(allocation.cloud_provider),
                          color: 'white',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          fontWeight: '500'
                        }}>
                          {getCloudProviderIcon(allocation.cloud_provider)}
                          {allocation.cloud_provider.toUpperCase()}
                        </div>
                        <div>
                          <h4 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>
                            {allocation.program_name}
                          </h4>
                          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                            Period: {allocation.allocation_period}
                          </div>
                        </div>
                      </div>

                      {/* Budget Details */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                          <label style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: '500' }}>
                            Allocated
                          </label>
                          <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#111827' }}>
                            {formatCurrency(allocation.allocation_amount)}
                          </div>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: '500' }}>
                            Used
                          </label>
                          <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#16a34a' }}>
                            {formatCurrency(allocation.used_amount)}
                          </div>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: '500' }}>
                            Remaining
                          </label>
                          <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#2563eb' }}>
                            {formatCurrency(allocation.remaining_amount)}
                          </div>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: '500' }}>
                            Utilization
                          </label>
                          <div style={{
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            color: utilization >= 80 ? '#dc2626' : utilization >= 60 ? '#eab308' : '#16a34a'
                          }}>
                            {utilization}%
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{
                          width: '100%',
                          height: '8px',
                          backgroundColor: '#e5e7eb',
                          borderRadius: '4px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${utilization}%`,
                            height: '100%',
                            backgroundColor: utilization >= 80 ? '#dc2626' : utilization >= 60 ? '#eab308' : '#16a34a',
                            transition: 'width 0.3s ease'
                          }}></div>
                        </div>
                      </div>

                      {/* Created Date */}
                      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        Created: {formatDate(allocation.created_at)}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div>
                      <button
                        onClick={() => setSelectedAllocation(selectedAllocation === allocation.id ? null : allocation.id)}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#f3f4f6',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.875rem'
                        }}
                      >
                        {selectedAllocation === allocation.id ? 'Hide Details' : 'View Details'}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {selectedAllocation === allocation.id && (
                    <div style={{
                      marginTop: '1.5rem',
                      padding: '1rem',
                      backgroundColor: '#f9fafb',
                      borderRadius: '6px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <h5 style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '1rem', color: '#111827' }}>
                        Recent Transactions
                      </h5>
                      
                      {transactions.filter(t => t.program_name === allocation.program_name).length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '1rem', color: '#6b7280' }}>
                          No transactions found for this allocation
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                          {transactions
                            .filter(t => t.program_name === allocation.program_name)
                            .slice(0, 5)
                            .map((transaction) => (
                              <div
                                key={transaction.id}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  padding: '0.75rem',
                                  backgroundColor: 'white',
                                  borderRadius: '4px',
                                  fontSize: '0.875rem'
                                }}
                              >
                                <div>
                                  <div style={{ fontWeight: '500', color: '#111827' }}>
                                    {transaction.prospect_company || 'Meeting Transaction'}
                                  </div>
                                  <div style={{ color: '#6b7280' }}>
                                    {formatDate(transaction.created_at)}
                                    {transaction.meeting_date && ` • Meeting: ${formatDate(transaction.meeting_date)}`}
                                  </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontWeight: 'bold', color: '#111827' }}>
                                    {formatCurrency(transaction.amount)}
                                  </div>
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    color: getStatusColor(transaction.status),
                                    fontSize: '0.75rem'
                                  }}>
                                    {getStatusIcon(transaction.status)}
                                    {transaction.status.toUpperCase()}
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="content-card">
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#111827' }}>
            Recent Transactions
          </h3>
          <div style={{
            padding: '0.5rem 1rem',
            backgroundColor: stats.pendingTransactions > 0 ? '#fef3c7' : '#dcfce7',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: '500',
            color: stats.pendingTransactions > 0 ? '#92400e' : '#166534'
          }}>
            {stats.pendingTransactions} Pending
          </div>
        </div>

        {transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
            No transactions found. Complete meetings to generate MDF transactions.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    Prospect
                  </th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    Provider
                  </th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    Amount
                  </th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    Status
                  </th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 10).map((transaction) => (
                  <tr key={transaction.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <div style={{ fontWeight: '500', color: '#111827' }}>
                        {transaction.prospect_company || 'Unknown Prospect'}
                      </div>
                      {transaction.invoice_number && (
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          Invoice: {transaction.invoice_number}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <span style={{ color: getCloudProviderColor(transaction.cloud_provider) }}>
                          {getCloudProviderIcon(transaction.cloud_provider)}
                        </span>
                        <span style={{ fontSize: '0.875rem', color: '#111827' }}>
                          {transaction.cloud_provider.toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <div style={{ fontWeight: 'bold', color: '#111827' }}>
                        {formatCurrency(transaction.amount)}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.25rem 0.75rem',
                        backgroundColor: getStatusColor(transaction.status) + '20',
                        color: getStatusColor(transaction.status),
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        width: 'fit-content'
                      }}>
                        {getStatusIcon(transaction.status)}
                        {transaction.status.toUpperCase()}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                      {formatDate(transaction.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MDFBudgetDashboard;
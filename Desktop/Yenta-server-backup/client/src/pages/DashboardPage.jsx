import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const DashboardPage = () => {
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProspects = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const response = await axios.get('/api/admin/prospects', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProspects(response.data);
      } catch (err) {
        setError('Failed to fetch prospects.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProspects();
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div style={{ padding: '20px' }}>
      <h1>Admin Dashboard</h1>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #ccc' }}>
            <th style={{ padding: '10px', textAlign: 'left' }}>ID</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Company Name</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Contact Name</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Email</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Last Updated</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Details</th>
          </tr>
        </thead>
        <tbody>
          {prospects.map((prospect) => (
            <tr key={prospect.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '10px' }}>{prospect.id}</td>
              <td style={{ padding: '10px' }}>{prospect.company_name || 'N/A'}</td>
              <td style={{ padding: '10px' }}>{prospect.contact_name || 'N/A'}</td>
              <td style={{ padding: '10px' }}>{prospect.email || 'N/A'}</td>
              <td style={{ padding: '10px' }}>{new Date(prospect.updated_at).toLocaleString()}</td>
              <td style={{ padding: '10px' }}>
                <Link to={`/prospects/${prospect.id}`}>View</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DashboardPage;
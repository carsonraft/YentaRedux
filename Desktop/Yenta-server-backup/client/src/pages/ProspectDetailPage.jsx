import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const ProspectDetailPage = () => {
  const { id } = useParams();
  const [prospect, setProspect] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedDetails, setEditedDetails] = useState('');

  useEffect(() => {
    const fetchProspect = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const response = await axios.get(`/api/admin/prospects/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProspect(response.data);
        setEditedDetails(JSON.stringify(response.data.project_details, null, 2));
      } catch (err) {
        setError('Failed to fetch prospect details.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProspect();
  }, [id]);

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const updatedDetails = JSON.parse(editedDetails);
      await axios.put(`/api/admin/prospects/${id}`, 
        { project_details: updatedDetails },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProspect({ ...prospect, project_details: updatedDetails });
      setIsEditing(false);
    } catch (err) {
      setError('Failed to save changes. Please ensure the JSON is valid.');
      console.error(err);
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (!prospect) return <p>No prospect data found.</p>;

  return (
    <div style={{ padding: '20px' }}>
      <h1>Prospect Detail: #{prospect.id}</h1>
      
      <h2>Conversation History</h2>
      <div style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '4px', maxHeight: '300px', overflowY: 'auto', marginBottom: '20px' }}>
        {prospect.messages && prospect.messages.map((msg, index) => (
          <p key={index} style={{ margin: '5px 0', padding: '5px', borderRadius: '4px', backgroundColor: msg.role === 'user' ? '#e1f5fe' : '#f1f8e9' }}>
            <strong>{msg.role}:</strong> {msg.content}
          </p>
        ))}
      </div>

      <h2>AI Summary</h2>
      <div style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '4px', marginBottom: '20px' }}>
        <p>{prospect.ai_summary || 'No summary generated yet.'}</p>
      </div>

      <h2>Extracted Information</h2>
      <div style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '4px' }}>
        {isEditing ? (
          <textarea
            value={editedDetails}
            onChange={(e) => setEditedDetails(e.target.value)}
            style={{ width: '100%', height: '250px', boxSizing: 'border-box' }}
          />
        ) : (
          <pre>{JSON.stringify(prospect.project_details, null, 2)}</pre>
        )}
        <button onClick={() => isEditing ? handleSave() : setIsEditing(true)} style={{ marginTop: '10px' }}>
          {isEditing ? 'Save' : 'Edit'}
        </button>
        {isEditing && (
          <button onClick={() => setIsEditing(false)} style={{ marginLeft: '10px' }}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

export default ProspectDetailPage;

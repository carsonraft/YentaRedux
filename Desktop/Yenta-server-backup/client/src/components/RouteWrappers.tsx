import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ConversationViewer } from './admin/ConversationViewer';
import { MatchManagement } from './admin/MatchManagement';

export const ConversationViewerWrapper: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  return (
    <ConversationViewer 
      sessionId={sessionId || ''}
      onBack={() => navigate('/prospects')}
    />
  );
};

export const MatchManagementWrapper: React.FC = () => {
  const { prospectId } = useParams<{ prospectId: string }>();
  const navigate = useNavigate();

  return (
    <MatchManagement 
      prospectId={prospectId}
      onBack={() => navigate('/prospects')}
    />
  );
};
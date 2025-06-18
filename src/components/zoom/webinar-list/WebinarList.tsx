
import React from 'react';
import { WebinarListContainer } from './WebinarListContainer';

interface WebinarListProps {
  connectionId: string;
}

export const WebinarList: React.FC<WebinarListProps> = ({ connectionId }) => {
  return <WebinarListContainer connectionId={connectionId} />;
};

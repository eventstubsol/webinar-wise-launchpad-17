
import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface ExportButtonProps {
  data: any[];
  filename: string;
  type: 'participants' | 'polls' | 'qna';
}

export const ExportButton: React.FC<ExportButtonProps> = ({ data, filename, type }) => {
  const exportToCSV = () => {
    if (data.length === 0) {
      alert('No data to export');
      return;
    }

    let csvContent = '';
    let headers: string[] = [];

    // Define headers based on data type
    switch (type) {
      case 'participants':
        headers = ['Name', 'Email', 'Join Time', 'Leave Time', 'Duration (minutes)', 'Engagement Activities'];
        csvContent = headers.join(',') + '\n';
        
        data.forEach(participant => {
          const activities = [];
          if (participant.answered_polling) activities.push('Polls');
          if (participant.asked_question) activities.push('Q&A');
          if (participant.posted_chat) activities.push('Chat');
          if (participant.raised_hand) activities.push('Hand Raised');
          
          const row = [
            participant.participant_name || 'Unknown',
            participant.participant_email || 'N/A',
            participant.join_time || 'N/A',
            participant.leave_time || 'N/A',
            participant.duration || 0,
            activities.join('; ')
          ];
          csvContent += row.map(field => `"${field}"`).join(',') + '\n';
        });
        break;
        
      case 'polls':
        headers = ['Poll Title', 'Question', 'Responses'];
        csvContent = headers.join(',') + '\n';
        
        data.forEach(poll => {
          if (poll.questions) {
            poll.questions.forEach((question: any) => {
              const row = [
                poll.poll_title || 'Untitled Poll',
                question.question || 'No question',
                poll.zoom_poll_responses?.length || 0
              ];
              csvContent += row.map(field => `"${field}"`).join(',') + '\n';
            });
          }
        });
        break;
        
      case 'qna':
        headers = ['Question', 'Asker', 'Asked At', 'Answer', 'Status', 'Upvotes'];
        csvContent = headers.join(',') + '\n';
        
        data.forEach(qa => {
          const row = [
            qa.question || 'No question',
            qa.anonymous ? 'Anonymous' : (qa.asker_name || 'Unknown'),
            qa.asked_at || 'N/A',
            qa.answer || 'No answer',
            qa.answer ? 'Answered' : 'Pending',
            qa.upvote_count || 0
          ];
          csvContent += row.map(field => `"${field}"`).join(',') + '\n';
        });
        break;
    }

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Button variant="outline" size="sm" onClick={exportToCSV}>
      <Download className="h-4 w-4 mr-2" />
      Export CSV
    </Button>
  );
};

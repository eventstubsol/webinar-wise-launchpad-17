
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, FileSpreadsheet, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ExportButtonProps {
  data: any[];
  filename: string;
  type: 'participants' | 'polls' | 'qna';
}

export const ExportButton: React.FC<ExportButtonProps> = ({ data, filename, type }) => {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const exportToCSV = (exportData: any[], format: 'csv' | 'xlsx' = 'csv') => {
    if (exportData.length === 0) {
      toast({
        title: "No data to export",
        description: "There is no data available for export.",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);

    try {
      let csvContent = '';
      let headers: string[] = [];

      // Define headers based on data type
      switch (type) {
        case 'participants':
          headers = ['Name', 'Email', 'Join Time', 'Leave Time', 'Duration (minutes)', 'Engagement Activities'];
          csvContent = headers.join(',') + '\n';
          
          exportData.forEach(participant => {
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
            csvContent += row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',') + '\n';
          });
          break;
          
        case 'polls':
          headers = ['Poll Title', 'Question', 'Responses', 'Status'];
          csvContent = headers.join(',') + '\n';
          
          exportData.forEach(poll => {
            if (poll.questions && Array.isArray(poll.questions)) {
              poll.questions.forEach((question: any) => {
                const row = [
                  poll.poll_title || 'Untitled Poll',
                  question.question || 'No question',
                  poll.zoom_poll_responses?.length || 0,
                  poll.status || 'Unknown'
                ];
                csvContent += row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',') + '\n';
              });
            } else {
              const row = [
                poll.poll_title || 'Untitled Poll',
                'No questions available',
                poll.zoom_poll_responses?.length || 0,
                poll.status || 'Unknown'
              ];
              csvContent += row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',') + '\n';
            }
          });
          break;
          
        case 'qna':
          headers = ['Question', 'Asker', 'Asked At', 'Answer', 'Status', 'Upvotes'];
          csvContent = headers.join(',') + '\n';
          
          exportData.forEach(qa => {
            const row = [
              qa.question || 'No question',
              qa.anonymous ? 'Anonymous' : (qa.asker_name || 'Unknown'),
              qa.asked_at || 'N/A',
              qa.answer || 'No answer',
              qa.answer ? 'Answered' : 'Pending',
              qa.upvote_count || 0
            ];
            csvContent += row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',') + '\n';
          });
          break;
      }

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.${format}`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: `${exportData.length} records exported to ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: "There was an error exporting the data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleCSVExport = () => exportToCSV(data, 'csv');
  const handleExcelExport = () => {
    // For now, export as CSV with .xlsx extension
    // In a full implementation, you'd use a library like xlsx or exceljs
    toast({
      title: "Excel export",
      description: "Excel export will be available in a future update. Exporting as CSV instead.",
    });
    exportToCSV(data, 'csv');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting}>
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? 'Exporting...' : 'Export'}
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleCSVExport}>
          <FileText className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExcelExport}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export as Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

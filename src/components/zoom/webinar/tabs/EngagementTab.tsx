
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PollResultsChart } from '../components/PollResultsChart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MessageSquare, HelpCircle, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

interface EngagementTabProps {
  polls: any[];
  qna: any[];
  participants: any[];
  webinar: any;
}

export const EngagementTab: React.FC<EngagementTabProps> = ({
  polls,
  qna,
  participants,
  webinar
}) => {
  const engagementStats = {
    pollParticipants: participants.filter(p => p.answered_polling).length,
    qaParticipants: participants.filter(p => p.asked_question).length,
    chatParticipants: participants.filter(p => p.posted_chat).length,
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'MMM dd, h:mm a');
  };

  return (
    <div className="space-y-6">
      {/* Engagement Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Poll Participation</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{engagementStats.pollParticipants}</div>
            <p className="text-xs text-muted-foreground">
              {participants.length > 0 
                ? `${((engagementStats.pollParticipants / participants.length) * 100).toFixed(1)}% of attendees`
                : 'No attendees'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Q&A Participation</CardTitle>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{engagementStats.qaParticipants}</div>
            <p className="text-xs text-muted-foreground">
              {qna.length} total questions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chat Activity</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{engagementStats.chatParticipants}</div>
            <p className="text-xs text-muted-foreground">
              Participants who posted in chat
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Poll Results */}
      {polls.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Poll Results</h3>
          {polls.map((poll) => (
            <PollResultsChart key={poll.id} poll={poll} />
          ))}
        </div>
      )}

      {/* Q&A Session */}
      {qna.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Q&A Session ({qna.length} questions)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Question</TableHead>
                  <TableHead>Asker</TableHead>
                  <TableHead>Asked At</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Upvotes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {qna.slice(0, 10).map((question) => (
                  <TableRow key={question.id}>
                    <TableCell className="max-w-md">
                      <div className="truncate">{question.question}</div>
                      {question.answer && (
                        <div className="text-xs text-muted-foreground mt-1 truncate">
                          Answer: {question.answer}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {question.anonymous ? 'Anonymous' : question.asker_name}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(question.asked_at)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={question.answer ? 'default' : 'secondary'}>
                        {question.answer ? 'Answered' : 'Pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>{question.upvote_count || 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {qna.length > 10 && (
              <div className="text-center mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing 10 of {qna.length} questions
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty States */}
      {polls.length === 0 && qna.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Engagement Data</h3>
            <p className="text-muted-foreground">
              No polls or Q&A sessions were recorded for this webinar.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

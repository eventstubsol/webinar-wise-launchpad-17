
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessingTask {
  id: string;
  task_type: string;
  task_data: any;
  priority: number;
  status: string;
  retry_count: number;
  max_retries: number;
  webinar_id?: string;
  user_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (req.method === 'POST') {
      // Process analytics tasks
      const result = await processAnalyticsTasks(supabase);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          processed: result.processed,
          errors: result.errors 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Analytics processing error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function processAnalyticsTasks(supabase: any) {
  const processed: string[] = [];
  const errors: Array<{ taskId: string; error: string }> = [];

  try {
    // Get next pending tasks with highest priority
    const { data: tasks, error: tasksError } = await supabase
      .from('processing_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(5); // Process up to 5 tasks at once

    if (tasksError) throw tasksError;
    if (!tasks || tasks.length === 0) {
      return { processed: [], errors: [] };
    }

    // Process each task
    for (const task of tasks) {
      try {
        await processTask(supabase, task);
        processed.push(task.id);
      } catch (error) {
        console.error(`Task ${task.id} failed:`, error);
        errors.push({
          taskId: task.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        // Handle task failure
        await handleTaskFailure(supabase, task, error);
      }
    }

  } catch (error) {
    console.error('Error processing analytics tasks:', error);
    throw error;
  }

  return { processed, errors };
}

async function processTask(supabase: any, task: ProcessingTask) {
  // Mark task as processing
  await supabase
    .from('processing_queue')
    .update({
      status: 'processing',
      started_at: new Date().toISOString(),
    })
    .eq('id', task.id);

  let result;
  switch (task.task_type) {
    case 'participant_analysis':
      result = await processParticipantAnalysis(supabase, task);
      break;
    case 'poll_analysis':
      result = await processPollAnalysis(supabase, task);
      break;
    case 'qna_analysis':
      result = await processQnaAnalysis(supabase, task);
      break;
    case 'engagement_analysis':
      result = await processEngagementAnalysis(supabase, task);
      break;
    default:
      throw new Error(`Unknown task type: ${task.task_type}`);
  }

  // Mark task as completed
  await supabase
    .from('processing_queue')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', task.id);

  // Broadcast completion event
  await supabase.rpc('broadcast_event', {
    p_event_type: 'processing_complete',
    p_event_data: {
      task_id: task.id,
      task_type: task.task_type,
      result,
    },
    p_target_users: task.user_id ? [task.user_id] : null,
  });

  return result;
}

async function processParticipantAnalysis(supabase: any, task: ProcessingTask) {
  const { webinar_id, participant_id } = task.task_data;

  // Get participant data
  const { data: participant, error: participantError } = await supabase
    .from('zoom_participants')
    .select('*')
    .eq('id', participant_id)
    .single();

  if (participantError) throw participantError;

  // Calculate engagement score
  const engagementScore = calculateEngagementScore(participant);
  
  // Update cache
  await updateAnalyticsCache(supabase, `participant_engagement:${webinar_id}`, {
    participant_id,
    engagement_score: engagementScore,
    updated_at: new Date().toISOString(),
  });

  return { participant_id, engagement_score };
}

async function processPollAnalysis(supabase: any, task: ProcessingTask) {
  const { webinar_id } = task.task_data;

  // Get poll data
  const { data: polls, error: pollsError } = await supabase
    .from('zoom_polls')
    .select(`
      *,
      zoom_poll_responses(*)
    `)
    .eq('webinar_id', webinar_id);

  if (pollsError) throw pollsError;

  // Analyze polls
  const analysis = {
    total_polls: polls.length,
    total_responses: polls.reduce((sum: number, poll: any) => 
      sum + (poll.zoom_poll_responses?.length || 0), 0),
    response_rate: polls.length > 0 ? 
      polls.reduce((sum: number, poll: any) => 
        sum + (poll.zoom_poll_responses?.length || 0), 0) / polls.length : 0,
    analyzed_at: new Date().toISOString(),
  };

  // Update cache
  await updateAnalyticsCache(supabase, `poll_analysis:${webinar_id}`, analysis);

  return analysis;
}

async function processQnaAnalysis(supabase: any, task: ProcessingTask) {
  const { webinar_id } = task.task_data;

  // Get Q&A data
  const { data: qna, error: qnaError } = await supabase
    .from('zoom_qna')
    .select('*')
    .eq('webinar_id', webinar_id);

  if (qnaError) throw qnaError;

  // Analyze Q&A
  const analysis = {
    total_questions: qna.length,
    answered_questions: qna.filter((q: any) => q.answer).length,
    anonymous_questions: qna.filter((q: any) => q.anonymous).length,
    avg_upvotes: qna.length > 0 ? 
      qna.reduce((sum: number, q: any) => sum + (q.upvote_count || 0), 0) / qna.length : 0,
    analyzed_at: new Date().toISOString(),
  };

  // Update cache
  await updateAnalyticsCache(supabase, `qna_analysis:${webinar_id}`, analysis);

  return analysis;
}

async function processEngagementAnalysis(supabase: any, task: ProcessingTask) {
  const { webinar_id } = task.task_data;

  // Get all engagement data
  const [participantsRes, pollsRes, qnaRes] = await Promise.all([
    supabase.from('zoom_participants').select('*').eq('webinar_id', webinar_id),
    supabase.from('zoom_polls').select('*, zoom_poll_responses(*)').eq('webinar_id', webinar_id),
    supabase.from('zoom_qna').select('*').eq('webinar_id', webinar_id),
  ]);

  if (participantsRes.error) throw participantsRes.error;
  if (pollsRes.error) throw pollsRes.error;
  if (qnaRes.error) throw qnaRes.error;

  const participants = participantsRes.data;
  const polls = pollsRes.data;
  const qna = qnaRes.data;

  // Calculate comprehensive engagement
  const totalParticipants = participants.length;
  const engagementScores = participants.map((p: any) => calculateEngagementScore(p));
  
  const analysis = {
    total_participants: totalParticipants,
    avg_engagement_score: totalParticipants > 0 ? 
      engagementScores.reduce((sum: number, score: number) => sum + score, 0) / totalParticipants : 0,
    high_engagement_count: engagementScores.filter((score: number) => score >= 70).length,
    medium_engagement_count: engagementScores.filter((score: number) => score >= 40 && score < 70).length,
    low_engagement_count: engagementScores.filter((score: number) => score < 40).length,
    poll_participation_rate: polls.length > 0 ? 
      polls.reduce((sum: number, poll: any) => sum + (poll.zoom_poll_responses?.length || 0), 0) / totalParticipants : 0,
    qna_participation_rate: totalParticipants > 0 ? qna.length / totalParticipants : 0,
    analyzed_at: new Date().toISOString(),
  };

  // Update cache
  await updateAnalyticsCache(supabase, `engagement_analysis:${webinar_id}`, analysis);

  // Check for threshold breaches and send alerts
  if (analysis.avg_engagement_score < 40) {
    await supabase.rpc('broadcast_event', {
      p_event_type: 'threshold_breach',
      p_event_data: {
        metric: 'Average Engagement Score',
        value: analysis.avg_engagement_score,
        threshold: 40,
        webinar_id,
      },
    });
  }

  return analysis;
}

function calculateEngagementScore(participant: any): number {
  let score = 0;
  
  // Duration score (0-40 points)
  if (participant.duration) {
    score += Math.min(40, (participant.duration / 60) * 10);
  }

  // Interaction score (0-60 points)
  if (participant.posted_chat) score += 15;
  if (participant.answered_polling) score += 20;
  if (participant.asked_question) score += 20;
  if (participant.raised_hand) score += 5;

  return Math.min(100, score);
}

async function updateAnalyticsCache(supabase: any, cacheKey: string, data: any) {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1); // Cache for 1 hour

  const { error } = await supabase
    .from('analytics_cache')
    .upsert({
      cache_key: cacheKey,
      cache_data: data,
      expires_at: expiresAt.toISOString(),
      dependencies: [cacheKey.split(':')[0]],
    });

  if (error) {
    console.error('Failed to update analytics cache:', error);
    throw error;
  }
}

async function handleTaskFailure(supabase: any, task: ProcessingTask, error: any) {
  if (task.retry_count < task.max_retries) {
    // Schedule retry with exponential backoff
    const retryDelay = Math.pow(2, task.retry_count) * 1000;
    const scheduledAt = new Date(Date.now() + retryDelay).toISOString();
    
    await supabase
      .from('processing_queue')
      .update({
        retry_count: task.retry_count + 1,
        scheduled_at: scheduledAt,
        status: 'pending',
      })
      .eq('id', task.id);
  } else {
    // Mark as failed
    await supabase
      .from('processing_queue')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString(),
      })
      .eq('id', task.id);
  }
}


-- Create missing Zoom tables for participants, polls, Q&A, recordings, and registrants

-- Zoom Participants table
CREATE TABLE public.zoom_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webinar_id UUID REFERENCES public.zoom_webinars(id) ON DELETE CASCADE,
  participant_uuid TEXT,
  name TEXT NOT NULL,
  email TEXT,
  join_time TIMESTAMP WITH TIME ZONE,
  leave_time TIMESTAMP WITH TIME ZONE,
  duration INTEGER DEFAULT 0,
  user_id TEXT,
  registrant_id TEXT,
  status TEXT DEFAULT 'joined',
  failover BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Zoom Polls table
CREATE TABLE public.zoom_polls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webinar_id UUID REFERENCES public.zoom_webinars(id) ON DELETE CASCADE,
  poll_id TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'notstart',
  anonymous BOOLEAN DEFAULT false,
  poll_type INTEGER DEFAULT 1,
  questions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Zoom Poll Responses table  
CREATE TABLE public.zoom_poll_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID REFERENCES public.zoom_polls(id) ON DELETE CASCADE,
  participant_email TEXT,
  participant_name TEXT,
  question_details JSONB DEFAULT '{}'::jsonb,
  date_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Zoom Q&A table
CREATE TABLE public.zoom_qna (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webinar_id UUID REFERENCES public.zoom_webinars(id) ON DELETE CASCADE,
  question_details JSONB DEFAULT '{}'::jsonb,
  answer_details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Zoom Recordings table
CREATE TABLE public.zoom_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webinar_id UUID REFERENCES public.zoom_webinars(id) ON DELETE CASCADE,
  recording_id TEXT NOT NULL,
  meeting_uuid TEXT,
  recording_start TIMESTAMP WITH TIME ZONE,
  recording_end TIMESTAMP WITH TIME ZONE,
  file_type TEXT,
  file_size INTEGER,
  download_url TEXT,
  play_url TEXT,
  recording_type TEXT,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Zoom Registrants table
CREATE TABLE public.zoom_registrants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webinar_id UUID REFERENCES public.zoom_webinars(id) ON DELETE CASCADE,
  registrant_id TEXT,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  zip TEXT,
  state TEXT,
  phone TEXT,
  industry TEXT,
  org TEXT,
  job_title TEXT,
  purchasing_time_frame TEXT,
  role_in_purchase_process TEXT,
  no_of_employees TEXT,
  comments TEXT,
  status TEXT DEFAULT 'approved',
  join_url TEXT,
  registrant_uuid TEXT,
  create_time TIMESTAMP WITH TIME ZONE,
  custom_questions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for all new tables
ALTER TABLE public.zoom_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoom_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoom_poll_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoom_qna ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoom_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoom_registrants ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for participants
CREATE POLICY "Users can view participants for their webinars" ON public.zoom_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.zoom_webinars zw 
      JOIN public.zoom_connections zc ON zw.connection_id = zc.id 
      WHERE zw.id = zoom_participants.webinar_id AND zc.user_id = auth.uid()
    )
  );

-- Create RLS policies for polls
CREATE POLICY "Users can view polls for their webinars" ON public.zoom_polls
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.zoom_webinars zw 
      JOIN public.zoom_connections zc ON zw.connection_id = zc.id 
      WHERE zw.id = zoom_polls.webinar_id AND zc.user_id = auth.uid()
    )
  );

-- Create RLS policies for poll responses
CREATE POLICY "Users can view poll responses for their polls" ON public.zoom_poll_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.zoom_polls zp
      JOIN public.zoom_webinars zw ON zp.webinar_id = zw.id
      JOIN public.zoom_connections zc ON zw.connection_id = zc.id 
      WHERE zp.id = zoom_poll_responses.poll_id AND zc.user_id = auth.uid()
    )
  );

-- Create RLS policies for Q&A
CREATE POLICY "Users can view qna for their webinars" ON public.zoom_qna
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.zoom_webinars zw 
      JOIN public.zoom_connections zc ON zw.connection_id = zc.id 
      WHERE zw.id = zoom_qna.webinar_id AND zc.user_id = auth.uid()
    )
  );

-- Create RLS policies for recordings
CREATE POLICY "Users can view recordings for their webinars" ON public.zoom_recordings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.zoom_webinars zw 
      JOIN public.zoom_connections zc ON zw.connection_id = zc.id 
      WHERE zw.id = zoom_recordings.webinar_id AND zc.user_id = auth.uid()
    )
  );

-- Create RLS policies for registrants
CREATE POLICY "Users can view registrants for their webinars" ON public.zoom_registrants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.zoom_webinars zw 
      JOIN public.zoom_connections zc ON zw.connection_id = zc.id 
      WHERE zw.id = zoom_registrants.webinar_id AND zc.user_id = auth.uid()
    )
  );

-- Add indexes for better performance
CREATE INDEX idx_zoom_participants_webinar_id ON public.zoom_participants(webinar_id);
CREATE INDEX idx_zoom_polls_webinar_id ON public.zoom_polls(webinar_id);
CREATE INDEX idx_zoom_poll_responses_poll_id ON public.zoom_poll_responses(poll_id);
CREATE INDEX idx_zoom_qna_webinar_id ON public.zoom_qna(webinar_id);
CREATE INDEX idx_zoom_recordings_webinar_id ON public.zoom_recordings(webinar_id);
CREATE INDEX idx_zoom_registrants_webinar_id ON public.zoom_registrants(webinar_id);

-- Add updated_at triggers
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.zoom_participants
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.zoom_polls
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.zoom_poll_responses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.zoom_qna
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.zoom_recordings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.zoom_registrants
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

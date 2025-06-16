
/**
 * Handles saving participant-related data to the database
 */
export class ParticipantDataProcessor {
  /**
   * Save participants to database
   */
  static async saveParticipantsToDatabase(supabase: any, participants: any[], webinarZoomId: string, connectionId: string): Promise<void> {
    if (!participants || participants.length === 0) return;
    
    console.log(`💾 Saving ${participants.length} participants to database for webinar ${webinarZoomId}`);
    
    // Get the database webinar ID
    const { data: webinarData, error: webinarError } = await supabase
      .from('zoom_webinars')
      .select('id')
      .eq('connection_id', connectionId)
      .eq('webinar_id', webinarZoomId)
      .single();
      
    if (webinarError || !webinarData) {
      console.error(`❌ Could not find webinar in database for Zoom ID ${webinarZoomId}`);
      throw new Error(`Could not find webinar in database for Zoom ID ${webinarZoomId}`);
    }
    
    const webinarDbId = webinarData.id;
    console.log(`🔗 Using database webinar ID: ${webinarDbId}`);
    
    // Transform participants for database
    const transformedParticipants = participants.map((participant, index) => {
      console.log(`🔄 Transforming participant ${index + 1}: ${participant.name || participant.participant_name || 'Unknown'}`);
      
      return {
        webinar_id: webinarDbId,
        participant_id: participant.id || participant.participant_id,
        registrant_id: participant.registrant_id || null,
        participant_name: participant.name || participant.participant_name,
        participant_email: participant.user_email || participant.participant_email || null,
        participant_user_id: participant.user_id || null,
        join_time: participant.join_time || null,
        leave_time: participant.leave_time || null,
        duration: participant.duration || null,
        attentiveness_score: participant.attentiveness_score || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });
    
    console.log(`💾 Attempting to save ${transformedParticipants.length} transformed participants`);
    
    const { error } = await supabase
      .from('zoom_participants')
      .upsert(transformedParticipants, {
        onConflict: 'webinar_id,participant_id',
        ignoreDuplicates: false
      });
      
    if (error) {
      console.error(`❌ Failed to save participants to database:`, error);
      throw new Error(`Failed to save participants: ${error.message}`);
    }
    
    console.log(`✅ Successfully saved ${transformedParticipants.length} participants for webinar ${webinarZoomId}`);
  }

  /**
   * Save registrants to database
   */
  static async saveRegistrantsToDatabase(supabase: any, registrants: any[], webinarZoomId: string, connectionId: string): Promise<void> {
    if (!registrants || registrants.length === 0) return;
    
    console.log(`💾 Saving ${registrants.length} registrants to database for webinar ${webinarZoomId}`);
    
    // Get the database webinar ID
    const { data: webinarData, error: webinarError } = await supabase
      .from('zoom_webinars')
      .select('id')
      .eq('connection_id', connectionId)
      .eq('webinar_id', webinarZoomId)
      .single();
      
    if (webinarError || !webinarData) {
      console.error(`❌ Could not find webinar in database for Zoom ID ${webinarZoomId}`);
      throw new Error(`Could not find webinar in database for Zoom ID ${webinarZoomId}`);
    }
    
    const webinarDbId = webinarData.id;
    console.log(`🔗 Using database webinar ID: ${webinarDbId}`);
    
    // Transform registrants for database
    const transformedRegistrants = registrants.map((registrant, index) => {
      console.log(`🔄 Transforming registrant ${index + 1}: ${registrant.first_name} ${registrant.last_name}`);
      
      return {
        webinar_id: webinarDbId,
        registrant_id: registrant.id || registrant.registrant_id,
        email: registrant.email,
        first_name: registrant.first_name,
        last_name: registrant.last_name,
        address: registrant.address || null,
        city: registrant.city || null,
        country: registrant.country || null,
        zip: registrant.zip || null,
        state: registrant.state || null,
        phone: registrant.phone || null,
        industry: registrant.industry || null,
        org: registrant.org || null,
        job_title: registrant.job_title || null,
        purchasing_time_frame: registrant.purchasing_time_frame || null,
        role_in_purchase_process: registrant.role_in_purchase_process || null,
        no_of_employees: registrant.no_of_employees || null,
        comments: registrant.comments || null,
        custom_questions: registrant.custom_questions || null,
        status: registrant.status || null,
        create_time: registrant.create_time || null,
        join_url: registrant.join_url || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });
    
    console.log(`💾 Attempting to save ${transformedRegistrants.length} transformed registrants`);
    
    const { error } = await supabase
      .from('zoom_registrants')
      .upsert(transformedRegistrants, {
        onConflict: 'webinar_id,registrant_id',
        ignoreDuplicates: false
      });
      
    if (error) {
      console.error(`❌ Failed to save registrants to database:`, error);
      throw new Error(`Failed to save registrants: ${error.message}`);
    }
    
    console.log(`✅ Successfully saved ${transformedRegistrants.length} registrants for webinar ${webinarZoomId}`);
  }

  /**
   * Save polls to database
   */
  static async savePollsToDatabase(supabase: any, polls: any[], webinarZoomId: string, connectionId: string): Promise<void> {
    if (!polls || polls.length === 0) return;
    
    console.log(`💾 Saving ${polls.length} polls to database for webinar ${webinarZoomId}`);
    
    // Get the database webinar ID
    const { data: webinarData, error: webinarError } = await supabase
      .from('zoom_webinars')
      .select('id')
      .eq('connection_id', connectionId)
      .eq('webinar_id', webinarZoomId)
      .single();
      
    if (webinarError || !webinarData) {
      console.error(`❌ Could not find webinar in database for Zoom ID ${webinarZoomId}`);
      throw new Error(`Could not find webinar in database for Zoom ID ${webinarZoomId}`);
    }
    
    const webinarDbId = webinarData.id;
    console.log(`🔗 Using database webinar ID: ${webinarDbId}`);
    
    // Transform polls for database
    const transformedPolls = polls.map((poll, index) => {
      console.log(`🔄 Transforming poll ${index + 1}: ${poll.title || poll.poll_title || 'Untitled Poll'}`);
      
      return {
        webinar_id: webinarDbId,
        poll_id: poll.id || poll.poll_id,
        poll_title: poll.title || poll.poll_title,
        poll_type: poll.type || null,
        status: poll.status || null,
        anonymous: poll.anonymous || false,
        questions: poll.questions || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });
    
    console.log(`💾 Attempting to save ${transformedPolls.length} transformed polls`);
    
    const { error } = await supabase
      .from('zoom_polls')
      .upsert(transformedPolls, {
        onConflict: 'webinar_id,poll_id',
        ignoreDuplicates: false
      });
      
    if (error) {
      console.error(`❌ Failed to save polls to database:`, error);
      throw new Error(`Failed to save polls: ${error.message}`);
    }
    
    console.log(`✅ Successfully saved ${transformedPolls.length} polls for webinar ${webinarZoomId}`);
  }

  /**
   * Save Q&A to database
   */
  static async saveQAToDatabase(supabase: any, qa: any[], webinarZoomId: string, connectionId: string): Promise<void> {
    if (!qa || qa.length === 0) return;
    
    console.log(`💾 Saving ${qa.length} Q&A items to database for webinar ${webinarZoomId}`);
    
    // Get the database webinar ID
    const { data: webinarData, error: webinarError } = await supabase
      .from('zoom_webinars')
      .select('id')
      .eq('connection_id', connectionId)
      .eq('webinar_id', webinarZoomId)
      .single();
      
    if (webinarError || !webinarData) {
      console.error(`❌ Could not find webinar in database for Zoom ID ${webinarZoomId}`);
      throw new Error(`Could not find webinar in database for Zoom ID ${webinarZoomId}`);
    }
    
    const webinarDbId = webinarData.id;
    console.log(`🔗 Using database webinar ID: ${webinarDbId}`);
    
    // Transform Q&A for database
    const transformedQA = qa.map((qna, index) => {
      console.log(`🔄 Transforming Q&A ${index + 1}: ${qna.question?.substring(0, 50) || 'No question text'}...`);
      
      return {
        webinar_id: webinarDbId,
        question_id: qna.question_id || qna.id,
        question: qna.question,
        answer: qna.answer || null,
        asker_name: qna.asker_name,
        asker_email: qna.asker_email || null,
        answered_by: qna.answered_by || null,
        asked_at: qna.asked_at || qna.question_time,
        answered_at: qna.answered_at || qna.answer_time || null,
        upvote_count: qna.upvote_count || 0,
        status: qna.status || 'open',
        anonymous: qna.anonymous || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });
    
    console.log(`💾 Attempting to save ${transformedQA.length} transformed Q&A items`);
    
    const { error } = await supabase
      .from('zoom_qna')
      .upsert(transformedQA, {
        onConflict: 'webinar_id,question_id',
        ignoreDuplicates: false
      });
      
    if (error) {
      console.error(`❌ Failed to save Q&A to database:`, error);
      throw new Error(`Failed to save Q&A: ${error.message}`);
    }
    
    console.log(`✅ Successfully saved ${transformedQA.length} Q&A items for webinar ${webinarZoomId}`);
  }
}


import { WorkflowStep } from './types/WorkflowTypes';

export class WorkflowTemplateService {
  static createWebinarFollowUpSteps(): WorkflowStep[] {
    return [
      {
        id: '1',
        type: 'email',
        name: 'Thank You Email',
        config: {
          template_id: 'thank_you_template',
          subject: 'Thank you for attending our webinar!',
          delay_hours: 1
        },
        delay_hours: 1
      },
      {
        id: '2',
        type: 'email',
        name: 'Resource Follow-up',
        config: {
          template_id: 'resources_template',
          subject: 'Additional resources from today\'s webinar',
          delay_hours: 24
        },
        delay_hours: 24
      },
      {
        id: '3',
        type: 'email',
        name: 'Feedback Request',
        config: {
          template_id: 'feedback_template',
          subject: 'We\'d love your feedback!',
          delay_hours: 72
        },
        delay_hours: 72
      }
    ];
  }
}


import { TemplateBlock } from "@/components/email/template-builder/blocks";

export interface PrebuiltTemplate {
  name: string;
  category: string;
  description: string;
  tags: string[];
  blocks: TemplateBlock[];
  variables: string[];
  preview_image_url?: string;
}

export const prebuiltTemplates: PrebuiltTemplate[] = [
  {
    name: "Welcome Email",
    category: "registration",
    description: "A warm welcome message for new users",
    tags: ["welcome", "onboarding", "registration"],
    variables: ["name", "dashboard_url"],
    blocks: [
      {
        id: "1",
        type: "text",
        content: { text: "Welcome {{name}}!" }
      },
      {
        id: "2", 
        type: "text",
        content: { text: "Thank you for joining us. We're excited to have you on board." }
      },
      {
        id: "3",
        type: "button",
        content: { label: "Get Started", url: "{{dashboard_url}}" }
      }
    ]
  },
  {
    name: "Webinar Reminder",
    category: "reminder",
    description: "Remind attendees about upcoming webinars",
    tags: ["reminder", "webinar", "notification"],
    variables: ["webinar_title", "time_until", "start_time", "join_url"],
    blocks: [
      {
        id: "1",
        type: "text",
        content: { text: "Don't forget: {{webinar_title}}" }
      },
      {
        id: "2",
        type: "text", 
        content: { text: "Your webinar starts in {{time_until}} at {{start_time}}." }
      },
      {
        id: "3",
        type: "button",
        content: { label: "Join Webinar", url: "{{join_url}}" }
      }
    ]
  },
  {
    name: "Thank You for Attending",
    category: "follow-up",
    description: "Thank attendees and share resources",
    tags: ["thank-you", "follow-up", "resources"],
    variables: ["webinar_title", "resources_url"],
    blocks: [
      {
        id: "1",
        type: "text",
        content: { text: "Thank you for attending {{webinar_title}}!" }
      },
      {
        id: "2",
        type: "text",
        content: { text: "We hope you found the session valuable. Here are the resources we mentioned:" }
      },
      {
        id: "3",
        type: "button", 
        content: { label: "Download Resources", url: "{{resources_url}}" }
      }
    ]
  },
  {
    name: "We Miss You",
    category: "re-engagement",
    description: "Re-engage inactive users",
    tags: ["re-engagement", "winback", "inactive"],
    variables: ["name", "webinars_url"],
    blocks: [
      {
        id: "1",
        type: "text",
        content: { text: "We miss you, {{name}}!" }
      },
      {
        id: "2",
        type: "text",
        content: { text: "It's been a while since your last webinar. Come back and see what's new." }
      },
      {
        id: "3",
        type: "button",
        content: { label: "Browse Webinars", url: "{{webinars_url}}" }
      }
    ]
  },
  {
    name: "Newsletter Template",
    category: "custom",
    description: "Professional newsletter layout",
    tags: ["newsletter", "updates", "professional"],
    variables: ["newsletter_title", "main_content", "website_url"],
    blocks: [
      {
        id: "1",
        type: "text",
        content: { text: "{{newsletter_title}}" }
      },
      {
        id: "2",
        type: "divider",
        content: {}
      },
      {
        id: "3",
        type: "text",
        content: { text: "{{main_content}}" }
      },
      {
        id: "4",
        type: "button",
        content: { label: "Visit Website", url: "{{website_url}}" }
      }
    ]
  }
];

export const getTemplatesByCategory = (category: string) => {
  return prebuiltTemplates.filter(template => template.category === category);
};

export const getTemplatesByTag = (tag: string) => {
  return prebuiltTemplates.filter(template => template.tags.includes(tag));
};

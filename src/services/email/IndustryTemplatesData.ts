
import { TemplateBlock } from "@/components/email/template-builder/blocks";

export interface IndustryTemplate {
  name: string;
  industry: string;
  category: string;
  description: string;
  tags: string[];
  blocks: TemplateBlock[];
  variables: string[];
  preview_image_url?: string;
  use_cases: string[];
}

export const industryTemplates: IndustryTemplate[] = [
  // Technology & SaaS
  {
    name: "Product Launch Announcement",
    industry: "technology",
    category: "announcement",
    description: "Professional product launch email for tech companies",
    tags: ["product-launch", "technology", "announcement", "saas"],
    use_cases: ["New feature releases", "Product updates", "Beta launches"],
    variables: ["product_name", "launch_date", "key_features", "cta_url", "demo_url"],
    blocks: [
      { id: "1", type: "text", content: { text: "🚀 Introducing {{product_name}}" } },
      { id: "2", type: "text", content: { text: "We're excited to announce the launch of {{product_name}} on {{launch_date}}. This groundbreaking solution will transform how you work." } },
      { id: "3", type: "text", content: { text: "Key Features:\n{{key_features}}" } },
      { id: "4", type: "button", content: { label: "Try It Now", url: "{{cta_url}}" } },
      { id: "5", type: "button", content: { label: "Watch Demo", url: "{{demo_url}}" } }
    ]
  },
  {
    name: "Software Update Notification",
    industry: "technology",
    category: "notification",
    description: "Clean notification template for software updates",
    tags: ["update", "software", "notification", "changelog"],
    use_cases: ["Version releases", "Bug fixes", "Security updates"],
    variables: ["software_name", "version_number", "update_highlights", "update_url"],
    blocks: [
      { id: "1", type: "text", content: { text: "{{software_name}} {{version_number}} is Now Available" } },
      { id: "2", type: "text", content: { text: "We've improved {{software_name}} with new features and bug fixes:" } },
      { id: "3", type: "text", content: { text: "{{update_highlights}}" } },
      { id: "4", type: "button", content: { label: "Update Now", url: "{{update_url}}" } }
    ]
  },

  // Healthcare
  {
    name: "Appointment Reminder",
    industry: "healthcare",
    category: "reminder",
    description: "Professional appointment reminder for healthcare providers",
    tags: ["appointment", "healthcare", "reminder", "medical"],
    use_cases: ["Doctor appointments", "Consultation reminders", "Treatment schedules"],
    variables: ["patient_name", "appointment_date", "appointment_time", "doctor_name", "location", "reschedule_url"],
    blocks: [
      { id: "1", type: "text", content: { text: "Appointment Reminder - {{patient_name}}" } },
      { id: "2", type: "text", content: { text: "Dear {{patient_name}},\n\nThis is a friendly reminder of your upcoming appointment:" } },
      { id: "3", type: "text", content: { text: "📅 Date: {{appointment_date}}\n🕐 Time: {{appointment_time}}\n👨‍⚕️ Provider: {{doctor_name}}\n📍 Location: {{location}}" } },
      { id: "4", type: "button", content: { label: "Confirm Appointment", url: "{{confirm_url}}" } },
      { id: "5", type: "button", content: { label: "Reschedule", url: "{{reschedule_url}}" } }
    ]
  },
  {
    name: "Health Tips Newsletter",
    industry: "healthcare",
    category: "newsletter",
    description: "Educational health content template",
    tags: ["health", "education", "newsletter", "wellness"],
    use_cases: ["Monthly health tips", "Wellness content", "Prevention advice"],
    variables: ["health_topic", "tip_content", "expert_name", "read_more_url"],
    blocks: [
      { id: "1", type: "text", content: { text: "🌿 Weekly Health Tip: {{health_topic}}" } },
      { id: "2", type: "text", content: { text: "{{tip_content}}" } },
      { id: "3", type: "text", content: { text: "Expert insight from {{expert_name}}" } },
      { id: "4", type: "button", content: { label: "Read Full Article", url: "{{read_more_url}}" } }
    ]
  },

  // E-commerce & Retail
  {
    name: "Abandoned Cart Recovery",
    industry: "ecommerce",
    category: "recovery",
    description: "Persuasive abandoned cart email with urgency",
    tags: ["cart-abandonment", "ecommerce", "recovery", "sales"],
    use_cases: ["Cart recovery", "Purchase completion", "Revenue recovery"],
    variables: ["customer_name", "cart_items", "cart_total", "discount_code", "cart_url"],
    blocks: [
      { id: "1", type: "text", content: { text: "Don't Miss Out, {{customer_name}}!" } },
      { id: "2", type: "text", content: { text: "You left some great items in your cart:" } },
      { id: "3", type: "text", content: { text: "{{cart_items}}\n\nTotal: {{cart_total}}" } },
      { id: "4", type: "text", content: { text: "Complete your purchase now and save 10% with code: {{discount_code}}" } },
      { id: "5", type: "button", content: { label: "Complete Purchase", url: "{{cart_url}}" } }
    ]
  },
  {
    name: "Order Confirmation",
    industry: "ecommerce",
    category: "transactional",
    description: "Professional order confirmation template",
    tags: ["order", "confirmation", "ecommerce", "receipt"],
    use_cases: ["Purchase confirmations", "Order receipts", "Transaction records"],
    variables: ["customer_name", "order_number", "order_items", "total_amount", "tracking_url"],
    blocks: [
      { id: "1", type: "text", content: { text: "Order Confirmed - Thank You {{customer_name}}!" } },
      { id: "2", type: "text", content: { text: "Your order #{{order_number}} has been confirmed and is being processed." } },
      { id: "3", type: "text", content: { text: "Order Summary:\n{{order_items}}\n\nTotal: {{total_amount}}" } },
      { id: "4", type: "button", content: { label: "Track Your Order", url: "{{tracking_url}}" } }
    ]
  },

  // Education
  {
    name: "Course Enrollment Confirmation",
    industry: "education",
    category: "confirmation",
    description: "Welcome email for course enrollment",
    tags: ["course", "education", "enrollment", "learning"],
    use_cases: ["Course confirmations", "Class enrollment", "Training programs"],
    variables: ["student_name", "course_name", "start_date", "instructor_name", "course_url"],
    blocks: [
      { id: "1", type: "text", content: { text: "Welcome to {{course_name}}, {{student_name}}!" } },
      { id: "2", type: "text", content: { text: "You're successfully enrolled in {{course_name}} starting {{start_date}}." } },
      { id: "3", type: "text", content: { text: "Your instructor {{instructor_name}} will guide you through this learning journey." } },
      { id: "4", type: "button", content: { label: "Access Course", url: "{{course_url}}" } }
    ]
  },
  {
    name: "Assignment Deadline Reminder",
    industry: "education",
    category: "reminder",
    description: "Student assignment deadline notification",
    tags: ["assignment", "deadline", "education", "reminder"],
    use_cases: ["Assignment reminders", "Deadline notifications", "Academic alerts"],
    variables: ["student_name", "assignment_name", "due_date", "submission_url"],
    blocks: [
      { id: "1", type: "text", content: { text: "Assignment Reminder - {{assignment_name}}" } },
      { id: "2", type: "text", content: { text: "Hi {{student_name}},\n\nDon't forget that {{assignment_name}} is due on {{due_date}}." } },
      { id: "3", type: "button", content: { label: "Submit Assignment", url: "{{submission_url}}" } }
    ]
  },

  // Real Estate
  {
    name: "New Property Listing",
    industry: "real-estate",
    category: "listing",
    description: "Attractive property listing notification",
    tags: ["property", "listing", "real-estate", "notification"],
    use_cases: ["Property alerts", "New listings", "Market updates"],
    variables: ["client_name", "property_address", "price", "features", "listing_url", "agent_name"],
    blocks: [
      { id: "1", type: "text", content: { text: "New Property Alert for {{client_name}}" } },
      { id: "2", type: "text", content: { text: "🏠 {{property_address}}\n💰 {{price}}" } },
      { id: "3", type: "text", content: { text: "Key Features:\n{{features}}" } },
      { id: "4", type: "button", content: { label: "View Property", url: "{{listing_url}}" } },
      { id: "5", type: "text", content: { text: "Contact {{agent_name}} for more information." } }
    ]
  },

  // Finance & Investment
  {
    name: "Portfolio Update",
    industry: "finance",
    category: "update",
    description: "Professional portfolio performance update",
    tags: ["portfolio", "finance", "investment", "update"],
    use_cases: ["Portfolio reports", "Investment updates", "Financial summaries"],
    variables: ["client_name", "portfolio_value", "performance_summary", "dashboard_url"],
    blocks: [
      { id: "1", type: "text", content: { text: "Portfolio Update - {{client_name}}" } },
      { id: "2", type: "text", content: { text: "Current Portfolio Value: {{portfolio_value}}" } },
      { id: "3", type: "text", content: { text: "Performance Summary:\n{{performance_summary}}" } },
      { id: "4", type: "button", content: { label: "View Dashboard", url: "{{dashboard_url}}" } }
    ]
  },

  // Fitness & Wellness
  {
    name: "Workout Plan Update",
    industry: "fitness",
    category: "update",
    description: "Personalized workout plan notification",
    tags: ["workout", "fitness", "plan", "health"],
    use_cases: ["Training updates", "Fitness plans", "Wellness programs"],
    variables: ["member_name", "workout_plan", "schedule", "trainer_name", "app_url"],
    blocks: [
      { id: "1", type: "text", content: { text: "New Workout Plan Ready, {{member_name}}! 💪" } },
      { id: "2", type: "text", content: { text: "Your personalized workout plan:\n{{workout_plan}}" } },
      { id: "3", type: "text", content: { text: "Schedule: {{schedule}}\nTrainer: {{trainer_name}}" } },
      { id: "4", type: "button", content: { label: "Start Workout", url: "{{app_url}}" } }
    ]
  },

  // Food & Restaurant
  {
    name: "Restaurant Reservation Confirmation",
    industry: "restaurant",
    category: "confirmation",
    description: "Elegant reservation confirmation template",
    tags: ["reservation", "restaurant", "confirmation", "dining"],
    use_cases: ["Table reservations", "Event bookings", "Dining confirmations"],
    variables: ["guest_name", "reservation_date", "reservation_time", "party_size", "restaurant_name"],
    blocks: [
      { id: "1", type: "text", content: { text: "Reservation Confirmed at {{restaurant_name}}" } },
      { id: "2", type: "text", content: { text: "Dear {{guest_name}},\n\nYour table is reserved!" } },
      { id: "3", type: "text", content: { text: "📅 {{reservation_date}}\n🕐 {{reservation_time}}\n👥 Party of {{party_size}}" } },
      { id: "4", type: "text", content: { text: "We look forward to serving you!" } }
    ]
  },

  // Travel & Hospitality
  {
    name: "Booking Confirmation",
    industry: "travel",
    category: "confirmation",
    description: "Comprehensive travel booking confirmation",
    tags: ["booking", "travel", "confirmation", "hospitality"],
    use_cases: ["Hotel bookings", "Travel confirmations", "Reservation receipts"],
    variables: ["guest_name", "hotel_name", "check_in", "check_out", "room_type", "booking_ref"],
    blocks: [
      { id: "1", type: "text", content: { text: "Booking Confirmed - {{hotel_name}}" } },
      { id: "2", type: "text", content: { text: "Dear {{guest_name}},\n\nYour reservation is confirmed!" } },
      { id: "3", type: "text", content: { text: "Check-in: {{check_in}}\nCheck-out: {{check_out}}\nRoom: {{room_type}}\nReference: {{booking_ref}}" } },
      { id: "4", type: "text", content: { text: "Have a wonderful stay!" } }
    ]
  },

  // Non-Profit
  {
    name: "Donation Thank You",
    industry: "nonprofit",
    category: "thank-you",
    description: "Heartfelt donation acknowledgment template",
    tags: ["donation", "nonprofit", "thank-you", "charity"],
    use_cases: ["Donation receipts", "Fundraising thanks", "Impact reports"],
    variables: ["donor_name", "donation_amount", "cause_name", "impact_statement"],
    blocks: [
      { id: "1", type: "text", content: { text: "Thank You for Your Generous Support! ❤️" } },
      { id: "2", type: "text", content: { text: "Dear {{donor_name}},\n\nYour donation of {{donation_amount}} to {{cause_name}} makes a real difference." } },
      { id: "3", type: "text", content: { text: "Impact: {{impact_statement}}" } },
      { id: "4", type: "text", content: { text: "With gratitude,\nThe Team" } }
    ]
  },

  // Legal Services
  {
    name: "Legal Consultation Confirmation",
    industry: "legal",
    category: "confirmation",
    description: "Professional legal consultation scheduling",
    tags: ["legal", "consultation", "appointment", "professional"],
    use_cases: ["Legal appointments", "Consultation bookings", "Client meetings"],
    variables: ["client_name", "consultation_date", "consultation_time", "lawyer_name", "meeting_type"],
    blocks: [
      { id: "1", type: "text", content: { text: "Legal Consultation Confirmed" } },
      { id: "2", type: "text", content: { text: "Dear {{client_name}},\n\nYour consultation is scheduled:" } },
      { id: "3", type: "text", content: { text: "Date: {{consultation_date}}\nTime: {{consultation_time}}\nAttorney: {{lawyer_name}}\nType: {{meeting_type}}" } },
      { id: "4", type: "text", content: { text: "Please bring relevant documents to your appointment." } }
    ]
  }
];

export const getTemplatesByIndustry = (industry: string) => {
  return industryTemplates.filter(template => template.industry === industry);
};

export const getTemplatesByCategory = (category: string) => {
  return industryTemplates.filter(template => template.category === category);
};

export const getAllIndustries = () => {
  const industries = [...new Set(industryTemplates.map(t => t.industry))];
  return industries.map(industry => ({
    id: industry,
    name: industry.charAt(0).toUpperCase() + industry.slice(1),
    count: industryTemplates.filter(t => t.industry === industry).length
  }));
};

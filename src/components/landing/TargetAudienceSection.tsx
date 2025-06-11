
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, GraduationCap, Building, Briefcase } from "lucide-react";

const targetAudience = [
  {
    icon: Users,
    title: "Marketers",
    description: "Who run webinars every month and hate digging through spreadsheets"
  },
  {
    icon: GraduationCap,
    title: "Educators & Trainers",
    description: "Who want to measure learner engagement"
  },
  {
    icon: Building,
    title: "SaaS Teams",
    description: "Running onboarding, demos, and community sessions"
  },
  {
    icon: Briefcase,
    title: "Agencies",
    description: "Managing webinars for multiple clients"
  }
];

export const TargetAudienceSection = () => {
  return (
    <section className="py-16 px-4 bg-gray-50">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Who's It For?
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {targetAudience.map((audience, index) => (
            <Card key={index} className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <audience.icon className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{audience.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 text-sm">
                  {audience.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

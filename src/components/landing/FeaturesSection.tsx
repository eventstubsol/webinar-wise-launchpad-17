
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Brain, BarChart3, FileText, Shield } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Sync Instantly with Zoom",
    description: "Pull in registrants, attendees, polls, and Q&A with one click. No exports. No mess."
  },
  {
    icon: Brain,
    title: "AI-Powered Insights",
    description: "Spot trends, drop-offs, and engagement patterns — no analyst required."
  },
  {
    icon: BarChart3,
    title: "Interactive Dashboards",
    description: "Visualize attendance, engagement, and audience behavior in real time."
  },
  {
    icon: FileText,
    title: "Export Beautiful Reports",
    description: "Download branded PDFs, Excel workbooks, or raw CSVs — ready for stakeholders."
  },
  {
    icon: Shield,
    title: "Built for Security",
    description: "Powered by Supabase with secure authentication, access control, and privacy by design."
  }
];

export const FeaturesSection = () => {
  return (
    <section className="py-16 px-4 bg-white">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Why Webinar Wise?
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Transform your Zoom webinar data into actionable business intelligence
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.slice(0, 3).map((feature, index) => (
            <Card key={index} className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 max-w-4xl mx-auto">
          {features.slice(3).map((feature, index) => (
            <Card key={index + 3} className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};


import { Zap, Brain, BarChart3, FileText, Shield } from "lucide-react";
import { Meteors } from "@/components/ui/meteors";

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
    <section className="relative -mt-32 pt-32 pb-16 px-4 bg-gradient-to-b from-transparent via-white to-white z-10">
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
            <div key={index} className="w-full relative max-w-xs mx-auto">
              <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-blue-500 to-teal-500 transform scale-[0.80] rounded-full blur-3xl" />
              <div className="relative shadow-xl bg-gray-900 border border-gray-800 px-6 py-8 h-full overflow-hidden rounded-2xl flex flex-col justify-start items-start">
                <div className="h-10 w-10 rounded-full border flex items-center justify-center mb-6 border-gray-500">
                  <feature.icon className="h-5 w-5 text-white" />
                </div>

                <h3 className="font-bold text-xl text-white mb-4 relative z-50">
                  {feature.title}
                </h3>

                <p className="font-normal text-base text-white mb-4 relative z-50">
                  {feature.description}
                </p>

                <Meteors number={20} />
              </div>
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 max-w-4xl mx-auto">
          {features.slice(3).map((feature, index) => (
            <div key={index + 3} className="w-full relative max-w-xs mx-auto">
              <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-blue-500 to-teal-500 transform scale-[0.80] rounded-full blur-3xl" />
              <div className="relative shadow-xl bg-gray-900 border border-gray-800 px-6 py-8 h-full overflow-hidden rounded-2xl flex flex-col justify-start items-start">
                <div className="h-10 w-10 rounded-full border flex items-center justify-center mb-6 border-gray-500">
                  <feature.icon className="h-5 w-5 text-white" />
                </div>

                <h3 className="font-bold text-xl text-white mb-4 relative z-50">
                  {feature.title}
                </h3>

                <p className="font-normal text-base text-white mb-4 relative z-50">
                  {feature.description}
                </p>

                <Meteors number={20} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

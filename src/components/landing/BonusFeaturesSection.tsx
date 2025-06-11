
import { CheckCircle } from "lucide-react";

const bonusFeatures = [
  "CSV upload fallback (for users without Zoom OAuth)", 
  "Mobile-ready dashboards", 
  "Real-time sync status tracking", 
  "Custom branding on all reports"
];

export const BonusFeaturesSection = () => {
  return (
    <section className="py-20 px-4 bg-muted/30">
      <div className="container mx-auto text-center max-w-4xl">
        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
          Plus These Bonus Features
        </h2>
        <p className="text-xl text-muted-foreground mb-12">
          Everything you need to turn your webinar data into actionable insights
        </p>
        
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {bonusFeatures.map((feature, index) => (
            <div key={index} className="flex items-center space-x-3 p-4 bg-background rounded-lg shadow-sm">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span className="text-foreground font-medium">{feature}</span>
            </div>
          ))}
        </div>
        
        <div className="mt-12 p-6 bg-primary/5 rounded-lg border border-primary/20">
          <h3 className="text-lg font-semibold text-foreground mb-2">
            🚀 Ready to Launch
          </h3>
          <p className="text-muted-foreground">
            All features are production-ready and designed to scale with your business needs.
          </p>
        </div>
      </div>
    </section>
  );
};

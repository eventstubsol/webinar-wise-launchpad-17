
import { CheckCircle } from "lucide-react";

const bonusFeatures = [
  "CSV upload fallback (for users without Zoom OAuth)",
  "Mobile-ready dashboards",
  "Real-time sync status tracking",
  "Custom branding on all reports"
];

export const BonusFeaturesSection = () => {
  return (
    <section className="py-16 px-4 bg-gray-50">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Bonus Features
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {bonusFeatures.map((feature, index) => (
            <div key={index} className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700">{feature}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};


import { Link, Zap } from "lucide-react";

export const HowItWorksSection = () => {
  const steps = [
    {
      number: "01",
      title: "Connect",
      description: "Integrate with your Zoom account in a few clicks",
      icon: Link,
    },
    {
      number: "02", 
      title: "Analyze",
      description: "Our AI processes and organizes your webinar data",
      icon: Zap,
    },
    {
      number: "03",
      title: "Visualize", 
      description: "Access interactive dashboards and reports",
      icon: Link,
    },
    {
      number: "04",
      title: "Optimize",
      description: "Implement AI-suggested improvements",
      icon: Zap,
    },
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            How Webinar Wise Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Get started in minutes with our simple setup process
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => {
            const IconComponent = step.icon;
            return (
              <div key={index} className="text-center group">
                {/* Step Number */}
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary font-bold text-lg mb-6 group-hover:bg-primary/20 transition-colors duration-300">
                  {step.number}
                </div>

                {/* Icon */}
                <div className="flex justify-center mb-4">
                  <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <IconComponent className="w-6 h-6 text-foreground" />
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>

                {/* Connector Line (except for last item) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-1/2 w-full h-0.5 bg-border transform translate-x-8 -translate-y-1/2" />
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom decorative element */}
        <div className="mt-16 flex justify-center">
          <div className="w-24 h-1 bg-gradient-to-r from-primary to-primary/60 rounded-full" />
        </div>
      </div>
    </section>
  );
};

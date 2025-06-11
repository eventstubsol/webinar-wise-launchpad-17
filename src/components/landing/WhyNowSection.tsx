
import { SparklesCore } from "@/components/ui/sparkles-core";

export const WhyNowSection = () => {
  return (
    <section className="py-20 px-4 bg-gradient-to-br from-background to-muted/50 relative overflow-hidden">
      <div className="absolute inset-0 w-full h-full">
        <SparklesCore
          id="tsparticlesfullpage"
          background="transparent"
          minSize={0.6}
          maxSize={1.4}
          particleDensity={100}
          className="w-full h-full"
          particleColor="#3B82F6"
        />
      </div>
      
      <div className="container mx-auto text-center max-w-4xl relative z-10">
        <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
          Why Now Is The Perfect Time
        </h2>
        <div className="grid md:grid-cols-2 gap-8 mt-12">
          <div className="space-y-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-foreground">Remote Work Boom</h3>
            <p className="text-muted-foreground">
              Webinars became essential during the pandemic and are now a permanent part of business strategy. 
              The data from these sessions is more valuable than ever.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-foreground">Data-Driven Decisions</h3>
            <p className="text-muted-foreground">
              Companies are investing heavily in analytics tools. Your webinar data shouldn't be trapped 
              in Zoom's interface when it could be driving strategic decisions.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

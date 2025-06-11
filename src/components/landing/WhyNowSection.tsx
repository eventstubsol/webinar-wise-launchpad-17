import { SparklesCore } from "@/components/ui/sparkles-core";

export const WhyNowSection = () => {
  return (
    <section className="h-[40rem] w-full flex flex-col items-center justify-start overflow-hidden" style={{ backgroundColor: '#020617' }}>
      <h1 className="text-4xl font-bold text-center text-white relative z-20 mb-8">
        Why Now?
      </h1>
      <div className="w-[40rem] h-40 relative">
        {/* Gradients */}
        <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-indigo-500 to-transparent h-[2px] w-3/4 blur-sm" />
        <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-indigo-500 to-transparent h-px w-3/4" />
        <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-sky-500 to-transparent h-[5px] w-1/4 blur-sm" />
        <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-sky-500 to-transparent h-px w-1/4" />

        {/* Core component */}
        <SparklesCore
          background="transparent"
          minSize={0.4}
          maxSize={1}
          particleDensity={1200}
          className="w-full h-full"
          particleColor="#FFFFFF"
        />

        {/* Radial Gradient to prevent sharp edges */}
        <div className="absolute inset-0 w-full h-full" style={{ backgroundColor: '#020617', maskImage: 'radial-gradient(350px 200px at top, transparent 20%, white)' }}></div>
      </div>
      
      {/* Content below the sparkles */}
      <div className="text-center mt-8 max-w-4xl px-4 relative z-20">
        <p className="text-xl text-gray-300 mb-4">
          Because you're spending hours cleaning data when you should be learning from it.
        </p>
        <p className="text-lg text-gray-400">
          Webinar Wise turns every Zoom event into a strategic advantage — instantly.
        </p>
      </div>
    </section>
  );
};

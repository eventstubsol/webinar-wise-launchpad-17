import { Button } from "@/components/ui/button";
import { AnimatedGroup } from "@/components/ui/animated-group";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
export const HeroSection = () => {
  return <AuroraBackground className="overflow-hidden">
      <div className="relative pt-20 sm:pt-24 md:pt-32 lg:pt-40 w-full">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center sm:mx-auto lg:mr-auto lg:mt-0">
            <AnimatedGroup preset="blur-slide">
              <Link to="/register" className="hover:bg-background dark:hover:border-t-border bg-muted group mx-auto flex w-fit items-center gap-4 rounded-full border p-1 pl-4 shadow-md shadow-black/5 transition-all duration-300 dark:border-t-white/5 dark:shadow-zinc-950">
                <span className="text-foreground text-sm">Introducing Webinar Wise Analytics</span>
                <span className="dark:border-background block h-4 w-0.5 border-l bg-white dark:bg-zinc-700"></span>

                <div className="bg-background group-hover:bg-muted size-6 overflow-hidden rounded-full duration-500">
                  <div className="flex w-12 -translate-x-1/2 duration-500 ease-in-out group-hover:translate-x-0">
                    <span className="flex size-6">
                      <ArrowRight className="m-auto size-3" />
                    </span>
                    <span className="flex size-6">
                      <ArrowRight className="m-auto size-3" />
                    </span>
                  </div>
                </div>
              </Link>
    
              <h1 className="mt-8 max-w-4xl mx-auto text-balance text-4xl md:text-5xl lg:mt-16 xl:text-6xl font-bold text-gray-900 dark:text-white">
                <span className="block">Turn Zoom Webinar</span>
                <span className="text-primary block">Report Chaos into Clarity</span>
              </h1>
              
              <p className="mx-auto mt-8 max-w-2xl text-balance text-lg text-gray-600 dark:text-gray-300">
                Say goodbye to CSV headaches. Webinar Wise connects to Zoom, cleans your data, 
                and delivers beautiful insights, dashboards, and reports — automatically.
              </p>
            </AnimatedGroup>

            <AnimatedGroup preset="scale" className="mt-12 flex flex-col items-center justify-center gap-2 md:flex-row">
              <div className="bg-foreground/10 rounded-[14px] border p-0.5">
                <Button asChild size="lg" className="rounded-xl px-5 text-base">
                  <Link to="/register">
                    <span className="text-nowrap">Join the Waitlist</span>
                  </Link>
                </Button>
              </div>
              <Button asChild size="lg" variant="ghost" className="h-10.5 rounded-xl px-5">
                
              </Button>
            </AnimatedGroup>
            
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
              No credit card. No setup hassle. Just insights.
            </p>
          </div>
        </div>

        <AnimatedGroup preset="zoom">
          <div className="relative -mr-56 mt-8 overflow-hidden px-2 sm:mr-0 sm:mt-12 md:mt-20 pb-32">
            <div className="relative mx-auto max-w-6xl overflow-hidden rounded-2xl border p-4 shadow-lg shadow-zinc-950/15 ring-1 ring-background bg-background z-[2]">
              <div className="relative">
                <img className="bg-background aspect-[15/8] relative rounded-2xl" alt="Email Interface Preview" width="2700" height="1440" src="/lovable-uploads/72117dd5-e795-4677-a0d6-6aac40197a81.jpg" />
              </div>
              {/* Extended gradient overlay to completely fade out entire container including borders and shadow */}
              <div className="absolute -bottom-16 -left-8 -right-8 h-96 bg-gradient-to-t from-background via-background/98 via-background/90 via-background/70 to-transparent pointer-events-none z-10" />
            </div>
          </div>
        </AnimatedGroup>

        {/* Additional gradient overlay extending beyond the image container for seamless transition */}
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-background via-background/95 via-background/80 to-transparent z-[3] pointer-events-none" />
      </div>
    </AuroraBackground>;
};
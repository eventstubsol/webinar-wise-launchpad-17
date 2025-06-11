
"use client";

import React from "react";
import { Boxes } from "@/components/ui/background-boxes";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function BackgroundBoxesDemo() {
  return (
    <div className="h-96 relative w-full overflow-hidden bg-slate-900 flex flex-col items-center justify-center rounded-lg">
      <div className="absolute inset-0 w-full h-full bg-slate-900 z-20 [mask-image:radial-gradient(transparent,white)] pointer-events-none" />

      <Boxes />
      <h1 className={cn("md:text-4xl text-xl text-white relative z-20")}>
        Ready to transform your webinar analytics?
      </h1>
      <p className="text-center mt-2 text-neutral-300 relative z-20">
        Join our early access program and be the first to leverage the power of Webinar Wise for your organization.
      </p>
      
      <div className="mt-6 relative z-20">
        <div className="bg-foreground/10 rounded-[14px] border p-0.5">
          <Button asChild size="lg" className="rounded-xl px-5 text-base">
            <Link to="/register">
              <span className="text-nowrap">Join the Waitlist</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

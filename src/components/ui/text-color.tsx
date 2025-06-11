"use client";

import React from "react";
import { Plus } from "lucide-react"; 

export function TextColor() {
  return (
    <div>
      <div className=" mb-10 mt-4 md:mt-6">
        <div className="px-2">
          <div className="relative p-4 w-full h-full border border-slate-200 dark:border-slate-800 [mask-image:radial-gradient(200rem_24rem_at_center,white,transparent)] max-w-[1440px] mx-auto">
            <h1 className="tracking-tighter flex select-none px-1 py-1 flex-col text-center text-5xl font-extrabold leading-none sm:text-6xl md:flex-row">
              <Plus className="absolute -left-4 -top-4 h-8 w-8 text-indigo-500" />
              <Plus className="absolute -bottom-4 -left-4 h-8 w-8 text-indigo-500" />
              <Plus className="absolute -right-4 -top-4 h-8 w-8 text-indigo-500" />
              <Plus className="absolute -bottom-4 -right-4 h-8 w-8 text-indigo-500" />

              <span
                data-content="Connect."
                className="before:animate-gradient-background-1 relative before:absolute before:bottom-4 before:left-0 before:top-0 before:z-0  before:w-full before:px-1 before:content-[attr(data-content)]  sm:before:top-0"
              >
                <span className="from-gradient-1-start to-gradient-1-end animate-gradient-foreground-1 bg-gradient-to-r bg-clip-text px-1 text-transparent sm:px-2">
                Connect.
                </span>
              </span>
              <span
                data-content="Analyze."
                className="before:animate-gradient-background-2 relative before:absolute before:bottom-0 before:left-0 before:top-0 before:z-0 before:w-full before:px-1 before:content-[attr(data-content)] sm:before:top-0"
              >
                <span className="from-gradient-2-start to-gradient-2-end animate-gradient-foreground-2 bg-gradient-to-r bg-clip-text px-1 text-transparent sm:px-2">
                Analyze.
                </span>
              </span>
              <span
                data-content="Visualize."
                className="before:animate-gradient-background-3 relative before:absolute before:bottom-1 before:left-0 before:top-0 before:z-0 before:w-full before:px-1 before:content-[attr(data-content)] sm:before:top-0"
              >
                <span className="from-gradient-3-start to-gradient-3-end animate-gradient-foreground-3 bg-gradient-to-r bg-clip-text px-1 text-transparent sm:px-2">
                Visualize.
                </span>
              </span>
              <span
                data-content="Optimize."
                className="before:animate-gradient-background-4 relative before:absolute before:bottom-1 before:left-0 before:top-0 before:z-0 before:w-full before:px-1 before:content-[attr(data-content)] sm:before:top-0"
              >
                <span className="from-gradient-4-start to-gradient-4-end animate-gradient-foreground-4 bg-gradient-to-r bg-clip-text px-1 text-transparent sm:px-2">
                Optimize.
                </span>
              </span>
            </h1>
          </div>
        </div>
      </div>
    </div>
  );
}

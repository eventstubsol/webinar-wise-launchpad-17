
import React from "react";
import { cn } from "@/lib/utils";

interface SimpleBackgroundProps {
  className?: string;
  children?: React.ReactNode;
  intensity?: "subtle" | "medium" | "strong";
}

export const SimpleBackground: React.FC<SimpleBackgroundProps> = ({
  className,
  children,
  intensity = "medium"
}) => {
  const backgroundClass = {
    subtle: "bg-gradient-to-br from-slate-900 to-slate-800",
    medium: "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900",
    strong: "bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900"
  }[intensity];

  return (
    <div className={cn(
      "relative overflow-hidden",
      backgroundClass,
      className
    )}>
      {children}
    </div>
  );
};

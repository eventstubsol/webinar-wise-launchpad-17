
"use client";

import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface BentoItem {
    title: string;
    description: string;
    icon: React.ReactNode;
    status?: string;
    tags?: string[];
    meta?: string;
    cta?: string;
    colSpan?: number;
    hasPersistentHover?: boolean;
}

interface BentoGridProps {
    items: BentoItem[];
}

function BentoGridCard({ item, index }: { item: BentoItem; index: number }) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <motion.div
            className={cn(
                "relative rounded-xl overflow-hidden cursor-pointer",
                "transition-all duration-300 bg-card border border-border",
                "hover:shadow-lg",
                item.colSpan === 2 ? "md:col-span-2" : "col-span-1"
            )}
            style={{ minHeight: "200px" }}
            initial={{ y: 0 }}
            animate={{ y: isHovered ? -2 : 0 }}
            transition={{
                type: "spring",
                stiffness: 300,
                damping: 20
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Card content */}
            <div className="relative flex flex-col h-full p-6">
                {/* Icon and status */}
                <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10">
                        {item.icon}
                    </div>

                    <span className="text-xs font-medium px-2 py-1 rounded-lg bg-primary/10 text-primary">
                        {item.status || "Active"}
                    </span>
                </div>

                {/* Content */}
                <div className="flex-1 space-y-3">
                    <h3 className="font-medium text-foreground text-base tracking-tight">
                        {item.title}
                        {item.meta && (
                            <span className="ml-2 text-xs text-muted-foreground font-normal">
                                {item.meta}
                            </span>
                        )}
                    </h3>

                    <p className="text-sm leading-relaxed text-muted-foreground">
                        {item.description}
                    </p>
                </div>

                {/* Tags and CTA */}
                <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center space-x-2 text-xs">
                        {item.tags?.slice(0, 2).map((tag, i) => (
                            <span
                                key={i}
                                className="px-2 py-1 rounded-md bg-secondary text-secondary-foreground"
                            >
                                #{tag}
                            </span>
                        ))}
                    </div>

                    <motion.span
                        className="text-xs font-medium text-muted-foreground"
                        animate={{
                            opacity: isHovered ? 1 : 0,
                            x: isHovered ? 0 : -10,
                        }}
                        transition={{ duration: 0.3 }}
                    >
                        {item.cta || "Explore →"}
                    </motion.span>
                </div>
            </div>
        </motion.div>
    );
}

function BentoGrid({ items }: BentoGridProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 max-w-7xl mx-auto">
            {items.map((item, index) => (
                <BentoGridCard key={index} item={item} index={index} />
            ))}
        </div>
    );
}

export { BentoGrid };

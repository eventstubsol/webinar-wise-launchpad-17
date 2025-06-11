
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
    const cardRef = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);
    const [rotation, setRotation] = useState({ x: 0, y: 0 });

    // Handle mouse movement for 3D effect
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (cardRef.current) {
            const rect = cardRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            
            const rotateX = -(y / rect.height) * 3; // Reduced for bento grid
            const rotateY = (x / rect.width) * 3;
            
            setRotation({ x: rotateX, y: rotateY });
        }
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        setRotation({ x: 0, y: 0 });
    };

    return (
        <motion.div
            ref={cardRef}
            className={cn(
                "relative rounded-2xl overflow-hidden cursor-pointer",
                "transition-all duration-300 will-change-transform",
                item.colSpan === 2 ? "md:col-span-2" : "col-span-1"
            )}
            style={{
                transformStyle: "preserve-3d",
                backgroundColor: "#0a0a0a",
                minHeight: "200px",
            }}
            initial={{ y: 0 }}
            animate={{
                y: isHovered ? -3 : 0,
                rotateX: rotation.x,
                rotateY: rotation.y,
                perspective: 1000,
            }}
            transition={{
                type: "spring",
                stiffness: 300,
                damping: 20
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={handleMouseLeave}
            onMouseMove={handleMouseMove}
        >
            {/* Subtle glass reflection overlay */}
            <motion.div
                className="absolute inset-0 z-30 pointer-events-none"
                style={{
                    background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0) 80%, rgba(255,255,255,0.03) 100%)",
                    backdropFilter: "blur(1px)",
                }}
                animate={{
                    opacity: isHovered ? 0.7 : 0.4,
                }}
                transition={{ duration: 0.3 }}
            />

            {/* Dark background gradient */}
            <div
                className="absolute inset-0 z-0"
                style={{
                    background: "linear-gradient(145deg, #0a0a0a 0%, #050505 100%)",
                }}
            />

            {/* Noise texture overlay */}
            <div
                className="absolute inset-0 opacity-20 mix-blend-overlay z-5"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                }}
            />

            {/* Purple/blue glow effect */}
            <motion.div
                className="absolute bottom-0 left-0 right-0 h-3/4 z-10"
                style={{
                    background: `
                        radial-gradient(ellipse at bottom right, rgba(172, 92, 255, 0.4) -20%, transparent 70%),
                        radial-gradient(ellipse at bottom left, rgba(56, 189, 248, 0.4) -20%, transparent 70%)
                    `,
                    filter: "blur(20px)",
                }}
                animate={{
                    opacity: isHovered ? 0.8 : 0.6,
                }}
                transition={{ duration: 0.3 }}
            />

            {/* Central glow */}
            <motion.div
                className="absolute bottom-0 left-0 right-0 h-2/3 z-11"
                style={{
                    background: `radial-gradient(circle at bottom center, rgba(139, 69, 255, 0.5) -30%, transparent 60%)`,
                    filter: "blur(25px)",
                }}
                animate={{
                    opacity: isHovered ? 0.7 : 0.5,
                }}
                transition={{ duration: 0.3 }}
            />

            {/* Enhanced bottom border glow */}
            <motion.div
                className="absolute bottom-0 left-0 right-0 h-[1px] z-20"
                style={{
                    background: "linear-gradient(90deg, rgba(255, 255, 255, 0.02) 0%, rgba(139, 69, 255, 0.6) 50%, rgba(255, 255, 255, 0.02) 100%)",
                }}
                animate={{
                    boxShadow: isHovered
                        ? "0 0 20px 2px rgba(172, 92, 255, 0.7), 0 0 30px 4px rgba(139, 69, 255, 0.5)"
                        : "0 0 15px 1px rgba(172, 92, 255, 0.5), 0 0 25px 3px rgba(139, 69, 255, 0.3)",
                    opacity: isHovered ? 1 : 0.8,
                }}
                transition={{ duration: 0.3 }}
            />

            {/* Card content */}
            <motion.div
                className="relative flex flex-col h-full p-6 z-40"
                animate={{
                    z: 2
                }}
            >
                {/* Icon and status */}
                <div className="flex items-center justify-between mb-4">
                    <motion.div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{
                            background: "linear-gradient(145deg, #1a1a1a 0%, #0d0d0d 100%)",
                            position: "relative",
                            overflow: "hidden"
                        }}
                        animate={{
                            boxShadow: isHovered
                                ? "0 4px 12px -1px rgba(0, 0, 0, 0.3), inset 1px 1px 3px rgba(255, 255, 255, 0.1), inset -1px -1px 3px rgba(0, 0, 0, 0.5)"
                                : "0 2px 8px -1px rgba(0, 0, 0, 0.2), inset 1px 1px 2px rgba(255, 255, 255, 0.08), inset -1px -1px 2px rgba(0, 0, 0, 0.4)",
                        }}
                        transition={{ duration: 0.3 }}
                    >
                        {/* Top-left highlight */}
                        <div
                            className="absolute top-0 left-0 w-2/3 h-2/3 opacity-30"
                            style={{
                                background: "radial-gradient(circle at top left, rgba(255, 255, 255, 0.3), transparent 70%)",
                                filter: "blur(6px)"
                            }}
                        />
                        
                        <div className="relative z-10">
                            {item.icon}
                        </div>
                    </motion.div>

                    <motion.span
                        className="text-xs font-medium px-2 py-1 rounded-lg"
                        style={{
                            background: "rgba(255, 255, 255, 0.05)",
                            color: "rgba(255, 255, 255, 0.7)",
                            backdropFilter: "blur(10px)",
                        }}
                        animate={{
                            background: isHovered ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.05)",
                        }}
                        transition={{ duration: 0.3 }}
                    >
                        {item.status || "Active"}
                    </motion.span>
                </div>

                {/* Content */}
                <div className="flex-1 space-y-3">
                    <motion.h3
                        className="font-medium text-white text-base tracking-tight"
                        style={{ lineHeight: 1.2 }}
                        animate={{
                            textShadow: isHovered ? "0 1px 3px rgba(0,0,0,0.3)" : "none",
                        }}
                        transition={{ duration: 0.3 }}
                    >
                        {item.title}
                        {item.meta && (
                            <span className="ml-2 text-xs text-gray-400 font-normal">
                                {item.meta}
                            </span>
                        )}
                    </motion.h3>

                    <motion.p
                        className="text-sm leading-relaxed"
                        style={{
                            color: "rgba(255, 255, 255, 0.6)",
                            fontWeight: 400,
                        }}
                        animate={{
                            color: isHovered ? "rgba(255, 255, 255, 0.7)" : "rgba(255, 255, 255, 0.6)",
                        }}
                        transition={{ duration: 0.3 }}
                    >
                        {item.description}
                    </motion.p>
                </div>

                {/* Tags and CTA */}
                <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center space-x-2 text-xs">
                        {item.tags?.slice(0, 2).map((tag, i) => (
                            <motion.span
                                key={i}
                                className="px-2 py-1 rounded-md"
                                style={{
                                    background: "rgba(255, 255, 255, 0.03)",
                                    color: "rgba(255, 255, 255, 0.5)",
                                    backdropFilter: "blur(10px)",
                                }}
                                animate={{
                                    background: isHovered ? "rgba(255, 255, 255, 0.06)" : "rgba(255, 255, 255, 0.03)",
                                }}
                                transition={{ duration: 0.3 }}
                            >
                                #{tag}
                            </motion.span>
                        ))}
                    </div>

                    <motion.span
                        className="text-xs font-medium"
                        style={{ color: "rgba(255, 255, 255, 0.4)" }}
                        animate={{
                            opacity: isHovered ? 1 : 0,
                            x: isHovered ? 0 : -10,
                        }}
                        transition={{ duration: 0.3 }}
                    >
                        {item.cta || "Explore →"}
                    </motion.span>
                </div>
            </motion.div>

            {/* Border gradient */}
            <motion.div
                className="absolute inset-0 -z-10 rounded-2xl p-px"
                style={{
                    background: "linear-gradient(145deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 50%, rgba(255,255,255,0.1) 100%)",
                }}
                animate={{
                    opacity: isHovered ? 1 : 0.6,
                }}
                transition={{ duration: 0.3 }}
            />
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


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

            const rotateX = -(y / rect.height) * 3; // Reduced for grid cards
            const rotateY = (x / rect.width) * 3; // Reduced for grid cards

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
            className="relative rounded-xl overflow-hidden cursor-pointer"
            style={{
                minHeight: "280px",
                transformStyle: "preserve-3d",
                backgroundColor: "#0e131f",
                boxShadow: "0 -5px 50px 5px rgba(78, 99, 255, 0.15), 0 0 5px 0 rgba(0, 0, 0, 0.3)",
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
            {/* Glass reflection overlay */}
            <motion.div
                className="absolute inset-0 z-35 pointer-events-none"
                style={{
                    background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0) 80%, rgba(255,255,255,0.05) 100%)",
                    backdropFilter: "blur(2px)",
                }}
                animate={{
                    opacity: isHovered ? 0.7 : 0.5,
                    rotateX: -rotation.x * 0.2,
                    rotateY: -rotation.y * 0.2,
                    z: 1,
                }}
                transition={{
                    duration: 0.4,
                    ease: "easeOut"
                }}
            />

            {/* Dark background */}
            <motion.div
                className="absolute inset-0 z-0"
                style={{
                    background: "linear-gradient(180deg, #000000 0%, #000000 70%)",
                }}
                animate={{
                    z: -1
                }}
            />

            {/* Noise texture overlay */}
            <motion.div
                className="absolute inset-0 opacity-30 mix-blend-overlay z-10"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                }}
                animate={{
                    z: -0.5
                }}
            />

            {/* Purple/blue glow effect */}
            <motion.div
                className="absolute bottom-0 left-0 right-0 h-2/3 z-20"
                style={{
                    background: `
                        radial-gradient(ellipse at bottom right, rgba(172, 92, 255, 0.5) -10%, rgba(79, 70, 229, 0) 70%),
                        radial-gradient(ellipse at bottom left, rgba(56, 189, 248, 0.5) -10%, rgba(79, 70, 229, 0) 70%)
                    `,
                    filter: "blur(30px)",
                }}
                animate={{
                    opacity: isHovered ? 0.8 : 0.6,
                    y: isHovered ? rotation.x * 0.5 : 0,
                    z: 0
                }}
                transition={{
                    duration: 0.4,
                    ease: "easeOut"
                }}
            />

            {/* Central purple glow */}
            <motion.div
                className="absolute bottom-0 left-0 right-0 h-2/3 z-21"
                style={{
                    background: `
                        radial-gradient(circle at bottom center, rgba(161, 58, 229, 0.5) -20%, rgba(79, 70, 229, 0) 60%)
                    `,
                    filter: "blur(35px)",
                }}
                animate={{
                    opacity: isHovered ? 0.7 : 0.5,
                    y: isHovered ? `calc(10% + ${rotation.x * 0.3}px)` : "10%",
                    z: 0
                }}
                transition={{
                    duration: 0.4,
                    ease: "easeOut"
                }}
            />

            {/* Bottom border glow */}
            <motion.div
                className="absolute bottom-0 left-0 right-0 h-[2px] z-25"
                style={{
                    background: "linear-gradient(90deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.5) 50%, rgba(255, 255, 255, 0.05) 100%)",
                }}
                animate={{
                    boxShadow: isHovered
                        ? "0 0 15px 3px rgba(172, 92, 255, 0.7), 0 0 20px 4px rgba(138, 58, 185, 0.5), 0 0 25px 5px rgba(56, 189, 248, 0.3)"
                        : "0 0 10px 2px rgba(172, 92, 255, 0.6), 0 0 15px 3px rgba(138, 58, 185, 0.4), 0 0 20px 4px rgba(56, 189, 248, 0.2)",
                    opacity: isHovered ? 1 : 0.8,
                    z: 0.5
                }}
                transition={{
                    duration: 0.4,
                    ease: "easeOut"
                }}
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
                        className="w-10 h-10 rounded-lg flex items-center justify-center relative overflow-hidden"
                        style={{
                            background: "linear-gradient(225deg, #171c2c 0%, #121624 100%)",
                        }}
                        animate={{
                            boxShadow: isHovered
                                ? "0 6px 12px -2px rgba(0, 0, 0, 0.25), 0 3px 6px -1px rgba(0, 0, 0, 0.15), inset 1px 1px 3px rgba(255, 255, 255, 0.12), inset -1px -1px 3px rgba(0, 0, 0, 0.5)"
                                : "0 4px 8px -2px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.1), inset 1px 1px 2px rgba(255, 255, 255, 0.1), inset -1px -1px 2px rgba(0, 0, 0, 0.4)",
                            y: isHovered ? -1 : 0,
                            rotateX: isHovered ? -rotation.x * 0.3 : 0,
                            rotateY: isHovered ? -rotation.y * 0.3 : 0
                        }}
                        transition={{
                            duration: 0.4,
                            ease: "easeOut"
                        }}
                    >
                        {/* Top-left highlight */}
                        <div
                            className="absolute top-0 left-0 w-2/3 h-2/3 opacity-30"
                            style={{
                                background: "radial-gradient(circle at top left, rgba(255, 255, 255, 0.4), transparent 80%)",
                                pointerEvents: "none",
                                filter: "blur(8px)"
                            }}
                        />
                        <div className="relative z-10 text-cyan-400">
                            {item.icon}
                        </div>
                    </motion.div>

                    <motion.span 
                        className="text-xs font-medium px-2 py-1 rounded-lg text-white"
                        style={{
                            background: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)",
                            backdropFilter: "blur(10px)"
                        }}
                        animate={{
                            boxShadow: isHovered ? "0 2px 8px rgba(172, 92, 255, 0.3)" : "none"
                        }}
                    >
                        {item.status || "Active"}
                    </motion.span>
                </div>

                {/* Content */}
                <motion.div
                    className="flex-1 space-y-3"
                    animate={{
                        z: isHovered ? 3 : 1,
                        rotateX: isHovered ? -rotation.x * 0.2 : 0,
                        rotateY: isHovered ? -rotation.y * 0.2 : 0
                    }}
                    transition={{
                        duration: 0.4,
                        ease: "easeOut"
                    }}
                >
                    <motion.h3 
                        className="font-medium text-white text-base tracking-tight"
                        style={{
                            letterSpacing: "-0.01em",
                            lineHeight: 1.2,
                        }}
                        animate={{
                            textShadow: isHovered ? "0 2px 4px rgba(0,0,0,0.2)" : "none",
                        }}
                    >
                        {item.title}
                        {item.meta && (
                            <span className="ml-2 text-xs text-gray-400 font-normal">
                                {item.meta}
                            </span>
                        )}
                    </motion.h3>

                    <motion.p 
                        className="text-sm leading-relaxed text-gray-300"
                        style={{
                            lineHeight: 1.5,
                        }}
                        animate={{
                            textShadow: isHovered ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
                            opacity: 0.85,
                        }}
                    >
                        {item.description}
                    </motion.p>
                </motion.div>

                {/* CTA */}
                <div className="flex items-center justify-end mt-4">
                    <motion.span
                        className="text-xs font-medium text-white inline-flex items-center"
                        animate={{
                            opacity: isHovered ? 1 : 0,
                            x: isHovered ? 0 : -10,
                        }}
                        transition={{ duration: 0.3 }}
                    >
                        {item.cta || "Explore"}
                        <motion.svg
                            className="ml-1 w-3 h-3"
                            viewBox="0 0 16 16"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            animate={{
                                x: isHovered ? 2 : 0
                            }}
                            transition={{
                                duration: 0.4,
                                ease: "easeOut"
                            }}
                        >
                            <path
                                d="M1 8H15M15 8L8 1M15 8L8 15"
                                stroke="white"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </motion.svg>
                    </motion.span>
                </div>
            </motion.div>
        </motion.div>
    );
}

function BentoGrid({ items }: BentoGridProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 max-w-7xl mx-auto">
            {items.map((item, index) => (
                <BentoGridCard key={index} item={item} index={index} />
            ))}
        </div>
    );
}

export { BentoGrid };

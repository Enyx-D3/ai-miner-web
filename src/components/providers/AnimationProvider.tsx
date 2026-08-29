"use client";

import { cn } from "@/lib/utils";
import { motion, Variants } from "framer-motion";
import { ReactNode } from "react";

type AnimationType =
  | "fade-up"
  | "fade-down"
  | "fade-left"
  | "fade-right"
  | "zoom-in"
  | "zoom-out"
  | "slide-in-top"
  | "slide-in-bottom"
  | "slide-in-left"
  | "slide-in-right"
  | "slide-out-top"
  | "slide-out-bottom"
  | "slide-out-left"
  | "slide-out-right";

interface AnimationProviderProps {
  children: ReactNode;
  className?: string;
  stagger?: boolean;
  animation?: AnimationType;
  delay?: number;
  duration?: number;
}

const getVariants = (type: AnimationType = "fade-up"): Variants => {
  switch (type) {
    case "fade-down":
      return { hidden: { opacity: 0, y: -40 }, visible: { opacity: 1, y: 0 } };
    case "fade-left":
      return { hidden: { opacity: 0, x: -40 }, visible: { opacity: 1, x: 0 } };
    case "fade-right":
      return { hidden: { opacity: 0, x: 40 }, visible: { opacity: 1, x: 0 } };
    case "zoom-in":
      return {
        hidden: { opacity: 0, scale: 0.9 },
        visible: { opacity: 1, scale: 1 },
      };
    case "zoom-out":
      return {
        hidden: { opacity: 0, scale: 1.1 },
        visible: { opacity: 1, scale: 1 },
      };
    case "slide-in-top":
      return { hidden: { y: -100, opacity: 0 }, visible: { y: 0, opacity: 1 } };
    case "slide-in-bottom":
      return { hidden: { y: 100, opacity: 0 }, visible: { y: 0, opacity: 1 } };
    case "slide-in-left":
      return { hidden: { x: -100, opacity: 0 }, visible: { x: 0, opacity: 1 } };
    case "slide-in-right":
      return { hidden: { x: 100, opacity: 0 }, visible: { x: 0, opacity: 1 } };
    case "slide-out-top":
      return { hidden: { y: 0, opacity: 1 }, visible: { y: -100, opacity: 0 } };
    case "slide-out-bottom":
      return { hidden: { y: 0, opacity: 1 }, visible: { y: 100, opacity: 0 } };
    case "slide-out-left":
      return { hidden: { x: 0, opacity: 1 }, visible: { x: -100, opacity: 0 } };
    case "slide-out-right":
      return { hidden: { x: 0, opacity: 1 }, visible: { x: 100, opacity: 0 } };
    case "fade-up":
    default:
      return { hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0 } };
  }
};

export default function AnimationProvider({
  children,
  className,
  stagger = false,
  animation = "fade-up",
  delay = 0,
  duration = 0.5,
}: AnimationProviderProps) {
  return (
    <motion.div
      className={cn("overflow-hidden", className)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: stagger ? 0.2 : 0,
            delay,
          },
        },
      }}
    >
      {Array.isArray(children) ? (
        children.map((child, index) => (
          <motion.div
            key={index}
            variants={getVariants(animation)}
            transition={{
              duration,
              delay: delay + index * (stagger ? 0.2 : 0),
            }}
          >
            {child}
          </motion.div>
        ))
      ) : (
        <motion.div
          variants={getVariants(animation)}
          transition={{ duration, delay }}
        >
          {children}
        </motion.div>
      )}
    </motion.div>
  );
}

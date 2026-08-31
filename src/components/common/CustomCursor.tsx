"use client";

import { useEffect, useRef } from "react";

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if the device has coarse pointer (touch device)
    if (window.matchMedia("(pointer: coarse)").matches) {
      return;
    }

    const cursor = cursorRef.current;
    const ring = ringRef.current;
    if (!cursor || !ring) return;

    let mouseX = -100;
    let mouseY = -100;
    let cursorX = -100;
    let cursorY = -100;
    let ringX = -100;
    let ringY = -100;
    let isHovering = false;
    let isVisible = false;
    let animationFrameId: number;

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      if (!isVisible) {
        isVisible = true;
        cursor.style.opacity = "1";
        ring.style.opacity = "1";
      }

      // Check if hovering interactive elements
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.closest("button") ||
          target.closest("a") ||
          target.closest("input") ||
          target.closest("textarea") ||
          target.closest("[role='button']") ||
          target.closest(".cursor-pointer"))
      ) {
        isHovering = true;
      } else {
        isHovering = false;
      }
    };

    const onMouseEnter = () => {
      isVisible = true;
      cursor.style.opacity = "1";
      ring.style.opacity = "1";
    };

    const onMouseLeave = () => {
      isVisible = false;
      cursor.style.opacity = "0";
      ring.style.opacity = "0";
    };

    const animate = () => {
      // Lerp calculations
      cursorX += (mouseX - cursorX) * 0.4;
      cursorY += (mouseY - cursorY) * 0.4;

      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;

      cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0) translate(-50%, -50%) scale(${
        isHovering ? 1.5 : 1
      })`;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%) scale(${
        isHovering ? 1.4 : 1
      })`;

      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("mouseenter", onMouseEnter);
    document.addEventListener("mouseleave", onMouseLeave);
    animationFrameId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseenter", onMouseEnter);
      document.removeEventListener("mouseleave", onMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      {/* Horizon Main Difference Dot */}
      <div
        ref={cursorRef}
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 z-[9999] h-3.5 w-3.5 rounded-full bg-white opacity-0 mix-blend-difference transition-transform duration-75 ease-out max-lg:hidden"
        style={{ willChange: "transform, opacity" }}
      />
      {/* Horizon Outer Glass Halo */}
      <div
        ref={ringRef}
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 z-[9998] h-9 w-9 rounded-full border border-sky-400/40 bg-sky-400/5 opacity-0 backdrop-blur-[1px] transition-transform duration-150 ease-out max-lg:hidden"
        style={{ willChange: "transform, opacity" }}
      />
    </>
  );
}

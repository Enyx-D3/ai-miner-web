import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils"; // shadcn er cn utility

const headingVariants = cva(
  "font-sans font-bold tracking-tight text-gray-900 dark:text-white",
  {
    variants: {
      size: {
        h1: "text-4xl md:text-5xl",
        h2: "text-3xl md:text-4xl",
        h3: "text-2xl md:text-3xl",
        h4: "text-xl md:text-2xl",
        h5: "text-lg md:text-xl",
        h6: "text-base md:text-lg",
      },
    },
    defaultVariants: {
      size: "h1",
    },
  }
);

export interface HeadingProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof headingVariants> {}

const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ className, size, ...props }, ref) => {
    const Tag = size || "h1"; // h1, h2, ...
    return <Tag ref={ref} className={cn(headingVariants({ size }), className)} {...props} />;
  }
);

Heading.displayName = "Heading";

export { Heading };
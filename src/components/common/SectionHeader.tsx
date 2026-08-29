import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { Heading } from "@/components/ui/typography";

interface SectionHeaderProps {
  badge?: string;
  badgeIcon?: ReactNode;
  title: string;
  titleClassName?: string;
  description?: string;
  align?: "left" | "center";
  right?: ReactNode;
  className?: string;
}

export default function SectionHeader({
  badge,
  badgeIcon,
  title,
  titleClassName,
  description,
  align = "left",
  right,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-5",
        align === "center" && "flex-col items-center text-center",
        className,
      )}
    >
      {/* Left / Center Content */}
      <div
        className={cn(
          "flex flex-col gap-1",
          align === "center" && "items-center",
        )}
      >
        {badge && (
          <div className="inline-flex items-center gap-2.5 text-base font-medium text-primary bg-primary/20 rounded-full px-3 py-2 w-fit">
            {badgeIcon}
            {badge}
          </div>
        )}
        <Heading
          size={"h2"}
          className={cn("font-playfair max-w-3xl", titleClassName)}
        >
          {title}
        </Heading>
        {description && (
          <p className="text-neutral-500  max-w-[550px] mt-2">{description}</p>
        )}
      </div>

      {/* Right Content (optional) */}
      {right && align !== "center" && (
        <div className="flex items-center gap-2 shrink-0 mt-1">{right}</div>
      )}
    </div>
  );
}

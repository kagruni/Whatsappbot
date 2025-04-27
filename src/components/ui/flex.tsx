import React from "react";
import { cn } from "@/lib/utils";

interface FlexProps extends React.HTMLAttributes<HTMLDivElement> {
  inline?: boolean;
  direction?: "row" | "row-reverse" | "column" | "column-reverse";
  align?: "start" | "center" | "end" | "stretch" | "baseline";
  justify?: "start" | "center" | "end" | "between" | "around" | "evenly";
  wrap?: boolean | "reverse";
  gap?: "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
}

const Flex = React.forwardRef<HTMLDivElement, FlexProps>(
  (
    {
      className,
      inline = false,
      direction = "row",
      align,
      justify,
      wrap,
      gap = "none",
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          inline ? "inline-flex" : "flex",
          {
            "flex-row": direction === "row",
            "flex-row-reverse": direction === "row-reverse",
            "flex-col": direction === "column",
            "flex-col-reverse": direction === "column-reverse",
            "items-start": align === "start",
            "items-center": align === "center",
            "items-end": align === "end",
            "items-stretch": align === "stretch",
            "items-baseline": align === "baseline",
            "justify-start": justify === "start",
            "justify-center": justify === "center",
            "justify-end": justify === "end",
            "justify-between": justify === "between",
            "justify-around": justify === "around",
            "justify-evenly": justify === "evenly",
            "flex-wrap": wrap === true,
            "flex-wrap-reverse": wrap === "reverse",
            "gap-0": gap === "none",
            "gap-1": gap === "xs",
            "gap-2": gap === "sm",
            "gap-4": gap === "md",
            "gap-6": gap === "lg",
            "gap-8": gap === "xl",
            "gap-12": gap === "2xl",
          },
          className
        )}
        {...props}
      />
    );
  }
);

Flex.displayName = "Flex";

export { Flex }; 
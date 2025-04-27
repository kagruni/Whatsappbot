import React from "react";
import { cn } from "@/lib/utils";

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl" | "full";
  padding?: "none" | "sm" | "md" | "lg";
  centered?: boolean;
}

const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  (
    {
      className,
      size = "xl",
      padding = "md",
      centered = true,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          {
            "max-w-screen-sm": size === "sm",
            "max-w-screen-md": size === "md",
            "max-w-screen-lg": size === "lg",
            "max-w-screen-xl": size === "xl",
            "max-w-full": size === "full",
            "p-0": padding === "none",
            "p-2": padding === "sm",
            "p-4": padding === "md",
            "p-6": padding === "lg",
            "mx-auto": centered,
          },
          className
        )}
        {...props}
      />
    );
  }
);

Container.displayName = "Container";

export { Container }; 
import * as React from "react";
import { cn } from "@/lib/utils";

interface TextProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  weight?: "normal" | "medium" | "semibold" | "bold";
  variant?: "default" | "muted" | "primary" | "secondary" | "destructive" | "success";
  as?: React.ElementType;
}

const Text = React.forwardRef<HTMLSpanElement, TextProps>(
  (
    {
      className,
      size = "md",
      weight = "normal",
      variant = "default",
      as: Component = "span",
      ...props
    },
    ref
  ) => {
    return (
      <Component
        ref={ref}
        className={cn(
          {
            "text-xs": size === "xs",
            "text-sm": size === "sm",
            "text-base": size === "md",
            "text-lg": size === "lg",
            "text-xl": size === "xl",
            "font-normal": weight === "normal",
            "font-medium": weight === "medium",
            "font-semibold": weight === "semibold",
            "font-bold": weight === "bold",
            "text-foreground": variant === "default",
            "text-muted-foreground": variant === "muted",
            "text-primary": variant === "primary",
            "text-secondary-foreground": variant === "secondary",
            "text-destructive": variant === "destructive",
            "text-green-600": variant === "success",
          },
          className
        )}
        {...props}
      />
    );
  }
);

Text.displayName = "Text";

export { Text }; 
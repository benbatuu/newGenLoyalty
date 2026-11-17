import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-foreground text-background hover:bg-foreground/90",
        secondary: "bg-muted text-foreground hover:bg-muted/80",
        outline:
          "border border-foreground/10 bg-background hover:bg-muted/60",
        ghost: "hover:bg-muted/60",
        link: "text-primary underline-offset-4 hover:underline",
        light: "bg-background text-foreground hover:bg-background/90",
        "ghost-light":
          "border border-background/30 bg-transparent text-background hover:bg-background/10",
        brass: "bg-primary text-primary-foreground hover:bg-primary/90",
      },
      size: {
        default: "h-10 px-5",
        sm: "h-9 rounded-md px-4 text-sm",
        lg: "h-11 px-6 text-sm",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };

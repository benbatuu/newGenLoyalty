import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva("btn-premium", {
  variants: {
    variant: {
      default: "",
      secondary: "",
      outline: "",
      ghost: "",
      link: "border-0 bg-transparent px-0 h-auto after:hidden before:hidden hover:text-[var(--brass)]",
      light: "",
      "ghost-light": "",
      brass: "",
    },
    size: {
      default: "h-12 px-7",
      sm: "h-10 px-5 text-[0.62rem]",
      lg: "h-14 px-9",
      icon: "h-11 w-11 px-0",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

const variantAttr: Partial<
  Record<NonNullable<VariantProps<typeof buttonVariants>["variant"]>, string>
> = {
  secondary: "ghost",
  outline: "ghost",
  ghost: "ghost",
  light: "light",
  "ghost-light": "ghost-light",
  brass: "brass",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "default", size, asChild = false, children, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    const dataVariant = variant ? variantAttr[variant] : undefined;

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        data-variant={dataVariant}
        ref={ref}
        {...props}
      >
        {children}
      </Comp>
    );
  },
);
Button.displayName = "Button";

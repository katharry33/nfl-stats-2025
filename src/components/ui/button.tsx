'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils'; // Correctly import from central utils
import { cva, type VariantProps } from 'class-variance-authority';

// 1. Use CVA to define variants
const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none active:scale-95',
  {
    variants: {
      variant: {
        default: 'bg-teal-400 text-white hover:bg-teal-500 shadow-lg shadow-teal-900/20',
        outline: 'border border-border bg-transparent hover:bg-muted text-foreground',
        secondary: 'bg-muted text-foreground hover:bg-muted/80 border border-border',
        ghost: 'text-muted-foreground hover:text-foreground hover:bg-muted',
        destructive: 'bg-rose-600 text-white hover:bg-rose-500 shadow-lg shadow-rose-900/20',
        link: 'text-teal-400 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-12 px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

// 2. Make props compatible with CVA
export interface ButtonProps 
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, 
          VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

// 3. Export both the component and the variants
export { Button, buttonVariants };

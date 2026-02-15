'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 1. Define the styles outside so they can be exported
const variantStyles = {
  default: 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-900/20',
  outline: 'border border-slate-800 bg-transparent hover:bg-slate-800 text-slate-300',
  secondary: 'bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700', // Added this back
  ghost: 'hover:bg-slate-800 text-slate-400 hover:text-slate-100',
  destructive: 'bg-rose-600 text-white hover:bg-rose-500 shadow-lg shadow-rose-900/20',
};

const sizeStyles = {
  default: 'h-10 px-4 py-2',
  sm: 'h-8 px-3 text-xs',
  lg: 'h-12 px-8',
  icon: 'h-9 w-9',
};

// 2. Export the function the Calendar and other components need
export function buttonVariants({ variant = 'default', size = 'default' }: { 
  variant?: keyof typeof variantStyles, 
  size?: keyof typeof sizeStyles 
} = {}) {
  return cn(
    'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none active:scale-95',
    variantStyles[variant],
    sizeStyles[size]
  );
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: keyof typeof variantStyles;
  size?: keyof typeof sizeStyles;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
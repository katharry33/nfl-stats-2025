import { cn } from '@/lib/utils';
import Image from 'next/image';

export function Logo({ className }: { className?: string }) {
  // We'll use a standard path or a text fallback to avoid the missing module error
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Option 1: If you have a logo in public/logo.png, uncomment this:
         <Image src="/logo.png" alt="Logo" width={32} height={32} /> 
      */}
      
      {/* Option 2: Text-based logo (Safe, build-friendly) */}
      <span className="text-xl font-black tracking-tighter text-primary italic">
        GRIDIRON<span className="text-foreground">GURU</span>
      </span>
    </div>
  );
}
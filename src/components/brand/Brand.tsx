// @/components/brand/Brand.tsx
import React from 'react';
import Image from "next/image";

interface BrandProps {
  showSubtitle?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function Brand({ showSubtitle = true, size = 'md' }: BrandProps) {
  // Dynamic sizing for flexibility across the app
  const iconSizes = {
    sm: "h-8 w-8 p-1",
    md: "h-10 w-10 p-1.5",
    lg: "h-12 w-12 p-2"
  };

  const textSizes = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-3xl"
  };

  return (
    <div className="flex items-center gap-3 group select-none transition-all duration-300">
      {/* Logo Container with a subtle Cyan glow on hover */}
      <div className={`relative ${iconSizes[size]} bg-zinc-900 rounded-xl border border-white/10 group-hover:border-cyan-500/50 group-hover:shadow-[0_0_15px_rgba(34,211,238,0.2)] transition-all overflow-hidden`}>
        <Image
          src="/logo.png"
          alt="SweetSpot Logo"
          fill
          className="object-contain p-1"
          sizes="40px"
        />
      </div>

      <div className="flex flex-col">
        <h1 className={`${textSizes[size]} font-black italic tracking-tighter uppercase leading-none`}>
          <span className="text-white group-hover:text-zinc-200 transition-colors">SWEET</span>
          <span className="text-cyan-400 group-hover:text-cyan-300 transition-colors">SPOT</span>
        </h1>
        
        {showSubtitle && (
          <p className="text-[7px] font-bold text-zinc-500 uppercase tracking-[0.4em] mt-1 group-hover:text-zinc-400 transition-colors">
            Intelligence
          </p>
        )}
      </div>
    </div>
  );
}
// components/logo/SweetSpotLogo.tsx
// Football shape with concentric target rings — clean teal on light bg

export function SweetSpotLogo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Football body */}
      <ellipse cx="32" cy="32" rx="26" ry="17" fill="#1fa896" />

      {/* Outer target ring */}
      <ellipse cx="32" cy="32" rx="26" ry="17"
        stroke="white" strokeWidth="1.5" strokeOpacity="0.25" fill="none" />

      {/* Middle target ring */}
      <ellipse cx="32" cy="32" rx="17" ry="11"
        stroke="white" strokeWidth="1.2" strokeOpacity="0.35" fill="none" />

      {/* Inner target ring */}
      <ellipse cx="32" cy="32" rx="9" ry="6"
        stroke="white" strokeWidth="1" strokeOpacity="0.5" fill="none" />

      {/* Centre dot */}
      <circle cx="32" cy="32" r="2.5" fill="white" fillOpacity="0.9" />

      {/* Horizontal lace */}
      <line x1="12" y1="32" x2="52" y2="32"
        stroke="white" strokeWidth="1.2" strokeOpacity="0.5" />

      {/* Vertical lace stitches */}
      <line x1="32" y1="22" x2="32" y2="42"
        stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.7" />
      <line x1="28" y1="25" x2="28" y2="39"
        stroke="white" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.4" />
      <line x1="36" y1="25" x2="36" y2="39"
        stroke="white" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.4" />
    </svg>
  );
}

// ─── Full Brand Lockup ────────────────────────────────────────────────────────

export function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className='shrink-0'>
        <SweetSpotLogo size={34} />
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-[15px] font-black tracking-tight text-foreground">
          Sweet<span className="text-primary">Spot</span>
        </span>
        <span className="text-[8px] font-semibold uppercase tracking-[0.35em] text-muted-foreground mt-0.5">
          Intelligence
        </span>
      </div>
    </div>
  );
}
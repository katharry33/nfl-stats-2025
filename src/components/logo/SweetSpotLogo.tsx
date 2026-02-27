// components/logo/SweetSpotLogo.tsx

export function SweetSpotLogo({ size = 32 }: { size?: number }) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        xmlns="http://www.w3.org/2000/svg"
      >
        <ellipse cx="32" cy="32" rx="28" ry="18" fill="#111" stroke="#FACC15" strokeWidth="4" />
        <rect x="28" y="20" width="8" height="24" rx="2" fill="#FACC15" />
        <text
          x="32"
          y="39"
          textAnchor="middle"
          fontSize="22"
          fontWeight="700"
          fill="#FACC15"
          fontFamily="Inter, sans-serif"
        >
          $
        </text>
      </svg>
    );
  }
  
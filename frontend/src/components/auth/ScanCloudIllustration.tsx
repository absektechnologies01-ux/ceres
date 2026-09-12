// Decorative, looping illustration for the login page: a scanned answer
// sheet flies from the scanner up into the cloud, where the CERES wordmark
// appears. Purely visual — no interactivity, no external assets/libraries.
export default function ScanCloudIllustration() {
  return (
    <div className="relative w-full max-w-xs mx-auto" aria-hidden="true">
      <svg viewBox="0 0 300 400" className="w-full h-auto overflow-visible">
        <defs>
          <radialGradient id="ceresGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#DBEAFE" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#DBEAFE" stopOpacity="0" />
          </radialGradient>
          <clipPath id="paperClip">
            <rect x="115" y="190" width="70" height="86" rx="6" />
          </clipPath>
        </defs>

        {/* Ambient glow behind the cloud */}
        <circle cx="150" cy="90" r="95" fill="url(#ceresGlow)" />

        {/* Cloud */}
        <g
          className="animate-scan-cloud-pulse"
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        >
          <rect x="100" y="70" width="100" height="36" rx="18" fill="#1D4ED8" />
          <circle cx="120" cy="68" r="22" fill="#1D4ED8" />
          <circle cx="150" cy="56" r="28" fill="#1D4ED8" />
          <circle cx="181" cy="68" r="20" fill="#1D4ED8" />
        </g>

        {/* CERES wordmark, appears once the paper "arrives" */}
        <text
          x="150"
          y="124"
          textAnchor="middle"
          className="animate-scan-text"
          style={{
            transformBox: 'fill-box',
            transformOrigin: 'center',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 700,
            fontSize: '22px',
            letterSpacing: '4px',
            fill: '#1E40AF',
          }}
        >
          CERES
        </text>

        {/* Data particles trailing the paper up to the cloud */}
        <circle
          cx="150" cy="230" r="4" fill="#93C5FD"
          className="animate-scan-particle-1"
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        />
        <circle
          cx="150" cy="230" r="3" fill="#93C5FD"
          className="animate-scan-particle-2"
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        />
        <circle
          cx="150" cy="230" r="3.5" fill="#93C5FD"
          className="animate-scan-particle-3"
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        />

        {/* Scanner base shadow */}
        <ellipse cx="150" cy="320" rx="70" ry="8" fill="#1E293B" opacity="0.08" />

        {/* Scanner body */}
        <rect x="85" y="262" width="130" height="50" rx="10" fill="#1E293B" />
        <rect x="97" y="256" width="106" height="14" rx="6" fill="#CBD5E1" />
        <circle cx="103" cy="300" r="3" fill="#475569" />
        <circle cx="115" cy="300" r="3" fill="#475569" />

        {/* Paper — drops in, sits through the scan sweep, then flies to the cloud */}
        <g
          className="animate-scan-paper"
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        >
          <rect x="115" y="190" width="70" height="86" rx="6" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" />
          <rect x="126" y="206" width="48" height="5" rx="2.5" fill="#CBD5E1" />
          <rect x="126" y="218" width="48" height="5" rx="2.5" fill="#CBD5E1" />
          <rect x="126" y="230" width="34" height="5" rx="2.5" fill="#CBD5E1" />
          <rect x="126" y="246" width="40" height="5" rx="2.5" fill="#CBD5E1" />
          <rect x="126" y="258" width="26" height="5" rx="2.5" fill="#CBD5E1" />

          {/* Scan beam sweeping across the paper — a soft glow band plus a
              bright core, in a cyan distinct from the gray text lines so
              the sweep itself stays legible. Clipped to the paper's edges. */}
          <g clipPath="url(#paperClip)" className="animate-scan-line-sweep">
            <rect x="113" y="190" width="74" height="18" fill="#38BDF8" opacity="0.25" />
            <rect
              x="113" y="196" width="74" height="3" rx="1.5"
              fill="#38BDF8"
              style={{ filter: 'drop-shadow(0 0 5px rgba(56,189,248,0.95))' }}
            />
          </g>
        </g>
      </svg>
    </div>
  );
}

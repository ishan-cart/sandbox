import React from "react";
import "./ThemeDrawings.css";

interface DrawingProps {
  isNight?: boolean;
}

export const ThemeSeagull = ({ isNight }: DrawingProps) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
      {/* Horizontal glider */}
      <div className="absolute left-0 top-0 w-full h-full animate-seagull-horizontal">
        {/* Vertical sinusoidal helper */}
        <div className="animate-seagull-vertical inline-block">
          <svg viewBox="0 0 64 32" className={`w-12 h-6 overflow-visible blur-[0.4px] drop-shadow-[0.5px_0.5px_0.2px_rgba(255,255,255,0.4)] ${isNight ? 'text-cyan-300/40 md:text-cyan-300/50' : 'text-slate-800/22 md:text-slate-800/26'}`}>
            <path
              fill={isNight ? "rgba(34, 211, 238, 0.12)" : "rgba(255, 255, 255, 0.15)"}
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <animate
                attributeName="d"
                dur="1.5s"
                repeatCount="indefinite"
                values="
                  M 4 20 C 16 4, 26 2, 32 16 C 38 2, 48 4, 60 20 C 48 13, 38 12, 32 18 C 26 12, 16 13, 4 20 Z;
                  M 4 16 C 16 11, 26 10, 32 16 C 38 10, 48 11, 60 16 C 48 16, 38 16, 32 17 C 26 16, 16 16, 4 16 Z;
                  M 4 8 C 16 19, 26 22, 32 16 C 38 22, 48 19, 60 8 C 48 11, 38 13, 32 15 C 26 13, 16 11, 4 8 Z;
                  M 4 16 C 16 11, 26 10, 32 16 C 38 10, 48 11, 60 16 C 48 16, 38 16, 32 17 C 26 16, 16 16, 4 16 Z;
                  M 4 20 C 16 4, 26 2, 32 16 C 38 2, 48 4, 60 20 C 48 13, 38 12, 32 18 C 26 12, 16 13, 4 20 Z
                "
                keyTimes="0; 0.25; 0.5; 0.75; 1"
                calcMode="spline"
                keySplines="0.42 0 0.58 1; 0.42 0 0.58 1; 0.42 0 0.58 1; 0.42 0 0.58 1"
              />
            </path>
          </svg>
        </div>
      </div>
    </div>
  );
};

export const ThemeLightbulbFish = ({ isNight }: DrawingProps) => {
  const strokeColor = isNight ? "rgba(240, 249, 255, 0.32)" : "rgba(15, 23, 42, 0.11)";
  const strokeWidth = "2.2";
  const glowStrokeColor = isNight ? "rgba(240, 249, 255, 0.16)" : "rgba(15, 23, 42, 0.05)";
  const bulbFillColor = isNight ? "rgba(240, 249, 255, 0.4)" : "rgba(15, 23, 42, 0.15)";

  const commonStrokeProps = {
    stroke: strokeColor,
    strokeWidth,
    vectorEffect: "non-scaling-stroke" as const,
  };

  const commonGlowStrokeProps = {
    stroke: glowStrokeColor,
    strokeWidth,
    vectorEffect: "non-scaling-stroke" as const,
  };

  return (
    <div className="absolute inset-x-0 bottom-0 h-32 pointer-events-none select-none overflow-hidden z-20">
      <div className="absolute bottom-6 left-0 w-20 h-15 animate-fish-horizontal">
        <div className="animate-fish-vertical inline-block">
          <svg viewBox="0 0 110 80" className="w-20 h-15 overflow-visible">
            {/* Lightbulb Glow Ring (behind fish) */}
            <circle
              cx="15"
              cy="15"
              r="8"
              fill="none"
              {...commonGlowStrokeProps}
            />
            
            {/* Stalk/Antenna */}
            <path
              d="M 52 24 C 45 5, 25 5, 15 15"
              fill="none"
              strokeLinecap="round"
              {...commonStrokeProps}
            />
            
            {/* Glowing Bulb */}
            <circle
              cx="15"
              cy="15"
              r="4"
              fill={bulbFillColor}
              className="animate-bulb-glow"
              {...commonStrokeProps}
            />

            {/* Main Body with mouth open */}
            <path
              d="M 85 40 
                 C 75 22, 60 20, 50 22 
                 C 40 24, 30 28, 28 35
                 L 42 42
                 L 30 48
                 C 32 55, 42 60, 52 60
                 C 65 60, 75 52, 85 40 Z"
              fill="none"
              strokeLinejoin="round"
              {...commonStrokeProps}
            />

            {/* Teeth - Sharp & pointy */}
            {/* Upper teeth */}
            <path
              d="M 29 35 L 32 39 L 34 35 L 37 40 L 40 37 L 42 42"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              {...commonStrokeProps}
            />
            {/* Lower teeth */}
            <path
              d="M 30 48 L 33 44 L 35 47 L 38 43 L 41 45 L 42 42"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              {...commonStrokeProps}
            />

            {/* Big circular Eye */}
            <circle
              cx="48"
              cy="32"
              r="4"
              fill="none"
              {...commonStrokeProps}
            />
            <circle
              cx="47"
              cy="32"
              r="1.5"
              fill={strokeColor}
            />

            {/* Gills / Accent line */}
            <path
              d="M 60 30 C 58 35, 58 45, 60 50"
              fill="none"
              strokeLinecap="round"
              opacity="0.6"
              {...commonStrokeProps}
            />

            {/* Tail Fin */}
            <path
              d="M 85 40 L 98 25 L 95 40 L 98 55 Z"
              fill="none"
              strokeLinejoin="round"
              {...commonStrokeProps}
            />

            {/* Pectoral Fin */}
            <path
              d="M 64 44 C 68 44, 72 48, 70 52 C 68 54, 63 50, 64 44 Z"
              fill="none"
              strokeLinejoin="round"
              {...commonStrokeProps}
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

function getHash(index: number, seed: number): number {
  const x = Math.sin(index * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function renderRipplingWave(
  waveLength: number,
  gap: number,
  amplitude: number,
  count: number,
  yOffset: number,
  stroke: string,
  strokeWidth: number,
  seedOffset: number = 0,
  depthScale: number = 1.0,
  repeatPeriod: number = 10,
  morphScale: number = 1.0
) {
  const paths = [];
  const period = waveLength + gap;
  for (let i = 0; i < count; i++) {
    const startX = i * period + gap / 2;
    const endX = startX + waveLength;
    const keyIndex = i % repeatPeriod;
    const verticalDisplacement = (getHash(keyIndex, seedOffset + 45.3) - 0.5) * 8 * depthScale;
    const localY = yOffset + verticalDisplacement;
    const morphAmp = amplitude * morphScale;
    const dNormal = `M ${startX} ${localY} C ${startX + waveLength / 3} ${localY - morphAmp}, ${startX + (waveLength / 3) * 2} ${localY + morphAmp}, ${endX} ${localY}`;
    const dMorphed = `M ${startX} ${localY} C ${startX + waveLength / 3} ${localY + morphAmp}, ${startX + (waveLength / 3) * 2} ${localY - morphAmp}, ${endX} ${localY}`;
    const morphDuration = 1.5 + getHash(keyIndex, seedOffset + 71.9) * 1.5;
    const morphDelay = -(getHash(keyIndex, seedOffset + 98.4) * 5.0);
    const oscAmp = (1.5 + getHash(keyIndex, seedOffset + 12.3) * 3.5) * depthScale;
    const oscDuration = 2.0 + getHash(keyIndex, seedOffset + 31.4) * 2.0;
    const oscDelay = -(getHash(keyIndex, seedOffset + 53.6) * 5.0);

    paths.push(
      <path
        key={i}
        d={dNormal}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
      >
        <animate
          attributeName="d"
          dur={`${morphDuration}s`}
          begin={`${morphDelay}s`}
          repeatCount="indefinite"
          values={`${dNormal}; ${dMorphed}; ${dNormal}`}
        />
        <animateTransform
          attributeName="transform"
          type="translate"
          values={`0,${-oscAmp}; 0,${oscAmp}; 0,${-oscAmp}`}
          keyTimes="0; 0.5; 1"
          calcMode="spline"
          keySplines="0.42 0 0.58 1; 0.42 0 0.58 1"
          dur={`${oscDuration}s`}
          begin={`${oscDelay}s`}
          repeatCount="indefinite"
        />
      </path>
    );
  }
  return paths;
}

export const ThemeWaves = ({ isNight }: DrawingProps) => {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-[36%] overflow-hidden pointer-events-none select-none opacity-90">
      {/* Wave Layer 1 - Very faint, slow flowing background wave nearest the bridge & opera house */}
      <div className="absolute left-0 right-0 top-[15%] w-[5120px] animate-theme-wave-1">
        <svg width="5120" height="60" className="overflow-visible">
          {renderRipplingWave(30, 80, 7.5, 47, 30, isNight ? "rgba(240, 249, 255, 0.28)" : "rgba(15, 23, 42, 0.11)", 0.9, 0, 0.20, 15, 0.20)}
        </svg>
      </div>
      
      {/* Wave Layer 2 - Opposite flow direction, slightly more visible */}
      <div className="absolute left-0 right-0 top-[28%] w-[5070px] animate-theme-wave-2">
        <svg width="5070" height="60" className="overflow-visible">
          {renderRipplingWave(55, 80, 8.5, 38, 30, isNight ? "rgba(240, 249, 255, 0.28)" : "rgba(15, 23, 42, 0.11)", 1.0, 10, 0.45, 10, 0.40)}
        </svg>
      </div>
      
      {/* Wave Layer 3 - Large, deep slow-moving wave closer to the bottom */}
      <div className="absolute left-0 right-0 top-[50%] w-[5040px] animate-theme-wave-3">
        <svg width="5040" height="60" className="overflow-visible">
          {renderRipplingWave(85, 80, 12.0, 31, 30, isNight ? "rgba(240, 249, 255, 0.28)" : "rgba(15, 23, 42, 0.11)", 1.2, 30, 1.00, 10)}
        </svg>
      </div>
      
      {/* Wave Layer 4 - Larger rhythmic ripples near the very front/bottom */}
      <div className="absolute left-0 right-0 top-[75%] w-[5040px] animate-theme-wave-4">
        <svg width="5040" height="60" className="overflow-visible">
          {renderRipplingWave(135, 80, 14, 24, 30, isNight ? "rgba(240, 249, 255, 0.32)" : "rgba(15, 23, 42, 0.11)", 2.2, 40, 2.00, 6)}
        </svg>
      </div>
    </div>
  );
};


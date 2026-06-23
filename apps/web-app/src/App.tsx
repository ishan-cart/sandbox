import { motion, useScroll, useSpring, useMotionValueEvent, useTransform } from "motion/react";
import { ArchitectureDiagram } from "./components/ArchitectureDiagram";
import { Skills } from "./components/Skills";
import { Experience } from "./components/Experience";
import { Contact } from "./components/Contact";
import { useState } from "react";
import { 
  ChevronDown, 
  ArrowRight,
  Home 
} from "lucide-react";
import sydneyHarborImage from "./assets/images/sydney_harbor_refined_bg_1782136462280.jpg";

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
  depthScale: number = 1.0, // scale factor for oscillation amplitude to create depth
  repeatPeriod: number = 10, // number of waves after which random properties repeat
  morphScale: number = 1.0 // scale factor for the convexing/concaving (cresting/troughing) morphological shift
) {
  const paths = [];
  const period = waveLength + gap;
  for (let i = 0; i < count; i++) {
    const startX = i * period + gap / 2;
    const endX = startX + waveLength;
    
    // Ensure all random physical & animation attributes repeat perfectly over the sliding period loop
    const keyIndex = i % repeatPeriod;
    
    // Displace each wave vertically so they don't sit on a flat line
    const verticalDisplacement = (getHash(keyIndex, seedOffset + 45.3) - 0.5) * 8 * depthScale;
    const localY = yOffset + verticalDisplacement;
    
    // Calculate the morph amplitude scaled by morphScale
    const morphAmp = amplitude * morphScale;
    
    // Normal curve (Crest then Trough) with individual vertical starting position
    const dNormal = `M ${startX} ${localY} C ${startX + waveLength / 3} ${localY - morphAmp}, ${startX + (waveLength / 3) * 2} ${localY + morphAmp}, ${endX} ${localY}`;
    
    // Inverse curve (Trough then Crest) for concaving/convexing animation
    const dMorphed = `M ${startX} ${localY} C ${startX + waveLength / 3} ${localY + morphAmp}, ${startX + (waveLength / 3) * 2} ${localY - morphAmp}, ${endX} ${localY}`;
    
    // Unique morph/ripple motion per individual wave stroke
    const morphDuration = 1.5 + getHash(keyIndex, seedOffset + 71.9) * 1.5;
    const morphDelay = -(getHash(keyIndex, seedOffset + 98.4) * 5.0);
    
    // Unique up/down vertical oscillation parameters scaled by depthScale
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

export default function App() {
  const { scrollY } = useScroll();
  const { scrollYProgress } = useScroll();
  const [showHomeButton, setShowHomeButton] = useState(false);
  const [showChevron, setShowChevron] = useState(true);

  // Parallax/Layering effects for the name
  const nameX = useTransform(scrollY, [0, 500], [0, -40]);
  const nameY = useTransform(scrollY, [0, 500], [0, -20]);
  const lastNameX = useTransform(scrollY, [0, 500], [0, 40]);
  const lastNameY = useTransform(scrollY, [0, 500], [0, 20]);
  const nameOpacity = useTransform(scrollY, [0, 300], [1, 0]);
  const nameScale = useTransform(scrollY, [0, 500], [1, 1.1]);

  useMotionValueEvent(scrollY, "change", (latest) => {
    if (latest > 10) {
      setShowChevron(false);
    } else {
      setShowChevron(true);
    }

    if (latest > 100) {
      setShowHomeButton(true);
    } else {
      setShowHomeButton(false);
    }
  });

  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <div className="min-h-screen relative">
      {/* Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-brand-primary z-50 origin-left"
        style={{ scaleX }}
      />

      {/* Floating Navigation - Separate Home (Left) */}
      <nav className="fixed top-6 left-0 right-0 z-50 pointer-events-none px-6">
        <div className="max-w-7xl mx-auto flex items-center w-full">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ 
              opacity: showHomeButton ? 1 : 0, 
              y: showHomeButton ? 0 : -20,
              pointerEvents: showHomeButton ? "auto" : "none" 
            }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="pointer-events-auto"
          >
            <a 
              href="#" 
              className="flex items-center gap-2 group"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-900 shadow-xl group-hover:bg-brand-primary group-hover:text-white group-hover:border-brand-primary transition-all">
                <Home className="w-5 h-5" />
              </div>
            </a>
          </motion.div>
        </div>
      </nav>

      {/* Hero Section - Full Height */}
      <header className="relative min-h-[100dvh] flex items-center justify-center py-20 px-6 overflow-hidden bg-white">
        <div className="absolute inset-0 z-0">
          <img 
            src={sydneyHarborImage} 
            alt="Sydney Harbour Blueprint Background" 
            className="w-full h-full object-cover object-bottom opacity-25 md:opacity-25 blur-[0.5px] pointer-events-none mix-blend-multiply"
            referrerPolicy="no-referrer"
          />
          {/* Subtle central fade mask to keep foreground typography highly legible */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.75)_0%,rgba(255,255,255,0)_80%)] pointer-events-none" />
          
          {/* Highly transparent ambient blue and indigo glows */}
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-blue-50/40 rounded-full blur-[120px] opacity-35 animate-pulse pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-indigo-50/40 rounded-full blur-[120px] opacity-35 animate-pulse delay-700 pointer-events-none" />
          
          {/* Smooth transition to the rest of the page (positioned behind waves to avoid washing them out) */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent pointer-events-none" />

          {/* Animated Stylized Blueprint Seagull */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
            {/* Horizontal glider */}
            <div className="absolute left-0 top-0 w-full h-full animate-seagull-horizontal">
              {/* Vertical sinusoidal helper */}
              <div className="animate-seagull-vertical inline-block">
                <svg viewBox="0 0 64 32" className="w-12 h-6 text-slate-800/22 overflow-visible blur-[0.4px] drop-shadow-[0.5px_0.5px_0.2px_rgba(255,255,255,0.4)] md:text-slate-800/26">
                  <path
                    fill="rgba(255, 255, 255, 0.15)"
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

          {/* Animated Water Blueprint Wave Lines (Sydney Harbor alive effect) */}
          <div className="absolute bottom-0 left-0 right-0 h-[36%] overflow-hidden pointer-events-none select-none opacity-90">
            {/* Wave Layer 1 - Very faint, slow flowing background wave nearest the bridge & opera house (very delicate disjoint marks) */}
            <div className="absolute left-0 right-0 top-[15%] w-[5120px] animate-blueprint-wave-1">
              <svg width="5120" height="60" className="overflow-visible">
                {renderRipplingWave(30, 80, 7.5, 47, 30, "rgba(15, 23, 42, 0.11)", 0.9, 0, 0.20, 15, 0.20)}
              </svg>
            </div>
            
            {/* Wave Layer 2 - Opposite flow direction, slightly more visible, disjoint marks */}
            <div className="absolute left-0 right-0 top-[28%] w-[5070px] animate-blueprint-wave-2">
              <svg width="5070" height="60" className="overflow-visible">
                {renderRipplingWave(55, 80, 8.5, 38, 30, "rgba(15, 23, 42, 0.11)", 1.0, 10, 0.45, 10, 0.40)}
              </svg>
            </div>
            
            {/* Wave Layer 3 - Large, deep slow-moving wave closer to the bottom (more noticeble disjoint curves) */}
            <div className="absolute left-0 right-0 top-[50%] w-[5040px] animate-blueprint-wave-3">
              <svg width="5040" height="60" className="overflow-visible">
                {renderRipplingWave(85, 80, 12.0, 31, 30, "rgba(15, 23, 42, 0.11)", 1.2, 30, 1.00, 10)}
              </svg>
            </div>
            
            {/* Wave Layer 4 - Larger rhythmic ripples near the very front/bottom (strongest contrast & fastest activity) */}
            <div className="absolute left-0 right-0 top-[75%] w-[5040px] animate-blueprint-wave-4">
              <svg width="5040" height="60" className="overflow-visible">
                {renderRipplingWave(135, 80, 14, 24, 30, "rgba(15, 23, 42, 0.11)", 1.4, 40, 2.00, 6)}
              </svg>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <span className="text-brand-primary font-mono text-xs font-bold tracking-[0.3em] uppercase bg-blue-50 px-4 py-2 rounded-full border border-blue-100">
              Platform | SRE | DevOps
            </span>
          </motion.div>

          {/* Layered Animated Name */}
          <div className="mb-10 select-none relative">
            <motion.h1 
              style={{ x: nameX, y: nameY, opacity: nameOpacity, scale: nameScale }}
              className="text-6xl md:text-9xl font-black tracking-tighter leading-[0.8] text-slate-900 uppercase"
            >
              Ishan
            </motion.h1>
            <motion.h1 
              style={{ x: lastNameX, y: lastNameY, opacity: nameOpacity, scale: nameScale }}
              className="text-6xl md:text-9xl font-black tracking-tighter leading-[0.8] text-slate-200 md:text-slate-300 uppercase"
            >
              Sawant.
            </motion.h1>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-xl md:text-2xl text-slate-400 font-light max-w-2xl mx-auto mb-10 leading-relaxed">
              <span className="text-slate-900 font-medium">Passionate</span> about building <span className="text-slate-900 font-medium">reliable systems</span> and streamlining <span className="text-slate-900 font-medium">DevEx</span>.
            </p>
            
            <div className="flex flex-wrap justify-center gap-3 mb-10">
              {[
                { label: "How am I running this?", link: "#architecture" },
                { label: "Stack", link: "#skills" },
                { label: "Experience", link: "#experience" }
              ].map((item) => (
                <a 
                  key={item.label}
                  href={item.link}
                  className="px-5 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:border-brand-primary hover:text-brand-primary transition-all shadow-sm"
                >
                  {item.label}
                </a>
              ))}
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex justify-center"
            >
              <a href="#contact" className="group w-full md:w-auto px-10 py-5 bg-brand-primary text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-blue-600/20">
                Let's Build Together
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
            </motion.div>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: showChevron ? 1 : 0, y: showChevron ? 0 : 10 }}
          transition={{ duration: 0.3 }}
          className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 text-slate-400 z-20 pointer-events-none"
        >
          <ChevronDown className="w-4 h-4 animate-bounce" />
        </motion.div>
      </header>



      {/* Main Sections */}
      <main>
        <ArchitectureDiagram />
        <Skills />
        <Experience />
        <Contact />
      </main>
    </div>
  );
}

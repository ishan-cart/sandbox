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
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-blue-100 rounded-full blur-[120px] opacity-40 animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-indigo-100 rounded-full blur-[120px] opacity-40 animate-pulse delay-700" />
          <div className="absolute inset-0 opacity-[0.4] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 0)', backgroundSize: '32px 32px' }} />
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
              className="text-6xl md:text-9xl font-black tracking-tighter leading-[0.8] text-slate-200 uppercase"
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
                { label: "How am i running this?", link: "#architecture" },
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

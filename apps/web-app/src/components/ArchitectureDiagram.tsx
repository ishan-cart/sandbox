import { motion } from "motion/react";
import { useCallback, useRef } from "react";
import QuickPinchZoom from "react-quick-pinch-zoom";

import DIAGRAM_URL from "../assets/images/Untitled-2026-05-16-2229.png";

export const ArchitectureDiagram = () => {
  const imgRef = useRef<HTMLImageElement>(null);
  
  const onUpdate = useCallback(({ x, y, scale }: { x: number; y: number; scale: number }) => {
    const { current: img } = imgRef;
    if (img) {
      const value = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
      img.style.setProperty("transform", value);
    }
  }, []);

  return (
    <section className="pt-20 pb-16 px-6 relative overflow-hidden bg-white" id="architecture">
      <div className="max-w-6xl mx-auto">
        <div className="mb-16 text-left">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex items-center gap-3 mb-2"
          >
            <div className="w-12 h-1 bg-brand-primary rounded-full" />
            <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-black">System Flow</span>
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="text-5xl md:text-6xl font-black mb-4 text-slate-900 tracking-tighter"
          >
            How did I <span className="text-slate-300">deploy this?</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 max-w-xl text-lg leading-relaxed font-light"
          >
            I put together a hand-drawn diagram showing how everything connects. 
            From Cloudflare down to EKS, this illustrates the full lifecycle of the application.
          </motion.p>
        </div>

        <div className="relative flex flex-col items-center w-full max-w-4xl lg:max-w-2xl mx-auto">
          <div className="relative w-full rounded-2xl border-2 border-slate-900 bg-white overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.1)] p-4 md:p-8 touch-none">
            <QuickPinchZoom onUpdate={onUpdate} enforceBounds={true} tapZoomFactor={2}>
              <img 
                ref={imgRef}
                src={DIAGRAM_URL} 
                alt="Cloud Architecture Strategy" 
                className="w-full h-auto block mx-auto transition-transform duration-75 will-change-transform"
                referrerPolicy="no-referrer"
              />
            </QuickPinchZoom>
            
            <div className="absolute bottom-4 right-4 md:hidden pointer-events-none">
              <span className="bg-slate-900/80 text-white text-[10px] px-2 py-1 rounded-full font-mono uppercase tracking-tighter backdrop-blur-sm">Pinch to Zoom</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};



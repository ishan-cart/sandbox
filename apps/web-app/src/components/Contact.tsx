import { motion } from "motion/react";

export const Contact = () => {
  return (
    <section className="pt-20 pb-12 px-6 bg-slate-50 border-t border-slate-100" id="contact">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="w-full bg-brand-primary rounded-[2.5rem] p-8 md:p-14 text-white flex flex-col md:flex-row items-center md:justify-center shadow-2xl shadow-blue-600/20 gap-10 md:gap-60"
          >
            <div className="text-center md:text-left">
              <h2 className="text-5xl font-black mb-6 leading-[0.9] tracking-tighter">
                Let's chat!
              </h2>
              <p className="text-white/80 text-lg max-w-xs leading-relaxed font-light">
                Ready to engineer resilient, automated cloud systems that run themselves.
              </p>
            </div>

            <div className="w-full md:w-auto max-w-sm">
              <a href="https://www.linkedin.com/in/ishansawant" target="_blank" rel="noopener noreferrer" className="flex items-center gap-5 bg-white/5 p-5 md:p-6 rounded-[2rem] border border-white/5 group hover:bg-white transition-all text-white hover:text-[#0A66C2]">
                <div className="flex-none w-14 h-14 bg-white/10 group-hover:bg-[#0A66C2] rounded-2xl flex items-center justify-center shadow-inner transition-all duration-300 border border-white/5 group-hover:border-transparent">
                  <svg 
                    viewBox="0 0 24 24" 
                    fill="currentColor" 
                    className="w-11 h-11 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                  </svg>
                </div>
                <div className="text-left">
                  <span className="text-lg font-bold block leading-tight">Connect on LinkedIn</span>
                  <div className="text-xs opacity-60 font-mono tracking-wider uppercase mt-1">@ishan-sawant</div>
                </div>
              </a>
            </div>
          </motion.div>
        </div>
        
        <footer className="mt-12 pt-10 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-mono text-slate-300 uppercase tracking-[0.3em] font-black">
          <div className="flex gap-8">
            <a href="https://github.com/ishan-cart" className="hover:text-brand-primary transition-colors">GitHub</a>
          </div>
        </footer>
      </div>
    </section>
  );
};

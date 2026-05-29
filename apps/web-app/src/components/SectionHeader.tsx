import { motion } from "motion/react";

type SectionHeaderProps = {
  eyebrow: string;
  title: string;
  titleMuted: string;
  description: string;
  className?: string;
  titleClassName?: string;
};

export const SectionHeader = ({
  eyebrow,
  title,
  titleMuted,
  description,
  className = "mb-20",
  titleClassName = "text-5xl md:text-6xl font-black text-slate-900 mb-4",
}: SectionHeaderProps) => (
  <div className={className}>
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      className="flex items-center gap-3 mb-2"
    >
      <div className="w-12 h-1 bg-brand-primary rounded-full" />
      <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-black">{eyebrow}</span>
    </motion.div>
    <motion.h2
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.1 }}
      className={titleClassName}
    >
      {title} <span className="text-slate-300">{titleMuted}</span>
    </motion.h2>
    <motion.p
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.2 }}
      className="text-slate-400 max-w-xl text-lg font-light"
    >
      {description}
    </motion.p>
  </div>
);

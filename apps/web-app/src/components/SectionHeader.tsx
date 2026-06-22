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
    <div className="flex items-center gap-3 mb-2">
      <div className="w-12 h-1 bg-brand-primary rounded-full" />
      <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-black">{eyebrow}</span>
    </div>
    <h2 className={titleClassName}>
      {title} <span className="text-slate-300">{titleMuted}</span>
    </h2>
    <p className="text-slate-400 max-w-xl text-lg font-light">
      {description}
    </p>
  </div>
);

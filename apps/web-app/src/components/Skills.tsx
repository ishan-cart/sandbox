import { motion } from "motion/react";
import { useState } from "react";
import { Cpu } from "lucide-react";

import amazonwebservicesLogo from "../assets/images/logos/amazonwebservices.svg";
import argocdLogo from "../assets/images/logos/argocd.svg";
import saltLogo from "../assets/images/logos/salt.png";

interface Skill {
  name: string;
  slug: string;
}

const LOCAL_LOGOS: Record<string, string> = {
  amazonwebservices: amazonwebservicesLogo,
  argocd: argocdLogo,
  salt: saltLogo,
};

const SkillIcon = ({ skill }: { skill: Skill }) => {
  const [errorType, setErrorType] = useState<"none" | "simpleicons" | "local">("none");

  const simpleIconsUrl = `https://cdn.simpleicons.org/${skill.slug}`;
  const localLogoUrl = LOCAL_LOGOS[skill.slug];

  if (errorType === "local") {
    return <Cpu className="w-4 h-4 text-slate-400" />;
  }

  if (errorType === "simpleicons") {
    if (localLogoUrl) {
      return (
        <img
          src={localLogoUrl}
          alt={skill.name}
          className="w-4 h-4 group-hover:scale-110 transition-all"
          onError={() => setErrorType("local")}
        />
      );
    }
    return <Cpu className="w-4 h-4 text-slate-400" />;
  }

  return (
    <img 
      src={simpleIconsUrl} 
      alt={skill.name}
      className="w-4 h-4 group-hover:scale-110 transition-all outline-hidden"
      onError={() => setErrorType("simpleicons")}
    />
  );
};

export const Skills = () => {
  const categories = [
    {
      title: "IaC",
      skills: [
        { name: "Terraform", slug: "terraform" },
        { name: "Salt", slug: "salt" }
      ]
    },
    {
      title: "Cloud Platforms",
      skills: [
        { name: "AWS", slug: "amazonwebservices" },
        { name: "GCP", slug: "googlecloud" }
      ]
    },
    {
      title: "Orchestration",
      skills: [
        { name: "Docker", slug: "docker" },
        { name: "Kubernetes", slug: "kubernetes" },
        { name: "Helm", slug: "helm" }
      ]
    },
    {
      title: "CI/CD",
      skills: [
        { name: "Github Actions", slug: "githubactions" },
        { name: "Argo CD", slug: "argocd" }
      ]
    },
    {
      title: "Monitoring/Observability",
      skills: [
        { name: "Splunk", slug: "splunk" },
        { name: "Prometheus", slug: "prometheus" },
        { name: "Grafana", slug: "grafana" }
      ]
    },
    {
      title: "Languages",
      skills: [
        { name: "Python", slug: "python" },
        { name: "Go", slug: "go" },
        { name: "Bash", slug: "gnubash" },
        { name: "C++", slug: "cplusplus" },
        { name: "SQL", slug: "postgresql" },
        { name: "PHP", slug: "php" }
      ]
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  };

  return (
    <section className="pt-20 pb-16 px-6 bg-slate-50" id="skills">
      <div className="max-w-6xl mx-auto">
        <div className="mb-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex items-center gap-3 mb-2"
          >
            <div className="w-12 h-1 bg-brand-primary rounded-full" />
            <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-black">Architecture Toolkit</span>
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.1 }}
            className="text-5xl md:text-6xl font-black text-slate-900 mb-4"
          >
            Tech <span className="text-slate-300">Stack.</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-slate-400 max-w-xl text-lg font-light"
          >
            A list of the tools and technologies I've worked with to build, monitor, and scale modern infra.
          </motion.p>
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {categories.map((cat) => (
            <motion.div
              key={cat.title}
              variants={itemVariants}
              className="bento-card group flex flex-col hover:border-brand-primary/20 hover:bg-white p-10"
            >
              <h3 className="font-black text-xl mb-6 text-slate-900 group-hover:text-brand-primary transition-colors">{cat.title}</h3>
              
              <div className="flex flex-wrap gap-2">
                {cat.skills.map((skill) => (
                  <motion.div 
                    key={skill.name}
                    whileHover={{ scale: 1.05 }}
                    className="px-4 py-2 bg-white border border-slate-100 rounded-2xl shadow-xs flex items-center gap-2.5 transition-all hover:border-slate-200"
                  >
                    <SkillIcon skill={skill} />
                    <span className="text-xs font-bold text-slate-600">{skill.name}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

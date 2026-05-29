import { motion } from "motion/react";
import type { ReactNode } from "react";

type TabPanelProps = {
  panelKey: string;
  className?: string;
  children: ReactNode;
};

export const TabPanel = ({ panelKey, className, children }: TabPanelProps) => (
  <motion.div
    key={panelKey}
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -15 }}
    transition={{ duration: 0.25 }}
    className={className}
  >
    {children}
  </motion.div>
);

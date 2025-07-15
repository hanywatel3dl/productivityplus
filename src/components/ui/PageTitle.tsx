import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface PageTitleProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
}

export const PageTitle = ({ icon: Icon, title, subtitle }: PageTitleProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4"
    >
      <Icon className="w-8 h-8 text-amber-500" />
      <div>
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        {subtitle && <p className="text-purple-300">{subtitle}</p>}
      </div>
    </motion.div>
  );
};
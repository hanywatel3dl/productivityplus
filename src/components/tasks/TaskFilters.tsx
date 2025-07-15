import { motion } from 'framer-motion';
import { Filter } from 'lucide-react';

interface TaskFiltersProps {
  filter: 'active' | 'completed';
  onFilterChange: (filter: 'active' | 'completed') => void;
}

export const TaskFilters = ({ filter, onFilterChange }: TaskFiltersProps) => {
  const filters = [
    { id: 'active', label: 'النشطة' },
    { id: 'completed', label: 'المكتملة' }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }} 
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6 p-2 md:p-2.5 bg-[#2D1B69]/30 rounded-full border border-purple-800/40 w-fit"
    >
      <Filter className="w-4 h-4 md:w-5 md:h-5 text-amber-400 ml-1" />
      <div className="flex gap-2 md:gap-3">
        {filters.map((f) => (
          <motion.button
            key={f.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onFilterChange(f.id as 'active' | 'completed')}
            className="px-4 py-1.5 md:px-5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-colors relative"
          >
            {filter === f.id && (
              <motion.div
                layoutId="taskFilterActive"
                className="absolute inset-0 bg-amber-400 rounded-full z-0"
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              />
            )}
            <span className={`relative z-10 ${filter === f.id ? 'text-purple-900' : 'text-white'}`}>
              {f.label}
            </span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
};
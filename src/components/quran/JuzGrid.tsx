import { motion } from 'framer-motion';
import { useStore } from '../../store';

const PAGES_PER_JUZ = 20;
const TOTAL_PAGES = 604;

interface JuzGridProps {
  onJuzSelect: (juzNumber: number) => void;
}

export const JuzGrid = ({ onJuzSelect }: JuzGridProps) => {
  const { quranProgress } = useStore();
  const today = new Date().toISOString().split('T')[0];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
    >
      {Array.from({ length: 30 }).map((_, index) => {
        const juzNumber = index + 1;
        const startPage = (juzNumber - 1) * PAGES_PER_JUZ + 1;
        const endPage = Math.min(juzNumber * PAGES_PER_JUZ, TOTAL_PAGES);
        const completedInJuz = quranProgress.filter(
          p => p.date === today && p.page >= startPage && p.page <= endPage
        ).length;
        
        return (
          <motion.button
            key={juzNumber}
            variants={item}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onJuzSelect(juzNumber)}
            className="p-4 bg-[#2D1B69]/30 rounded-lg hover:bg-[#2D1B69]/50 transition-all"
          >
            <div className="text-lg font-bold text-white mb-2">
              جزء {juzNumber}
            </div>
            <div className="text-sm text-purple-300">
              {completedInJuz} / {PAGES_PER_JUZ} صفحة
            </div>
            <div className="mt-2 h-1 bg-[#2D1B69] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(completedInJuz / PAGES_PER_JUZ) * 100}%` }}
                className="h-full bg-amber-500"
                transition={{ duration: 1 }}
              />
            </div>
          </motion.button>
        );
      })}
    </motion.div>
  );
};
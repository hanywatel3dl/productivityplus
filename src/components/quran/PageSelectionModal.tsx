import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle } from 'lucide-react';
import { useStore } from '../../store';

const PAGES_PER_JUZ = 20;
const TOTAL_PAGES = 604;

interface PageSelectionModalProps {
  juzNumber: number;
  onClose: () => void;
}

export const PageSelectionModal = ({ juzNumber, onClose }: PageSelectionModalProps) => {
  const { quranProgress, markPageCompleted } = useStore();
  const today = new Date().toISOString().split('T')[0];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.03
      }
    }
  };

  const item = {
    hidden: { opacity: 0, scale: 0.8 },
    show: { opacity: 1, scale: 1 }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-[#1A0F3C] rounded-xl p-6 w-full max-w-lg relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">
            الجزء {juzNumber}
          </h3>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#2D1B69]/50 text-purple-300"
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>
        
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-5 gap-3"
        >
          {Array.from({ length: PAGES_PER_JUZ }).map((_, index) => {
            const pageNumber = (juzNumber - 1) * PAGES_PER_JUZ + index + 1;
            if (pageNumber > TOTAL_PAGES) return null;
            
            const isCompleted = quranProgress.some(
              p => p.page === pageNumber && p.date === today
            );
            
            return (
              <motion.button
                key={pageNumber}
                variants={item}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => markPageCompleted(pageNumber, !isCompleted)}
                className={`
                  aspect-square rounded-lg flex items-center justify-center
                  transition-all duration-300
                  ${isCompleted 
                    ? 'bg-amber-500 shadow-lg shadow-amber-500/20' 
                    : 'bg-[#2D1B69]/50 hover:bg-[#2D1B69] text-white'}
                `}
              >
                {isCompleted ? (
                  <CheckCircle className="w-5 h-5 text-[#1A0F3C]" />
                ) : (
                  <span className="text-sm">{pageNumber}</span>
                )}
              </motion.button>
            );
          })}
        </motion.div>
      </motion.div>
    </motion.div>
  );
};
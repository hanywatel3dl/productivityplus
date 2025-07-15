import { motion } from 'framer-motion';
import { Book } from 'lucide-react';

interface DailyGoalCardProps {
  completedPages: number;
  progress: number;
}

export const DailyGoalCard = ({ completedPages, progress }: DailyGoalCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#2D1B69]/30 backdrop-blur-lg rounded-xl p-6"
    >
      <div className="flex items-center gap-4 mb-6">
        <Book className="w-8 h-8 text-amber-500" />
        <div>
          <h3 className="text-xl font-bold text-white">هدف اليوم</h3>
          <p className="text-purple-300">خمس صفحات في اليوم</p>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm text-purple-300 mb-2">
          <span>{completedPages} صفحات</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full h-2 bg-[#2D1B69] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-amber-500"
            transition={{ 
              type: "spring",
              stiffness: 260,
              damping: 20
            }}
          />
        </div>
      </div>

      {/* Motivational Message */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-4 text-sm text-purple-300"
      >
      </motion.div>
    </motion.div>
  );
};
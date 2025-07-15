import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useStore } from '../../store';

const TOTAL_PAGES = 604;

export const QuickAddPage = () => {
  const { quranProgress, markPageCompleted } = useStore();
  const [quickAddPage, setQuickAddPage] = useState('');
  
  const today = new Date().toISOString().split('T')[0];

  const handleQuickAdd = () => {
    const page = parseInt(quickAddPage);
    if (page >= 1 && page <= TOTAL_PAGES) {
      markPageCompleted(page, !quranProgress.some(p => p.page === page && p.date === today));
      setQuickAddPage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleQuickAdd();
    }
  };

  return (
    <div className="flex gap-4 mb-8">
      <input
        type="number"
        min="1"
        max={TOTAL_PAGES}
        value={quickAddPage}
        onChange={(e) => setQuickAddPage(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="رقم الصفحة..."
        className="flex-1 px-4 py-3 rounded-lg bg-[#2D1B69]/30 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
      />
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleQuickAdd}
        className="px-6 py-3 rounded-lg bg-amber-500 text-purple-900 font-bold flex items-center gap-2 transition-colors hover:bg-amber-400"
      >
        <Plus className="w-5 h-5" />
        إضافة
      </motion.button>
    </div>
  );
};
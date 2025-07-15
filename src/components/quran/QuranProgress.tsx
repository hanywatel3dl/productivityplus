import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Book, ChevronRight, Plus } from 'lucide-react';
import { useStore } from '../../store';
import { DailyGoalCard } from './DailyGoalCard';
import { QuickAddPage } from './QuickAddPage';
import { JuzGrid } from './JuzGrid';
import { PageSelectionModal } from './PageSelectionModal';
import { PageTitle } from '../ui/PageTitle';

interface QuranProgressProps {
  onBack: () => void;
}

export const QuranProgress = ({ onBack }: QuranProgressProps) => {
  const { quranProgress } = useStore();
  const [selectedJuz, setSelectedJuz] = useState<number | null>(null);
  
  const today = new Date().toISOString().split('T')[0];
  const completedPages = quranProgress.filter(p => p.date === today).length;
  const progress = (completedPages / 5) * 100;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <PageTitle
          icon={Book}
          title="تقدم القرآن الكريم"
          subtitle={`${completedPages} صفحات اليوم`}
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          className="px-4 py-2 rounded-lg bg-[#2D1B69]/50 text-white hover:bg-[#2D1B69] transition-colors flex items-center gap-2"
        >
          <ChevronRight className="w-5 h-5" />
          العودة للقراءة
        </motion.button>
      </div>

      <DailyGoalCard completedPages={completedPages} progress={progress} />
      <QuickAddPage />
      <JuzGrid onJuzSelect={setSelectedJuz} />
      
      {selectedJuz && (
        <PageSelectionModal
          juzNumber={selectedJuz}
          onClose={() => setSelectedJuz(null)}
        />
      )}
    </div>
  );
};
// --- START OF FILE PrayerStatus.tsx ---

import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';

interface PrayerStatusProps {
  remainingTime?: string;
  isNext: boolean;
}

export const PrayerStatus = ({ remainingTime, isNext }: PrayerStatusProps) => {
  if (!isNext || !remainingTime) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 text-amber-400 flex items-center gap-2"
    >
      <Clock className="w-4 h-4" />
      <span>متبقي: {remainingTime}</span>
    </motion.div>
  );
};
// --- END OF FILE PrayerStatus.tsx ---
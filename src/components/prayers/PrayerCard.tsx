// --- START OF FILE PrayerCard.tsx ---

import { motion } from 'framer-motion';
import { Check, Lock, Timer } from 'lucide-react'; // <-- إضافة أيقونة Timer
import { PrayerTime } from './PrayerTime';
import { PrayerStatus } from './PrayerStatus';

interface PrayerCardProps {
  name: string;
  time: Date;
  isNext: boolean;
  isCompleted: boolean;
  isEnabled: boolean;
  remainingTime?: string;
  elapsedTime?: string; // <-- Prop جديد للوقت المنقضي
  onComplete: () => void;
}

export const PrayerCard = ({
  name,
  time,
  isNext,
  isCompleted,
  isEnabled,
  remainingTime,
  elapsedTime, // <-- استخدامه هنا
  onComplete
}: PrayerCardProps) => {
  // البطاقة تعتبر "نشطة" إذا كانت هي الصلاة التالية أو الحالية (التي يمضي وقتها)
  const isActive = isNext || !!elapsedTime;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`
        relative p-6 rounded-2xl backdrop-blur-lg transition-all duration-300
        ${isActive ? 'bg-amber-400/20 ring-2 ring-amber-400' : 'bg-purple-900/30'}
        ${isCompleted ? 'border-green-500' : ''}
      `}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">{name}</h3>
        <motion.button
          whileHover={isEnabled ? { scale: 1.1 } : {}}
          whileTap={isEnabled ? { scale: 0.95 } : {}}
          onClick={isEnabled ? onComplete : undefined}
          className={`
            p-2 rounded-full transition-colors
            ${isCompleted ? 'bg-green-500' : isEnabled ? 'bg-purple-700 hover:bg-purple-600' : 'bg-gray-700 cursor-not-allowed'}
          `}
          disabled={!isEnabled}
        >
          {isEnabled ? (
            <Check className={`w-5 h-5 ${isCompleted ? 'text-white' : 'text-amber-400'}`} />
          ) : (
            <Lock className="w-5 h-5 text-gray-500" />
          )}
        </motion.button>
      </div>

      <PrayerTime time={time} />
      
      {/* عرض الوقت المتبقي للصلاة القادمة */}
      <PrayerStatus isNext={isNext} remainingTime={remainingTime} />

      {/* عرض الوقت المنقضي للصلاة الحالية */}
      {elapsedTime && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          // ✨ --- هذا هو التعديل: تم تغيير اللون من text-cyan-300 إلى text-amber-400 --- ✨
          className="mt-4 text-amber-400 flex items-center gap-2"
        >
          <Timer className="w-4 h-4" />
          <span>مضى من الوقت: {elapsedTime}</span>
        </motion.div>
      )}
      
      {!isEnabled && !isCompleted && (
        <div className="mt-2 text-sm text-gray-400">
          لم يحن وقت الصلاة بعد
        </div>
      )}
    </motion.div>
  );
};
// --- END OF FILE PrayerCard.tsx ---

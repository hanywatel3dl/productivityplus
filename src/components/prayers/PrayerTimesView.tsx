// --- START OF FILE PrayerTimesView.tsx ---

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
// ✨ تم حذف getCurrentIslamicDay من هنا لأنها كانت سبب المشكلة ✨
import { getPrayerTimes } from '../../services/prayerTimes';
import { PrayerCard } from './PrayerCard';
import { useStore } from '../../store';
import { format } from 'date-fns'; // <-- استيراد format

// دالة تنسيق الوقت الصحيحة
const formatUnit = (value: number, unitSingular: string, unitDual: string, unitPlural: string) => {
  if (value === 1) return `1 ${unitSingular}`;
  if (value === 2) return unitDual;
  if (value >= 3 && value <= 10) return `${value} ${unitPlural}`;
  return `${value} ${unitSingular}`;
};

const formatDuration = (totalSeconds: number) => {
  if (totalSeconds < 0) totalSeconds = 0;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const parts = [];
  if (hours > 0) parts.push(formatUnit(hours, 'ساعة', 'ساعتان', 'ساعات'));
  if (minutes > 0) parts.push(formatUnit(minutes, 'دقيقة', 'دقيقتان', 'دقائق'));
  if (seconds > 0) parts.push(formatUnit(seconds, 'ثانية', 'ثانيتان', 'ثوان'));

  if (parts.length === 0 && totalSeconds >= 0) return "حان الآن";
  return parts.join(' و ');
};

interface ActiveTimingInfo {
  prayerName: string;
  text: string;
  type: 'elapsed' | 'remaining';
}

export const PrayerTimesView = () => {
  const { prayers = [], setPrayerCompleted } = useStore();
  const [prayerCycleData, setPrayerCycleData] = useState<{ all: any[], display: any[] }>({ all: [], display: [] });
  const [activeTiming, setActiveTiming] = useState<ActiveTimingInfo | null>(null);
  const [islamicDay, setIslamicDay] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const determineAndLoadCorrectCycle = async () => {
      setIsLoading(true);
      try {
        const now = new Date();
        const todayDate = new Date();
        const yesterdayDate = new Date(now.getTime() - 86400000);

        const todayTimesForCheck = await getPrayerTimes(todayDate);
        const todaysFajr = todayTimesForCheck.find(p => p.name === 'الفجر');
        
        const targetDate = (todaysFajr && now < todaysFajr.time) ? yesterdayDate : todayDate;
        
        // --- ✨ هذا هو الحل الحقيقي: نستخدم targetDate كمصدر وحيد للحقيقة ✨ ---
        const correctIslamicDayString = format(targetDate, 'yyyy-MM-dd');
        console.log(`Prayer day for DISPLAY and SAVE is: ${correctIslamicDayString}`);
        setIslamicDay(correctIslamicDayString); // <-- يتم تعيين تاريخ الحفظ هنا بشكل صحيح
        
        const rawTimes = await getPrayerTimes(targetDate);
        
        const correctedTimes = rawTimes.map((prayer: any) => {
            const isNextDayFajr = prayer.name.includes('غدًا');
            const baseDate = new Date(targetDate);
            if (isNextDayFajr) {
                baseDate.setDate(baseDate.getDate() + 1);
            }
            const correctedDate = new Date(baseDate);
            correctedDate.setHours(prayer.time.getHours());
            correctedDate.setMinutes(prayer.time.getMinutes());
            correctedDate.setSeconds(prayer.time.getSeconds());
            return { ...prayer, time: correctedDate };
        });
        
        setPrayerCycleData({
          all: correctedTimes,
          display: correctedTimes.filter(p => !p.name.includes('غدًا')),
        });

      } catch (error) {
        console.error("Failed to determine and load prayer cycle:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    determineAndLoadCorrectCycle();

  }, []);

  useEffect(() => {
    if (isLoading || prayerCycleData.all.length === 0) return;

    const timerInterval = setInterval(() => {
      const now = new Date();
      const { all } = prayerCycleData;
      const ELAPSED_TIME_DURATION_MIN = 25;
      const currentPrayer = [...all].filter(p => now >= p.time).pop();
      const nextPrayer = all.find(p => p.time > now);

      let newActiveTiming: ActiveTimingInfo | null = null;
      if (currentPrayer) {
          const secondsSince = (now.getTime() - currentPrayer.time.getTime()) / 1000;
          if (secondsSince < ELAPSED_TIME_DURATION_MIN * 60 && !currentPrayer.name.includes('غدًا')) {
              newActiveTiming = { prayerName: currentPrayer.name, text: formatDuration(secondsSince), type: 'elapsed' };
          }
      }
      if (!newActiveTiming && nextPrayer) {
          const secondsUntil = (nextPrayer.time.getTime() - now.getTime()) / 1000;
          newActiveTiming = {
              prayerName: nextPrayer.name.replace(' (غدًا)', ''),
              text: formatDuration(secondsUntil),
              type: 'remaining'
          };
      }
      setActiveTiming(newActiveTiming);
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [isLoading, prayerCycleData]);

  const getCompletionStatus = (prayerName: string) => {
    // نستخدم islamicDay الصحيح الذي تم تعيينه
    return prayers.some(p => p.name === prayerName && p.date === islamicDay && p.completed);
  };

  const isPrayerEnabled = (prayerName: string, prayerTime: Date) => {
    return new Date() >= prayerTime;
  };

  if (isLoading) {
    return <div className="text-white text-center p-10">جاري تحديد يوم الصلاة...</div>;
  }

  return (
    <div className="space-y-6">
      <motion.h2 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold text-white mb-8">
        مواقيت الصلاة
      </motion.h2>

      {activeTiming?.type === 'remaining' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-amber-400/20 rounded-xl p-6 mb-8">
          <h3 className="text-xl font-bold text-white mb-2">الصلاة القادمة</h3>
          <div className="flex items-center gap-4">
            <span className="text-2xl font-bold text-amber-400">{activeTiming.prayerName}</span>
            <span className="text-white">متبقي: {activeTiming.text}</span>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {prayerCycleData.display.map((prayer) => (
          <PrayerCard
            key={`${prayer.name}-${prayer.time.toISOString()}`}
            name={prayer.name}
            time={prayer.time}
            isNext={activeTiming?.type === 'remaining' && activeTiming.prayerName === prayer.name}
            isCompleted={getCompletionStatus(prayer.name)}
            remainingTime={activeTiming?.type === 'remaining' && activeTiming.prayerName === prayer.name ? activeTiming.text : undefined}
            elapsedTime={activeTiming?.type === 'elapsed' && activeTiming.prayerName === prayer.name ? activeTiming.text : undefined}
            // --- دالة الحفظ الآن تستخدم islamicDay الصحيح والمضمون ---
            onComplete={() => setPrayerCompleted(prayer.name, !getCompletionStatus(prayer.name), islamicDay)}
            isEnabled={isPrayerEnabled(prayer.name, prayer.time)}
          />
        ))}
      </div>
    </div>
  );
};
// --- END OF FILE PrayerTimesView.tsx ---
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AudioPlayer } from './AudioPlayer';

export const AudioPlayerToggle = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const audioPlayerRef = useRef<HTMLDivElement>(null);
  const [playerHeight, setPlayerHeight] = useState(0);

  // useEffect للتحكم في الإغلاق عند النقر خارج المشغل (إذا لم يكن مثبتًا)
  useEffect(() => {
    if (isPinned) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        audioPlayerRef.current && 
        !audioPlayerRef.current.contains(event.target as Node) && 
        !(event.target as Element).closest('.audio-toggle-area')
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPinned]);

  // useEffect لحساب ارتفاع المشغل لوضع الشريط الأصفر بشكل صحيح
  useEffect(() => {
    if (audioPlayerRef.current) {
      setPlayerHeight(audioPlayerRef.current.offsetHeight);
    }
  }, [isOpen, isPinned]); // يتم إعادة الحساب عند فتح/تثبيت المشغل

  const handlePinToggle = (pinned: boolean) => {
    setIsPinned(pinned);
    if (pinned) {
      setIsOpen(true);
    }
  };

  return (
    <>
      <AnimatePresence>
        {!isPinned && (
          <motion.div
            initial={{x: -20, opacity: 0}}
            animate={{x: 0, opacity: 1}}
            exit={{x: -20, opacity: 0}}
            transition={{duration: 0.2}}
            onClick={() => setIsOpen(!isOpen)}
            // *** هذا هو التعديل الرئيسي: محاذاة ديناميكية ***
            // يتم حساب الموضع الرأسي بناءً على موضع المشغل وارتفاعه
            style={{ top: `calc(20vh + ${playerHeight}px - 4rem)` }}
            className="fixed left-0 h-16 w-2 bg-amber-500 rounded-r-full z-40 audio-toggle-area cursor-pointer shadow-md"
            whileHover={{ 
              width: 3, 
              backgroundColor: "#F59E0B",
              boxShadow: "0 0 8px rgba(245, 158, 11, 0.5)"
            }}
          >
            {/* لا يوجد أيقونة هنا */}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(isOpen || isPinned) && (
          <motion.div
            ref={audioPlayerRef}
            initial={{ opacity: 0, y: 20, x: 10 }}
            animate={{ opacity: 1, y: 0, x: 10 }}
            exit={{ opacity: 0, y: 20, x: 10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            // *** تم تثبيت موضع المشغل وتقريبه من الشريط ***
            // left-4: لتقريب المسافة
            className="fixed top-[20vh] left-4 z-50 shadow-xl"
          >
            <AudioPlayer 
              isPinned={isPinned} 
              setIsPinned={handlePinToggle}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
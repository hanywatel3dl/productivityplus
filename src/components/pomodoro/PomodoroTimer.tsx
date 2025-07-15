import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Settings, CheckCircle, Volume2, VolumeX, Check, ChevronRight, ChevronDown, Bell, Clock, Zap } from 'lucide-react';
import { useStore } from '../../store'; 
import { FocusSession } from '../../types'; 

type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

interface TimerSettings {
  focus: number;
  shortBreak: number;
  longBreak: number;
  autoStartBreaks: boolean;
  autoStartPomodoros: boolean;
  longBreakInterval: number;
  focusSound: string;
  breakSound: string;
  volume: number;
}

const soundOptions = [
  { id: 'bell', name: 'جرس', url: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' },
  { id: 'digital', name: 'رقمي', url: 'https://assets.mixkit.co/active_storage/sfx/2870/2870-preview.mp3' },
  { id: 'chime', name: 'رنين', url: 'https://assets.mixkit.co/active_storage/sfx/2872/2872-preview.mp3' },
  { id: 'notification', name: 'إشعار', url: 'https://assets.mixkit.co/active_storage/sfx/1518/1518-preview.mp3' },
  { id: 'alert', name: 'تنبيه', url: 'https://assets.mixkit.co/active_storage/sfx/2867/2867-preview.mp3' },
];

const TIMER_STATE_KEY = 'pomodoro-timer-state';
const TIMER_SETTINGS_KEY = 'pomodoro-timer-settings';

const defaultSettings: TimerSettings = {
  focus: 25,
  shortBreak: 5,
  longBreak: 15,
  autoStartBreaks: true,
  autoStartPomodoros: true,
  longBreakInterval: 4,
  focusSound: 'bell',
  breakSound: 'chime',
  volume: 0.7
};

export const PomodoroTimer = () => {
  const [settings, setSettings] = useState<TimerSettings>(() => {
    const savedSettings = localStorage.getItem(TIMER_SETTINGS_KEY);
    return savedSettings ? JSON.parse(savedSettings) : defaultSettings;
  });

  const currentPomodoroSessionIdRef = useRef<string | null>(null);
  const pomodoroStartTimeRef = useRef<number | null>(null);
  const loggedMinutesForCurrentPomodoroRef = useRef<number>(0);
  const pauseStartTimeRef = useRef<number | null>(null);


  const [timerState, setTimerState] = useState(() => {
    const savedStateString = localStorage.getItem(TIMER_STATE_KEY);
    const loadedSettings = localStorage.getItem(TIMER_SETTINGS_KEY) ? JSON.parse(localStorage.getItem(TIMER_SETTINGS_KEY)!) : defaultSettings;
    const initialFocusTime = loadedSettings.focus * 60;

    let initialState = {
      mode: 'focus' as TimerMode,
      timeLeft: initialFocusTime,
      isActive: false,
      completedPomodoros: 0,
      endTime: null as string | null,
      lastCompletedMode: null as TimerMode | null, // لتتبع آخر وضع مكتمل لعرض الرسالة الصحيحة
      _initial_sessionId: null as string | null,
      _initial_startTimeEpoch: null as number | null,
      _initial_loggedMinutes: 0,
    };

    if (savedStateString) {
      const parsed = JSON.parse(savedStateString);
      initialState = {
        ...initialState, 
        ...parsed, 
        _initial_sessionId: parsed.currentPomodoroSessionId || null,
        _initial_startTimeEpoch: parsed.pomodoroStartTimeEpoch || null,
        _initial_loggedMinutes: parsed.loggedMinutes || 0,
        // تأكد من أن lastCompletedMode يتم تحميله أيضًا إذا كان موجودًا
        lastCompletedMode: parsed.lastCompletedMode || null, 
      };

      if (parsed.endTime && parsed.isActive) { 
        const now = new Date().getTime();
        const endTimeEpoch = new Date(parsed.endTime).getTime();
        const remaining = Math.max(0, Math.floor((endTimeEpoch - now) / 1000));
        initialState.timeLeft = remaining;
        initialState.isActive = remaining > 0;
        initialState.endTime = remaining > 0 ? parsed.endTime : null;
         if (!initialState.isActive) { // إذا انتهى الوقت أثناء عدم تحميل الصفحة
            initialState.lastCompletedMode = parsed.mode; // افترض أن الوضع المحفوظ هو الذي اكتمل
        }
      } else { 
        initialState.isActive = false;
        initialState.endTime = null;
        // إذا كان متوقفًا مؤقتًا, `timeLeft` سيكون القيمة المحفوظة
      }
    }
    return initialState;
  });

  useEffect(() => {
    if (timerState._initial_sessionId) currentPomodoroSessionIdRef.current = timerState._initial_sessionId;
    if (timerState._initial_startTimeEpoch) pomodoroStartTimeRef.current = timerState._initial_startTimeEpoch;
    if (typeof timerState._initial_loggedMinutes === 'number') loggedMinutesForCurrentPomodoroRef.current = timerState._initial_loggedMinutes;
  }, [timerState._initial_sessionId, timerState._initial_startTimeEpoch, timerState._initial_loggedMinutes]);


  const { mode, timeLeft, isActive, completedPomodoros, endTime, lastCompletedMode } = timerState;
  const [showSettings, setShowSettings] = useState(false);
  const [showCompletionMessage, setShowCompletionMessage] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [notificationPermissionStatus, setNotificationPermissionStatus] = useState<NotificationPermission | null>(null);

  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const notificationRef = useRef<Notification | null>(null);

  const { addFocusSession } = useStore();

  useEffect(() => {
    const audio = new Audio();
    audio.volume = settings.volume;
    audioRef.current = audio;

    if ('Notification' in window) {
      setNotificationPermissionStatus(Notification.permission);
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => setNotificationPermissionStatus(permission));
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (notificationRef.current) notificationRef.current.close();
    };
  }, [settings.volume]);

  useEffect(() => { localStorage.setItem(TIMER_SETTINGS_KEY, JSON.stringify(settings)); }, [settings]);

  useEffect(() => {
    const { _initial_sessionId, _initial_startTimeEpoch, _initial_loggedMinutes, ...stateToSaveBase } = timerState;
    const stateToSave = {
      ...stateToSaveBase,
      currentPomodoroSessionId: currentPomodoroSessionIdRef.current,
      pomodoroStartTimeEpoch: pomodoroStartTimeRef.current,
      loggedMinutes: loggedMinutesForCurrentPomodoroRef.current,
    };
    localStorage.setItem(TIMER_STATE_KEY, JSON.stringify(stateToSave));
  }, [timerState]);


  const updateTimerState = (updates: Partial<Omit<typeof timerState, '_initial_sessionId' | '_initial_startTimeEpoch' | '_initial_loggedMinutes'>>) => {
    setTimerState(prev => ({ ...prev, ...updates }));
  };

  const logFocusMinute = useCallback((isFinalMinuteOfCompletedPomodoro = false) => {
    if (mode === 'focus' && currentPomodoroSessionIdRef.current) {
      const now = new Date();
      const minuteEntry: FocusSession = {
        id: crypto.randomUUID(),
        pomodoroSessionId: currentPomodoroSessionIdRef.current,
        duration: 1,
        startTime: new Date(now.getTime() - 60 * 1000).toISOString(),
        endTime: now.toISOString(),
        isCompletedPomodoro: isFinalMinuteOfCompletedPomodoro,
        targetPomodoroDuration: settings.focus,
      };
      addFocusSession(minuteEntry);
    }
  }, [addFocusSession, mode, settings.focus]);


  useEffect(() => {
    if (mode === 'focus' && isActive) {
      if (!currentPomodoroSessionIdRef.current) {
        currentPomodoroSessionIdRef.current = crypto.randomUUID();
        const elapsedSeconds = (settings.focus * 60) - timeLeft;
        pomodoroStartTimeRef.current = Date.now() - (elapsedSeconds * 1000);
        loggedMinutesForCurrentPomodoroRef.current = Math.floor(elapsedSeconds / 60);
      }
    } else if (mode !== 'focus') {
      currentPomodoroSessionIdRef.current = null;
      pomodoroStartTimeRef.current = null;
      loggedMinutesForCurrentPomodoroRef.current = 0;
      pauseStartTimeRef.current = null;
    }

    if (!isActive) {
      const isPausedFocusSession =
        mode === 'focus' &&
        !!currentPomodoroSessionIdRef.current &&
        endTime === null && 
        timeLeft < settings.focus * 60; 

      if (!isPausedFocusSession) {
        let newTimeLeft;
        switch (mode) {
          case 'focus': newTimeLeft = settings.focus * 60; break;
          case 'shortBreak': newTimeLeft = settings.shortBreak * 60; break;
          case 'longBreak': newTimeLeft = settings.longBreak * 60; break;
          default: newTimeLeft = settings.focus * 60;
        }
        // لا تقم بتحديث timeLeft إذا كان بالفعل هو القيمة المستهدفة أو إذا كان endTime ليس null (لأنه قد يكون قد توقف للتو)
        if (timerState.timeLeft !== newTimeLeft && timerState.endTime === null) {
            updateTimerState({ timeLeft: newTimeLeft });
        } else if (timerState.endTime !== null && (mode !== 'focus' || !currentPomodoroSessionIdRef.current)) {
             // إذا كان هناك endTime (يعني كان نشطًا وتوقف), ولكننا لسنا في جلسة تركيز متوقفة, قم بتنظيف endTime
            updateTimerState({ endTime: null });
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, isActive, settings.focus, settings.shortBreak, settings.longBreak, addFocusSession]); // timeLeft و endTime أُزيلت من هنا لتجنب الحلقات، المنطق أعلاه يعالجها


  useEffect(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    if (isActive && timeLeft > 0 && endTime) {
      const updateRemainingTime = () => {
        const nowMs = Date.now();
        const endTimeMs = new Date(endTime).getTime();
        const currentRemainingSeconds = Math.ceil(Math.max(0, endTimeMs - nowMs) / 1000);

        if (currentRemainingSeconds !== timerState.timeLeft) { 
          setTimerState(prev => ({ ...prev, timeLeft: currentRemainingSeconds }));
        }

        if (mode === 'focus' && pomodoroStartTimeRef.current && currentPomodoroSessionIdRef.current) {
          const totalElapsedMsFromPomodoroStart = nowMs - pomodoroStartTimeRef.current;
          const totalElapsedMinutesFromPomodoroStart = Math.floor(totalElapsedMsFromPomodoroStart / (60 * 1000));

          if (totalElapsedMinutesFromPomodoroStart > loggedMinutesForCurrentPomodoroRef.current && currentRemainingSeconds > 0) {
            for (let i = loggedMinutesForCurrentPomodoroRef.current; i < totalElapsedMinutesFromPomodoroStart; i++) {
              logFocusMinute(false);
            }
            loggedMinutesForCurrentPomodoroRef.current = totalElapsedMinutesFromPomodoroStart;
          }
        }

        if (currentRemainingSeconds <= 0) handleTimerComplete();
      };
      updateRemainingTime();
      timerRef.current = window.setInterval(updateRemainingTime, 500);
    } else if (isActive && timeLeft <= 0) {
      handleTimerComplete();
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, timeLeft, endTime, mode, logFocusMinute, timerState.timeLeft]); 


  const showNotification = (title: string, body: string = '') => {
    if (notificationPermissionStatus === 'granted' && 'Notification' in window) {
        if (notificationRef.current) {
            notificationRef.current.close();
        }
        try {
            const notification = new Notification(title, { body, icon: '/logo192.png' }); 
            notificationRef.current = notification;
        } catch (err) {
            console.error("Error showing notification:", err);
        }
    }
  };

  const handleTimerComplete = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    const soundId = timerState.mode === 'focus' ? settings.focusSound : settings.breakSound; // استخدم timerState.mode
    const soundUrl = soundOptions.find(s => s.id === soundId)?.url;
    if (soundUrl && audioRef.current) {
        audioRef.current.src = soundUrl;
        audioRef.current.play().catch(e => console.error("Error playing sound:", e));
    }

    const justCompletedMode = timerState.mode; 

    if (justCompletedMode === 'focus') {
      showNotification('انتهت جلسة التركيز!', 'حان وقت الاستراحة');
      if (currentPomodoroSessionIdRef.current && pomodoroStartTimeRef.current && settings.focus > 0) {
        const totalExpectedMinutesInPomodoro = settings.focus;
        if (loggedMinutesForCurrentPomodoroRef.current < totalExpectedMinutesInPomodoro) {
          for (let i = loggedMinutesForCurrentPomodoroRef.current; i < totalExpectedMinutesInPomodoro -1; i++) { 
            logFocusMinute(false);
          }
        }
        logFocusMinute(true);
        loggedMinutesForCurrentPomodoroRef.current = totalExpectedMinutesInPomodoro;
      } else if (settings.focus === 0 && currentPomodoroSessionIdRef.current) {
         logFocusMinute(true); 
      }
      currentPomodoroSessionIdRef.current = null;
      pomodoroStartTimeRef.current = null;
      loggedMinutesForCurrentPomodoroRef.current = 0;
      pauseStartTimeRef.current = null; 
    } else {
      showNotification('انتهت فترة الاستراحة!', 'حان وقت العودة للتركيز');
    }

    setShowCompletionMessage(true); setTimeout(() => setShowCompletionMessage(false), 5000);
    setIsAnimating(true); setTimeout(() => setIsAnimating(false), 1000);

    let nextStateUpdates: Partial<Omit<typeof timerState, '_initial_sessionId' | '_initial_startTimeEpoch' | '_initial_loggedMinutes'>>;

    if (justCompletedMode === 'focus') {
      const newCompletedCount = completedPomodoros + 1;
      const isLongBreakDue = newCompletedCount % settings.longBreakInterval === 0;
      const nextMode = isLongBreakDue ? 'longBreak' : 'shortBreak';
      const nextDuration = nextMode === 'longBreak' ? settings.longBreak : settings.shortBreak;
      const nextEndTimeValue = settings.autoStartBreaks ? calculateEndTime(nextDuration) : null;
      nextStateUpdates = {
        completedPomodoros: newCompletedCount, 
        mode: nextMode,
        isActive: settings.autoStartBreaks, 
        timeLeft: nextDuration * 60, 
        endTime: nextEndTimeValue
      };
    } else { 
      const nextEndTimeValue = settings.autoStartPomodoros ? calculateEndTime(settings.focus) : null;
      nextStateUpdates = {
        mode: 'focus', 
        isActive: settings.autoStartPomodoros,
        timeLeft: settings.focus * 60, 
        endTime: nextEndTimeValue
      };
    }
    
    updateTimerState({
        ...nextStateUpdates,
        lastCompletedMode: justCompletedMode 
    });
  };

  const calculateEndTime = (minutes: number): string => { const e = new Date(); e.setSeconds(e.getSeconds() + minutes*60); return e.toISOString();};

  const toggleTimer = () => {
    const newIsActive = !isActive;
    let newEndTimeValue = timerState.endTime;

    if (newIsActive) { 
      const now = new Date();
      now.setSeconds(now.getSeconds() + timeLeft);
      newEndTimeValue = now.toISOString();

      if (mode === 'focus') {
        if (!currentPomodoroSessionIdRef.current) { 
            currentPomodoroSessionIdRef.current = crypto.randomUUID();
            const elapsedSinceFull = (settings.focus * 60) - timeLeft;
            pomodoroStartTimeRef.current = Date.now() - (elapsedSinceFull * 1000);
            loggedMinutesForCurrentPomodoroRef.current = Math.floor(elapsedSinceFull / 60);
        } else if (pauseStartTimeRef.current && pomodoroStartTimeRef.current) { 
            const pauseDurationMs = Date.now() - pauseStartTimeRef.current;
            pomodoroStartTimeRef.current += pauseDurationMs;
            pauseStartTimeRef.current = null;
        }
      }
    } else { 
      newEndTimeValue = null; 
      if (mode === 'focus' && isActive) { 
        pauseStartTimeRef.current = Date.now();
      }
    }
    updateTimerState({ isActive: newIsActive, endTime: newEndTimeValue });
  };

  const resetTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    let newTimeLeft;
    let newMode = mode; // الوضع الحالي بشكل افتراضي
    // إذا كنا في وضع التركيز، وأردنا إعادة تعيينه، نبقى في وضع التركيز
    // إذا كنا في وضع استراحة، وأردنا إعادة تعيينه، نعود إلى وضع التركيز
    if (mode === 'shortBreak' || mode === 'longBreak') {
        newMode = 'focus';
        newTimeLeft = settings.focus * 60;
    } else { // وضع التركيز
        newTimeLeft = settings.focus * 60;
    }
    
    currentPomodoroSessionIdRef.current = null;
    pomodoroStartTimeRef.current = null;
    loggedMinutesForCurrentPomodoroRef.current = 0;
    pauseStartTimeRef.current = null;

    updateTimerState({ mode: newMode, isActive: false, timeLeft: newTimeLeft, endTime: null, lastCompletedMode: null });
  };

  const formatTime = (totalSeconds: number): string => {
    if (totalSeconds < 0) totalSeconds = 0; 
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  };

  const calculateProgress = (): number => {
    let totalDurationSeconds;
    switch(mode) {
      case 'focus': totalDurationSeconds = settings.focus * 60; break;
      case 'shortBreak': totalDurationSeconds = settings.shortBreak * 60; break;
      case 'longBreak': totalDurationSeconds = settings.longBreak * 60; break;
      default: totalDurationSeconds = settings.focus * 60;
    }
    if (totalDurationSeconds === 0) return mode === 'focus' && isActive ? 100 : 0; 
    
    if (isActive) {
        return ((totalDurationSeconds - timeLeft) / totalDurationSeconds) * 100;
    } else if (mode === 'focus' && currentPomodoroSessionIdRef.current && totalDurationSeconds > 0) {
        return ((totalDurationSeconds - timeLeft) / totalDurationSeconds) * 100;
    }
    return 0; 
  };

  const handleSettingChange = (key: keyof TimerSettings, value: number | boolean | string) => {
    setSettings(prev => {
        const newSettings = { ...prev, [key]: value };
        if (!isActive) {
            let newTimeLeftVal = timerState.timeLeft;
            let modeToCompare = mode;

            if (key === 'focus' && modeToCompare === 'focus') {
                newTimeLeftVal = (newSettings.focus as number) * 60;
            } else if (key === 'shortBreak' && modeToCompare === 'shortBreak') {
                newTimeLeftVal = (newSettings.shortBreak as number) * 60;
            } else if (key === 'longBreak' && modeToCompare === 'longBreak') {
                newTimeLeftVal = (newSettings.longBreak as number) * 60;
            }
            
            if (newTimeLeftVal !== timerState.timeLeft) {
                 updateTimerState({ timeLeft: newTimeLeftVal });
            }
        }
        return newSettings;
    });
  };

  const setTimerMode = (newMode: TimerMode) => {
    if (newMode !== mode) {
      updateTimerState({ mode: newMode, isActive: false, endTime: null, lastCompletedMode: null });
    }
  };

  const calculateStrokeDashOffset = () => { const c = 2*Math.PI*46; return c - (c * calculateProgress())/100;};
  const getModeColor = () => { switch(mode){case 'focus': return '#FFA000'; case 'shortBreak': return '#4FD1C5'; case 'longBreak': return '#68D391'; default: return '#FFA000';}};

  const requestNotificationPermission = () => {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        setNotificationPermissionStatus(permission);
        if (permission === 'granted') {
          showNotification('تم تفعيل الإشعارات!', 'ستتلقى الآن إشعارات بانتهاء الجلسات.');
        }
      });
    }
  };

  const playTestSound = (soundId: string) => {
    const soundUrl = soundOptions.find(s => s.id === soundId)?.url;
    if (soundUrl && audioRef.current) {
        audioRef.current.src = soundUrl;
        audioRef.current.volume = settings.volume; 
        audioRef.current.play().catch(e => console.error("Error playing test sound:", e));
    }
  };

  return (
    <div className="space-y-8">
      <motion.h2 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold text-amber-400">
        بومودورو
      </motion.h2>
      
      <div className="grid grid-cols-1 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Timer Mode Selector */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex bg-[#1A0F3C] rounded-lg p-1">
              {(['focus', 'shortBreak', 'longBreak'] as const).map((timerModeOption) => { 
                const isActiveMode = mode === timerModeOption;
                let bgColor = 'bg-amber-400'; 
                if (timerModeOption === 'shortBreak') bgColor = 'bg-teal-400';
                else if (timerModeOption === 'longBreak') bgColor = 'bg-green-400';
                
                return (
                  <motion.button 
                    key={timerModeOption} 
                    whileHover={{ scale: 1.05 }} 
                    whileTap={{ scale: 0.95 }} 
                    onClick={() => setTimerMode(timerModeOption)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors mx-1 ${isActiveMode ? `${bgColor} text-[#1A0F3C]` : `text-white hover:bg-[#2D1B69]`}`}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    {timerModeOption === 'focus' && 'تركيز'}
                    {timerModeOption === 'shortBreak' && 'استراحة قصيرة'}
                    {timerModeOption === 'longBreak' && 'استراحة طويلة'}
                  </motion.button>
                );
              })}
            </div>
          </div>
          
          {/* Timer Display */}
          {/* جعل هذا الـ div هو relative لتحديد موضع رسالة الإكتمال */}
          <div className="relative flex flex-col items-center justify-center mb-8">
            <motion.div 
              className="w-72 h-72 rounded-full bg-[#1A0F3C] flex items-center justify-center relative" // زيادة حجم الدائرة + relative
              animate={isAnimating ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            >
              <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="46" fill="none" stroke="#3D2B79" strokeWidth="8" />
                <motion.circle 
                  cx="50" 
                  cy="50" 
                  r="46" 
                  fill="none" 
                  stroke={getModeColor()} 
                  strokeWidth="8" 
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 46} 
                  transform="rotate(-90 50 50)"
                  initial={{ strokeDashoffset: 2 * Math.PI * 46 }} 
                  animate={{ strokeDashoffset: calculateStrokeDashOffset() }}
                  transition={{ duration: 0.5, ease: "easeInOut" }} 
                />
              </svg>
              <div className="text-center z-10">
                <motion.div 
                  key={`${timeLeft}-${mode}`} // key لضمان إعادة الأنيميشن عند تغير الوقت أو الوضع
                  className="text-5xl font-bold text-white mb-2" // زيادة حجم الخط
                  animate={isAnimating ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                >
                  {formatTime(timeLeft)}
                </motion.div>
                <motion.div 
                  className="text-purple-300"
                  animate={isAnimating ? { opacity: [1, 0.7, 1] } : {}}
                >
                  {mode === 'focus' && 'وقت التركيز'}
                  {mode === 'shortBreak' && 'استراحة قصيرة'}
                  {mode === 'longBreak' && 'استراحة طويلة'}
                </motion.div>
              </div>
            </motion.div>
            
            <AnimatePresence>
              {showCompletionMessage && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  // تعديل الـ className ليكون أسفل الدائرة مباشرة
                  className="absolute top-[155%] mt-4 bg-green-500 text-white px-6 py-3 rounded-lg flex items-center gap-2 shadow-lg z-20"
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>
                    {lastCompletedMode === 'focus' 
                      ? 'أحسنت! اكتملت فترة التركيز' 
                      : lastCompletedMode // إذا كان shortBreak أو longBreak
                        ? 'انتهت فترة الاستراحة' 
                        : 'اكتملت الجلسة' // كحالة احتياطية
                    }
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {/* Timer Controls */}
          <div className="flex justify-center gap-4">
            <motion.button 
              whileHover={{ scale: 1.1 }} 
              whileTap={{ scale: 0.9 }} 
              onClick={toggleTimer}
              className="p-4 rounded-full text-[#1A0F3C]" 
              style={{ backgroundColor: getModeColor() }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              aria-label={isActive ? "Pause timer" : "Start timer"}
            >
              {isActive ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.1, backgroundColor: "#3D2B79" }} 
              whileTap={{ scale: 0.9 }} 
              onClick={resetTimer}
              className="p-4 rounded-full bg-[#2D1B69] text-white"
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              aria-label="Reset timer"
            >
              <RotateCcw className="w-6 h-6" />
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.1, backgroundColor: "#3D2B79" }} 
              whileTap={{ scale: 0.9 }} 
              onClick={() => setShowSettings(!showSettings)}
              className="p-4 rounded-full bg-[#2D1B69] text-white"
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              aria-label="Open settings"
            >
              <Settings className="w-6 h-6" />
            </motion.button>
          </div>
          
          {/* Pomodoro Counter */}
          <div className="mt-8 flex justify-center">
            <div className="flex gap-2">
              {Array.from({ length: settings.longBreakInterval }).map((_, index) => (
                <motion.div 
                  key={index} 
                  className={`w-3 h-3 rounded-full ${index < (completedPomodoros % settings.longBreakInterval) ? 'bg-amber-400' : 'bg-[#2D1B69]'}`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.1, type: "spring", stiffness: 400, damping: 17 }}
                />
              ))}
            </div>
          </div>
          
          {/* Settings Panel */}
          <AnimatePresence>
            {showSettings && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="mt-8 overflow-hidden"
              >
                <motion.div 
                  className="bg-[#1A0F3C] rounded-lg p-6 shadow-lg border border-purple-800/30 space-y-8"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">الإعدادات</h3>
                    <motion.button 
                      whileHover={{ scale: 1.1, backgroundColor: "rgba(45, 27, 105, 0.5)" }} 
                      whileTap={{ scale: 0.9 }} 
                      onClick={() => setShowSettings(false)}
                      className="p-2 rounded-full hover:bg-[#2D1B69] text-purple-300"
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      aria-label="Close settings"
                    >
                      <ChevronRight className="w-5 h-5" /> {/* إعادة الأيقونة للأصل */}
                    </motion.button>
                  </div>
                  
                  {/* Duration Settings */}
                  <motion.div 
                    className="bg-[#2D1B69]/30 rounded-xl p-6 shadow-inner"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <h4 className="text-lg font-bold text-amber-400 mb-6 flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      مدة الجلسات
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Focus Duration */}
                      <motion.div 
                        className="bg-gradient-to-br from-[#2D1B69]/80 to-[#2D1B69]/40 p-5 rounded-xl shadow-md border border-purple-700/30"
                        whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(45, 27, 105, 0.5)" }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-amber-400 rounded-full"></div>
                            <span className="text-white font-medium">التركيز</span>
                          </div>
                          <span className="text-amber-400 font-bold">{settings.focus} دقيقة</span>
                        </div>
                        <div className="flex items-center bg-[#1A0F3C]/50 rounded-lg overflow-hidden">
                          <motion.button 
                            whileHover={{ backgroundColor: 'rgba(61, 43, 121, 0.8)' }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleSettingChange('focus', Math.max(1, settings.focus - 5))}
                            className="px-3 py-2 text-white hover:bg-[#3D2B79]"
                            aria-label="Decrease focus time by 5 minutes"
                          >
                            -5
                          </motion.button>
                          <motion.button 
                            whileHover={{ backgroundColor: 'rgba(61, 43, 121, 0.8)' }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleSettingChange('focus', Math.max(1, settings.focus - 1))}
                            className="px-3 py-2 text-white hover:bg-[#3D2B79]"
                            aria-label="Decrease focus time by 1 minute"
                          >
                            -
                          </motion.button>
                          <div className="flex-1 text-center py-2 text-white font-bold">{settings.focus}</div>
                          <motion.button 
                            whileHover={{ backgroundColor: 'rgba(61, 43, 121, 0.8)' }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleSettingChange('focus', Math.min(180, settings.focus + 1))}
                            className="px-3 py-2 text-white hover:bg-[#3D2B79]"
                            aria-label="Increase focus time by 1 minute"
                          >
                            +
                          </motion.button>
                          <motion.button 
                            whileHover={{ backgroundColor: 'rgba(61, 43, 121, 0.8)' }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleSettingChange('focus', Math.min(180, settings.focus + 5))}
                            className="px-3 py-2 text-white hover:bg-[#3D2B79]"
                            aria-label="Increase focus time by 5 minutes"
                          >
                            +5
                          </motion.button>
                        </div>
                      </motion.div>
                      
                      {/* Short Break Duration */}
                      <motion.div 
                        className="bg-gradient-to-br from-[#2D1B69]/80 to-[#2D1B69]/40 p-5 rounded-xl shadow-md border border-purple-700/30"
                        whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(45, 27, 105, 0.5)" }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-teal-400 rounded-full"></div>
                            <span className="text-white font-medium">استراحة قصيرة</span>
                          </div>
                          <span className="text-teal-400 font-bold">{settings.shortBreak} دقيقة</span>
                        </div>
                        <div className="flex items-center bg-[#1A0F3C]/50 rounded-lg overflow-hidden">
                          <motion.button 
                            whileHover={{ backgroundColor: 'rgba(61, 43, 121, 0.8)' }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleSettingChange('shortBreak', Math.max(1, settings.shortBreak - 1))}
                            className="px-3 py-2 text-white hover:bg-[#3D2B79]"
                            aria-label="Decrease short break time by 1 minute"
                          >
                            -
                          </motion.button>
                          <div className="flex-1 text-center py-2 text-white font-bold">{settings.shortBreak}</div>
                          <motion.button 
                            whileHover={{ backgroundColor: 'rgba(61, 43, 121, 0.8)' }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleSettingChange('shortBreak', Math.min(30, settings.shortBreak + 1))}
                            className="px-3 py-2 text-white hover:bg-[#3D2B79]"
                            aria-label="Increase short break time by 1 minute"
                          >
                            +
                          </motion.button>
                        </div>
                      </motion.div>
                      
                      {/* Long Break Duration */}
                      <motion.div 
                        className="bg-gradient-to-br from-[#2D1B69]/80 to-[#2D1B69]/40 p-5 rounded-xl shadow-md border border-purple-700/30"
                        whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(45, 27, 105, 0.5)" }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                            <span className="text-white font-medium">استراحة طويلة</span>
                          </div>
                          <span className="text-green-400 font-bold">{settings.longBreak} دقيقة</span>
                        </div>
                        <div className="flex items-center bg-[#1A0F3C]/50 rounded-lg overflow-hidden">
                          <motion.button 
                            whileHover={{ backgroundColor: 'rgba(61, 43, 121, 0.8)' }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleSettingChange('longBreak', Math.max(1, settings.longBreak - 5))} 
                            className="px-3 py-2 text-white hover:bg-[#3D2B79]"
                            aria-label="Decrease long break time by 5 minutes"
                          >
                            -5
                          </motion.button>
                          <motion.button 
                            whileHover={{ backgroundColor: 'rgba(61, 43, 121, 0.8)' }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleSettingChange('longBreak', Math.max(1, settings.longBreak - 1))}
                            className="px-3 py-2 text-white hover:bg-[#3D2B79]"
                            aria-label="Decrease long break time by 1 minute"
                          >
                            -
                          </motion.button>
                          <div className="flex-1 text-center py-2 text-white font-bold">{settings.longBreak}</div>
                          <motion.button 
                            whileHover={{ backgroundColor: 'rgba(61, 43, 121, 0.8)' }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleSettingChange('longBreak', Math.min(60, settings.longBreak + 1))}
                            className="px-3 py-2 text-white hover:bg-[#3D2B79]"
                            aria-label="Increase long break time by 1 minute"
                          >
                            +
                          </motion.button>
                          <motion.button 
                            whileHover={{ backgroundColor: 'rgba(61, 43, 121, 0.8)' }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleSettingChange('longBreak', Math.min(60, settings.longBreak + 5))}
                            className="px-3 py-2 text-white hover:bg-[#3D2B79]"
                            aria-label="Increase long break time by 5 minutes"
                          >
                            +5
                          </motion.button>
                        </div>
                      </motion.div>
                    </div>
                    
                    {/* Long Break Interval Setting */}
                    <motion.div 
                      className="bg-gradient-to-br from-[#2D1B69]/80 to-[#2D1B69]/40 p-5 rounded-xl shadow-md border border-purple-700/30 mt-6"
                      whileHover={{ boxShadow: "0 10px 25px -5px rgba(45, 27, 105, 0.5)" }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-amber-400 rounded-full"></div>
                          <span className="text-white font-medium">عدد الجلسات قبل الاستراحة الطويلة</span>
                        </div>
                        <span className="text-amber-400 font-bold">{settings.longBreakInterval} جلسات</span>
                      </div>
                      <div className="flex items-center bg-[#1A0F3C]/50 rounded-lg overflow-hidden">
                        <motion.button 
                          whileHover={{ backgroundColor: 'rgba(61, 43, 121, 0.8)' }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleSettingChange('longBreakInterval', Math.max(1, settings.longBreakInterval - 1))}
                          className="px-3 py-2 text-white hover:bg-[#3D2B79]"
                          aria-label="Decrease long break interval by 1"
                        >
                          -
                        </motion.button>
                        <div className="flex-1 text-center py-2 text-white font-bold">{settings.longBreakInterval}</div>
                        <motion.button 
                          whileHover={{ backgroundColor: 'rgba(61, 43, 121, 0.8)' }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleSettingChange('longBreakInterval', Math.min(10, settings.longBreakInterval + 1))}
                          className="px-3 py-2 text-white hover:bg-[#3D2B79]"
                          aria-label="Increase long break interval by 1"
                        >
                          +
                        </motion.button>
                      </div>
                    </motion.div>
                    
                    <motion.div  
                      className="bg-gradient-to-br from-[#2D1B69]/80 to-[#2D1B69]/40 p-5 rounded-xl shadow-md border border-purple-700/30 mt-6" 
                      whileHover={{ scale: 1.02, boxShadow: "0 10px 25px -5px rgba(45, 27, 105, 0.5)" }} 
                      transition={{ type: "spring", stiffness: 300, damping: 20 }} 
                    >
                      <h5 className="text-white font-medium mb-4 flex items-center gap-2"> 
                        <Zap className="w-4 h-4 text-amber-400" /> 
                        إعدادات التشغيل التلقائي 
                      </h5> 

                      <div className="space-y-4"> 
                        <div className="flex items-center justify-between"> 
                          <div className="text-purple-300 text-sm"> 
                            <div className="font-medium text-white">تشغيل الاستراحات تلقائيًا</div> 
                            <div>بدء الاستراحة تلقائيًا بعد انتهاء جلسة التركيز</div> 
                          </div> 
                          <motion.button  
                            onClick={() => handleSettingChange('autoStartBreaks', !settings.autoStartBreaks)} 
                            whileTap={{ scale: 0.95 }} 
                            className={`w-12 h-6 rounded-full relative transition-colors ${settings.autoStartBreaks ? 'bg-amber-400' : 'bg-[#3D2B79]'}`} 
                            aria-pressed={settings.autoStartBreaks}
                            aria-label="Toggle auto start breaks"
                          > 
                            <motion.div  
                              className="w-5 h-5 rounded-full bg-white absolute top-0.5" 
                              initial={false} 
                              animate={{ right: settings.autoStartBreaks ? "2px" : "calc(100% - 22px)" }} 
                              transition={{ type: "spring", stiffness: 500, damping: 30 }} 
                            /> 
                          </motion.button> 
                        </div> 

                        <div className="flex items-center justify-between"> 
                          <div className="text-purple-300 text-sm"> 
                            <div className="font-medium text-white">تشغيل جلسات التركيز تلقائيًا</div> 
                            <div>بدء جلسة تركيز جديدة تلقائيًا بعد انتهاء الاستراحة</div> 
                          </div> 
                          <motion.button  
                            onClick={() => handleSettingChange('autoStartPomodoros', !settings.autoStartPomodoros)} 
                            whileTap={{ scale: 0.95 }} 
                            className={`w-12 h-6 rounded-full relative transition-colors ${settings.autoStartPomodoros ? 'bg-amber-400' : 'bg-[#3D2B79]'}`} 
                            aria-pressed={settings.autoStartPomodoros}
                            aria-label="Toggle auto start pomodoros"
                          > 
                            <motion.div  
                              className="w-5 h-5 rounded-full bg-white absolute top-0.5" 
                              initial={false} 
                              animate={{ right: settings.autoStartPomodoros ? "2px" : "calc(100% - 22px)" }} 
                              transition={{ type: "spring", stiffness: 500, damping: 30 }} 
                            /> 
                          </motion.button> 
                        </div> 
                      </div> 
                    </motion.div>
                  </motion.div>
                  
                  {/* Sound Settings */}
                  <motion.div 
                    className="bg-[#2D1B69]/30 rounded-xl p-6 shadow-inner"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <h4 className="text-lg font-bold text-amber-400 mb-6 flex items-center gap-2">
                      <Volume2 className="w-5 h-5" />
                      إعدادات الصوت
                    </h4>
                    <motion.div 
                      className="bg-gradient-to-br from-[#2D1B69]/80 to-[#2D1B69]/40 p-5 rounded-xl shadow-md border border-purple-700/30 mb-6"
                      whileHover={{ boxShadow: "0 10px 25px -5px rgba(45, 27, 105, 0.5)" }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-white font-medium">مستوى الصوت</span>
                        <span className="text-amber-400 font-bold">{Math.round(settings.volume * 100)}%</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <VolumeX className="w-5 h-5 text-purple-300 flex-shrink-0" aria-hidden="true" />
                        <div className="relative w-full h-2 bg-[#1A0F3C] rounded-full overflow-hidden">
                          <motion.div 
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"
                            style={{ width: `${settings.volume * 100}%` }}
                            initial={{ width: 0 }}
                            animate={{ width: `${settings.volume * 100}%` }}
                            transition={{ duration: 0.3 }}
                          ></motion.div>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            value={settings.volume}
                            onChange={(e) => {
                                const newVolume = parseFloat(e.target.value);
                                handleSettingChange('volume', newVolume);
                                if (audioRef.current) audioRef.current.volume = newVolume;
                            }}
                            className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                            aria-label="Volume control"
                          />
                        </div>
                        <Volume2 className="w-5 h-5 text-purple-300 flex-shrink-0" aria-hidden="true" />
                      </div>
                    </motion.div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <motion.div 
                        className="bg-gradient-to-br from-[#2D1B69]/80 to-[#2D1B69]/40 p-5 rounded-xl shadow-md border border-purple-700/30"
                        whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(45, 27, 105, 0.5)" }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Bell className="w-5 h-5 text-amber-400" />
                            <span className="text-white font-medium">صوت انتهاء جلسة التركيز</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <select
                              value={settings.focusSound}
                              onChange={(e) => handleSettingChange('focusSound', e.target.value)}
                              className="w-full p-3 pr-12 bg-[#1A0F3C] rounded-lg text-white border border-purple-700/30 focus:outline-none focus:ring-2 focus:ring-amber-400 appearance-none"
                              aria-label="Focus session end sound"
                            >
                              {soundOptions.map(sound => (
                                <option key={sound.id} value={sound.id}>
                                  {sound.name}
                                </option>
                              ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                              <ChevronDown className="w-5 h-5 text-purple-300" />
                            </div>
                          </div >
                          <motion.button 
                            whileHover={{ scale: 1.05, backgroundColor: 'rgba(61, 43, 121, 0.8)' }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => playTestSound(settings.focusSound)}
                            className="p-3 bg-[#3D2B79] hover:bg-[#4D3B89] rounded-lg text-white transition-colors flex items-center justify-center border border-purple-700/30"
                            aria-label="Play test sound for focus end"
                          >
                            <Volume2 className="w-5 h-5" />
                          </motion.button>
                        </div>
                      </motion.div>
                      
                      <motion.div 
                        className="bg-gradient-to-br from-[#2D1B69]/80 to-[#2D1B69]/40 p-5 rounded-xl shadow-md border border-purple-700/30"
                        whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(45, 27, 105, 0.5)" }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Bell className="w-5 h-5 text-teal-400" />
                            <span className="text-white font-medium">صوت انتهاء فترة الاستراحة</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <select
                              value={settings.breakSound}
                              onChange={(e) => handleSettingChange('breakSound', e.target.value)}
                              className="w-full p-3 pr-12 bg-[#1A0F3C] rounded-lg text-white border border-purple-700/30 focus:outline-none focus:ring-2 focus:ring-teal-400 appearance-none"
                              aria-label="Break end sound"
                            >
                              {soundOptions.map(sound => (
                                <option key={sound.id} value={sound.id}>
                                  {sound.name}
                                </option>
                              ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                              <ChevronDown className="w-5 h-5 text-purple-300" />
                            </div>
                          </div>
                          <motion.button 
                            whileHover={{ scale: 1.05, backgroundColor: 'rgba(61, 43, 121, 0.8)' }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => playTestSound(settings.breakSound)}
                            className="p-3 bg-[#3D2B79] hover:bg-[#4D3B89] rounded-lg text-white transition-colors flex items-center justify-center border border-purple-700/30"
                            aria-label="Play test sound for break end"
                          >
                            <Volume2 className="w-5 h-5" />
                          </motion.button>
                        </div>
                      </motion.div>
                    </div>
                    
                    <motion.div 
                      className="mt-6 bg-gradient-to-br from-[#2D1B69]/80 to-[#2D1B69]/40 p-5 rounded-xl shadow-md border border-purple-700/30"
                      whileHover={{ boxShadow: "0 10px 25px -5px rgba(45, 27, 105, 0.5)" }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-white font-medium mb-1 flex items-center gap-2">
                            <Bell className="w-5 h-5 text-amber-400" />
                            إشعارات المتصفح
                          </div>
                          <div className="text-sm text-purple-300">
                            {notificationPermissionStatus === 'granted' 
                              ? 'الإشعارات مفعلة ✓' 
                              : notificationPermissionStatus === 'denied'
                                ? 'تم رفض الإشعارات. يرجى تغيير الإعدادات في متصفحك'
                                : 'الإشعارات غير مفعلة'}
                          </div>
                        </div>
                        <motion.button 
                          whileHover={{ scale: 1.05, backgroundColor: notificationPermissionStatus === 'granted' ? 'rgb(34, 197, 94)' : 'rgb(245, 158, 11)' }}
                          whileTap={{ scale: 0.95 }} 
                          onClick={requestNotificationPermission}
                          disabled={notificationPermissionStatus === 'granted' || notificationPermissionStatus === 'denied'}
                          className={`px-4 py-2 rounded-lg text-white flex items-center gap-2 
                            ${notificationPermissionStatus === 'granted' 
                              ? 'bg-green-500 cursor-not-allowed' 
                              : notificationPermissionStatus === 'denied'
                                ? 'bg-red-500 cursor-not-allowed'
                                : 'bg-amber-400 text-[#1A0F3C] hover:bg-amber-500'}`}
                          transition={{ type: "spring", stiffness: 400, damping: 17 }}
                          aria-label={
                            notificationPermissionStatus === 'granted' ? 'Notifications enabled' :
                            notificationPermissionStatus === 'denied' ? 'Notifications denied' :
                            'Enable notifications'
                          }
                        >
                          <Bell className="w-4 h-4" />
                          {notificationPermissionStatus === 'granted' 
                            ? 'تم التفعيل' 
                            : notificationPermissionStatus === 'denied'
                              ? 'تم الرفض'
                              : 'تفعيل الإشعارات'}
                        </motion.button>
                      </div>
                      
                      {notificationPermissionStatus === 'denied' && (
                        <div className="mt-3 text-sm text-red-400 bg-red-500/10 p-3 rounded-lg">
                          تم رفض الإشعارات. لتفعيلها، يرجى تغيير إعدادات الإشعارات في متصفحك ثم إعادة تحميل الصفحة.
                        </div>
                      )}
                      
                      {notificationPermissionStatus !== 'granted' && notificationPermissionStatus !== 'denied' && (
                        <div className="mt-3 text-sm text-amber-400 bg-amber-500/10 p-3 rounded-lg">
                          الإشعارات تساعدك على معرفة وقت انتهاء جلسات التركيز والاستراحة حتى عندما تكون في تبويب آخر.
                        </div>
                      )}
                    </motion.div>
                  </motion.div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};
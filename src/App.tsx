import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from './components/Sidebar';
import { Calendar } from './components/Calendar';
import { PrayerTimesView } from './components/prayers/PrayerTimesView';
import { QuranProgress } from './components/quran/QuranProgress';
import { QuranReader } from './components/quran/QuranReader';
import { PomodoroTimer } from './components/pomodoro/PomodoroTimer';
import { TaskList } from './components/tasks/TaskList';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { JournalView } from './components/journal/JournalView';
import { NotesView } from './components/notes/NotesView';
import { HabitsView } from './components/habits/HabitsView';
import { EnhancedRemindersView } from './components/reminders/EnhancedRemindersView';
import { AudioPlayerToggle } from './components/pomodoro/AudioPlayerToggle';

function App() {
  const [activePath, setActivePath] = useState('recovery'); 
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#1A0F3C]">
      <Sidebar 
        isCollapsed={isCollapsed} 
        setIsCollapsed={setIsCollapsed} 
        activePath={activePath} 
        onNavigate={setActivePath} 
      />
      
      <main 
        className="flex-1 p-8 overflow-auto transition-all duration-300 ease-in-out"
        style={{ marginRight: isCollapsed ? '80px' : '260px' }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activePath}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activePath === 'recovery' && <Calendar />}
            {activePath === 'prayers' && <PrayerTimesView />}
            {activePath === 'quran' && (
              <QuranReader onShowProgress={() => setActivePath('quran-progress')} />
            )}
            {activePath === 'quran-progress' && (
              <QuranProgress onBack={() => setActivePath('quran')} />
            )}
            {activePath === 'journal' && <JournalView />}
            {activePath === 'notes' && <NotesView />}
            {activePath === 'tasks' && <TaskList />}
            {activePath === 'habits' && <HabitsView />}
            {activePath === 'reminders' && <EnhancedRemindersView />}
            {activePath === 'pomodoro' && <PomodoroTimer />}
            {activePath === 'analytics' && <AnalyticsView />}
          </motion.div>
        </AnimatePresence>
      </main>
      
      {/* 
        *** هذا هو التعديل الوحيد والمطلوب ***
        الآن، AudioPlayerToggle سيظهر فقط عندما يكون activePath هو 'pomodoro'.
      */}
      {activePath === 'pomodoro' && <AudioPlayerToggle />}
    </div>
  );
}

export default App;
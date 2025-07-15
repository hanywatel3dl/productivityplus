import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Timer, BarChart3, CalendarDays, Columns3,
  Calendar, ListChecks, 
  Settings, Filter, ChevronLeft, ChevronRight, List
} from 'lucide-react';
import { useReminderStore } from '../../store/reminderStore';
import { EnhancedTimelineView } from './EnhancedTimelineView';
import { ReminderForm } from './ReminderForm';
import { RemindersList } from './RemindersList';
import { UpcomingReminders } from './UpcomingReminders';
import { ReminderStats } from './ReminderStats';
import { MiniCalendar } from './MiniCalendar';
import { Reminder } from '../../types/reminders';
import { 
  format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, 
  startOfWeek, endOfWeek,
  parseISO, getHours, setMinutes, setHours, isValid
} from 'date-fns';
import { ar } from 'date-fns/locale';

export type CalendarViewMode = 'day' | 'week' | 'month' | 'list';
export type DayViewZoomLevel = 'hour' | 'halfHour' | 'quarterHour';

// --- Simplified Navigation Component ---
const SimplifiedCalendarNavigation = ({ selectedDate, viewMode, onDateChange, navRef }) => {
  const handlePrevious = () => {
    let newDate;
    if (viewMode === 'day') newDate = subDays(selectedDate, 1);
    else if (viewMode === 'week') newDate = subWeeks(selectedDate, 1);
    else newDate = subMonths(selectedDate, 1);
    onDateChange(newDate);
  };

  const handleNext = () => {
    let newDate;
    if (viewMode === 'day') newDate = addDays(selectedDate, 1);
    else if (viewMode === 'week') newDate = addWeeks(selectedDate, 1);
    else newDate = addMonths(selectedDate, 1);
    onDateChange(newDate);
  };

  const getHeaderText = () => {
    if (viewMode === 'month') {
      return format(selectedDate, 'MMMM yyyy', { locale: ar });
    }
    if (viewMode === 'week') {
      const start = startOfWeek(selectedDate, { locale: ar });
      const end = endOfWeek(selectedDate, { locale: ar });
      return `${format(start, 'd MMMM', { locale: ar })} - ${format(end, 'd MMMM yyyy', { locale: ar })}`;
    }
    return format(selectedDate, 'EEEE, d MMMM yyyy', { locale: ar });
  };

  return (
    <div ref={navRef} className="flex items-center justify-center bg-[#2D1B69]/30 rounded-lg p-2 gap-4">
      <motion.button 
        whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 255, 255, 0.1)' }} 
        whileTap={{ scale: 0.95 }}
        onClick={handleNext}
        className="p-2 rounded-full text-white transition-colors"
        title="التالي"
      >
        <ChevronRight className="w-6 h-6" />
      </motion.button>
      
      <h3 className="text-xl font-semibold text-white tracking-wide w-64 text-center">
        {getHeaderText()}
      </h3>

      <motion.button 
        whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 255, 255, 0.1)' }} 
        whileTap={{ scale: 0.95 }}
        onClick={handlePrevious}
        className="p-2 rounded-full text-white transition-colors"
        title="السابق"
      >
        <ChevronLeft className="w-6 h-6" />
      </motion.button>
    </div>
  );
};


export const EnhancedRemindersView = () => {
  const {
    selectedDate,
    setSelectedDate,
    viewMode: initialStoreViewMode,
    timelineZoom: initialStoreTimelineZoom,
    setViewMode: setStoreViewModeAction, 
    setTimelineZoom: setStoreTimelineZoomAction,
    forceUpdate,
  } = useReminderStore(state => ({
    selectedDate: state.selectedDate,
    setSelectedDate: state.setSelectedDate,
    viewMode: state.viewMode,
    timelineZoom: state.timelineZoom,
    setViewMode: state.setViewMode, 
    setTimelineZoom: state.setTimelineZoom,
    forceUpdate: state.forceUpdate,
    lastUpdateTime: state.lastUpdateTime
  }));

  const [activeMainView, setActiveMainView] = useState<'timeline' | 'list'>(
    initialStoreViewMode === 'list' ? 'list' : 'timeline'
  );
  const [activeCalendarModeForTimeline, setActiveCalendarModeForTimeline] = useState<'day' | 'week' | 'month'>('week');
  const [dayViewZoom, setDayViewZoom] = useState<DayViewZoomLevel>(initialStoreTimelineZoom || 'hour');

  const [showForm, setShowForm] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | Partial<Reminder> | null>(null);
  const [showStats, setShowStats] = useState(false);

  const navBarRef = useRef<HTMLDivElement>(null);
  const switcherRef = useRef<HTMLDivElement>(null);
  const [navBarHeight, setNavBarHeight] = useState(0);
  const [switcherHeight, setSwitcherHeight] = useState(0);

  useEffect(() => {
    if (navBarRef.current) {
      setNavBarHeight(navBarRef.current.offsetHeight);
    } else {
      setNavBarHeight(0); 
    }
    if (switcherRef.current) {
      setSwitcherHeight(switcherRef.current.offsetHeight);
    }
  }, [activeMainView, selectedDate, activeCalendarModeForTimeline]); 

  
  useEffect(() => {
    forceUpdate();
  }, [forceUpdate]);
  
  useEffect(() => {
    if (typeof setStoreViewModeAction !== 'function' || typeof setStoreTimelineZoomAction !== 'function') {
      return; 
    }
    if (activeMainView === 'timeline') {
        setStoreViewModeAction('timeline'); 
        if (activeCalendarModeForTimeline === 'day') {
            setStoreTimelineZoomAction(dayViewZoom);
        }
    } else if (activeMainView === 'list') {
      setStoreViewModeAction('list');
    }
  }, [activeMainView, activeCalendarModeForTimeline, dayViewZoom, setStoreViewModeAction, setStoreTimelineZoomAction]);

  const handleCreateReminder = (isoStartTime: string, isoEndTime?: string, reminderDate?: Date) => {
    const initialDataForForm: Partial<Reminder> = {
        startTime: isoStartTime, 
        endTime: isoEndTime, 
        title: '', 
        type: 'reminder', 
        priority: 'medium', 
        category: 'personal', 
        isCompleted: false,
    };
    setEditingReminder(initialDataForForm);
    setShowForm(true);
  };
  
  const containerVariants = { 
    hidden: { opacity: 0 }, 
    visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 }}
  };
  const itemVariants = { 
    hidden: { opacity: 0, y: 20 }, 
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 26 }}
  };

  const switcherMarginTop = useMemo(() => {
    if (activeMainView === 'timeline' && navBarHeight > 0 && switcherHeight > 0) {
      return Math.max(0, (navBarHeight - switcherHeight) / 2);
    }
    return 0; 
  }, [activeMainView, navBarHeight, switcherHeight]);

  // !! IMPORTANT !!
  // Adjust ESTIMATED_TIMELINE_HEADER_HEIGHT if your timeline's day header strip (e.g., "Sat", "Fri")
  // has a different height. This is crucial for perfect MiniCalendar alignment.
  const ESTIMATED_TIMELINE_HEADER_HEIGHT = 4; // px - The final, subtle adjustment for perfect alignment.
  const MAIN_CONTENT_COLUMN_GAP = 24; // This is from `gap-6` (1.5rem) on the main content column
  const DEFAULT_SIDEBAR_GAP = 24; // Default gap for sidebar elements if not timeline view
  const MIN_SIDEBAR_GAP = 8; // Minimum gap between elements in the sidebar (0.5rem)

  const dynamicMiniCalendarMarginTop = useMemo(() => {
    if (activeMainView === 'timeline' && navBarHeight > 0 && switcherHeight > 0) {
      // Target Y position for the top of the MiniCalendar. This should align with where
      // the actual timeline grid content (below day headers) starts in the left column.
      // This is: DateNavBarHeight + GapBelowNavBar + TimelineInternalDayHeaderHeight
      const targetAlignmentYOffset = navBarHeight + MAIN_CONTENT_COLUMN_GAP + ESTIMATED_TIMELINE_HEADER_HEIGHT;
      
      // Y position of the bottom of the view switcher in the sidebar
      const switcherBottomYOffsetInSidebar = switcherMarginTop + switcherHeight;
      
      // The margin needed for the MiniCalendar is the difference, ensuring its top aligns with targetAlignmentYOffset
      const calculatedMargin = targetAlignmentYOffset - switcherBottomYOffsetInSidebar;
      
      return Math.max(MIN_SIDEBAR_GAP, calculatedMargin);
    }
    return DEFAULT_SIDEBAR_GAP; 
  }, [activeMainView, navBarHeight, switcherHeight, switcherMarginTop]);


  return (
    <motion.div 
      variants={containerVariants} 
      initial="hidden" 
      animate="visible" 
      className="space-y-6 h-full flex flex-col" 
      dir="rtl"
    >
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">التقويم والتذكيرات</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[#2D1B69]/30 rounded-lg p-1">
            {[ 
              { mode: 'day', icon: Timer, label: 'عرض اليوم' }, 
              { mode: 'week', icon: CalendarDays, label: 'عرض الأسبوع' }, 
              { mode: 'month', icon: Columns3, label: 'عرض الشهر' }
            ].map(({ mode, icon: Icon, label }) => (
              <motion.button 
                key={mode} 
                whileHover={{ scale: 1.05 }} 
                whileTap={{ scale: 0.95 }} 
                onClick={() => { 
                  setActiveMainView('timeline'); 
                  setActiveCalendarModeForTimeline(mode as 'day' | 'week' | 'month'); 
                }}
                className={`px-3 py-2 rounded-md flex items-center gap-2 text-sm transition-colors ${
                  activeMainView === 'timeline' && activeCalendarModeForTimeline === mode 
                    ? 'bg-amber-400 text-purple-900 font-semibold' 
                    : 'text-white hover:bg-[#2D1B69]/50'
                }`} 
                title={label}
              >
                <Icon className="w-4 h-4" />
              </motion.button>
            ))}
          </div>

          {activeCalendarModeForTimeline === 'day' && activeMainView === 'timeline' && (
            <div className="flex items-center bg-[#2D1B69]/30 rounded-lg p-1">
              {[ { zoom: 'hour', label: 'ساعة' }, { zoom: 'halfHour', label: '30د' }, { zoom: 'quarterHour', label: '15د' } ].map(({ zoom, label }) => (
                <motion.button key={zoom} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setDayViewZoom(zoom as DayViewZoomLevel)}
                  className={`px-3 py-2 rounded-md text-sm transition-colors ${ dayViewZoom === zoom ? 'bg-amber-400 text-purple-900 font-semibold' : 'text-white hover:bg-[#2D1B69]/50' }`}
                > {label} </motion.button>
              ))}
            </div>
          )}
          
          <motion.button 
            whileHover={{ scale: 1.05 }} 
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              const defaultStartTime = setMinutes(setHours(new Date(), getHours(new Date()) + 1), 0).toISOString();
              setEditingReminder({ 
                title: '', startTime: defaultStartTime, type: 'reminder', priority: 'medium', 
                category: 'personal', isCompleted: false 
              }); 
              setShowForm(true);
            }}
            className="px-5 py-2.5 rounded-xl bg-amber-400 text-purple-900 hover:bg-amber-500 font-semibold flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="w-5 h-5" />
            تذكير جديد
          </motion.button>
        </div>
      </motion.div>

      {/* Main layout: Left column for content, Right column for sidebar */}
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Left Column: Main Content (Timeline/List) */}
        <motion.div variants={itemVariants} className="flex-1 min-h-0 flex flex-col gap-6"> 
          
          {/* Date Navigation Bar (Only for Timeline View) */}
          {activeMainView === 'timeline' && (
            <motion.div variants={itemVariants}> {/* Item variant for nav bar appearance */}
              <SimplifiedCalendarNavigation
                navRef={navBarRef} 
                selectedDate={selectedDate}
                viewMode={activeCalendarModeForTimeline}
                onDateChange={setSelectedDate}
              />
            </motion.div>
          )}

          {/* Timeline or List View Content Area */}
          <div className="flex-1 min-h-0"> 
            <AnimatePresence mode="wait">
              {activeMainView === 'timeline' && (
                <motion.div 
                  key={`timeline-${activeCalendarModeForTimeline}`} 
                  initial={{ opacity: 0, y: 30, scale: 0.97, filter: 'blur(3px)' }} 
                  animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', transition: { type: "spring", stiffness: 200, damping: 25, duration: 0.45 } }} 
                  exit={{ opacity: 0, y: -20, scale: 0.97, filter: 'blur(3px)', transition: { duration: 0.25 } }} 
                  className="h-full" 
                >
                  <EnhancedTimelineView date={selectedDate} viewMode={activeCalendarModeForTimeline} zoomLevel={dayViewZoom} 
                    onEditReminder={(reminderToEdit) => { setEditingReminder(reminderToEdit); setShowForm(true); }}
                    onCreateReminder={handleCreateReminder}
                  />
                </motion.div>
              )}
              {activeMainView === 'list' && (
                <motion.div 
                  key="list" 
                  initial={{ opacity: 0, x: 50, scale: 0.97, filter: 'blur(3px)' }} 
                  animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)', transition: { type: "spring", stiffness: 200, damping: 25, duration: 0.45 } }} 
                  exit={{ opacity: 0, x: -50, scale: 0.97, filter: 'blur(3px)', transition: { duration: 0.25 } }} 
                >
                  <RemindersList date={selectedDate} 
                    onEditReminder={(reminderToEdit) => { setEditingReminder(reminderToEdit); setShowForm(true); }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Right Column: Sidebar */}
        <motion.div variants={itemVariants} className="w-80 flex-shrink-0 flex flex-col"> 
          {/* View Switcher Toggle */}
          <div 
            ref={switcherRef} 
            style={{ marginTop: `${switcherMarginTop}px` }}
            dir="ltr" 
            className="relative flex w-full items-center rounded-full bg-[#2D1B69]/30 p-1"
          >
            <motion.div
              className="absolute left-1 top-1 h-[calc(100%-0.5rem)] w-1/2 rounded-full bg-amber-400"
              animate={{ x: activeMainView === 'list' ? '100%' : '0%' }}
              transition={{ type: "tween", duration: 0.25, ease: "easeInOut" }} // Refined animation
            />
            <button
                onClick={() => setActiveMainView('timeline')}
                className="relative z-10 flex w-1/2 items-center justify-center py-2.5"
                title="عرض التقويم"
            >
                <Calendar className={`h-5 w-5 transition-colors ${activeMainView === 'timeline' ? 'text-purple-900' : 'text-white'}`} />
            </button>
            <button
                onClick={() => setActiveMainView('list')}
                className="relative z-10 flex w-1/2 items-center justify-center py-2.5"
                title="عرض القائمة"
            >
                <ListChecks className={`h-5 w-5 transition-colors ${activeMainView === 'list' ? 'text-purple-900' : 'text-white'}`} />
            </button>
          </div>
          
          {/* MiniCalendar with dynamic top margin for alignment */}
          <div style={{ marginTop: `${dynamicMiniCalendarMarginTop}px` }}>
            <MiniCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />
          </div>

          {/* Upcoming Reminders with default gap */}
          <div style={{ marginTop: `${DEFAULT_SIDEBAR_GAP}px` }}>
            <UpcomingReminders />
          </div>
        </motion.div>
      </div>

      {/* Modals (ShowForm and ShowStats) */}
      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]"
            onClick={() => { setShowForm(false); setEditingReminder(null); }}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }} transition={{ type: "spring", duration: 0.4 }}
              className="bg-[#1A0F3C] border border-purple-700/50 shadow-2xl rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-600 scrollbar-track-transparent"
              onClick={(e) => e.stopPropagation()}
            >
              <ReminderForm
                reminder={editingReminder} 
                initialDate={editingReminder?.startTime && isValid(parseISO(editingReminder.startTime)) ? parseISO(editingReminder.startTime) : selectedDate} 
                onClose={() => { setShowForm(false); setEditingReminder(null);}}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence> 
        {showStats && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]"
            onClick={() => setShowStats(false)}
          >
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ type: "spring", duration: 0.4 }}
              className="bg-[#1A0F3C] border border-purple-700/50 shadow-2xl rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-600 scrollbar-track-transparent"
              onClick={(e) => e.stopPropagation()}
            >
              <ReminderStats onClose={() => setShowStats(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
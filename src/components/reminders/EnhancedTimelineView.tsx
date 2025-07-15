import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// تأكد من صحة هذه المسارات
import { useReminderStore } from '../../store/reminderStore';
import { Reminder } from '../../types/reminders';

import {
    format, parseISO, setHours, setMinutes, differenceInMinutes, addMinutes,
    startOfDay, endOfDay, isSameDay, isValid, isBefore, isAfter,
    eachDayOfInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
    addDays, getHours, getMinutes, isToday, isWithinInterval
} from 'date-fns';
import { ar } from 'date-fns/locale';
// تم إضافة Link هنا
import { Check, Edit, Trash2, X, Link } from 'lucide-react';


// ===================================================================================
// 1. مكون النافذة المنبثقة (QuickView) - مع إضافة استثناء خاص ليوم الاثنين
// ===================================================================================
interface ReminderQuickViewProps {
    reminder: Reminder;
    anchorEl: HTMLElement;
    timelineGridRef: React.RefObject<HTMLDivElement>;
    dayVisualIndex: number;
    onClose: () => void;
    onEdit: (reminder: Reminder) => void;
    onDelete: (id: string) => void;
    onToggleComplete: (id: string) => void;
}

const ReminderQuickView = ({ reminder, anchorEl, timelineGridRef, dayVisualIndex, onClose, onEdit, onDelete, onToggleComplete }: ReminderQuickViewProps) => {
    const popoverRef = useRef<HTMLDivElement>(null);
    const [style, setStyle] = useState<React.CSSProperties>({ opacity: 0, position: 'absolute' });
    
    const [isLinksMenuOpen, setIsLinksMenuOpen] = useState(false);
    const linksMenuRef = useRef<HTMLDivElement>(null);
    const linkButtonRef = useRef<HTMLButtonElement>(null);

    React.useLayoutEffect(() => {
        if (!anchorEl || !timelineGridRef.current || !popoverRef.current) {
            return;
        }

        const timelineRect = timelineGridRef.current.getBoundingClientRect(); 
        const anchorRect = anchorEl.getBoundingClientRect(); 
        const popoverWidth = popoverRef.current.offsetWidth || 420;
        const popoverHeight = popoverRef.current.offsetHeight || 240;
        const gap = 12;

        let finalTop, finalLeft;

        if (dayVisualIndex === 3) {
            // منطق يوم الثلاثاء (أعلى/أسفل) - لا تغيير
            const anchorTop = (anchorRect.top - timelineRect.top) + timelineGridRef.current.scrollTop;
            const anchorBottom = anchorTop + anchorRect.height;
            const anchorCenterH = (anchorRect.left - timelineRect.left) + (anchorRect.width / 2);
            const spaceBelowInViewport = timelineRect.height - (anchorRect.bottom - timelineRect.top);
            
            finalTop = spaceBelowInViewport > popoverHeight + gap ? anchorBottom + gap : anchorTop - popoverHeight - gap;
            finalLeft = anchorCenterH - (popoverWidth / 2);

            if (finalLeft < gap) finalLeft = gap;
            if (finalLeft + popoverWidth > timelineRect.width - gap) {
                finalLeft = timelineRect.width - popoverWidth - gap;
            }

        } else {
            // منطق بقية الأيام (يمين/يسار)
            finalTop = anchorRect.top - timelineRect.top + timelineGridRef.current.scrollTop;

            // تحديد الاتجاه الافتراضي
            if (dayVisualIndex <= 1) { // السبت والأحد
                finalLeft = (anchorRect.left - timelineRect.left + anchorRect.width) + gap;
            } else { // الاثنين، الأربعاء، الخميس، الجمعة
                finalLeft = (anchorRect.left - timelineRect.left) - popoverWidth - gap;
            }

            // --- منطق التحقق من الحواف الذكي مع الاستثناء الجديد ---
            const minLeft = 10;
            const maxLeft = timelineGridRef.current.scrollWidth - popoverWidth - 10;
            
            // تحقق من الحافة اليسرى
            if (finalLeft < minLeft) {
                // <-- التعديل الجذري هنا
                // إذا كان اليوم هو الاثنين، لا تقلب الاتجاه، فقط الصق البطاقة بالحد الأدنى
                if (dayVisualIndex === 2) {
                    finalLeft = minLeft;
                } else { // لبقية الأيام (الأربعاء، الخميس، الخ)، اسمح بالقلب
                    finalLeft = (anchorRect.left - timelineRect.left + anchorRect.width) + gap;
                }
            }
            
            // تحقق من الحافة اليمنى (يؤثر بشكل أساسي على السبت والأحد)
            if (finalLeft > maxLeft) {
                 finalLeft = (anchorRect.left - timelineRect.left) - popoverWidth - gap;
            }

            // إعادة التحقق من الحافة اليسرى بعد احتمال حدوث قلب من الحافة اليمنى
            if (finalLeft < minLeft) {
                finalLeft = minLeft;
            }

            // ضمان بقاء الـ popover داخل الحدود العمودية
            const maxTop = timelineGridRef.current.scrollHeight - popoverHeight - 10;
            if (finalTop > maxTop) {
                finalTop = maxTop;
            }
            const minTopScroll = timelineGridRef.current.scrollTop + 10;
            if (finalTop < minTopScroll) {
                finalTop = minTopScroll;
            }
        }

        setStyle({
            position: 'absolute' as const,
            top: `${finalTop}px`,
            left: `${finalLeft}px`,
            zIndex: 50,
            width: `${popoverWidth}px`, 
            opacity: 1
        });

    }, [anchorEl, timelineGridRef, dayVisualIndex, reminder.id]);

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node) && anchorEl && !anchorEl.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [onClose, anchorEl]);

    useEffect(() => {
        const handleOutsideLinksMenuClick = (event: MouseEvent) => {
            if (
                isLinksMenuOpen &&
                linksMenuRef.current &&
                !linksMenuRef.current.contains(event.target as Node) &&
                linkButtonRef.current &&
                !linkButtonRef.current.contains(event.target as Node)
            ) {
                setIsLinksMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutsideLinksMenuClick);
        return () => document.removeEventListener('mousedown', handleOutsideLinksMenuClick);
    }, [isLinksMenuOpen]);

    if (!reminder || !reminder.startTime || !isValid(parseISO(reminder.startTime))) return null;

    const hasLinks = reminder.links && reminder.links.length > 0;

    return (
        <motion.div ref={popoverRef} initial={{ opacity: 0, scale: 0.95 }} animate={style} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.15, ease: 'easeOut' }}
            className="bg-[#2a1b5c] rounded-2xl shadow-2xl text-white flex flex-col border border-purple-400/30 w-[420px]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center p-3 border-b border-purple-400/20">
                <div className="flex-grow flex gap-2"><button title="إنجاز" onClick={() => onToggleComplete(reminder.id)} className={`p-2 rounded-full hover:bg-purple-400/20 transition-colors`}><Check className={`w-5 h-5 ${reminder.isCompleted ? 'text-green-400' : 'text-white/70'}`} /></button></div>
                <div className="flex-shrink-0 flex items-center gap-2">
                    {hasLinks && (
                        <div className="relative">
                            <button 
                                ref={linkButtonRef}
                                title="الروابط" 
                                onClick={() => setIsLinksMenuOpen(prev => !prev)} 
                                className="p-2 rounded-full hover:bg-purple-400/20 transition-colors"
                            >
                                <Link className="w-5 h-5" />
                            </button>
                            <AnimatePresence>
                                {isLinksMenuOpen && (
                                    <motion.div
                                        ref={linksMenuRef}
                                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                        transition={{ duration: 0.1, ease: 'easeOut' }}
                                        className="absolute top-full right-0 mt-2 w-64 bg-[#3a2b7c] border border-purple-400/30 rounded-lg shadow-xl z-10"
                                    >
                                        <ul className="p-1 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-purple-600/50">
                                            {reminder.links?.map((link, index) => (
                                                <li key={index}>
                                                    <a
                                                        href={link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        title={link}
                                                        className="block p-2 text-sm text-white/90 rounded-md hover:bg-purple-400/20 truncate transition-colors"
                                                    >
                                                        {link}
                                                    </a>
                                                </li>
                                            ))}
                                        </ul>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                    <button title="تعديل" onClick={() => { onEdit(reminder); onClose(); }} className="p-2 rounded-full hover:bg-purple-400/20 transition-colors"><Edit className="w-5 h-5" /></button>
                    <button title="حذف" onClick={() => { onDelete(reminder.id); onClose(); }} className="p-2 rounded-full hover:bg-purple-400/20 transition-colors"><Trash2 className="w-5 h-5 text-red-400" /></button>
                    <button title="إغلاق" onClick={onClose} className="p-2 rounded-full hover:bg-purple-400/20 transition-colors"><X className="w-5 h-5" /></button>
                </div>
            </div>
            <div className="p-6 space-y-4">
                <div className="flex items-start gap-4">
                    <div className="w-4 h-4 rounded mt-1.5 flex-shrink-0" style={{ backgroundColor: reminder.color || '#8B5CF6' }} />
                    <div>
                        <h2 className={`text-2xl font-bold ${reminder.isCompleted ? 'line-through text-white/60' : ''}`}>{reminder.title}</h2>
                        <p className="text-white/70">{format(parseISO(reminder.startTime), 'eeee, d MMMM yyyy', { locale: ar })} • {format(parseISO(reminder.startTime), 'h:mm a')} {reminder.endTime && isValid(parseISO(reminder.endTime)) ? `- ${format(parseISO(reminder.endTime), 'h:mm a')}` : ''}</p>
                        {reminder.description && <p className="text-white/60 mt-2 text-sm whitespace-pre-wrap">{reminder.description}</p>}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

// ===================================================================================
// 2. المكون الرئيسي: EnhancedTimelineView - (لا تغيير هنا، فقط يحتوي على حل select-none)
// ===================================================================================
const HOUR_HEIGHT_DEFAULT = 60;
const TIME_LABEL_WIDTH = 80;

interface EnhancedTimelineViewProps {
    date: Date;
    viewMode: 'day' | 'week' | 'month';
    zoomLevel?: 'hour' | 'halfHour' | 'quarterHour';
    onEditReminder: (reminder: Reminder) => void;
    onCreateReminder: (startTime: string, endTime?: string, reminderDate?: Date) => void;
}

export const EnhancedTimelineView = ({
    date, viewMode = 'week', zoomLevel = 'hour', onEditReminder, onCreateReminder
}: EnhancedTimelineViewProps) => {
    const { getRemindersForDate, getRemindersForDateRange, moveReminder, deleteReminder, toggleReminderCompletion, lastUpdateTime } = useReminderStore();
    const timelineGridRef = useRef<HTMLDivElement>(null); 
    const [quickView, setQuickView] = useState<{ reminder: Reminder; anchorEl: HTMLElement; dayVisualIndex: number; } | null>(null);
    const [reminderDragState, setReminderDragState] = useState<{ reminderId: string; initialYMouse: number; originalStartTime: Date; originalEndTime: Date; dayDateContext: Date; } | null>(null);
    const [newReminderSelection, setNewReminderSelection] = useState<{ startYInGrid: number; currentYInGrid: number; dayDate: Date; dayVisualIndex: number; isDragging: boolean; } | null>(null);
    const [hoveredTimeSlotInfo, setHoveredTimeSlotInfo] = useState<{ dayVisualIndex: number; hour: number; minute: number; } | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => { const timer = setInterval(() => setCurrentTime(new Date()), 60000); return () => clearInterval(timer); }, []);

    const { viewStartDate, viewEndDate, daysInView } = useMemo(() => {
        const options = { weekStartsOn: 6 as const }; 
        let startD: Date, endD: Date;
        if (viewMode === 'week') { startD = startOfWeek(date, options); endD = endOfWeek(date, options); }
        else if (viewMode === 'month') { startD = startOfWeek(startOfMonth(date), options); endD = endOfWeek(endOfMonth(date), options); }
        else { startD = startOfDay(date); endD = endOfDay(date); }
        return { viewStartDate: startD, viewEndDate: endD, daysInView: eachDayOfInterval({ start: startD, end: endD }) };
    }, [date, viewMode]);

    const remindersInView = useMemo(() => {
        if (!viewStartDate || !viewEndDate) return [];
        return viewMode === 'day' ? getRemindersForDate(date) : getRemindersForDateRange(viewStartDate, viewEndDate);
    }, [viewMode, date, viewStartDate, viewEndDate, getRemindersForDate, getRemindersForDateRange, lastUpdateTime]);

    const slotHeight = useMemo(() => (viewMode !== 'day' && viewMode !== 'week') ? 120 : (zoomLevel === 'quarterHour' ? HOUR_HEIGHT_DEFAULT / 2 : zoomLevel === 'halfHour' ? HOUR_HEIGHT_DEFAULT : HOUR_HEIGHT_DEFAULT * 1.5), [viewMode, zoomLevel]);
    const slotsPerHour = useMemo(() => (viewMode !== 'day' && viewMode !== 'week') ? 1 : (zoomLevel === 'quarterHour' ? 4 : zoomLevel === 'halfHour' ? 2 : 1), [viewMode, zoomLevel]);
    const totalTimelineGridHeight = 24 * slotsPerHour * slotHeight; 

    const getTimeFromYCoord = useCallback((y: number, targetDate: Date): Date => {
        const totalMinutesInDay = 24 * 60;
        const clampedY = Math.max(0, Math.min(y, totalTimelineGridHeight));
        const minutesFromTop = (clampedY / totalTimelineGridHeight) * totalMinutesInDay;
        const hour = Math.floor(minutesFromTop / 60);
        const minuteInterval = 60 / slotsPerHour;
        const minute = Math.floor((minutesFromTop % 60) / minuteInterval) * minuteInterval;
        return setMinutes(setHours(startOfDay(targetDate), hour), minute);
    }, [totalTimelineGridHeight, slotsPerHour]);

    const getYCoordFromTime = useCallback((time: Date): number => {
        const hours = getHours(time); const minutes = getMinutes(time);
        return (hours * slotsPerHour + (minutes / (60 / slotsPerHour))) * slotHeight;
    }, [slotHeight, slotsPerHour]);

    const getReminderVisuals = useCallback((reminder: Reminder, dayContext: Date) => {
        if (!reminder.startTime || !isValid(parseISO(reminder.startTime))) return { top: 0, height: 0, isValid: false };
        const startTime = parseISO(reminder.startTime);
        if ((viewMode === 'day' || viewMode === 'week') && !isSameDay(startTime, dayContext)) return { top: 0, height: 0, isValid: false };
        const top = getYCoordFromTime(startTime);
        let durationMinutes = 30;
        if (reminder.endTime && isValid(parseISO(reminder.endTime))) {
            const endTime = parseISO(reminder.endTime);
            const effectiveEndTime = (viewMode === 'day' || viewMode === 'week') && isAfter(endTime, endOfDay(dayContext)) ? endOfDay(dayContext) : endTime;
            durationMinutes = Math.max(15, differenceInMinutes(effectiveEndTime, startTime));
        }
        const height = Math.max((durationMinutes / (60 / slotsPerHour)) * slotHeight, slotHeight / 2);
        return { top, height, isValid: true };
    }, [viewMode, getYCoordFromTime, slotHeight, slotsPerHour]);

    useEffect(() => {
        if (timelineGridRef.current && daysInView.length > 0 && viewStartDate && viewEndDate) {
            const todayVisualIndex = daysInView.findIndex(day => isToday(day));
            if (todayVisualIndex !== -1) {
                const now = new Date();
                if (isWithinInterval(now, { start: startOfDay(viewStartDate), end: endOfDay(viewEndDate) })) {
                    const topOffset = getYCoordFromTime(now);
                    const containerHeight = timelineGridRef.current.clientHeight;
                    let scrollToPosition = topOffset - (containerHeight / 2) + (slotHeight / 2);
                    scrollToPosition = Math.max(0, Math.min(scrollToPosition, timelineGridRef.current.scrollHeight - containerHeight));
                    timelineGridRef.current.scrollTo({ top: scrollToPosition, behavior: 'auto' });
                }
            } else {
                timelineGridRef.current.scrollTo({ top: 0, behavior: 'auto' });
            }
        }
    }, [date, viewMode, lastUpdateTime, daysInView, viewStartDate, viewEndDate, getYCoordFromTime, slotHeight]);

    const handleGridHover = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (newReminderSelection || reminderDragState) return;
        const target = e.target as HTMLElement;
        const slotCell = target.closest('[data-day-visual-index][data-slot-time-str]');
        if (slotCell) {
            const dayVisualIndex = parseInt(slotCell.getAttribute('data-day-visual-index')!, 10);
            const [hour, minute] = slotCell.getAttribute('data-slot-time-str')!.split(':').map(Number);
            setHoveredTimeSlotInfo({ dayVisualIndex, hour, minute });
        } else {
            setHoveredTimeSlotInfo(null);
        }
    }, [newReminderSelection, reminderDragState]);

    const handleGridMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (target.closest('.reminder-card') || target.closest('button') || reminderDragState) return;
        
        const gridRect = timelineGridRef.current!.getBoundingClientRect();
        const xInGrid = e.clientX - gridRect.left;
        const gridAreaWidth = timelineGridRef.current!.clientWidth - TIME_LABEL_WIDTH; 
        const dayColumnWidth = gridAreaWidth / daysInView.length;
        const dayVisualIndex = Math.floor((gridAreaWidth - xInGrid) / dayColumnWidth);
        
        if (dayVisualIndex < 0 || dayVisualIndex >= daysInView.length) return;
        
        const dayDateForSelection = daysInView[dayVisualIndex];
        const yInGrid = e.clientY - gridRect.top + timelineGridRef.current!.scrollTop;
        setNewReminderSelection({ startYInGrid: yInGrid, currentYInGrid: yInGrid, dayDate: dayDateForSelection, dayVisualIndex, isDragging: false });
        e.preventDefault();
    }, [daysInView, reminderDragState]);

    const handleReminderMouseDown = useCallback((e: React.MouseEvent, reminder: Reminder, dayContext: Date) => {
        e.stopPropagation();
        const startTimeDate = parseISO(reminder.startTime!);
        const endTimeDate = reminder.endTime ? parseISO(reminder.endTime) : addMinutes(startTimeDate, 30);
        setReminderDragState({ reminderId: reminder.id, initialYMouse: e.clientY, originalStartTime: startTimeDate, originalEndTime: endTimeDate, dayDateContext: dayContext });
    }, []);

    useEffect(() => {
        const handleDocMouseMove = (e: MouseEvent) => {
            if (!timelineGridRef.current) return;
            const gridRect = timelineGridRef.current.getBoundingClientRect();

            if (newReminderSelection) {
                const currentYInGrid = e.clientY - gridRect.top + timelineGridRef.current.scrollTop;
                setNewReminderSelection(prev => !prev ? null : ({ ...prev, currentYInGrid, isDragging: prev.isDragging || Math.abs(currentYInGrid - prev.startYInGrid) > 5 }));
            } else if (reminderDragState) {
                const deltaY = e.clientY - reminderDragState.initialYMouse;
                const minuteIncrement = 60 / slotsPerHour;
                const deltaMinutes = Math.round((deltaY / slotHeight) * minuteIncrement);
                let newStart = addMinutes(reminderDragState.originalStartTime, deltaMinutes);
                if ((viewMode === 'day' || viewMode === 'week') && !isSameDay(newStart, reminderDragState.dayDateContext)) {
                    newStart = isBefore(newStart, reminderDragState.dayDateContext) ? startOfDay(reminderDragState.dayDateContext) : endOfDay(reminderDragState.dayDateContext);
                }
                const newEnd = addMinutes(newStart, differenceInMinutes(reminderDragState.originalEndTime, reminderDragState.originalStartTime));
                if (isBefore(newStart, newEnd) && differenceInMinutes(newEnd, newStart) >= 15) {
                    moveReminder(reminderDragState.reminderId, newStart.toISOString(), newEnd.toISOString());
                }
            }
        };
        const handleDocMouseUp = () => {
            if (newReminderSelection && newReminderSelection.isDragging) {
                const { startYInGrid, currentYInGrid, dayDate } = newReminderSelection;
                const minY = Math.min(startYInGrid, currentYInGrid), maxY = Math.max(startYInGrid, currentYInGrid);
                if (maxY - minY >= slotHeight / 2) {
                    let startTime = getTimeFromYCoord(minY, dayDate), endTime = getTimeFromYCoord(maxY, dayDate);
                    if (differenceInMinutes(endTime, startTime) < 15) endTime = addMinutes(startTime, 15);
                    if (isAfter(endTime, endOfDay(dayDate))) endTime = endOfDay(dayDate);
                    if (startTime.toISOString() === endTime.toISOString()) endTime = addMinutes(startTime, 15);
                    onCreateReminder(startTime.toISOString(), endTime.toISOString(), dayDate);
                }
            }
            setNewReminderSelection(null);
            setReminderDragState(null);
        };
        document.addEventListener('mousemove', handleDocMouseMove); document.addEventListener('mouseup', handleDocMouseUp);
        return () => { document.removeEventListener('mousemove', handleDocMouseMove); document.removeEventListener('mouseup', handleDocMouseUp); };
    }, [newReminderSelection, reminderDragState, viewMode, slotHeight, slotsPerHour, getTimeFromYCoord, moveReminder, onCreateReminder, lastUpdateTime]);

    return (
        <div className="h-[85vh] flex flex-col" dir="rtl"> 
            <div className="flex-1 bg-[#1A0F3C]/50 rounded-xl border border-purple-500/20 overflow-hidden flex flex-col">
                
                <div className="flex-shrink-0 flex bg-[#2D1B69]/30 border-b border-purple-500/20">
                    <div className="flex-shrink-0 bg-[#2D1B69]/30 border-l border-purple-500/20" style={{ width: TIME_LABEL_WIDTH }}>
                        <div className="h-16 flex items-center justify-center">
                            <span className="text-xs text-purple-300 font-medium">توقيت غرينتش+3</span>
                        </div>
                    </div>
                    
                    <div className="flex-1 flex">
                        {daysInView.map((day, visualIndex) => (
                            <div key={day.toISOString()} className={`flex-1 h-16 flex flex-col items-center justify-center relative ${visualIndex < daysInView.length - 1 ? 'border-l border-purple-500/20' : ''} ${isToday(day) ? 'bg-amber-500/10' : ''}`}>
                                <div className="text-xs text-purple-300 mb-1">{format(day, 'EEE', { locale: ar })}</div>
                                <div className={`text-lg font-bold ${isToday(day) ? 'bg-amber-400 text-purple-900 w-8 h-8 rounded-full flex items-center justify-center' : 'text-white'}`}>{format(day, 'd')}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div 
                    ref={timelineGridRef}
                    className="flex-1 flex overflow-y-auto scrollbar-thin scrollbar-thumb-purple-600/50"
                    onMouseMove={handleGridHover} 
                    onMouseLeave={() => setHoveredTimeSlotInfo(null)} 
                    onMouseDown={handleGridMouseDown}
                >
                    <div className="flex relative" style={{ minHeight: `${totalTimelineGridHeight}px`, width: '100%' }}>
                        <div className="flex-shrink-0 bg-[#2D1B69]/30 border-l border-purple-500/20" style={{ width: TIME_LABEL_WIDTH }}>
                            {Array.from({ length: 24 }).map((_, hour) => (
                                <div key={`time-label-${hour}`} className="time-label relative border-t border-purple-500/10 flex items-start justify-start pl-3 pt-1" style={{ height: `${slotHeight * slotsPerHour}px` }}>
                                    <span className="text-xs font-medium text-purple-300 bg-[#1A0F3C]/80 px-2 py-1 rounded">{format(setHours(new Date(), hour), 'h a', { locale: ar })}</span>
                                </div>
                            ))}
                        </div>

                        <div 
                            className="flex-1 relative" 
                            style={{ cursor: newReminderSelection ? 'grabbing' : (reminderDragState ? 'grabbing' : 'crosshair') }}
                        >
                            <div className="absolute inset-0 flex">
                                {daysInView.map((day, visualDayIndex) => (
                                    <div key={`day-col-${day.toISOString()}`} className={`flex-1 flex flex-col relative ${visualDayIndex < daysInView.length - 1 ? 'border-l border-purple-500/20' : ''}`}>
                                        {Array.from({ length: 24 * slotsPerHour }).map((_, slotSubIndex) => {
                                            const hour = Math.floor(slotSubIndex / slotsPerHour); const minute = (slotSubIndex % slotsPerHour) * (60 / slotsPerHour);
                                            const isHovered = hoveredTimeSlotInfo?.dayVisualIndex === visualDayIndex && hoveredTimeSlotInfo.hour === hour && hoveredTimeSlotInfo.minute === minute;
                                            return <div key={slotSubIndex} data-day-visual-index={visualDayIndex} data-slot-time-str={`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`} className={`border-b ${slotSubIndex % slotsPerHour === slotsPerHour - 1 ? 'border-purple-500/20' : 'border-purple-500/10'} ${isHovered ? 'bg-amber-400/20' : ''}`} style={{ height: `${slotHeight}px` }} />;
                                        })}
                                        {isToday(day) && (<motion.div className="absolute h-0.5 bg-red-500 z-10 pointer-events-none left-0 right-0" style={{ top: `${getYCoordFromTime(currentTime)}px` }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}><div className="absolute -top-[5px] w-2.5 h-2.5 bg-red-500 rounded-full shadow-md right-[-2px]" /></motion.div>)}
                                    </div>
                                ))}
                            </div>
                            
                            {newReminderSelection && newReminderSelection.isDragging && (() => {
                                const dayWidthPercentage = (1 / daysInView.length) * 100;
                                const minY = Math.min(newReminderSelection.startYInGrid, newReminderSelection.currentYInGrid);
                                const maxY = Math.max(newReminderSelection.startYInGrid, newReminderSelection.currentYInGrid);
                                const visualDayIdx = newReminderSelection.dayVisualIndex;
                                const positionStyle: React.CSSProperties = { top: `${minY}px`, height: `${maxY - minY}px`, width: `calc(${dayWidthPercentage}% - 8px)`, right: `calc(${visualDayIdx * dayWidthPercentage}% + 4px)`};
                                const startTime = getTimeFromYCoord(minY, newReminderSelection.dayDate);
                                const endTime = getTimeFromYCoord(maxY, newReminderSelection.dayDate);
                                return (<motion.div className="absolute bg-amber-400/30 border-2 border-amber-400 rounded-lg pointer-events-none z-30 p-2 flex flex-col justify-between" style={positionStyle}>
                                    <div className="text-xs text-amber-900 bg-amber-200/90 px-2 py-1 rounded font-bold self-start shadow-lg">{format(newReminderSelection.dayDate, 'eeee, d MMM', { locale: ar })}</div>
                                    <div className="text-center font-mono text-sm text-white bg-black/40 rounded py-0.5 mt-auto">{format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}</div>
                                </motion.div>);
                            })()}
                            
                            <AnimatePresence>
                              {remindersInView.map((reminder) => {
                                  if (!reminder.startTime || !isValid(parseISO(reminder.startTime))) return null;
                                  const reminderStartDate = parseISO(reminder.startTime);
                                  const visualDayIndex = daysInView.findIndex(d => isSameDay(d, reminderStartDate));
                                  if (visualDayIndex === -1) return null;
                                  const dayForPositioning = daysInView[visualDayIndex];
                                  const { top, height, isValid: isValidPos } = getReminderVisuals(reminder, dayForPositioning);
                                  if (!isValidPos || height <= 0) return null;
                                  const isBeingDragged = reminderDragState?.reminderId === reminder.id;
                                  const cardPositionStyle: React.CSSProperties = { top: `${top}px`, height: `${height}px`, width: `calc(${(100 / daysInView.length)}% - 8px)`, right: `calc(${(visualDayIndex / daysInView.length) * 100}% + 4px)`, borderRightWidth: '4px', borderLeftWidth: '0px' };
                                  
                                  return (
                                    <motion.div
                                      key={reminder.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1, zIndex: isBeingDragged ? 40 : 10 }} exit={{ opacity: 0 }} whileHover={{ zIndex: 30 }}
                                      className={`absolute group rounded-lg p-2 flex shadow-lg transition-shadow duration-200 select-none ${isBeingDragged ? 'cursor-grabbing shadow-2xl' : 'cursor-pointer'} ${reminder.isCompleted ? 'opacity-60' : ''}`}
                                      style={{ ...cardPositionStyle, backgroundColor: reminder.isCompleted ? 'rgba(75, 85, 99, 0.6)' : (reminder.color ? `${reminder.color}BF` : 'rgba(139, 92, 246, 0.75)'), borderColor: reminder.color || 'rgba(99, 102, 241, 1)' }}
                                      onMouseDown={(e) => handleReminderMouseDown(e, reminder, dayForPositioning)}
                                      onDoubleClick={(e) => { e.stopPropagation(); setQuickView({ reminder, anchorEl: e.currentTarget as HTMLElement, dayVisualIndex: visualDayIndex }); }}
                                    >
                                      <div className="flex flex-col h-full w-full overflow-hidden">
                                        <h4 className={`text-sm font-semibold text-white flex-shrink-0 ${reminder.isCompleted ? 'line-through' : ''}`}>{reminder.title}</h4>
                                        <p className="text-xs text-white/80 whitespace-normal break-words flex-shrink-0">
                                          {format(reminderStartDate, 'h:mm a', { locale: ar })}
                                          {reminder.endTime && isValid(parseISO(reminder.endTime)) && ` - ${format(parseISO(reminder.endTime), 'h:mm a', { locale: ar })}`}
                                        </p>
                                        {reminder.description && height > 50 && (<p className="text-xs text-white/70 mt-1 whitespace-pre-wrap overflow-y-auto flex-grow scrollbar-thin scrollbar-thumb-purple-400/50 scrollbar-track-transparent">{reminder.description}</p>)}
                                      </div>
                                    </motion.div>
                                  );
                              })}
                            </AnimatePresence>

                            <AnimatePresence>
                            {quickView && (
                                <ReminderQuickView
                                    key={`qv-${quickView.reminder.id}`}
                                    reminder={quickView.reminder}
                                    anchorEl={quickView.anchorEl}
                                    timelineGridRef={timelineGridRef}
                                    dayVisualIndex={quickView.dayVisualIndex}
                                    onClose={() => setQuickView(null)}
                                    onEdit={onEditReminder}
                                    onDelete={(id) => { deleteReminder(id); setQuickView(null); }}
                                    onToggleComplete={(id) => {
                                        toggleReminderCompletion(id);
                                        setQuickView(prev => {
                                            if (!prev) return null;
                                            const currentReminderInQuickView = prev.reminder;
                                            const newReminderState = { ...currentReminderInQuickView, isCompleted: !currentReminderInQuickView.isCompleted };
                                            return { ...prev, reminder: newReminderState };
                                        });
                                    }}
                                />
                            )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
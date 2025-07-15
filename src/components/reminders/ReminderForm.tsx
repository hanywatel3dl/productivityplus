// --- START OF FILE ReminderForm.tsx ---
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Clock, Calendar as CalendarIcon, MapPin, Bell, Repeat, Link as LinkIcon,
    Flag, User, Briefcase, BookOpen, Heart, MoreHorizontal,
    Plus, Trash2, Check, ChevronUp, ChevronDown
} from 'lucide-react';
import { useReminderStore } from '../../store/reminderStore';
import { useStore } from '../../store';
import { Reminder } from '../../types/reminders';
import { 
    format, parse, parseISO, addHours, setHours, setMinutes, isValid, getHours, addDays, 
    startOfTomorrow, set, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, 
    endOfWeek, isSameDay, isSameMonth, addMonths, subMonths 
} from 'date-fns';
import { ar } from 'date-fns/locale';

// <<< START: CUSTOM HOOK TO DETECT CLICK OUTSIDE >>>
function useOnClickOutside(ref: React.RefObject<HTMLDivElement>, handler: (event: MouseEvent | TouchEvent) => void) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler(event);
    };
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
}
// <<< END: CUSTOM HOOK >>>

// ... (CustomDatePicker and CustomTimePicker components remain the same)
interface CustomDatePickerProps {
    selectedDate: string;
    onDateSelect: (date: string) => void;
    onClose: () => void;
    onClear: () => void;
}

const CustomDatePicker = ({ selectedDate, onDateSelect, onClose, onClear }: CustomDatePickerProps) => {
    const initial = selectedDate && isValid(parseISO(selectedDate)) ? parseISO(selectedDate) : new Date();
    const [currentMonth, setCurrentMonth] = useState(startOfMonth(initial));

    const days = useMemo(() => {
        return eachDayOfInterval({
            start: startOfWeek(currentMonth, { locale: ar }),
            end: endOfWeek(endOfMonth(currentMonth), { locale: ar }),
        });
    }, [currentMonth]);

    const dayHeaders = ['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج'];

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-20 mt-2 w-72 bg-[#1A0F3C] rounded-lg shadow-2xl border border-purple-500/30 p-4"
        >
            <div className="flex justify-between items-center mb-4">
                <button type="button" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-full hover:bg-purple-800/50"><ChevronDown className="w-5 h-5 text-purple-300 transform rotate-90" /></button>
                <span className="font-bold text-white">{format(currentMonth, 'MMMM yyyy', { locale: ar })}</span>
                <button type="button" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-full hover:bg-purple-800/50"><ChevronUp className="w-5 h-5 text-purple-300 transform rotate-90" /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-purple-400 mb-2">
                {dayHeaders.map(day => <div key={day}>{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
                {days.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const isSelected = selectedDate === dateStr;
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    return (
                        <button
                            type="button"
                            key={dateStr}
                            onClick={() => onDateSelect(dateStr)}
                            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors text-sm ${
                                isSelected ? 'bg-amber-400 text-purple-900 font-bold' : 
                                isCurrentMonth ? 'text-white hover:bg-[#2D1B69]' : 'text-gray-500 hover:bg-[#2D1B69]'
                            }`}
                        >
                            {format(day, 'd')}
                        </button>
                    );
                })}
            </div>
            <div className="flex justify-between mt-4 pt-3 border-t border-purple-800/30">
                <button type="button" onClick={() => { onClear(); onClose(); }} className="text-sm text-red-400 hover:text-red-300">مسح</button>
                <button type="button" onClick={() => onDateSelect(format(new Date(), 'yyyy-MM-MM-dd'))} className="text-sm text-amber-400 hover:text-amber-300">اليوم</button>
            </div>
        </motion.div>
    );
};
interface CustomTimePickerProps {
    selectedTime: string; // "HH:mm"
    onTimeSelect: (time: string) => void;
    onClose: () => void;
}
const CustomTimePicker = ({ selectedTime, onTimeSelect, onClose }: CustomTimePickerProps) => {
    const initialTime = parse(selectedTime, 'HH:mm', new Date());
    const [hour, setHour] = useState(parseInt(format(initialTime, 'h'), 10)); // 1-12
    const [minute, setMinute] = useState(parseInt(format(initialTime, 'mm'), 10));
    const [period, setPeriod] = useState(format(initialTime, 'a', { locale: ar }).toLowerCase() as 'ص' | 'م');

    const hours = Array.from({ length: 12 }, (_, i) => i + 1);
    const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

    const handleSelect = () => {
        let finalHour = hour;
        if (period === 'م' && hour !== 12) finalHour += 12;
        if (period === 'ص' && hour === 12) finalHour = 0;
        onTimeSelect(format(setMinutes(setHours(new Date(), finalHour), minute), 'HH:mm'));
        onClose();
    };

    const TimeColumn = ({ values, selectedValue, onSelect, label }: { values: number[], selectedValue: number, onSelect: (val: number) => void, label: string }) => (
        <div className="h-40 w-16 overflow-y-auto scrollbar-thin scrollbar-thumb-purple-600 scrollbar-track-transparent pr-2" aria-label={label}>
            {values.map(val => (
                <button
                    type="button"
                    key={val}
                    onClick={() => onSelect(val)}
                    className={`block w-full text-center p-2 rounded-md my-1 text-lg transition-colors ${selectedValue === val ? 'bg-amber-400 text-purple-900 font-bold' : 'text-white hover:bg-[#2D1B69]'}`}
                >
                    {val.toString().padStart(2, '0')}
                </button>
            ))}
        </div>
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-20 mt-2 bg-[#1A0F3C] rounded-lg shadow-2xl border border-purple-500/30 p-4"
        >
            <div className="flex justify-center items-center gap-2">
                <TimeColumn values={hours} selectedValue={hour} onSelect={setHour} label="الساعات" />
                <span className="text-3xl font-bold text-white pb-2">:</span>
                <TimeColumn values={minutes} selectedValue={minute - (minute % 5)} onSelect={setMinute} label="الدقائق" />
                <div className="flex flex-col gap-2">
                    <button type="button" onClick={() => setPeriod('ص')} className={`px-4 py-2 rounded-md text-lg ${period === 'ص' ? 'bg-amber-400 text-purple-900' : 'bg-[#2D1B69] text-white'}`}>ص</button>
                    <button type="button" onClick={() => setPeriod('م')} className={`px-4 py-2 rounded-md text-lg ${period === 'م' ? 'bg-amber-400 text-purple-900' : 'bg-[#2D1B69] text-white'}`}>م</button>
                </div>
            </div>
            <div className="mt-4 pt-3 border-t border-purple-800/30">
                <button type="button" onClick={handleSelect} className="w-full py-2 bg-[var(--accent-color)] text-[var(--primary-bg)] rounded-lg font-bold hover:bg-[var(--accent-color-dark)] transition-colors">
                    تأكيد
                </button>
            </div>
        </motion.div>
    );
};

interface ReminderFormProps {
    reminder?: Reminder | Partial<Reminder> | null;
    initialDate?: Date;
    onClose: () => void;
}

type ActivePicker = 'startDate' | 'startTime' | 'endDate' | 'endTime' | null;

export const ReminderForm = ({ reminder, initialDate, onClose }: ReminderFormProps) => {
    const { addReminder, updateReminder } = useReminderStore();
    const { tasks } = useStore();

    const parseDateTime = (dateStr: string, timeStr: string): string => {
        if (!dateStr || !timeStr) {
            const now = initialDate || new Date();
            return setMinutes(setHours(now, getHours(now) + 1), 0).toISOString();
        }
        const [year, month, day] = dateStr.split('-').map(Number);
        const [hours, minutes] = timeStr.split(':').map(Number);
        if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes)) {
            const now = initialDate || new Date();
            return setMinutes(setHours(now, getHours(now) + 1), 0).toISOString();
        }
        return new Date(year, month - 1, day, hours, minutes).toISOString();
    };

    const getFormattedDate = (isoString?: string, fallbackDate?: Date): string => {
        const refDate = fallbackDate || initialDate || new Date();
        if (!isoString || !isValid(parseISO(isoString))) return format(refDate, 'yyyy-MM-dd');
        return format(parseISO(isoString), 'yyyy-MM-dd');
    };

    const getFormattedTime = (isoString?: string, defaultHourOffset = 1, fallbackDate?: Date): string => {
        const refDate = fallbackDate || initialDate || new Date();
        if (!isoString || !isValid(parseISO(isoString))) {
            const defaultDate = setMinutes(setHours(refDate, getHours(new Date()) + defaultHourOffset), 0);
            return format(defaultDate, 'HH:mm');
        }
        return format(parseISO(isoString), 'HH:mm');
    };

    const isEditingExisting = reminder && 'id' in reminder && reminder.id;

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startDateInp, setStartDateInp] = useState<string>('');
    const [startTimeInp, setStartTimeInp] = useState<string>('');
    const [endDateInp, setEndDateInp] = useState<string>('');
    const [endTimeInp, setEndTimeInp] = useState<string>('');
    const [hasEndTime, setHasEndTime] = useState<boolean>(false);
    const [type, setType] = useState<Reminder['type']>('reminder');
    const [priority, setPriority] = useState<Reminder['priority']>('medium');
    const [category, setCategory] = useState<Reminder['category']>('personal');
    const [location, setLocation] = useState('');
    const [notes, setNotes] = useState('');
    const [isRecurring, setIsRecurring] = useState(false);
    const [linkedTaskId, setLinkedTaskId] = useState('');
    const [color, setColor] = useState('');
    const [titleError, setTitleError] = useState('');
    const [attachments, setAttachments] = useState<Reminder['attachments']>([]);
    const [newAttachmentName, setNewAttachmentName] = useState('');
    const [newAttachmentUrl, setNewAttachmentUrl] = useState('');

    const [activePicker, setActivePicker] = useState<ActivePicker>(null);

    const togglePicker = useCallback((picker: ActivePicker) => {
        setActivePicker(current => (current === picker ? null : picker));
    }, []);
    
    // <<< START: DYNAMIC LABELS BASED ON TYPE >>>
    const typeLabels: Record<Reminder['type'], string> = {
        reminder: 'التذكير',
        task: 'المهمة',
        appointment: 'الموعد',
        event: 'الحدث'
    };
    const currentTypeName = typeLabels[type] || 'العنصر';
    // <<< END: DYNAMIC LABELS >>>

    useEffect(() => {
        // ... (useEffect logic remains the same)
        const currentContextDate = initialDate || new Date();

        if (reminder) {
            setTitle(reminder.title || '');
            setDescription(reminder.description || '');

            const effectiveStartTime = reminder.startTime || setMinutes(setHours(currentContextDate, getHours(new Date()) + 1), 0).toISOString();
            const parsedStartTime = isValid(parseISO(effectiveStartTime)) ? parseISO(effectiveStartTime) : parseISO(setMinutes(setHours(currentContextDate, getHours(new Date()) + 1), 0).toISOString());

            setStartDateInp(getFormattedDate(effectiveStartTime, parsedStartTime));
            setStartTimeInp(getFormattedTime(effectiveStartTime, 1, parsedStartTime));

            if (reminder.endTime && isValid(parseISO(reminder.endTime))) {
                setEndDateInp(getFormattedDate(reminder.endTime, parsedStartTime));
                setEndTimeInp(getFormattedTime(reminder.endTime, undefined, parsedStartTime));
                setHasEndTime(true);
            } else {
                const defaultEndTime = addHours(parsedStartTime, 1).toISOString();
                setEndDateInp(getFormattedDate(defaultEndTime, parsedStartTime));
                setEndTimeInp(getFormattedTime(defaultEndTime, undefined, parsedStartTime));
                setHasEndTime(!!reminder.endTime);
            }
            setType(reminder.type || 'reminder');
            setPriority(reminder.priority || 'medium');
            setCategory(reminder.category || 'personal');
            setLocation(reminder.location || '');
            setNotes(reminder.notes || '');
            setIsRecurring(reminder.isRecurring || false);
            setLinkedTaskId(reminder.linkedTaskId || '');
            setColor(reminder.color || '');
            // تأكد من تهيئة المرفقات عند التعديل
            setAttachments(reminder.attachments || []); 
        } else {
            const defaultStart = setMinutes(setHours(currentContextDate, getHours(new Date()) + 1), 0).toISOString();
            const defaultEnd = addHours(parseISO(defaultStart), 1).toISOString();
            setTitle(''); setDescription('');
            setStartDateInp(getFormattedDate(defaultStart, currentContextDate));
            setStartTimeInp(getFormattedTime(defaultStart, 1, currentContextDate));
            setEndDateInp(getFormattedDate(defaultEnd, currentContextDate));
            setEndTimeInp(getFormattedTime(defaultEnd, 2, currentContextDate));
            setHasEndTime(false);
            setType('reminder'); setPriority('medium'); setCategory('personal');
            setLocation(''); setNotes(''); setIsRecurring(false); setLinkedTaskId(''); setColor('');
            setAttachments([]); // تهيئة المرفقات فارغة عند إنشاء تذكير جديد
        }
    }, [reminder, initialDate]);
    
    // <<< START: REFS FOR CLICK-OUTSIDE HOOK >>>
    const startDateRef = useRef<HTMLDivElement>(null);
    const startTimeRef = useRef<HTMLDivElement>(null);
    const endDateRef = useRef<HTMLDivElement>(null);
    const endTimeRef = useRef<HTMLDivElement>(null);
    useOnClickOutside(startDateRef, () => activePicker === 'startDate' && togglePicker(null));
    useOnClickOutside(startTimeRef, () => activePicker === 'startTime' && togglePicker(null));
    useOnClickOutside(endDateRef, () => activePicker === 'endDate' && togglePicker(null));
    useOnClickOutside(endTimeRef, () => activePicker === 'endTime' && togglePicker(null));
    // <<< END: REFS FOR CLICK-OUTSIDE HOOK >>>

    const setQuickTime = (date: Date) => {
        setStartDateInp(format(date, 'yyyy-MM-dd'));
        setStartTimeInp(format(date, 'HH:mm'));
        setActivePicker(null);
    };
    
    const quickTimeOptions = [
        { label: 'بعد ساعة', action: () => setQuickTime(addHours(new Date(), 1)) },
        { label: 'هذا المساء', action: () => setQuickTime(set(new Date(), { hours: 20, minutes: 0, seconds: 0 })) },
        { label: 'غداً صباحاً', action: () => setQuickTime(set(startOfTomorrow(), { hours: 9, minutes: 0, seconds: 0 })) },
        { label: 'بعد يومين', action: () => setQuickTime(addDays(new Date(), 2)) },
    ];

    const types: { value: Reminder['type'], label: string, icon: React.ElementType }[] = [
        { value: 'reminder', label: 'تذكير', icon: Bell }, { value: 'task', label: 'مهمة', icon: Check },
        { value: 'appointment', label: 'موعد', icon: CalendarIcon }, { value: 'event', label: 'حدث', icon: Flag }
    ];
    const priorities: { value: Reminder['priority'], label: string, color: string }[] = [
        { value: 'low', label: 'منخفضة', color: 'blue' }, { value: 'medium', label: 'متوسطة', color: 'yellow' },
        { value: 'high', label: 'عالية', color: 'orange' }, { value: 'urgent', label: 'عاجلة', color: 'red' }
    ];
    const categories: { value: Reminder['category'], label: string, icon: React.ElementType }[] = [
        { value: 'personal', label: 'شخصي', icon: User }, { value: 'work', label: 'عمل', icon: Briefcase },
        { value: 'study', label: 'دراسة', icon: BookOpen }, { value: 'health', label: 'صحة', icon: Heart },
        { value: 'travel', label: 'سفر', icon: MapPin }, { value: 'meeting', label: 'اجتماع', icon: CalendarIcon },
        { value: 'other', label: 'أخرى', icon: MoreHorizontal }
    ];
    const colorOptions = [
        { value: '', label: 'افتراضي', class: 'bg-gray-500' }, { value: '#EF4444', label: 'أحمر', class: 'bg-red-500' },
        { value: '#F59E0B', label: 'كهرماني', class: 'bg-amber-500' }, { value: '#10B981', label: 'أخضر', class: 'bg-green-500' },
        { value: '#3B82F6', label: 'أزرق', class: 'bg-blue-500' }, { value: '#8B5CF6', label: 'بنفسجي', class: 'bg-purple-500' },
        { value: '#EC4899', label: 'وردي', class: 'bg-pink-500' }
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) { setTitleError(`يرجى إدخال عنوان ${currentTypeName}`); return; }
        setTitleError('');

        const finalStartTime = parseDateTime(startDateInp, startTimeInp);
        let finalEndTime: string | undefined = undefined;
        if (hasEndTime && endDateInp && endTimeInp) {
            finalEndTime = parseDateTime(endDateInp, endTimeInp);
            if (parseISO(finalEndTime) <= parseISO(finalStartTime)) {
                finalEndTime = addHours(parseISO(finalStartTime), 1).toISOString();
            }
        }

        // ====================================================================
        // هذا هو الجزء الذي تم تعديله لحل مشكلة الروابط (links)
        // ====================================================================
        const reminderData: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'> = {
            title: title.trim(),
            description,
            startTime: finalStartTime,
            endTime: finalEndTime,
            type,
            priority,
            category,
            location,
            notes,
            isRecurring,
            linkedTaskId: linkedTaskId || undefined,
            color: color || undefined,
            attachments, // نحافظ على خاصية attachments إذا كنت تستخدمها في أماكن أخرى
            // السطر الأهم: نقوم بتحويل مصفوفة المرفقات إلى مصفوفة روابط نصية لخاصية `links`
            links: attachments.map(att => att.url), 
            isCompleted: (reminder && 'isCompleted' in reminder) ? reminder.isCompleted! : false,
        };
        // ====================================================================

        if (isEditingExisting && reminder && 'id' in reminder && reminder.id) {
            updateReminder(reminder.id, reminderData);
        } else {
            addReminder(reminderData);
        }
        onClose();
    };

    const handleAddAttachment = () => {
        if (!newAttachmentName.trim() || !newAttachmentUrl.trim()) return;
        const newAtt = { id: crypto.randomUUID(), name: newAttachmentName, url: newAttachmentUrl, type: 'link' as const };
        setAttachments([...attachments, newAtt]);
        setNewAttachmentName(''); setNewAttachmentUrl('');
    };

    const handleRemoveAttachment = (id: string) => setAttachments(attachments.filter(a => a.id !== id));
    const formVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } } };
    const itemVariants = { hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 280, damping: 22 } } };

    return (
        <motion.form
            variants={formVariants} initial="hidden" animate="visible" onSubmit={handleSubmit}
            className="space-y-4 md:space-y-5 p-1" dir="rtl"
        >
             <motion.div variants={itemVariants} className="flex items-center justify-between">
                {/* <<< DYNAMIC TITLE >>> */}
                <h3 className="text-xl font-bold text-white">{isEditingExisting ? `تعديل ${currentTypeName}` : `${currentTypeName} جديد`}</h3>
                <motion.button type="button" whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={onClose}
                    className="p-2 rounded-full hover:bg-purple-800/50 text-purple-300" aria-label="إغلاق"
                ><X className="w-5 h-5" /></motion.button>
            </motion.div>

            <motion.div variants={itemVariants}>
                 {/* <<< DYNAMIC LABEL >>> */}
                <label htmlFor="reminderTitleForm" className="block text-sm text-purple-300 mb-1.5">عنوان {currentTypeName}</label>
                <input id="reminderTitleForm" type="text" value={title}
                    onChange={(e) => { setTitle(e.target.value); if (e.target.value.trim()) setTitleError(''); }}
                    placeholder={`أدخل عنوان ${currentTypeName}...`}
                    className={`w-full px-4 py-2.5 bg-[#2D1B69]/30 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 transition-all ${titleError ? 'focus:ring-red-500 border border-red-500' : 'focus:ring-amber-400'
                        }`}
                />
                {titleError && <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-1 text-xs text-red-500">{titleError}</motion.p>}
            </motion.div>

            <motion.div variants={itemVariants}>
                <label className="block text-sm text-purple-300 mb-1.5">النوع</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                    {types.map(({ value, label, icon: Icon }) => (
                        <motion.button key={value} type="button" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                            onClick={() => setType(value as Reminder['type'])}
                            className={`p-2.5 rounded-lg flex flex-col items-center gap-1.5 transition-all text-xs md:text-sm ${type === value ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30' : 'bg-[#2D1B69]/30 text-white hover:bg-[#2D1B69]/50'
                                }`}
                        ><Icon className="w-4 h-4 md:w-5 md:h-5" /><span>{label}</span></motion.button>
                    ))}
                </div>
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-3 p-3 bg-[#2D1B69]/20 rounded-lg border border-purple-700/30">
                <label className="block text-sm font-medium text-purple-200 mb-2">الوقت والتاريخ</label>
                
                <div className="flex flex-wrap items-center gap-2">
                    {quickTimeOptions.map(opt => (
                        <motion.button key={opt.label} type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            onClick={opt.action}
                            className="px-3 py-1.5 rounded-md text-xs bg-[#2D1B69]/50 text-purple-200 hover:bg-[#2D1B69] transition-colors"
                        >
                            {opt.label}
                        </motion.button>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    <div className="relative" ref={startDateRef}>
                        <label className="block text-xs text-purple-300 mb-1.5">تاريخ البدء</label>
                        <button type="button" onClick={() => togglePicker('startDate')} className="w-full text-right px-3 py-2.5 bg-[#2D1B69]/40 rounded-lg text-white flex justify-between items-center hover:bg-[#2D1B69]/60">
                            <span>{startDateInp ? format(parseISO(startDateInp), 'd MMMM yyyy', { locale: ar }) : 'اختر تاريخًا'}</span>
                            <CalendarIcon className="w-4 h-4 text-amber-400" />
                        </button>
                        <AnimatePresence>
                            {activePicker === 'startDate' && <CustomDatePicker selectedDate={startDateInp} onDateSelect={(d) => {setStartDateInp(d); togglePicker(null);}} onClose={() => togglePicker(null)} onClear={() => setStartDateInp('')} />}
                        </AnimatePresence>
                    </div>
                    <div className="relative" ref={startTimeRef}>
                        <label className="block text-xs text-purple-300 mb-1.5">وقت البدء</label>
                         <button type="button" onClick={() => togglePicker('startTime')} className="w-full text-right px-3 py-2.5 bg-[#2D1B69]/40 rounded-lg text-white flex justify-between items-center hover:bg-[#2D1B69]/60">
                            <span>{startTimeInp ? format(parse(startTimeInp, 'HH:mm', new Date()), 'hh:mm a', { locale: ar }) : 'اختر وقتًا'}</span>
                            <Clock className="w-4 h-4 text-amber-400" />
                        </button>
                        <AnimatePresence>
                           {activePicker === 'startTime' && <CustomTimePicker selectedTime={startTimeInp} onTimeSelect={setStartTimeInp} onClose={() => togglePicker(null)} />}
                        </AnimatePresence>
                    </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-purple-700/20">
                    <label htmlFor="hasEndTimeToggle" className="text-sm text-purple-300 cursor-pointer" onClick={() => setHasEndTime(!hasEndTime)}>
                        تحديد وقت نهاية
                    </label>
                    <button
                        type="button"
                        id="hasEndTimeToggle"
                        role="switch"
                        aria-checked={hasEndTime}
                        onClick={() => setHasEndTime(!hasEndTime)}
                        className={`relative flex items-center h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-[#1A0F3C] ${hasEndTime ? 'bg-amber-500' : 'bg-[#2D1B69]/50'}`}
                    >
                        <motion.span
                            layout
                            animate={{ x: hasEndTime ? '-1.25rem' : 0 }}
                            transition={{ type: "spring", stiffness: 700, damping: 30 }}
                            aria-hidden="true"
                            className="pointer-events-none h-5 w-5 transform rounded-full bg-white shadow-lg ring-0"
                        />
                    </button>
                </div>
                
                <AnimatePresence>
                {hasEndTime && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                        <div className="relative" ref={endDateRef}>
                            <label className="block text-xs text-purple-300 mb-1.5">تاريخ النهاية</label>
                            <button type="button" onClick={() => togglePicker('endDate')} className="w-full text-right px-3 py-2.5 bg-[#2D1B69]/40 rounded-lg text-white flex justify-between items-center hover:bg-[#2D1B69]/60">
                                <span>{endDateInp ? format(parseISO(endDateInp), 'd MMMM yyyy', { locale: ar }) : 'اختر تاريخًا'}</span>
                                <CalendarIcon className="w-4 h-4 text-amber-400" />
                            </button>
                            <AnimatePresence>
                                {activePicker === 'endDate' && <CustomDatePicker selectedDate={endDateInp} onDateSelect={(d) => {setEndDateInp(d); togglePicker(null);}} onClose={() => togglePicker(null)} onClear={() => setEndDateInp('')} />}
                            </AnimatePresence>
                        </div>
                        <div className="relative" ref={endTimeRef}>
                            <label className="block text-xs text-purple-300 mb-1.5">وقت النهاية</label>
                            <button type="button" onClick={() => togglePicker('endTime')} className="w-full text-right px-3 py-2.5 bg-[#2D1B69]/40 rounded-lg text-white flex justify-between items-center hover:bg-[#2D1B69]/60">
                                <span>{endTimeInp ? format(parse(endTimeInp, 'HH:mm', new Date()), 'hh:mm a', { locale: ar }) : 'اختر وقتًا'}</span>
                                <Clock className="w-4 h-4 text-amber-400" />
                            </button>
                            <AnimatePresence>
                               {activePicker === 'endTime' && <CustomTimePicker selectedTime={endTimeInp} onTimeSelect={setEndTimeInp} onClose={() => togglePicker(null)} />}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}
                </AnimatePresence>
            </motion.div>

             <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm text-purple-300 mb-1.5">الأولوية</label>
                    <div className="grid grid-cols-2 gap-2">
                        {priorities.map(({ value, label, color: priorityColor }) => (
                            <motion.button key={value} type="button" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                                onClick={() => setPriority(value as Reminder['priority'])}
                                className={`p-2 rounded-lg text-xs md:text-sm transition-all ${priority === value ? `bg-${priorityColor}-500/20 text-${priorityColor}-400 border border-${priorityColor}-400/30` : 'bg-[#2D1B69]/30 text-white hover:bg-[#2D1B69]/50'
                                    }`}
                            >{label}</motion.button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="block text-sm text-purple-300 mb-1.5">الفئة</label>
                    <div className="grid grid-cols-2 gap-2">
                        {categories.slice(0, 4).map(({ value, label, icon: Icon }) => (
                            <motion.button key={value} type="button" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                                onClick={() => setCategory(value as Reminder['category'])}
                                className={`p-2 rounded-lg flex items-center justify-center gap-1.5 text-xs md:text-sm transition-all ${category === value ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30' : 'bg-[#2D1B69]/30 text-white hover:bg-[#2D1B69]/50'
                                    }`}
                            ><Icon className="w-3.5 h-3.5 md:w-4 md:h-4" /><span>{label}</span></motion.button>
                        ))}
                    </div>
                </div>
            </motion.div>

            <motion.div variants={itemVariants}>
                <label htmlFor="reminderDescriptionForm" className="block text-sm text-purple-300 mb-1.5">الوصف (اختياري)</label>
                <textarea id="reminderDescriptionForm" value={description} onChange={(e) => setDescription(e.target.value)}
                    placeholder="أضف تفاصيل إضافية..." rows={3}
                    className="w-full px-4 py-2.5 bg-[#2D1B69]/30 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                />
            </motion.div>

            <motion.div variants={itemVariants}>
                <label htmlFor="reminderLocationForm" className="block text-sm text-purple-300 mb-1.5">المكان (اختياري)</label>
                <div className="relative">
                    <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-300 w-4 h-4" />
                    <input id="reminderLocationForm" type="text" value={location} onChange={(e) => setLocation(e.target.value)}
                        placeholder="أدخل المكان..."
                        className="w-full pl-4 pr-10 py-2.5 bg-[#2D1B69]/30 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                </div>
            </motion.div>

            <motion.div variants={itemVariants}>
                <label className="block text-sm text-purple-300 mb-2">اللون (اختياري)</label>
                <div className="flex flex-wrap gap-2.5">
                    {colorOptions.map(({ value, label, class: colorClass }) => (
                        <motion.button key={value || 'default-color'} type="button" whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                            onClick={() => setColor(value)}
                            className={`w-7 h-7 rounded-full border-2 transition-all ${colorClass} ${color === value ? 'border-white ring-2 ring-offset-2 ring-offset-[#1A0F3C] ring-white' : 'border-transparent'
                                }`}
                            title={label} aria-label={label}
                        />
                    ))}
                </div>
            </motion.div>

            <motion.div variants={itemVariants}>
                <label className="block text-sm text-purple-300 mb-1.5">المرفقات</label>
                <div className="space-y-2.5">
                    <div className="flex flex-col md:flex-row md:items-stretch gap-2.5">
                        <input
                            type="text" value={newAttachmentName} onChange={(e) => setNewAttachmentName(e.target.value)}
                            placeholder="اسم المرفق..." aria-label="اسم المرفق الجديد"
                            className="px-3 py-2.5 bg-[#2D1B69]/30 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-amber-400 md:flex-grow min-w-0"
                        />
                        <input
                            type="url" value={newAttachmentUrl} onChange={(e) => setNewAttachmentUrl(e.target.value)}
                            placeholder="رابط المرفق..." aria-label="رابط المرفق الجديد"
                            className="px-3 py-2.5 bg-[#2D1B69]/30 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-amber-400 md:flex-grow min-w-0"
                        />
                        <motion.button
                            type="button" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                            onClick={handleAddAttachment} disabled={!newAttachmentName.trim() || !newAttachmentUrl.trim()}
                            className="px-4 py-2.5 rounded-lg bg-[var(--accent-color)] text-[var(--primary-bg)] hover:bg-[var(--accent-color-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 font-medium md:flex-shrink-0"
                        ><Plus className="w-4 h-4" />إضافة</motion.button>
                    </div>
                    <AnimatePresence>
                        {attachments.map((attachment) => (
                            <motion.div key={attachment.id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                                className="flex items-center justify-between p-2.5 bg-[#2D1B69]/50 rounded-lg"
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <LinkIcon className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                    <span className="text-sm text-white truncate">{attachment.name}</span>
                                </div>
                                <motion.button type="button" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                    onClick={() => handleRemoveAttachment(attachment.id)}
                                    className="p-1 rounded-full hover:bg-red-500/20 text-red-400 flex-shrink-0"
                                    aria-label={`حذف مرفق ${attachment.name}`}
                                ><Trash2 className="w-4 h-4" /></motion.button>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </motion.div>

            <motion.div variants={itemVariants} className="flex justify-end gap-3 pt-4 border-t border-purple-800/30">
                <motion.button type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onClose}
                    className="px-5 py-2.5 rounded-lg bg-[#2D1B69]/50 text-white hover:bg-[#2D1B69] transition-colors font-medium"
                >إلغاء</motion.button>
                <motion.button type="submit" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    className="px-5 py-2.5 rounded-lg bg-[var(--solid-accent-button-bg)] text-[var(--solid-accent-button-text)] hover:bg-[var(--solid-accent-button-hover-bg)] transition-colors font-bold shadow-md"
                >
                    {/* <<< DYNAMIC SUBMIT BUTTON TEXT >>> */}
                    {isEditingExisting ? `تحديث ${currentTypeName}` : `إضافة ${currentTypeName}`}
                </motion.button>
            </motion.div>
        </motion.form>
    );
};
// --- END OF FILE ReminderForm.tsx ---
// --- START OF MODIFIED FILE src/components/reminders/MiniCalendar.tsx ---
import React, { useState, useEffect } from 'react'; // Added useEffect
import { DayPicker, useDayPicker, CaptionProps } from 'react-day-picker';
import { ar } from 'date-fns/locale';
// import { useReminderStore } from '../../store/reminderStore'; // Not using for event dots in this version
import { format, isValid, isSameDay, parseISO, startOfMonth, isSameMonth } from 'date-fns'; // <<< ADDED startOfMonth and isSameMonth HERE
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import 'react-day-picker/dist/style.css';

const miniCalendarClassNames = {
    // MODIFIED: Overall container styles remain the same, as centering should be handled by the parent.
    root: 'bg-[#1A0F3C] backdrop-blur-md rounded-xl p-3 text-white text-sm border border-purple-600/40 shadow-xl w-full dir-rtl',
    // MODIFIED: Increased bottom margin for better separation from the calendar grid.
    caption: 'flex items-center justify-between mb-4 px-1',
    caption_label: 'text-base font-bold text-amber-400 select-none',
    nav: 'flex items-center gap-1',
    nav_button: 'p-2 rounded-full bg-purple-700/50 text-purple-200 hover:bg-purple-700/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
    nav_button_previous: '',
    nav_button_next: '',
    // MODIFIED: Added `table-fixed` to ensure consistent column widths, helping with alignment.
    table: 'w-full border-collapse text-center table-fixed',
    head_row: 'border-b border-purple-700/30',
    // MODIFIED: Changed padding to be symmetrical (`py-2`) for better alignment.
    head_cell: 'py-2 font-bold text-xs text-purple-300 uppercase select-none',
    row: '', // No changes needed here, spacing will be handled by cell/day margins.
    // MODIFIED: Removed padding from cell; spacing is now controlled by the margin on the `day` element.
    cell: 'p-0',
    // MODIFIED: Added vertical margin `my-1` to create space between rows.
    day: 'rounded-full w-8 h-8 flex items-center justify-center mx-auto my-1 text-sm font-medium text-purple-100 cursor-pointer transition-all hover:bg-amber-500/25 hover:text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-opacity-70',
    day_selected: '!bg-amber-500 !text-purple-900 font-bold shadow-lg shadow-amber-600/30',
    day_today: 'ring-2 ring-red-500/70 text-red-400 font-semibold',
    day_outside: 'text-purple-400/40 opacity-50 !cursor-default hover:!bg-transparent',
    day_disabled: 'text-purple-400/20 opacity-30 cursor-not-allowed hover:!bg-transparent',
    day_hidden: 'invisible',
};


function CustomCaption(props: CaptionProps) {
const { goToMonth, nextMonth, previousMonth } = useDayPicker();
return (
<div className={miniCalendarClassNames.caption}>
<button
type="button"
disabled={!nextMonth} // Swapped for RTL logic
onClick={() => nextMonth && goToMonth(nextMonth)}
className={miniCalendarClassNames.nav_button}
aria-label="الشهر التالي"
>
{/* MODIFIED: Changed icon direction to match visual action in RTL */}
<ChevronRight className="w-5 h-5" />
</button>
<h2 className={miniCalendarClassNames.caption_label} aria-live="polite">
{props.displayMonth ? format(props.displayMonth, 'MMMM yyyy', { locale: ar }) : ''}
</h2>
<button
type="button"
disabled={!previousMonth}
onClick={() => previousMonth && goToMonth(previousMonth)}
className={miniCalendarClassNames.nav_button}
aria-label="الشهر السابق"
>
{/* MODIFIED: Changed icon direction to match visual action in RTL */}
<ChevronLeft className="w-5 h-5" />
</button>
</div>
);
}

interface MiniCalendarProps {
selectedDate: Date;
onSelectDate: (date: Date) => void;
}

export const MiniCalendar = ({ selectedDate, onSelectDate }: MiniCalendarProps) => {
// Initialize displayMonth with the start of the month of the selectedDate
const [displayMonth, setDisplayMonth] = useState(startOfMonth(selectedDate)); // Line 69 where startOfMonth was used

useEffect(() => {
    // Sync display month if selectedDate changes to a different month
    if (!isSameMonth(selectedDate, displayMonth)) {
        setDisplayMonth(startOfMonth(selectedDate));
    }
}, [selectedDate, displayMonth]); // Removed currentMonth as it's the same as displayMonth

const animationKey = format(displayMonth, 'yyyy-MM');

const isAnimatingForward = selectedDate > displayMonth;

return (
    <AnimatePresence mode="wait">
        <motion.div
            key={animationKey}
            // MODIFIED: Animation updated for RTL and enhanced visual appeal.
            initial={{ opacity: 0.6, x: isAnimatingForward ? -30 : 30, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0.6, x: isAnimatingForward ? 30 : -30, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
        >
            <DayPicker
                locale={ar}
                mode="single"
                required
                selected={selectedDate}
                onSelect={(date) => date && onSelectDate(date)}
                month={displayMonth} // Control the displayed month
                onMonthChange={setDisplayMonth} // Update the displayed month when user navigates
                classNames={miniCalendarClassNames}
                showOutsideDays
                dir="rtl"
                components={{ Caption: CustomCaption }}
                weekStartsOn={6}
            />
        </motion.div>
    </AnimatePresence>
);


};
// --- END OF MODIFIED FILE src/components/reminders/MiniCalendar.tsx ---
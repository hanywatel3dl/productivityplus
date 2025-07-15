import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addDays, subDays, startOfWeek, addWeeks, subWeeks, isAfter, isToday, isSameWeek } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useStore } from '../../store';
import { ChevronRight, ChevronLeft, Plus, Calendar, Edit3, Save } from 'lucide-react';

export const JournalView = () => {
  const { notes, addNote, updateNote } = useStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const today = new Date();

  // Format date for note title and lookup
  const formattedDate = format(selectedDate, 'yyyy-MM-dd');
  const displayDate = format(selectedDate, 'EEEE dd MMMM yyyy', { locale: ar });
  
  // Get note for selected date
  const todayNote = notes.find(note => note.title.includes(formattedDate));

  // Generate week days
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  const handlePrevDay = () => {
    const newDate = subDays(selectedDate, 1);
    setSelectedDate(newDate);
    // إذا انتقل اليوم إلى أسبوع مختلف، قم بتحديث عرض الأسبوع
    if (!isSameWeek(newDate, selectedDate, { weekStartsOn: 0 })) {
      setWeekStart(startOfWeek(newDate, { weekStartsOn: 0 }));
    }
  };
  const handleNextDay = () => {
    const newDate = addDays(selectedDate, 1);
    // منع التنقل إلى المستقبل
    if (isAfter(newDate, today)) return;
    
    setSelectedDate(newDate);
    // إذا انتقل اليوم إلى أسبوع مختلف، قم بتحديث عرض الأسبوع
    if (!isSameWeek(newDate, selectedDate, { weekStartsOn: 0 })) {
      setWeekStart(startOfWeek(newDate, { weekStartsOn: 0 }));
    }
  };
  const handlePrevWeek = () => {
    setWeekStart(prev => subWeeks(prev, 1));
    setSelectedDate(prev => subDays(prev, 7));
  };
  const handleNextWeek = () => {
    setWeekStart(prev => addWeeks(prev, 1));
    setSelectedDate(prev => addDays(prev, 7));
  };

  const handleNewEntry = () => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const title = `${dateStr} - ${format(selectedDate, 'EEEE', { locale: ar })}`;
    
    if (!todayNote) {
      const newNote = {
        id: crypto.randomUUID(),
        title,
        content: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addNote(newNote);
    }
  };

  const handleEditNote = (id: string, content: string) => {
    setEditingNote(id);
    setEditContent(content);
  };

  const handleSaveNote = (id: string) => {
    updateNote(id, {
      content: editContent,
      updatedAt: new Date().toISOString()
    });
    setEditingNote(null);
  };

  const isNextWeekInFuture = weekDays.some(day => isToday(day));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-amber-400">اليوميات</h2>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handlePrevWeek}
          className="p-2 rounded-full bg-[#2D1B69]/50 text-white"
        >
          <ChevronRight className="w-5 h-5" />
        </motion.button>
        <div className="text-white font-medium">
          {format(weekStart, 'MMMM yyyy', { locale: ar })}
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleNextWeek}
          disabled={isNextWeekInFuture}
          className="p-2 rounded-full bg-[#2D1B69]/50 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Week Days */}
      <div className="grid grid-cols-7 gap-2 mb-6">
        {weekDays.map((day) => {
          const isSelected = day.toDateString() === selectedDate.toDateString();
          const hasNote = notes.some(note => note.title.includes(format(day, 'yyyy-MM-dd')));
          const isFutureDate = isAfter(day, today);
          const isCurrentDay = isToday(day);
          
          return (
            <motion.button
              key={day.toISOString()}
              whileHover={!isFutureDate && !isSelected ? { scale: 1.05 } : {}}
              whileTap={!isFutureDate && !isSelected ? { scale: 0.95 } : {}}
              onClick={() => !isFutureDate && setSelectedDate(day)}
              disabled={isFutureDate}
              className={`
                flex flex-col items-center justify-center p-3 rounded-lg transition-colors
                ${isSelected 
                  ? 'bg-amber-400 text-[#2D1B69]' 
                  : 'bg-[#2D1B69]/30 text-white'}
                ${!isSelected && !isFutureDate ? 'hover:bg-[#2D1B69]/50' : ''}
                ${isFutureDate ? 'opacity-50 cursor-not-allowed' : ''}
                ${isCurrentDay && !isSelected ? 'ring-2 ring-amber-400/80' : ''}
              `}
            >
              <span className="text-sm">{format(day, 'EEEE', { locale: ar })}</span>
              <span className="text-lg font-bold">{format(day, 'd')}</span>
              {hasNote && !isSelected && !isFutureDate && (
                <div className="w-2 h-2 mt-1 rounded-full bg-amber-400"></div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Selected Day Navigation */}
      <div className="flex items-center justify-between mb-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handlePrevDay}
          className="p-2 rounded-full bg-[#2D1B69]/50 text-white"
        >
          <ChevronRight className="w-5 h-5" />
        </motion.button>
        <div className="flex items-center gap-2 text-white font-medium">
          <Calendar className="w-5 h-5 text-amber-400" />
          {displayDate}
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleNextDay}
          disabled={isToday(selectedDate) || isAfter(selectedDate, today)}
          className="p-2 rounded-full bg-[#2D1B69]/50 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Journal Entry */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedDate.toISOString()}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="bg-[#2D1B69]/30 backdrop-blur-lg rounded-xl p-6"
        >
          {todayNote ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">{displayDate}</h3>
                <div className="flex gap-2">
                  {editingNote === todayNote.id ? (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSaveNote(todayNote.id)}
                      className="p-2 rounded-lg bg-green-500 text-white"
                    >
                      <Save className="w-5 h-5" />
                    </motion.button>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleEditNote(todayNote.id, todayNote.content)}
                      className="p-2 rounded-lg bg-amber-400 text-[#2D1B69]"
                    >
                      <Edit3 className="w-5 h-5" />
                    </motion.button>
                  )}
                </div>
              </div>
              
              {editingNote === todayNote.id ? (
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full h-64 bg-[#2D1B69]/30 rounded-lg p-4 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                  placeholder="اكتب يوميتك هنا..."
                  autoFocus
                />
              ) : (
                <div className="w-full min-h-[16rem] bg-[#2D1B69]/30 rounded-lg p-4 text-white whitespace-pre-wrap">
                  {todayNote.content || (
                    <span className="text-purple-300">لا توجد ملاحظات لهذا اليوم. انقر على زر التعديل لإضافة محتوى.</span>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="w-16 h-16 text-purple-300 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">لا توجد يومية لهذا اليوم</h3>
              <p className="text-purple-300 mb-6">أضف يومية جديدة لتسجيل أحداث وملاحظات هذا اليوم</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleNewEntry}
                className="px-6 py-3 rounded-lg bg-amber-400 text-[#2D1B69] flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                إضافة يومية
              </motion.button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Recent Entries */}
      {notes.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-bold text-white mb-4">اليوميات السابقة</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {notes
              .filter(note => note.title.includes('-')) // Only show date-based journal entries
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .slice(0, 6)
              .map((note) => {
                const noteDate = note.title.split(' - ')[0];
                const displayNoteDate = note.title.includes('-') 
                  ? format(new Date(noteDate), 'EEEE dd MMMM', { locale: ar })
                  : note.title;
                
                return (
                  <motion.div
                    key={note.id}
                    whileHover={{ scale: 1.02 }}
                    className="bg-[#2D1B69]/30 backdrop-blur-lg rounded-lg p-4 cursor-pointer"
                    onClick={() => {
                      if (noteDate && noteDate.includes('-')) {
                        const newSelectedDate = new Date(noteDate);
                        setSelectedDate(newSelectedDate);
                        setWeekStart(startOfWeek(newSelectedDate, { weekStartsOn: 0 }));
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-white">{displayNoteDate}</h4>
                      <span className="text-xs text-purple-300">
                        {format(new Date(note.updatedAt), 'HH:mm', { locale: ar })}
                      </span>
                    </div>
                    <p className="text-purple-300 text-sm line-clamp-3">
                      {note.content || 'لا يوجد محتوى'}
                    </p>
                  </motion.div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};
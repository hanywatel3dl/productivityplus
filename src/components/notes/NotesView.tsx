import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Save, Trash2, PenLine } from 'lucide-react';
import { useStore, Note } from '../../store'; // تأكد من استيراد Note
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const SavingSpinner = () => (
  <motion.div 
    animate={{ rotate: 360 }} 
    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    className="w-4 h-4 border-2 border-t-purple-300 border-transparent rounded-full"
  />
);

export const NotesView = () => {
  const { notes, addNote, updateNote, deleteNote, currentNote, setCurrentNote } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  
  // 1. حالة جديدة لتتبع وضع الإنشاء بشكل صريح
  const [isCreating, setIsCreating] = useState(false);

  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // 2. تحديث خوارزمية المزامنة
  // هذا الـ hook يضبط حالة المحرر بناءً على الملاحظة المحددة أو وضع الإنشاء
  useEffect(() => {
    if (currentNote) {
      setEditorTitle(currentNote.title);
      setEditorContent(currentNote.content);
      setIsCreating(false); // إذا تم تحديد ملاحظة، فنحن لسنا في وضع الإنشاء
    } else {
      // إما أننا في وضع الإنشاء أو لا يوجد شيء محدد
      setEditorTitle('');
      setEditorContent('');
    }
    setHasChanges(false);
  }, [currentNote]);

  useEffect(() => {
    if (currentNote) {
      const changed = editorTitle !== currentNote.title || editorContent !== currentNote.content;
      setHasChanges(changed);
    } else {
      const changed = editorTitle.trim() !== '' || editorContent.trim() !== '';
      setHasChanges(changed);
    }
  }, [editorTitle, editorContent, currentNote]);

  const regularNotes = notes.filter(note => !note.title.includes('yyyy-MM-dd'));
  
  const filteredNotes = regularNotes.filter(note => 
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 3. تحديث دالة إضافة الملاحظة
  const handleAddNote = () => {
    setCurrentNote(null); // إلغاء تحديد أي ملاحظة حالية
    setIsCreating(true);  // الدخول في وضع الإنشاء بشكل صريح
  };
  
  const handleSelectNote = (note: Note) => {
    setCurrentNote(note);
    setIsCreating(false); // الخروج من وضع الإنشاء عند تحديد ملاحظة
  };

  const handleSaveNote = () => {
    if (!editorTitle.trim()) {
      alert("لا يمكن حفظ ملاحظة بدون عنوان.");
      return;
    }

    setIsSaving(true);

    setTimeout(() => {
      if (currentNote) {
        updateNote(currentNote.id, { title: editorTitle, content: editorContent });
      } else {
        const newNote = {
          id: crypto.randomUUID(),
          title: editorTitle,
          content: editorContent,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        addNote(newNote);
        setCurrentNote(newNote); 
        setIsCreating(false); // الخروج من وضع الإنشاء بعد الحفظ
      }
      setIsSaving(false);
      setHasChanges(false);
    }, 300);
  };

  const handleDeleteNote = (id: string) => {
    if (window.confirm("هل أنت متأكد من رغبتك في حذف هذه الملاحظة؟ لا يمكن التراجع عن هذا الإجراء.")) {
      deleteNote(id);
      if (currentNote && currentNote.id === id) {
        setCurrentNote(null);
        setIsCreating(false);
      }
    }
  };

  // 4. تحديث منطق العرض (الشرط الأساسي)
  // الآن الشرط واضح: اعرض المحرر إذا كانت هناك ملاحظة محددة أو إذا كنا في وضع الإنشاء
  const shouldShowEditor = currentNote !== null || isCreating;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-amber-400">الملاحظات</h2>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleAddNote}
          className="px-4 py-2 rounded-lg bg-amber-400 text-[#2D1B69] flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          ملاحظة جديدة
        </motion.button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-300 w-5 h-5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="بحث في الملاحظات..."
          className="w-full pl-4 pr-12 py-3 bg-[#2D1B69]/30 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-xl font-bold text-white">قائمة الملاحظات</h3>
          
          {filteredNotes.length === 0 ? (
             <div className="bg-[#2D1B69]/30 backdrop-blur-lg rounded-xl p-6 text-center h-full flex flex-col justify-center items-center">
               <PenLine className="w-12 h-12 text-purple-300 mx-auto mb-4" />
               <p className="text-purple-300">
                 {searchQuery ? 'لا توجد نتائج للبحث' : 'لا توجد ملاحظات بعد، أنشئ واحدة!'}
               </p>
               {searchQuery && (
                 <button 
                   onClick={() => setSearchQuery('')}
                   className="mt-4 text-amber-400 hover:underline"
                 >
                   مسح البحث
                 </button>
               )}
             </div>
          ) : (
            <div className="space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
              <AnimatePresence>
                {filteredNotes.map((note) => (
                  <motion.div
                    key={note.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    onClick={() => handleSelectNote(note)}
                    className={`p-4 rounded-lg cursor-pointer transition-colors relative ${
                      currentNote?.id === note.id
                        ? 'bg-amber-400/20 border border-amber-400'
                        : 'bg-[#2D1B69]/30 hover:bg-[#2D1B69]/50'
                    }`}
                  >
                    <h4 className="text-lg font-semibold text-white mb-2 line-clamp-1">{note.title}</h4>
                    <p className="text-purple-300 text-sm line-clamp-2 mb-2">{note.content}</p>
                    <div className="flex items-center justify-between text-xs text-purple-400">
                      <span>{format(new Date(note.updatedAt), 'dd MMMM yyyy', { locale: ar })}</span>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNote(note.id);
                        }}
                        className="p-1 rounded-full hover:bg-red-500/20 text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {shouldShowEditor ? (
              <motion.div
                key={currentNote?.id || 'new-note-editor'}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-[#2D1B69]/30 backdrop-blur-lg rounded-xl p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <input
                    type="text"
                    value={editorTitle}
                    onChange={(e) => setEditorTitle(e.target.value)}
                    placeholder="عنوان الملاحظة..."
                    className="bg-transparent text-xl font-bold text-white placeholder-purple-300 focus:outline-none w-full"
                  />
                </div>
                
                <textarea
                  value={editorContent}
                  onChange={(e) => setEditorContent(e.target.value)}
                  placeholder="اكتب ملاحظتك هنا..."
                  className="w-full h-[calc(100vh-400px)] bg-[#2D1B69]/30 rounded-lg p-4 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                />
                
                <div className="flex items-center justify-end mt-4 gap-4">
                  {isSaving && <span className="text-purple-300 text-sm">جارٍ الحفظ...</span>}
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSaveNote}
                    disabled={isSaving || !hasChanges}
                    className="px-6 py-2 rounded-lg bg-amber-400 text-[#2D1B69] flex items-center gap-2 disabled:bg-amber-400/50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? <SavingSpinner /> : <Save className="w-5 h-5" />}
                    {currentNote ? 'حفظ التغييرات' : 'إنشاء الملاحظة'}
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#2D1B69]/30 backdrop-blur-lg rounded-xl p-12 text-center h-full flex flex-col items-center justify-center"
              >
                <PenLine className="w-16 h-16 text-purple-300 mb-6" />
                <h3 className="text-xl font-bold text-white mb-4">اختر ملاحظة لعرضها أو تحريرها</h3>
                <p className="text-purple-300">أو قم بإنشاء ملاحظة جديدة للبدء.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
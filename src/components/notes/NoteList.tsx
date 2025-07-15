import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search } from 'lucide-react';
import { useStore } from '../../store';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export const NoteList = () => {
  const { notes, setCurrentNote } = useStore();

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">الملاحظات</h2>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setCurrentNote(null)}
          className="p-2 rounded-lg bg-amber-400 text-purple-900"
        >
          <Plus className="w-5 h-5" />
        </motion.button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-300 w-5 h-5" />
        <input
          type="text"
          placeholder="بحث في الملاحظات..."
          className="w-full pl-4 pr-12 py-3 bg-purple-900/30 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </div>

      <div className="flex-1 overflow-auto space-y-4">
        <AnimatePresence>
          {notes.map((note) => (
            <motion.div
              key={note.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              onClick={() => setCurrentNote(note)}
              className="p-4 bg-purple-900/30 rounded-lg cursor-pointer hover:bg-purple-800/40 transition-colors"
            >
              <h3 className="text-lg font-semibold text-white mb-2">{note.title}</h3>
              <p className="text-purple-300 text-sm line-clamp-2 mb-2">{note.content}</p>
              <div className="text-xs text-purple-400">
                {format(new Date(note.updatedAt), 'dd MMMM yyyy', { locale: ar })}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
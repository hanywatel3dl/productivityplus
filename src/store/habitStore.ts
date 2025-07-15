// src/store/useHabitStore.ts

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid'; // استيراد uuid لتوليد معرفات فريدة
import { 
  startOfDay, parseISO, isBefore, isAfter, getDay, subDays, isSameDay, addDays 
} from 'date-fns';

// استيراد أنواع البيانات المحدّثة
import { Habit, HabitLog, HabitStats } from '../types/habits';

// =================== الدوال المساعدة لحساب الـ Streak والجدولة ===================

/**
 * تتحقق مما إذا كانت العادة مجدولة في تاريخ معين، مع الأخذ في الاعتبار تاريخ البدء والانتهاء وأنواع التكرار.
 * @param habit كائن العادة.
 * @param date التاريخ المراد التحقق منه (كائن Date).
 * @returns {boolean} True إذا كانت العادة مجدولة في هذا التاريخ، False خلاف ذلك.
 */
const isScheduled = (habit: Habit, date: Date): boolean => {
  // === إصلاح حرج: التحقق من وجود habit.startDate قبل محاولة تحليله ===
  // هذا يمنع خطأ "Cannot read properties of undefined (reading 'split')"
  if (!habit.startDate) {
    return false;
  }
  
  const targetDate = startOfDay(date);
  const startDate = startOfDay(parseISO(habit.startDate));
  
  // 1. العادة لا يمكن أن تكون مجدولة قبل تاريخ البدء الخاص بها
  if (isBefore(targetDate, startDate)) {
    return false;
  }
  
  // 2. إذا كان للعادة تاريخ انتهاء محدد، فلا يمكن أن تكون مجدولة بعده
  if (habit.endDate) {
    const endDate = startOfDay(parseISO(habit.endDate));
    if (isAfter(targetDate, endDate)) {
      return false; 
    }
  }
  
  // 3. التحقق من نوع تكرار العادة (يومي أو أسبوعي)
  if (habit.frequency.type === 'daily') {
    return true; // العادات اليومية مجدولة كل يوم ضمن نطاقها الزمني
  }
  if (habit.frequency.type === 'weekly') {
    const dayOfWeek = getDay(targetDate); // 0 = الأحد, 6 = السبت
    return habit.frequency.days?.includes(dayOfWeek) ?? false; // هل اليوم الحالي من الأيام المحددة للتكرار الأسبوعي؟
  }
  
  // إذا كان نوع التكرار غير مدعوم أو غير محدد (مثلاً 'monthly' لم يتم تطبيق منطقه التفصيلي بعد)
  return false;
};

/**
 * تعثر على تاريخ اليوم المجدول السابق لعادة معينة قبل تاريخ `fromDate`.
 * تُستخدم هذه الدالة بشكل حاسم في حساب السلاسل لتتبع الأيام المجدولة فقط.
 * @param habit كائن العادة.
 * @param fromDate التاريخ الذي نبدأ البحث منه للخلف (كائن Date).
 * @returns {Date | null} تاريخ اليوم المجدول السابق، أو null إذا لم يتم العثور عليه خلال فترة معقولة.
 */
const getPreviousScheduledDate = (habit: Habit, fromDate: Date): Date | null => {
  let currentDate = subDays(startOfDay(fromDate), 1); // ابدأ من اليوم الذي يسبق `fromDate`
  // نبحث للخلف لمدة عام كحد أقصى لتجنب الحلقات اللانهائية في حال وجود فجوات كبيرة جداً
  for (let i = 0; i < 365; i++) { 
    // إذا كان `currentDate` مجدولاً لهذه العادة، فقد وجدنا اليوم السابق
    if (isScheduled(habit, currentDate)) {
      return currentDate;
    }
    currentDate = subDays(currentDate, 1); // انتقل ليوم أسبق
  }
  return null; // لم يتم العثور على يوم مجدول سابق خلال فترة البحث
};

/**
 * الدالة الأساسية لحساب السلسلة الحالية (currentStreak) وأطول سلسلة (bestStreak) لعادة معينة.
 * يتم تحديث هذه القيم وتخزينها مباشرة في كائن العادة بعد كل تغيير في سجلات الإنجاز.
 * @param habit كائن العادة الذي نقوم بحساب السلاسل له.
 * @param allLogs جميع سجلات الإنجاز الموجودة في المتجر حالياً.
 * @returns {{ currentStreak: number, bestStreak: number }} كائن يحتوي على السلسلة الحالية وأفضل سلسلة.
 */
const calculateStreaks = (habit: Habit, allLogs: HabitLog[]): { currentStreak: number, bestStreak: number } => {
  // تصفية سجلات الإنجاز المكتملة لهذه العادة والتي تقع ضمن نطاق تاريخ البدء.
  const completedLogsForHabit = allLogs
    .filter(log => log.habitId === habit.id && log.completed && habit.startDate && !isBefore(parseISO(log.date), parseISO(habit.startDate)))
    .map(log => startOfDay(parseISO(log.date))) // تحويل تواريخ السجلات إلى كائنات Date في بداية اليوم
    .sort((a, b) => b.getTime() - a.getTime()); // ترتيب تنازلي (الأحدث أولاً)

  // إذا لم يكن هناك أي إنجازات لهذه العادة، تكون السلاسل صفر
  if (completedLogsForHabit.length === 0) {
    return { currentStreak: 0, bestStreak: habit.bestStreak || 0 }; // نحافظ على أفضل سلسلة سابقة إذا كانت موجودة
  }

  // 1. حساب أطول سلسلة (Longest Streak) عبر كل تاريخ الإنجاز
  // نرتب التواريخ تصاعدياً لحساب السلسلة الأطول تاريخياً
  const sortedAscCompletedDates = [...completedLogsForHabit].sort((a, b) => a.getTime() - b.getTime());
  let longestStreak = 0;
  if (sortedAscCompletedDates.length > 0) {
    longestStreak = 1; // إذا كان هناك سجل واحد على الأقل، فالسلسلة الأولية هي 1
    let currentLocalStreak = 1; // لعد السلسلة المحلية أثناء المرور
    for (let i = 1; i < sortedAscCompletedDates.length; i++) {
      const currentDate = sortedAscCompletedDates[i];
      const prevDateInList = sortedAscCompletedDates[i - 1];
      
      // نبحث عن اليوم المجدول الذي كان يجب إنجاز العادة فيه قبل `currentDate`
      const expectedPrevDate = getPreviousScheduledDate(habit, currentDate);
      
      // إذا كان اليوم المجدول المتوقع موجوداً وهو نفس اليوم الذي تم إنجازه قبله في القائمة
      if (expectedPrevDate && isSameDay(prevDateInList, expectedPrevDate)) {
        currentLocalStreak++; // السلسلة مستمرة، نزيد العداد
      } else {
        // انقطعت السلسلة المحلية، نبدأ العد من جديد
        currentLocalStreak = 1;
      }
      // تحديث أطول سلسلة إذا كانت السلسلة المحلية الحالية أكبر
      if (currentLocalStreak > longestStreak) {
        longestStreak = currentLocalStreak;
      }
    }
  }

  // 2. حساب السلسلة الحالية (Current Streak)
  let currentStreak = 0;
  const today = startOfDay(new Date()); // بداية اليوم الحالي
  const lastCompletedDate = completedLogsForHabit[0]; // أحدث يوم تم الإنجاز فيه

  // الشرط 1: هل آخر إنجاز كان في اليوم الحالي؟ (مكتمل اليوم)
  const isLastCompletionToday = isSameDay(lastCompletedDate, today);
  
  // الشرط 2: هل آخر إنجاز كان في آخر يوم مجدول قبل اليوم الحالي (إذا لم يكن اليوم نفسه مجدولاً أو تم إنجازه)
  // نستخدم addDays(today, 1) لنتأكد أن `getPreviousScheduledDate` تبحث عن يوم قبل اليوم الحالي أو آخر يوم مجدول قبل اليوم.
  const lastScheduledDayBeforeToday = getPreviousScheduledDate(habit, addDays(today, 1)); 
  const isLastCompletionOnLastScheduledDay = lastScheduledDayBeforeToday ? isSameDay(lastCompletedDate, lastScheduledDayBeforeToday) : false;
  
  // إذا كانت السلسلة لا تزال "حية" (إما تم إنجازها اليوم أو في آخر يوم مجدول كان يجب إنجازها فيه)
  if (isLastCompletionToday || isLastCompletionOnLastScheduledDay) {
    currentStreak = 1; // نبدأ العد من 1 (آخر إنجاز)
    let loopDate = lastCompletedDate; // التاريخ الذي نستخدمه للبحث للخلف

    // نمر على سجلات الإنجاز السابقة (التي هي مرتبة تنازلياً)
    for (let i = 1; i < completedLogsForHabit.length; i++) {
      const prevLogInList = completedLogsForHabit[i]; // الإنجاز السابق في القائمة
      const expectedPrevDate = getPreviousScheduledDate(habit, loopDate); // اليوم المجدول المتوقع قبل `loopDate`

      // إذا كان اليوم المجدول المتوقع موجوداً وهو نفس اليوم الذي تم إنجازه قبله في القائمة
      if (expectedPrevDate && isSameDay(prevLogInList, expectedPrevDate)) {
        currentStreak++; // السلسلة مستمرة، نزيد العداد
        loopDate = prevLogInList; // ننتقل إلى هذا اليوم ونستمر في البحث للخلف
      } else {
        break; // انقطعت السلسلة، نتوقف
      }
    }
  }

  // نحدد أفضل سلسلة كأقصى قيمة بين: أطول سلسلة تم حسابها للتو، أفضل سلسلة مخزنة سابقاً، والسلسلة الحالية (في حال كانت هي الأطول)
  return {
    currentStreak,
    bestStreak: Math.max(longestStreak, habit.bestStreak || 0, currentStreak),
  };
};

/**
 * دالة جديدة لحساب السلسلة في تاريخ معين (للعرض في الأيام السابقة)
 * @param habit كائن العادة
 * @param allLogs جميع سجلات الإنجاز
 * @param targetDate التاريخ المراد حساب السلسلة له
 * @returns {{ currentStreak: number, bestStreak: number }} السلاسل في ذلك التاريخ
 */
const calculateStreaksForDate = (habit: Habit, allLogs: HabitLog[], targetDate: Date): { currentStreak: number, bestStreak: number } => {
  const targetDateStr = targetDate.toISOString().split('T')[0];
  
  // تصفية سجلات الإنجاز المكتملة لهذه العادة حتى التاريخ المحدد
  const completedLogsUntilDate = allLogs
    .filter(log => 
      log.habitId === habit.id && 
      log.completed && 
      habit.startDate && 
      !isBefore(parseISO(log.date), parseISO(habit.startDate)) &&
      !isAfter(parseISO(log.date), targetDate)
    )
    .map(log => startOfDay(parseISO(log.date)))
    .sort((a, b) => b.getTime() - a.getTime());

  if (completedLogsUntilDate.length === 0) {
    return { currentStreak: 0, bestStreak: 0 };
  }

  // حساب أطول سلسلة حتى هذا التاريخ
  const sortedAscCompletedDates = [...completedLogsUntilDate].sort((a, b) => a.getTime() - b.getTime());
  let longestStreak = 1;
  let currentLocalStreak = 1;
  
  for (let i = 1; i < sortedAscCompletedDates.length; i++) {
    const currentDate = sortedAscCompletedDates[i];
    const prevDateInList = sortedAscCompletedDates[i - 1];
    const expectedPrevDate = getPreviousScheduledDate(habit, currentDate);
    
    if (expectedPrevDate && isSameDay(prevDateInList, expectedPrevDate)) {
      currentLocalStreak++;
    } else {
      currentLocalStreak = 1;
    }
    
    if (currentLocalStreak > longestStreak) {
      longestStreak = currentLocalStreak;
    }
  }

  // حساب السلسلة الحالية في ذلك التاريخ
  let currentStreak = 0;
  const lastCompletedDate = completedLogsUntilDate[0];
  
  // التحقق من وجود إنجاز في التاريخ المحدد أو آخر يوم مجدول قبله
  const isCompletedOnTargetDate = completedLogsUntilDate.some(date => isSameDay(date, targetDate));
  const lastScheduledDayBeforeTarget = getPreviousScheduledDate(habit, addDays(targetDate, 1));
  const isLastCompletionOnLastScheduledDay = lastScheduledDayBeforeTarget ? isSameDay(lastCompletedDate, lastScheduledDayBeforeTarget) : false;
  
  if (isCompletedOnTargetDate || isLastCompletionOnLastScheduledDay) {
    currentStreak = 1;
    let loopDate = lastCompletedDate;

    for (let i = 1; i < completedLogsUntilDate.length; i++) {
      const prevLogInList = completedLogsUntilDate[i];
      const expectedPrevDate = getPreviousScheduledDate(habit, loopDate);

      if (expectedPrevDate && isSameDay(prevLogInList, expectedPrevDate)) {
        currentStreak++;
        loopDate = prevLogInList;
      } else {
        break;
      }
    }
  }

  return {
    currentStreak,
    bestStreak: longestStreak,
  };
};

// =================================================================================

// تعريف حالة المتجر الرئيسية
interface HabitState {
  habits: Habit[]; // قائمة العادات
  habitLogs: HabitLog[]; // قائمة بسجلات إنجاز العادات (مفصولة)
  
  // دوال CRUD (Create, Read, Update, Delete) للعادات
  // `Omit` تستبعد الخصائص التي يتم توليدها داخل المتجر
  addHabit: (habit: Omit<Habit, 'id' | 'userId' | 'createdAt' | 'currentStreak' | 'bestStreak'>) => void;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  archiveHabit: (id: string) => void;
  deleteHabit: (id: string) => void;
  
  // دوال تسجيل الإنجازات والملاحظات
  toggleHabitCompletion: (habitId: string, date: string, completed: boolean) => void;
  addHabitNote: (habitId: string, date: string, note: string) => void;
  
  // دوال الاستعلام والعرض
  getHabitsForDate: (date: string) => Array<{ habit: Habit; completed: boolean; }>;
  getHabitStats: (habitId: string) => HabitStats; // تُستخدم لدعم مكون HabitStats.tsx (إذا كان موجوداً)
  getWeeklyProgress: () => { achieved: number; total: number; improvement: number; }; // تُستخدم لدعم HabitStats.tsx
  
  // دالة لمسح كل البيانات (مفيدة جداً للاختبار والتطوير)
  clearAllData: () => void;
}

export const useHabitStore = create<HabitState>()(
  persist(
    (set, get) => ({
      habits: [],
      habitLogs: [],
      
      // إضافة عادة جديدة
      addHabit: (habitData) => set((state) => ({
        habits: [...state.habits, {
          ...habitData,
          id: uuidv4(), // توليد ID فريد للعادة
          userId: 'current-user', // يمكنك تغيير هذا إذا كان لديك نظام مستخدمين
          createdAt: new Date().toISOString(), // تاريخ إنشاء العادة
          currentStreak: 0, // قيمة ابتدائية للسلسلة الحالية
          bestStreak: 0,    // قيمة ابتدائية لأفضل سلسلة
          icon: habitData.icon || 'star', // قيمة افتراضية للأيقونة إذا لم تحدد
          reminders: habitData.reminders || [], // التأكد من وجود مصفوفة التذكيرات
          links: habitData.links || [], // التأكد من وجود مصفوفة الروابط
        }]
      })),
      
      // تحديث عادة موجودة بـ ID معين
      updateHabit: (id, updates) => set((state) => {
        let habitToRecalculate: Habit | undefined; // لتتبع العادة التي تحتاج لإعادة حساب السلاسل
        const newHabits = state.habits.map((habit) => {
          if (habit.id === id) {
            const updatedHabit = { ...habit, ...updates };
            // إذا تغيرت خصائص الجدولة (التكرار، تاريخ البدء، تاريخ الانتهاء)
            // أو الملاحظات/الروابط (لضمان تحديثها في الكائن)
            if (updates.frequency || updates.startDate || updates.endDate || updates.links || updates.reminders) {
                habitToRecalculate = updatedHabit; // نحدد هذه العادة لإعادة حساب السلاسل
            }
            return updatedHabit;
          }
          return habit;
        });

        // إذا كانت هناك عادة تحتاج لإعادة حساب السلاسل، نقوم بذلك هنا بعد تحديث خصائصها
        if (habitToRecalculate) {
            const streaks = calculateStreaks(habitToRecalculate, state.habitLogs);
            return {
                habits: newHabits.map(h => h.id === id ? {...h, ...streaks} : h) // نحدث السلاسل في كائن العادة مباشرة
            }
        }

        return { habits: newHabits }; // إذا لم تتغير خصائص الجدولة، نرجع العادات المحدثة فقط
      }),
      
      // أرشفة عادة (تجعلها غير نشطة دون حذف)
      archiveHabit: (id) => set((state) => ({
        habits: state.habits.map((habit) =>
          habit.id === id ? { ...habit, archivedAt: new Date().toISOString() } : habit
        )
      })),
      
      // حذف عادة وسجلاتها المرتبطة بشكل دائم
      deleteHabit: (id) => set((state) => ({
        habits: state.habits.filter((habit) => habit.id !== id),
        habitLogs: state.habitLogs.filter((log) => log.habitId !== id) // حذف السجلات المرتبطة أيضاً
      })),
      
      /**
       * تبديل حالة إنجاز العادة ليوم معين.
       * هذه هي الدالة الأساسية التي تؤثر على حساب السلاسل.
       * @param habitId معرف العادة.
       * @param date تاريخ اليوم (بتنسيق YYYY-MM-DD).
       * @param completed هل تم إنجازها (true) أم تم إلغاء إنجازها (false)؟
       */
      toggleHabitCompletion: (habitId, date, completed) => set((state) => {
        let newHabitLogs = [...state.habitLogs];
        const logIndex = newHabitLogs.findIndex(log => log.habitId === habitId && log.date === date);

        if (logIndex > -1) {
          // إذا كان هناك سجل إنجاز موجود لهذا اليوم وللعادة
          if (!completed) {
            // إذا كان المستخدم يلغي الإكمال:
            // نزيل السجل بالكامل إذا لم يكن به ملاحظات (لتجنب سجلات "إنجاز غير مكتمل" فارغة)
            if (!newHabitLogs[logIndex].notes) {
              newHabitLogs.splice(logIndex, 1);
            } else {
              // إذا كان به ملاحظات، فقط نغير حالة الإكمال إلى False
              newHabitLogs[logIndex] = { ...newHabitLogs[logIndex], completed: false };
            }
          } else {
            // إذا كان المستخدم يؤكد الإكمال، نغير حالة السجل الموجود إلى True
            newHabitLogs[logIndex] = { ...newHabitLogs[logIndex], completed: true };
          }
        } else if (completed) {
          // إذا لم يكن هناك سجل أصلاً وقام المستخدم بتأكيد الإكمال، نضيف سجل جديد
          newHabitLogs.push({
            id: uuidv4(), // ID فريد لسجل الإنجاز
            habitId, 
            userId: 'current-user', 
            date,
            completed: true, 
            createdAt: new Date().toISOString()
          });
        }
        
        // === الخطوة الأهم: بعد تحديث سجلات الإنجاز، نعيد حساب السلاسل للعادة المتأثرة ===
        const habitToUpdate = state.habits.find(h => h.id === habitId);
        if (!habitToUpdate) return { habitLogs: newHabitLogs }; // حالة نادرة إذا لم يتم العثور على العادة

        const newStreaks = calculateStreaks(habitToUpdate, newHabitLogs);

        // نحدث السلاسل (currentStreak و bestStreak) في كائن العادة مباشرةً في الـ state
        const updatedHabits = state.habits.map(h => 
          h.id === habitId 
            ? { ...h, ...newStreaks } // نستخدم قيم السلاسل الجديدة
            : h
        );

        return {
          habits: updatedHabits, // نرجع قائمة العادات المحدثة
          habitLogs: newHabitLogs, // نرجع قائمة سجلات الإنجاز المحدثة
        };
      }),
      
      // إضافة أو تحديث ملاحظة لعادة في يوم معين
      addHabitNote: (habitId, date, notes) => set((state) => {
        const existingLog = state.habitLogs.find(log => log.habitId === habitId && log.date === date);
        
        if (existingLog) {
          return {
            habitLogs: state.habitLogs.map(log => 
              log.id === existingLog.id ? { ...log, notes } : log
            )
          };
        }
        
        // إذا لم يكن هناك سجل، نضيف سجل جديد مع الملاحظة (وحالة إكمال False افتراضياً)
        return {
          habitLogs: [...state.habitLogs, {
            id: uuidv4(), habitId, userId: 'current-user', date, completed: false, notes, createdAt: new Date().toISOString()
          }]
        };
      }),
      
      /**
       * الحصول على العادات المجدولة ليوم معين.
       * هذه الدالة الآن تستخدم isScheduled() الجديدة وتحسب السلاسل للتاريخ المحدد.
       * @param dateStr تاريخ اليوم المطلوب (بتنسيق YYYY-MM-DD).
       * @returns {Array<{ habit: Habit; completed: boolean; }>} قائمة بالعادات المجدولة لليوم وحالة إنجازها.
       */
      getHabitsForDate: (dateStr) => {
        const { habits, habitLogs } = get();
        const targetDate = startOfDay(parseISO(dateStr));

        return habits
          .filter(habit => !habit.archivedAt && isScheduled(habit, targetDate))
          .map((habit) => {
            // البحث عن سجل الإنجاز لهذه العادة في هذا اليوم المحدد
            const log = habitLogs.find(
              (log) => log.habitId === habit.id && isSameDay(parseISO(log.date), targetDate)
            );
            
            // حساب السلاسل للتاريخ المحدد
            const streaksForDate = calculateStreaksForDate(habit, habitLogs, targetDate);
            
            return {
              habit: {
                ...habit,
                currentStreak: streaksForDate.currentStreak,
                bestStreak: streaksForDate.bestStreak
              }, // كائن العادة مع السلاسل المحسوبة للتاريخ المحدد
              completed: log?.completed || false, // حالة الإكمال لهذا اليوم
            };
          });
      },

      /**
       * الحصول على إحصائيات مفصلة لعادة معينة.
       * هذه الدالة تُستخدم عادة في مكونات الإحصائيات (مثل HabitStats.tsx).
       * تعتمد على الـ `currentStreak` و `bestStreak` المخزنين بالفعل.
       * @param habitId معرف العادة.
       * @returns {HabitStats} كائن الإحصائيات.
       */
      getHabitStats: (habitId) => {
        const { habits, habitLogs } = get();
        const habit = habits.find((h) => h.id === habitId);
        
        // إذا لم يتم العثور على العادة، نرجع قيم افتراضية
        if (!habit) return {
          completionRate: 0, totalCompletions: 0,
          streak: { current: 0, longest: 0 },
          weeklyProgress: { completed: 0, total: 0, previousWeek: 0 }
        };

        // حساب إجمالي مرات الإنجاز (ضمن نطاق تاريخ البدء)
        const totalCompletions = habitLogs
            .filter(log => log.habitId === habit.id && log.completed && !isBefore(parseISO(log.date), parseISO(habit.startDate)))
            .length;
        
        // ملاحظة: حساب completionRate و weeklyProgress بشكل دقيق يتطلب منطقاً إضافياً
        // لحساب "إجمالي الأيام التي كان يجب إنجاز العادة فيها" ضمن فترة معينة.
        // تم تركها بقيم مبسطة هنا، ويمكن تطويرها لاحقاً إذا لزم الأمر.
        return {
            completionRate: 0, // يمكن تطويرها لحساب النسبة المئوية للإنجاز
            totalCompletions: totalCompletions,
            streak: { 
                current: habit.currentStreak, // نستخدم القيمة المخزنة مباشرة
                longest: habit.bestStreak,    // نستخدم القيمة المخزنة مباشرة
                // البحث عن آخر تاريخ إكمال (للعرض فقط)
                lastCompleted: habitLogs.filter(log => log.habitId === habit.id && log.completed).sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())[0]?.date
            },
            weeklyProgress: { completed: 0, total: 0, previousWeek: 0 } // يمكن تطويرها لحساب التقدم الأسبوعي
        };
      },
      
      /**
       * الحصول على التقدم الأسبوعي العام لجميع العادات.
       * @returns { achieved: number; total: number; improvement: number; }
       */
      getWeeklyProgress: () => {
        const { habits, habitLogs } = get();
        const now = new Date();
        const weekStart = startOfDay(subDays(now, getDay(now))); // بداية الأسبوع (الأحد)
        const weekEnd = addDays(weekStart, 6); // نهاية الأسبوع (السبت)
        
        let thisWeekCompletedCount = 0;
        let thisWeekScheduledCount = 0;

        habits.forEach(habit => {
            if (habit.archivedAt) return; // تجاهل العادات المؤرشفة

            let currentDay = startOfDay(weekStart);
            while (isBefore(currentDay, addDays(weekEnd, 1))) { // المرور على كل أيام الأسبوع
                // إذا كانت العادة مجدولة في هذا اليوم من الأسبوع الحالي
                if (isScheduled(habit, currentDay)) {
                    thisWeekScheduledCount++;
                    const log = habitLogs.find(l => l.habitId === habit.id && isSameDay(parseISO(l.date), currentDay));
                    if (log?.completed) {
                        thisWeekCompletedCount++;
                    }
                }
                currentDay = addDays(currentDay, 1);
            }
        });

        // ملاحظة: لحساب Improvement بشكل دقيق، ستحتاج لمنطق لحساب الأسبوع السابق أيضاً
        return {
            achieved: thisWeekScheduledCount > 0 ? (thisWeekCompletedCount / thisWeekScheduledCount) * 100 : 0,
            total: thisWeekScheduledCount,
            improvement: 0 // يمكن تطويرها لحساب نسبة التحسن من الأسبوع السابق
        };
      },

      /**
       * دالة لمسح جميع بيانات العادات وسجلاتها.
       * مفيدة جداً لأغراض الاختبار والتطوير.
       */
      clearAllData: () => set({ habits: [], habitLogs: [] }),
    }),
    {
      name: 'habits-storage', // اسم المفتاح الذي سيتم تخزين البيانات تحته في Local Storage
      storage: createJSONStorage(() => localStorage), // استخدام Local Storage للتخزين
      
      // هذا الجزء يتم تشغيله عند أول تحميل للمتجر أو عند إعادة تحميل الصفحة.
      // يضمن أن يتم إعادة حساب جميع السلاسل لمرة واحدة بعد جلب البيانات من التخزين،
      // وهذا يفيد في حال كانت البيانات قديمة أو تم تغيير منطق الحسابات.
      onRehydrateStorage: () => (state) => {
        if (state) {
          // إعادة حساب السلاسل لكل عادة وتحديث كائن العادة بها
          const updatedHabits = state.habits.map(habit => {
            const streaks = calculateStreaks(habit, state.habitLogs);
            return { ...habit, ...streaks };
          });
          state.habits = updatedHabits;
        }
      },
    }
  )
);
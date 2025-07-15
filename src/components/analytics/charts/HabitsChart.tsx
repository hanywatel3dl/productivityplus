import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Info } from 'lucide-react';  // تغيير الأيقونة من ListChecks إلى BarChart3
import { format, eachDayOfInterval, isAfter, parseISO, isBefore } from 'date-fns';
import { ar } from 'date-fns/locale';
import { createChart, ColorType, LineStyle, CrosshairMode } from 'lightweight-charts';
import { useHabitStore } from '../../../store/habitStore';

interface HabitsChartProps {
  dateRange: { start: Date; end: Date };
  timeRange: 'day' | 'week' | 'month' | 'year';
}

export const HabitsChart = ({ dateRange, timeRange }: HabitsChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const [hoveredValue, setHoveredValue] = useState<{ 
    time: string; 
    completed: number;
    total: number;
    completionRate: number;
  } | null>(null);

  const { habits, habitLogs } = useHabitStore();
  
  // فلترة العادات النشطة فقط وتجاهل العادات المؤرشفة
  const activeHabits = habits.filter(habit => {
    // تحقق من أن العادة غير مؤرشفة وأن تاريخ البداية قبل أو يساوي تاريخ النهاية المحدد
    return !habit.archivedAt && 
           (!habit.startDate || !isAfter(parseISO(habit.startDate), dateRange.end));
  });

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // تنظيف الرسم البياني السابق
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    try {
      // إنشاء رسم بياني جديد
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: 'rgba(45, 27, 105, 0.3)' },
          textColor: '#B4A5D0',
          fontFamily: 'Tajawal, sans-serif',
        },
        grid: {
          vertLines: { color: 'rgba(45, 27, 105, 0.5)', style: LineStyle.Dotted },
          horzLines: { color: 'rgba(45, 27, 105, 0.5)', style: LineStyle.Dotted },
        },
        rightPriceScale: {
          borderColor: 'rgba(45, 27, 105, 0.5)',
          visible: true,
        },
        timeScale: {
          borderColor: 'rgba(45, 27, 105, 0.5)',
          timeVisible: true,
          secondsVisible: false,
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: {
            color: 'rgba(255, 160, 0, 0.5)',
            width: 1,
            style: LineStyle.Solid,
          },
          horzLine: {
            color: 'rgba(255, 160, 0, 0.5)',
            width: 1,
            style: LineStyle.Solid,
          },
        },
        localization: {
          locale: 'ar-SA',
        },
      });

      chartRef.current = chart;

      // حساب إحصائيات يومية
      const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
      const dailyStats = days.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        
        // فلترة العادات المتاحة لهذا اليوم
        const availableHabits = activeHabits.filter(habit => {
          // تحقق من أن تاريخ بداية العادة قبل أو يساوي هذا اليوم
          return !habit.startDate || !isAfter(parseISO(habit.startDate), day);
        });

        // فلترة السجلات لهذا اليوم
        const logsForDay = habitLogs ? habitLogs.filter(log => {
          const logDate = log?.date;
          // تأكد من وجود البيانات
          if (!log || !logDate) return false;
          
          const habitExists = availableHabits.some(h => h.id === log.habitId);
          return logDate === dateStr && habitExists;
        }) : [];

        const totalPossible = availableHabits.length;
        const completed = logsForDay.filter(log => log && log.completed).length;
        const completionRate = totalPossible > 0 ? (completed / totalPossible) * 100 : 0;

        return {
          time: dateStr,
          completed,
          total: totalPossible,
          completionRate,
        };
      });

      // إنشاء سلسلة المساحة لنسبة الإكمال
      const areaSeries = chart.addAreaSeries({
        topColor: 'rgba(255, 160, 0, 0.4)',
        bottomColor: 'rgba(255, 160, 0, 0.0)',
        lineColor: '#FFA000',
        lineWidth: 2,
        priceScaleId: 'right',
        title: 'نسبة إكمال العادات',
      });

      areaSeries.setData(dailyStats.map(stat => ({
        time: stat.time,
        value: stat.completionRate,
      })));

      // إنشاء سلسلة الأعمدة لعدد العادات المكتملة
      const histogramSeries = chart.addHistogramSeries({
        color: '#4FD1C5',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: 'right',
        title: 'عدد العادات المكتملة',
      });

      histogramSeries.setData(dailyStats.map(stat => ({
        time: stat.time,
        value: stat.completed,
        color: stat.completed > 0 ? '#4FD1C5' : undefined,
      })));

      chart.timeScale().fitContent();

      // معالجة حركة المؤشر
      chart.subscribeCrosshairMove((param) => {
        if (
          param.point === undefined ||
          !param.time ||
          param.point.x < 0 ||
          param.point.y < 0
        ) {
          setHoveredValue(null);
          return;
        }

        const data = dailyStats.find(item => item.time === param.time);
        if (data) {
          setHoveredValue(data);
        }
      });

      // معالجة تغيير الحجم
      const handleResize = () => {
        if (chartRef.current && chartContainerRef.current) {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
          });
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        if (chartRef.current) {
          chartRef.current.remove();
          chartRef.current = null;
        }
      };
    } catch (error) {
      console.error('Error creating habits chart:', error);
      // يمكن إضافة معالجة الأخطاء هنا
    }
  }, [activeHabits, habitLogs, dateRange, timeRange]);

  // حساب الإحصائيات الإجمالية - مع التحقق من وجود البيانات
  const totalLogs = habitLogs ? habitLogs.filter(log => {
    if (!log || !log.date) return false;
    const habit = activeHabits.find(h => h.id === log.habitId);
    return habit && (!habit.startDate || !isBefore(parseISO(log.date), parseISO(habit.startDate)));
  }).length : 0;
  
  const completedLogs = habitLogs ? habitLogs.filter(log => {
    if (!log || !log.date) return false;
    const habit = activeHabits.find(h => h.id === log.habitId);
    return habit && log.completed && (!habit.startDate || !isBefore(parseISO(log.date), parseISO(habit.startDate)));
  }).length : 0;
  
  const completionRate = totalLogs > 0 ? Math.round((completedLogs / totalLogs) * 100) : 0;

  // حساب إحصائيات العادات المحددة - مع التحقق من وجود البيانات
  const habitStats = activeHabits.map(habit => {
    const habitSpecificLogs = habitLogs ? habitLogs.filter(log => {
      if (!log || !log.date) return false;
      return log.habitId === habit.id && 
             (!habit.startDate || !isBefore(parseISO(log.date), parseISO(habit.startDate)));
    }) : [];
    
    const completed = habitSpecificLogs.filter(log => log && log.completed).length;
    const total = habitSpecificLogs.length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      habit,
      completed,
      total,
      rate,
    };
  }).sort((a, b) => b.rate - a.rate);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#2D1B69]/30 backdrop-blur-lg rounded-xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-amber-400" /> {/* تغيير الأيقونة من ListChecks إلى BarChart3 */}
          <h3 className="text-lg font-bold text-white">تحليل العادات</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#1A0F3C]/50 rounded-lg p-4 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-amber-400">{activeHabits.length}</div>
          <div className="text-sm text-purple-300">العادات النشطة</div>
        </div>
        <div className="bg-[#1A0F3C]/50 rounded-lg p-4 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-amber-400">{completedLogs}</div>
          <div className="text-sm text-purple-300">إجمالي الإكمال</div>
        </div>
        <div className="bg-[#1A0F3C]/50 rounded-lg p-4 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-amber-400">{completionRate}%</div>
          <div className="text-sm text-purple-300">متوسط الإكمال</div>
        </div>
      </div>

      <div className="relative">
        <div ref={chartContainerRef} className="w-full h-[300px]" />

        {hoveredValue && (
          <div className="absolute top-2 left-2 bg-[#1A0F3C] p-3 rounded-lg shadow-lg border border-purple-500/20 z-10">
            <div className="text-white font-bold">
              {format(new Date(hoveredValue.time), 'EEEE dd MMMM yyyy', { locale: ar })}
            </div>
            <div className="text-amber-400">
              {hoveredValue.completed} من {hoveredValue.total} عادات مكتملة
            </div>
            <div className="text-teal-400">
              {Math.round(hoveredValue.completionRate)}% نسبة الإكمال
            </div>
          </div>
        )}
      </div>

      {/* إحصائيات العادات المحددة */}
      <div className="mt-6 space-y-3">
        {habitStats.map(({ habit, completed, total, rate }) => (
          <div
            key={habit.id}
            className="bg-[#1A0F3C]/50 rounded-lg p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: habit.color }}
                ></div>
                <span className="text-white">{habit.name}</span>
              </div>
              <span className="text-amber-400 font-bold">{rate}%</span>
            </div>
            <div className="w-full h-1 bg-[#2D1B69] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${rate}%` }}
                className="h-full"
                style={{ backgroundColor: habit.color }}
                transition={{ duration: 1 }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-purple-300">
              <span>{completed} مكتملة</span>
              <span>{total} إجمالي</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-start gap-2 text-sm text-purple-300">
        <Info className="w-4 h-4 flex-shrink-0 mt-1" />
        <p>
          يوضح هذا المخطط نسبة إكمال العادات (المنطقة الكهرمانية) وعدد العادات المكتملة (الأعمدة الخضراء) لكل يوم.
          يمكنك تمرير المؤشر فوق المخطط لرؤية تفاصيل كل يوم.
        </p>
      </div>
    </motion.div>
  );
};
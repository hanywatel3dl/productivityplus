// --- START OF FILE PrayerChart.tsx ---

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Info } from 'lucide-react';
import { format, eachDayOfInterval } from 'date-fns';
import { ar } from 'date-fns/locale';
import { createChart, ColorType, LineStyle, CrosshairMode } from 'lightweight-charts';

interface PrayerChartProps {
  prayers: Array<{ name: string; date: string; completed: boolean }>;
  dateRange: { start: Date; end: Date };
  timeRange: 'day' | 'week' | 'month' | 'year';
}

export const PrayerChart = ({ prayers, dateRange, timeRange }: PrayerChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const [hoveredValue, setHoveredValue] = useState<{ time: string; value: number; total: number } | null>(null);
  
  useEffect(() => {
    if (!chartContainerRef.current) return;
    
    // Clear previous chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }
    
    // Create chart
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
      },
      localization: {
        locale: 'ar-SA',
      },
    });
    
    chartRef.current = chart;
    
    // --- ✨ الخوارزمية الجديدة والصحيحة لتجميع البيانات ✨ ---
    // الخطوة 1: تجميع الصلوات حسب "يوم الصلاة" الشرعي (prayer.date)
    const groupedByIslamicDay = prayers.reduce((acc, prayer) => {
      const date = prayer.date;
      if (!acc[date]) {
        acc[date] = { completed: 0, total: 0 };
      }
      acc[date].total++;
      if (prayer.completed) {
        acc[date].completed++;
      }
      return acc;
    }, {} as Record<string, { completed: number; total: number }>);
    
    // الخطوة 2: إنشاء بيانات المخطط لكل يوم في النطاق الزمني المحدد
    const daysInRange = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    const chartData = daysInRange.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dataForDay = groupedByIslamicDay[dateStr] || { completed: 0, total: 0 };
      const completedPrayers = dataForDay.completed;
      
      return {
        time: dateStr,
        value: completedPrayers,
        totalPrayers: dataForDay.total,
        color: completedPrayers === 5 ? '#4FD1C5' : // 5 is the goal
               completedPrayers >= 3 ? '#FFA000' : 
               completedPrayers > 0 ? '#F59E0B' : '#6D28D9',
      };
    });
    
    // إنشاء سلسلة البيانات في المخطط
    const histogramSeries = chart.addHistogramSeries({
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'right',
      title: 'الصلوات المكتملة',
    });
    
    histogramSeries.setData(chartData);
    
    // إضافة خط الهدف
    const targetLine = chart.addLineSeries({
      color: '#4FD1C5',
      lineWidth: 2,
      priceScaleId: 'right',
      title: 'الهدف (5 صلوات)',
      lastValueVisible: false,
      lineStyle: LineStyle.Dashed,
    });
    
    targetLine.setData(daysInRange.map(day => ({
      time: format(day, 'yyyy-MM-dd'),
      value: 5,
    })));
    
    chart.timeScale().fitContent();
    
    chart.subscribeCrosshairMove((param) => {
      if (!param.point || !param.time) {
        setHoveredValue(null);
        return;
      }
      const data = chartData.find(item => item.time === param.time);
      if (data) {
        setHoveredValue({
          time: data.time,
          value: data.value,
          total: 5, // الهدف اليومي دائمًا 5
        });
      }
    });
    
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
  }, [prayers, dateRange, timeRange]);
  
  // الإحصائيات العامة (لا تحتاج لتغيير لأنها تعمل على البيانات الخام)
  const totalPrayersInPeriod = prayers.length;
  const completedPrayersInPeriod = prayers.filter(prayer => prayer.completed).length;
  const completionRate = Math.round((completedPrayersInPeriod / Math.max(1, totalPrayersInPeriod)) * 100);
  
  const prayerNames = ['الفجر', 'الظهر', 'العصر', 'المغرب', 'العشاء'];
  const prayerStats = prayerNames.map(name => {
    const prayersOfType = prayers.filter(prayer => prayer.name === name);
    const completedOfType = prayersOfType.filter(prayer => prayer.completed).length;
    const completionRateOfType = Math.round((completedOfType / Math.max(1, prayersOfType.length)) * 100);
    
    return { name, completed: completedOfType, total: prayersOfType.length, rate: completionRateOfType };
  });
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#2D1B69]/30 backdrop-blur-lg rounded-xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Clock className="w-6 h-6 text-amber-400" />
          <h3 className="text-lg font-bold text-white">تحليل الصلوات</h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-amber-400 rounded-full"></div>
            <span className="text-sm text-purple-300">الصلوات المكتملة</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-teal-400 rounded-full"></div>
            <span className="text-sm text-purple-300">الهدف (5 صلوات)</span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#1A0F3C]/50 rounded-lg p-4 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-amber-400">{completedPrayersInPeriod}</div>
          <div className="text-sm text-purple-300">إجمالي الصلوات المكتملة</div>
        </div>
        <div className="bg-[#1A0F3C]/50 rounded-lg p-4 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-amber-400">{totalPrayersInPeriod}</div>
          <div className="text-sm text-purple-300">إجمالي الصلوات المطلوبة</div>
        </div>
        <div className="bg-[#1A0F3C]/50 rounded-lg p-4 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-amber-400">{completionRate}%</div>
          <div className="text-sm text-purple-300">نسبة الإكمال</div>
        </div>
      </div>
      
      <div className="relative">
        <div ref={chartContainerRef} className="w-full h-[300px]" />
        
        {hoveredValue && (
          <div className="absolute top-2 left-2 bg-[#1A0F3C] p-3 rounded-lg shadow-lg border border-purple-500/20 z-10 pointer-events-none">
            <div className="text-white font-bold">
              {format(new Date(hoveredValue.time + 'T00:00:00'), 'EEEE, dd MMMM yyyy', { locale: ar })}
            </div>
            <div className="text-amber-400">
              {hoveredValue.value} من {hoveredValue.total} صلوات مكتملة
            </div>
            <div className="text-purple-300 text-sm">
              {Math.round((hoveredValue.value / Math.max(1, hoveredValue.total)) * 100)}% من الهدف اليومي
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-6 grid grid-cols-5 gap-2">
        {prayerStats.map(stat => (
          <div key={stat.name} className="bg-[#1A0F3C]/50 rounded-lg p-3 text-center">
            <div className="text-white font-bold mb-1">{stat.name}</div>
            <div className="text-amber-400 text-sm">{stat.rate}%</div>
            <div className="w-full h-1 bg-[#2D1B69] rounded-full overflow-hidden mt-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${stat.rate}%` }}
                className="h-full bg-amber-400"
                transition={{ duration: 1 }}
              />
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 flex items-start gap-2 text-sm text-purple-300">
        <Info className="w-4 h-4 flex-shrink-0 mt-1" />
        <p>
          يوضح هذا المخطط عدد الصلوات المكتملة لكل يوم ضمن النطاق المحدد. الخط المتقطع يمثل الهدف اليومي.
        </p>
      </div>
    </motion.div>
  );
};
// --- END OF FILE PrayerChart.tsx ---
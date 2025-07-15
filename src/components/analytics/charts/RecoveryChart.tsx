import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Info } from 'lucide-react';
import { format, eachDayOfInterval, isSameDay } from 'date-fns';
import { ar } from 'date-fns/locale';
import { createChart, ColorType, LineStyle, CrosshairMode } from 'lightweight-charts';

interface RecoveryChartProps {
  calendar: Array<{ 
    date: string; 
    completed: boolean;
    prayers: number;
    tasks: number;
    quranPages: number[];
  }>;
  dateRange: { start: Date; end: Date };
  timeRange: 'day' | 'week' | 'month' | 'year';
}

export const RecoveryChart = ({ calendar, dateRange, timeRange }: RecoveryChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const [hoveredValue, setHoveredValue] = useState<{ time: string; value: number } | null>(null);
  
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
    
    // Prepare data
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    
    // Calculate streak data
    let currentStreak = 0;
    const streakData = days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayRecord = calendar.find(d => d.date === dateStr);
      
      if (dayRecord?.completed) {
        currentStreak += 1;
      } else {
        currentStreak = 0;
      }
      
      return {
        time: dateStr,
        value: currentStreak,
        completed: dayRecord?.completed || false,
      };
    });
    
    // Create line series for streak
    const lineSeries = chart.addLineSeries({
      color: '#FFA000',
      lineWidth: 2,
      priceScaleId: 'right',
      title: 'أيام التعافي المتتالية',
      lastValueVisible: true,
    });
    
    lineSeries.setData(streakData);
    
    // Add markers for completed days
    const markers = streakData
      .filter(day => day.completed)
      .map(day => ({
        time: day.time,
        position: 'aboveBar',
        color: '#FFA000',
        shape: 'circle',
        size: 1,
      }));
    
    lineSeries.setMarkers(markers);
    
    // Fit content
    chart.timeScale().fitContent();
    
    // Subscribe to crosshair move
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
      
      const data = streakData.find(item => item.time === param.time);
      if (data) {
        setHoveredValue({
          time: data.time,
          value: data.value,
        });
      }
    });
    
    // Handle resize
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
  }, [calendar, dateRange, timeRange]);
  
  // Calculate statistics
  const completedDays = calendar.filter(day => day.completed).length;
  const totalDays = eachDayOfInterval({ start: dateRange.start, end: dateRange.end }).length;
  const completionRate = Math.round((completedDays / Math.max(1, totalDays)) * 100);
  
  // Find current streak
  let currentStreak = 0;
  let maxStreak = 0;
  
  // Sort calendar by date
  const sortedCalendar = [...calendar].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  // Calculate current and max streaks
  for (let i = 0; i < sortedCalendar.length; i++) {
    if (sortedCalendar[i].completed) {
      currentStreak += 1;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#2D1B69]/30 backdrop-blur-lg rounded-xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-amber-400" />
          <h3 className="text-lg font-bold text-white">تحليل التعافي</h3>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#1A0F3C]/50 rounded-lg p-4 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-amber-400">{completedDays}</div>
          <div className="text-sm text-purple-300">أيام التعافي المكتملة</div>
        </div>
        <div className="bg-[#1A0F3C]/50 rounded-lg p-4 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-amber-400">{maxStreak}</div>
          <div className="text-sm text-purple-300">أطول سلسلة أيام متتالية</div>
        </div>
        <div className="bg-[#1A0F3C]/50 rounded-lg p-4 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-amber-400">{completionRate}%</div>
          <div className="text-sm text-purple-300">نسبة الالتزام</div>
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
              {hoveredValue.value} {hoveredValue.value === 1 ? 'يوم متتالي' : 'أيام متتالية'}
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-4 flex items-start gap-2 text-sm text-purple-300">
        <Info className="w-4 h-4 flex-shrink-0 mt-1" />
        <p>
          يوضح هذا المخطط الخطي عدد أيام التعافي المتتالية. كلما زاد الخط، كلما كانت سلسلة الأيام المتتالية أطول.
          النقاط الصفراء تشير إلى الأيام المكتملة.
        </p>
      </div>
    </motion.div>
  );
};
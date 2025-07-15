import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Timer, Info } from 'lucide-react';
import { format, differenceInDays, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { createChart, ColorType, LineStyle, CrosshairMode } from 'lightweight-charts';
import { FocusSession } from '../../../types';

interface ProductivityChartProps {
  focusSessions: FocusSession[]; // Expects 1-minute segments
  dateRange: { start: Date; end: Date };
  timeRange: 'day' | 'week' | 'month' | 'year';
}

export const ProductivityChart = ({ focusSessions, dateRange, timeRange }: ProductivityChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const [hoveredValue, setHoveredValue] = useState<{ time: string; value: number } | null>(null);
  
  useEffect(() => {
    if (!chartContainerRef.current) return;
    
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }
    
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
        vertLine: { color: 'rgba(255, 160, 0, 0.5)', width: 1, style: LineStyle.Solid },
        horzLine: { color: 'rgba(255, 160, 0, 0.5)', width: 1, style: LineStyle.Solid },
      },
      localization: { locale: 'ar-SA' },
    });
    
    chartRef.current = chart;
    
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    
    const dailyProductivity = days.map(day => {
      // Filter sessions whose startTime falls on this 'day'
      const sessionsForDay = focusSessions.filter(session => 
        isSameDay(parseISO(session.startTime), day)
      );
      
      // Since each session.duration is 1 (minute), sum of durations is just the count of sessions.
      const totalMinutes = sessionsForDay.reduce((total, session) => total + session.duration, 0);
      
      return {
        time: format(day, 'yyyy-MM-dd'),
        value: totalMinutes, // Total minutes focused on this day
        color: totalMinutes > 0 ? '#FFA000' : undefined,
      };
    });
    
    const histogramSeries = chart.addHistogramSeries({ // Renamed from waterfallSeries for clarity
      color: '#FFA000',
      priceFormat: { type: 'volume' },
      priceScaleId: 'right',
      title: 'دقائق التركيز',
    });
    
    histogramSeries.setData(dailyProductivity);
    
    let cumulativeMinutes = 0;
    const cumulativeData = dailyProductivity.map(item => {
      cumulativeMinutes += item.value;
      return { time: item.time, value: cumulativeMinutes };
    });
    
    const lineSeries = chart.addLineSeries({
      color: '#4FD1C5',
      lineWidth: 2,
      priceScaleId: 'right',
      title: 'إجمالي دقائق التركيز',
      lastValueVisible: false,
    });
    
    lineSeries.setData(cumulativeData);
    
    chart.timeScale().fitContent();
    
    chart.subscribeCrosshairMove((param) => {
      if (param.point === undefined || !param.time || param.point.x < 0 || param.point.y < 0) {
        setHoveredValue(null);
        return;
      }
      const data = dailyProductivity.find(item => item.time === param.time);
      if (data) setHoveredValue({ time: data.time, value: data.value });
    });
    
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }
    };
  }, [focusSessions, dateRange, timeRange]);
  
  const totalFocusedMinutes = focusSessions.reduce((total, session) => total + session.duration, 0);
  
  const completedPomodoroSessionIds = new Set<string>();
  focusSessions.forEach(session => {
    if (session.isCompletedPomodoro) {
      completedPomodoroSessionIds.add(session.pomodoroSessionId);
    }
  });
  const totalCompletedPomodoros = completedPomodoroSessionIds.size;

  const numDaysInRange = Math.max(1, differenceInDays(dateRange.end, dateRange.start) + 1);
  const averageMinutesPerDay = Math.round(totalFocusedMinutes / numDaysInRange);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#2D1B69]/30 backdrop-blur-lg rounded-xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Timer className="w-6 h-6 text-amber-400" />
          <h3 className="text-lg font-bold text-white">تحليل الإنتاجية</h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-amber-400 rounded-full"></div><span className="text-sm text-purple-300">دقائق التركيز</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-teal-400 rounded-full"></div><span className="text-sm text-purple-300">الإجمالي التراكمي</span></div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#1A0F3C]/50 rounded-lg p-4 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-amber-400">{totalFocusedMinutes}</div>
          <div className="text-sm text-purple-300">إجمالي دقائق التركيز</div>
        </div>
        <div className="bg-[#1A0F3C]/50 rounded-lg p-4 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-amber-400">{totalCompletedPomodoros}</div>
          <div className="text-sm text-purple-300">جلسات بومودورو مكتملة</div>
        </div>
        <div className="bg-[#1A0F3C]/50 rounded-lg p-4 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-amber-400">{averageMinutesPerDay}</div>
          <div className="text-sm text-purple-300">متوسط دقائق التركيز اليومية</div>
        </div>
      </div>
      
      <div className="relative">
        <div ref={chartContainerRef} className="w-full h-[300px]" />
        {hoveredValue && (
          <div className="absolute top-2 left-2 bg-[#1A0F3C] p-3 rounded-lg shadow-lg border border-purple-500/20 z-10">
            <div className="text-white font-bold">{format(parseISO(hoveredValue.time), 'EEEE dd MMMM yyyy', { locale: ar })}</div>
            <div className="text-amber-400">{hoveredValue.value} دقيقة من التركيز</div>
          </div>
        )}
      </div>
      
      <div className="mt-4 flex items-start gap-2 text-sm text-purple-300">
        <Info className="w-4 h-4 flex-shrink-0 mt-1" />
        <p>يوضح هذا المخطط دقائق التركيز اليومية (أعمدة كهرمانية) والإجمالي التراكمي (خط أزرق مخضر). تمثل كل دقيقة تركيز وحدة واحدة.</p>
      </div>
    </motion.div>
  );
};
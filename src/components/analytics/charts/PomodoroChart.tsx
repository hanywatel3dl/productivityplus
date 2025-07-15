import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Timer, Info } from 'lucide-react';
import { format, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { createChart, ColorType, LineStyle, CrosshairMode } from 'lightweight-charts';
import { FocusSession } from '../../../types';

interface PomodoroChartProps {
  focusSessions: FocusSession[]; // Expects 1-minute segments
  dateRange: { start: Date; end: Date };
  timeRange: 'day' | 'week' | 'month' | 'year';
}

export const PomodoroChart = ({ focusSessions, dateRange, timeRange }: PomodoroChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const [hoveredValue, setHoveredValue] = useState<{ 
    time: string; 
    completedPomodoros: number; 
    totalFocusedDuration: number;
  } | null>(null);
  
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
    
    const dailyStats = days.map(day => {
      const sessionsForDay = focusSessions.filter(session => 
        isSameDay(parseISO(session.startTime), day)
      );
      
      const completedPomodoroIdsOnDay = new Set<string>();
      sessionsForDay.forEach(s => {
        if (s.isCompletedPomodoro) {
          completedPomodoroIdsOnDay.add(s.pomodoroSessionId);
        }
      });
      const completedPomodorosCount = completedPomodoroIdsOnDay.size;
      const totalFocusedDuration = sessionsForDay.reduce((sum, s) => sum + s.duration, 0); // Sum of 1-min segments
      
      return {
        time: format(day, 'yyyy-MM-dd'),
        value: completedPomodorosCount, // For histogram: number of completed Pomodoros
        duration: totalFocusedDuration, // For line: total focused minutes
      };
    });
    
    const pomodoroCountSeries = chart.addHistogramSeries({
      color: '#FFA000',
      priceFormat: { type: 'volume' },
      priceScaleId: 'right',
      title: 'عدد البومودورو المكتمل',
    });
    pomodoroCountSeries.setData(dailyStats.map(item => ({
      time: item.time,
      value: item.value,
      color: item.value > 0 ? '#FFA000' : undefined,
    })));
    
    const focusedDurationSeries = chart.addLineSeries({
      color: '#4FD1C5',
      lineWidth: 2,
      priceScaleId: 'right',
      title: 'إجمالي دقائق التركيز',
      lastValueVisible: false,
    });
    focusedDurationSeries.setData(dailyStats.map(item => ({
      time: item.time,
      value: item.duration,
    })));
    
    chart.timeScale().fitContent();
    
    chart.subscribeCrosshairMove((param) => {
      if (param.point === undefined || !param.time || param.point.x < 0 || param.point.y < 0) {
        setHoveredValue(null);
        return;
      }
      const data = dailyStats.find(item => item.time === param.time);
      if (data) {
        setHoveredValue({
          time: data.time,
          completedPomodoros: data.value,
          totalFocusedDuration: data.duration,
        });
      }
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
  
  const completedPomodoroSessionIds = new Set<string>();
  focusSessions.forEach(session => {
    if (session.isCompletedPomodoro) {
      completedPomodoroSessionIds.add(session.pomodoroSessionId);
    }
  });
  const totalCompletedPomodoros = completedPomodoroSessionIds.size;
  
  const totalFocusedMinutes = focusSessions.reduce((total, session) => total + session.duration, 0);

  let totalMinutesInCompletedPomodoros = 0;
  completedPomodoroSessionIds.forEach(sessionId => {
    const minutesForThisPomodoro = focusSessions.filter(s => s.pomodoroSessionId === sessionId).length;
    totalMinutesInCompletedPomodoros += minutesForThisPomodoro;
  });
  
  const averageDurationOfCompletedPomodoro = totalCompletedPomodoros > 0 
    ? Math.round(totalMinutesInCompletedPomodoros / totalCompletedPomodoros) 
    : 0;
  
  const durationCounts: { [key: string]: number } = { '25': 0, '45': 0, '90': 0, 'other': 0 };
  const processedPomodoroIdsForDistribution = new Set<string>();
  focusSessions.forEach(session => {
    if (session.isCompletedPomodoro && !processedPomodoroIdsForDistribution.has(session.pomodoroSessionId)) {
        const target = session.targetPomodoroDuration;
        if (target === 25) durationCounts['25']++;
        else if (target === 45) durationCounts['45']++;
        else if (target === 90) durationCounts['90']++;
        else durationCounts['other']++;
        processedPomodoroIdsForDistribution.add(session.pomodoroSessionId);
    }
  });
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#2D1B69]/30 backdrop-blur-lg rounded-xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Timer className="w-6 h-6 text-amber-400" />
          <h3 className="text-lg font-bold text-white">تحليل جلسات البومودورو</h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-amber-400 rounded-full"></div><span className="text-sm text-purple-300">بومودورو مكتمل</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-teal-400 rounded-full"></div><span className="text-sm text-purple-300">إجمالي دقائق التركيز</span></div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#1A0F3C]/50 rounded-lg p-4 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-amber-400">{totalCompletedPomodoros}</div>
          <div className="text-sm text-purple-300">إجمالي البومودورو المكتمل</div>
        </div>
        <div className="bg-[#1A0F3C]/50 rounded-lg p-4 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-amber-400">{totalFocusedMinutes}</div>
          <div className="text-sm text-purple-300">إجمالي دقائق التركيز</div>
        </div>
        <div className="bg-[#1A0F3C]/50 rounded-lg p-4 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-amber-400">{averageDurationOfCompletedPomodoro}</div>
          <div className="text-sm text-purple-300">متوسط مدة البومودورو المكتمل</div>
        </div>
      </div>
      
      <div className="relative">
        <div ref={chartContainerRef} className="w-full h-[300px]" />
        {hoveredValue && (
          <div className="absolute top-2 left-2 bg-[#1A0F3C] p-3 rounded-lg shadow-lg border border-purple-500/20 z-10">
            <div className="text-white font-bold">{format(parseISO(hoveredValue.time), 'EEEE dd MMMM yyyy', { locale: ar })}</div>
            <div className="text-amber-400">{hoveredValue.completedPomodoros} بومودورو مكتمل</div>
            <div className="text-teal-400">{hoveredValue.totalFocusedDuration} دقيقة تركيز</div>
          </div>
        )}
      </div>
      
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Object.entries(durationCounts).map(([duration, count]) => {
          const percentage = totalCompletedPomodoros > 0 ? Math.round((count / totalCompletedPomodoros) * 100) : 0;
          const label = duration === 'other' ? 'أخرى' : `${duration} دقيقة`;
          return (
            <div key={duration} className="bg-[#1A0F3C]/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white text-sm">{label}</span>
                <span className="text-amber-400 font-bold text-sm">{count}</span>
              </div>
              <div className="w-full h-1 bg-[#2D1B69] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  className="h-full bg-amber-400"
                  transition={{ duration: 1 }}
                />
              </div>
              <div className="text-right text-xs text-purple-300 mt-1">{percentage}%</div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 flex items-start gap-2 text-sm text-purple-300">
        <Info className="w-4 h-4 flex-shrink-0 mt-1" />
        <p>يوضح المخطط عدد جلسات البومودورو المكتملة (أعمدة كهرمانية) وإجمالي دقائق التركيز (خط أزرق مخضر) لكل يوم.</p>
      </div>
    </motion.div>
  );
};

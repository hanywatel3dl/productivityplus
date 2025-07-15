import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckSquare, Info } from 'lucide-react';
import { format, eachDayOfInterval, isSameDay } from 'date-fns';
import { ar } from 'date-fns/locale';
import { createChart, ColorType, LineStyle, CrosshairMode } from 'lightweight-charts';
import { Task } from '../../../types';

interface TasksChartProps {
  tasks: Task[];
  dateRange: { start: Date; end: Date };
  timeRange: 'day' | 'week' | 'month' | 'year';
}

export const TasksChart = ({ tasks, dateRange, timeRange }: TasksChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const [hoveredValue, setHoveredValue] = useState<{ 
    time: string; 
    completed: number; 
    pending: number;
    total: number;
  } | null>(null);
  
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
    
    // Calculate daily task completion
    const dailyTasks = days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      
      // Get tasks for this day
      const tasksForDay = tasks.filter(task => {
        const taskDate = format(new Date(task.createdAt), 'yyyy-MM-dd');
        return taskDate === dateStr;
      });
      
      const completedTasks = tasksForDay.filter(task => task.completed).length;
      const pendingTasks = tasksForDay.length - completedTasks;
      
      return {
        time: dateStr,
        value: completedTasks,
        pendingTasks,
        totalTasks: tasksForDay.length,
      };
    });
    
    // Create waterfall series for completed tasks
    const completedSeries = chart.addHistogramSeries({
      color: '#10B981', // Green
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'right',
      title: 'المهام المكتملة',
    });
    
    completedSeries.setData(dailyTasks.map(item => ({
      time: item.time,
      value: item.value,
      color: item.value > 0 ? '#10B981' : undefined,
    })));
    
    // Create waterfall series for pending tasks
    const pendingSeries = chart.addHistogramSeries({
      color: '#F59E0B', // Amber
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'right',
      title: 'المهام المعلقة',
    });
    
    pendingSeries.setData(dailyTasks.map(item => ({
      time: item.time,
      value: -item.pendingTasks, // Negative to show below the axis
      color: item.pendingTasks > 0 ? '#F59E0B' : undefined,
    })));
    
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
      
      const data = dailyTasks.find(item => item.time === param.time);
      if (data) {
        setHoveredValue({
          time: data.time,
          completed: data.value,
          pending: data.pendingTasks,
          total: data.totalTasks,
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
  }, [tasks, dateRange, timeRange]);
  
  // Calculate statistics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.completed).length;
  const pendingTasks = totalTasks - completedTasks;
  const completionRate = Math.round((completedTasks / Math.max(1, totalTasks)) * 100);
  
  // Calculate task priority distribution
  const highPriorityTasks = tasks.filter(task => task.priority === 'high').length;
  const mediumPriorityTasks = tasks.filter(task => task.priority === 'medium').length;
  const lowPriorityTasks = tasks.filter(task => task.priority === 'low').length;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#2D1B69]/30 backdrop-blur-lg rounded-xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CheckSquare className="w-6 h-6 text-amber-400" />
          <h3 className="text-lg font-bold text-white">تحليل المهام</h3>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-purple-300">المهام المكتملة</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
            <span className="text-sm text-purple-300">المهام المعلقة</span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#1A0F3C]/50 rounded-lg p-4 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-green-500">{completedTasks}</div>
          <div className="text-sm text-purple-300">المهام المكتملة</div>
        </div>
        <div className="bg-[#1A0F3C]/50 rounded-lg p-4 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-amber-500">{pendingTasks}</div>
          <div className="text-sm text-purple-300">المهام المعلقة</div>
        </div>
        <div className="bg-[#1A0F3C]/50 rounded-lg p-4 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-amber-400">{completionRate}%</div>
          <div className="text-sm text-purple-300">نسبة الإكمال</div>
        </div>
      </div>
      
      <div className="relative">
        <div ref={chartContainerRef} className="w-full h-[300px]" />
        
        {hoveredValue && (
          <div className="absolute top-2 left-2 bg-[#1A0F3C] p-3 rounded-lg shadow-lg border border-purple-500/20 z-10">
            <div className="text-white font-bold">
              {format(new Date(hoveredValue.time), 'EEEE dd MMMM yyyy', { locale: ar })}
            </div>
            <div className="text-green-500">
              {hoveredValue.completed} مهام مكتملة
            </div>
            <div className="text-amber-500">
              {hoveredValue.pending} مهام معلقة
            </div>
            <div className="text-purple-300 text-sm">
              {hoveredValue.total} إجمالي المهام
            </div>
          </div>
        )}
      </div>
      
      {/* Task priority distribution */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="bg-[#1A0F3C]/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white">أولوية عالية</span>
            <span className="text-red-400 font-bold">{highPriorityTasks}</span>
          </div>
          <div className="w-full h-1 bg-[#2D1B69] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(highPriorityTasks / Math.max(1, totalTasks)) * 100}%` }}
              className="h-full bg-red-400"
              transition={{ duration: 1 }}
            />
          </div>
        </div>
        <div className="bg-[#1A0F3C]/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white">أولوية متوسطة</span>
            <span className="text-amber-400 font-bold">{mediumPriorityTasks}</span>
          </div>
          <div className="w-full h-1 bg-[#2D1B69] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(mediumPriorityTasks / Math.max(1, totalTasks)) * 100}%` }}
              className="h-full bg-amber-400"
              transition={{ duration: 1 }}
            />
          </div>
        </div>
        <div className="bg-[#1A0F3C]/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white">أولوية منخفضة</span>
            <span className="text-blue-400 font-bold">{lowPriorityTasks}</span>
          </div>
          <div className="w-full h-1 bg-[#2D1B69] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(lowPriorityTasks / Math.max(1, totalTasks)) * 100}%` }}
              className="h-full bg-blue-400"
              transition={{ duration: 1 }}
            />
          </div>
        </div>
      </div>
      
      <div className="mt-4 flex items-start gap-2 text-sm text-purple-300">
        <Info className="w-4 h-4 flex-shrink-0 mt-1" />
        <p>
          يوضح هذا المخطط الشلالي المهام المكتملة (باللون الأخضر) والمهام المعلقة (باللون الكهرماني) لكل يوم.
          المهام المكتملة تظهر فوق المحور والمهام المعلقة تظهر تحت المحور.
        </p>
      </div>
    </motion.div>
  );
};
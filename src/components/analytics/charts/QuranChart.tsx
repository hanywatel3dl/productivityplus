import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Book, Info } from 'lucide-react';
import { format, eachDayOfInterval, isSameDay } from 'date-fns';
import { ar } from 'date-fns/locale';
import { createChart, ColorType, LineStyle, CrosshairMode } from 'lightweight-charts';

interface QuranChartProps {
  quranProgress: Array<{ page: number; date: string }>;
  dateRange: { start: Date; end: Date };
  timeRange: 'day' | 'week' | 'month' | 'year';
}

export const QuranChart = ({ quranProgress, dateRange, timeRange }: QuranChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const [hoveredValue, setHoveredValue] = useState<{ time: string; value: number; cumulative: number } | null>(null);
  
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
    
    // Calculate daily Quran pages read
    const dailyPages = days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const pagesForDay = quranProgress.filter(progress => progress.date === dateStr);
      
      return {
        time: dateStr,
        value: pagesForDay.length,
      };
    });
    
    // Calculate cumulative pages
    let cumulativePages = 0;
    const cumulativeData = dailyPages.map(item => {
      cumulativePages += item.value;
      return {
        time: item.time,
        value: cumulativePages,
      };
    });
    
    // Create line series for cumulative pages
    const lineSeries = chart.addLineSeries({
      color: '#4FD1C5',
      lineWidth: 2,
      priceScaleId: 'right',
      title: 'إجمالي الصفحات المقروءة',
      lastValueVisible: true,
    });
    
    lineSeries.setData(cumulativeData);
    
    // Create area series for daily pages
    const areaSeries = chart.addAreaSeries({
      topColor: 'rgba(255, 160, 0, 0.4)',
      bottomColor: 'rgba(255, 160, 0, 0.0)',
      lineColor: '#FFA000',
      lineWidth: 2,
      priceScaleId: 'right',
      title: 'الصفحات اليومية',
      lastValueVisible: false,
    });
    
    areaSeries.setData(dailyPages);
    
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
      
      const dailyData = dailyPages.find(item => item.time === param.time);
      const cumulativeItem = cumulativeData.find(item => item.time === param.time);
      
      if (dailyData && cumulativeItem) {
        setHoveredValue({
          time: dailyData.time,
          value: dailyData.value,
          cumulative: cumulativeItem.value,
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
  }, [quranProgress, dateRange, timeRange]);
  
  // Calculate statistics
  const totalPages = quranProgress.length;
  const totalQuranPages = 604;
  const completionRate = Math.round((totalPages / totalQuranPages) * 100);
  
  // Calculate average pages per day
  const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
  const averagePagesPerDay = Math.round((totalPages / Math.max(1, days.length)) * 10) / 10;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#2D1B69]/30 backdrop-blur-lg rounded-xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Book className="w-6 h-6 text-amber-400" />
          <h3 className="text-lg font-bold text-white">تحليل قراءة القرآن</h3>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-amber-400 rounded-full"></div>
            <span className="text-sm text-purple-300">الصفحات اليومية</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-teal-400 rounded-full"></div>
            <span className="text-sm text-purple-300">الإجمالي التراكمي</span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#1A0F3C]/50 rounded-lg p-4 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-amber-400">{totalPages}</div>
          <div className="text-sm text-purple-300">إجمالي الصفحات المقروءة</div>
        </div>
        <div className="bg-[#1A0F3C]/50 rounded-lg p-4 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-amber-400">{averagePagesPerDay}</div>
          <div className="text-sm text-purple-300">متوسط الصفحات اليومية</div>
        </div>
        <div className="bg-[#1A0F3C]/50 rounded-lg p-4 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-amber-400">{completionRate}%</div>
          <div className="text-sm text-purple-300">نسبة إكمال المصحف</div>
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
              {hoveredValue.value} صفحة في هذا اليوم
            </div>
            <div className="text-teal-400">
              {hoveredValue.cumulative} صفحة في المجموع
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-4 flex items-start gap-2 text-sm text-purple-300">
        <Info className="w-4 h-4 flex-shrink-0 mt-1" />
        <p>
          يوضح هذا المخطط الخطي عدد صفحات القرآن المقروءة يوميًا (المنطقة الكهرمانية) والإجمالي التراكمي (الخط الأزرق المخضر).
          يمكنك تمرير المؤشر فوق المخطط لرؤية تفاصيل كل يوم.
        </p>
      </div>
    </motion.div>
  );
};
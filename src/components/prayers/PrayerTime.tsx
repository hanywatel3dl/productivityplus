import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Clock } from 'lucide-react';

interface PrayerTimeProps {
  time: Date;
}

export const PrayerTime = ({ time }: PrayerTimeProps) => {
  return (
    <div className="mt-4 flex items-center gap-3">
      <Clock className="w-4 h-4 text-amber-400" />
      <span className="text-white">
        {format(time, 'hh:mm a', { locale: ar })}
      </span>
    </div>
  );
};
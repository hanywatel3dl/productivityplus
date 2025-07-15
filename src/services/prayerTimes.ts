import { format, addMinutes, isAfter, isBefore, parse, differenceInMinutes, addDays } from 'date-fns';
import { ar } from 'date-fns/locale';

interface PrayerTime {
  name: string;
  time: Date;
}

const LATITUDE = 31.0435; // طناح المنصورة
const LONGITUDE = 31.3835;

export async function getPrayerTimes(): Promise<PrayerTime[]> {
  const today = new Date();
  const dateStr = format(today, 'dd-MM-yyyy');
  const tomorrowDateStr = format(addDays(today, 1), 'dd-MM-yyyy');
  
  try {
    // Get today's prayer times
    const response = await fetch(
      `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${LATITUDE}&longitude=${LONGITUDE}&method=5`
    );
    const data = await response.json();
    
    // Get tomorrow's Fajr time
    const tomorrowResponse = await fetch(
      `https://api.aladhan.com/v1/timings/${tomorrowDateStr}?latitude=${LATITUDE}&longitude=${LONGITUDE}&method=5`
    );
    const tomorrowData = await tomorrowResponse.json();
    
    const timings = data.data.timings;
    const prayers = [
      { name: 'الفجر', time: timings.Fajr, date: dateStr },
      { name: 'الظهر', time: timings.Dhuhr, date: dateStr },
      { name: 'العصر', time: timings.Asr, date: dateStr },
      { name: 'المغرب', time: timings.Maghrib, date: dateStr },
      { name: 'العشاء', time: timings.Isha, date: dateStr },
      // Add tomorrow's Fajr as the end of today's Islamic day
      { name: 'الفجر (غدًا)', time: tomorrowData.data.timings.Fajr, date: tomorrowDateStr }
    ];

    return prayers.map(prayer => ({
      ...prayer,
      time: parse(`${prayer.date} ${prayer.time}`, 'dd-MM-yyyy HH:mm', new Date())
    }));
  } catch (error) {
    console.error('خطأ في جلب مواقيت الصلاة:', error);
    return [];
  }
}

export function getNextPrayer(prayers: PrayerTime[]): PrayerTime | null {
  const now = new Date();
  // Exclude tomorrow's Fajr from next prayer calculation
  const todayPrayers = prayers.filter(prayer => !prayer.name.includes('غدًا'));
  return todayPrayers.find(prayer => isAfter(prayer.time, now)) || null;
}

export function getRemainingTime(prayer: PrayerTime): string {
  const now = new Date();
  const diff = differenceInMinutes(prayer.time, now);
  
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  
  if (hours > 0) {
    return `${hours} ساعة و ${minutes} دقيقة`;
  }
  return `${minutes} دقيقة`;
}

// Check if a prayer time has arrived
export function hasPrayerTimeArrived(prayerTime: Date): boolean {
  const now = new Date();
  return isAfter(now, prayerTime) || now.getTime() === prayerTime.getTime();
}

// Get the current Islamic day (from Fajr to next Fajr)
export function getCurrentIslamicDay(prayers: PrayerTime[]): string {
  const now = new Date();
  const today = format(now, 'yyyy-MM-dd');
  
  // If we have prayer times and we're before today's Fajr, we're still in yesterday's Islamic day
  if (prayers.length >= 1 && isBefore(now, prayers[0].time)) {
    return format(addDays(now, -1), 'yyyy-MM-dd');
  }
  
  // If we're after today's Fajr but before tomorrow's Fajr, we're in today's Islamic day
  return today;
}

// Check if a prayer is valid for the current Islamic day
export function isPrayerValidForCurrentDay(prayerName: string, prayers: PrayerTime[]): boolean {
  // If there are no prayers loaded yet, allow all prayers
  if (!prayers || prayers.length === 0) return true;
  
  const now = new Date();
  const todayFajr = prayers.find(p => p.name === 'الفجر');
  const tomorrowFajr = prayers.find(p => p.name.includes('غدًا'));
  
  // If we don't have both Fajr times, allow all prayers
  if (!todayFajr || !tomorrowFajr) return true;
  
  // If we're before today's Fajr, we're in yesterday's Islamic day
  // Only Isha from yesterday is valid
  if (isBefore(now, todayFajr.time)) {
    return prayerName === 'العشاء';
  }
  
  // If we're after today's Fajr but before tomorrow's Fajr
  // All of today's prayers are valid
  return true;
}
import moment from 'moment-hijri';
import axios from 'axios';

// Initialize moment-hijri
moment.locale('en');

export interface IslamicEvent {
  id: string;
  title: string;
  hijriDate: string; // "DD-MM" format
  description: string;
  icon: string;
}

export const ISLAMIC_EVENTS: IslamicEvent[] = [
  { id: 'ramadan', title: 'Ramadan', hijriDate: '01-09', description: 'The month of fasting and revelation of the Quran.', icon: 'moon' },
  { id: 'laylatul_qadr', title: 'Laylatul Qadr', hijriDate: '27-09', description: 'The Night of Power, better than a thousand months.', icon: 'star' },
  { id: 'eid_ul_fitr', title: 'Eid-ul-Fitr', hijriDate: '01-10', description: 'Festival of breaking the fast.', icon: 'sunny' },
  { id: 'eid_ul_adha', title: 'Eid-ul-Adha', hijriDate: '10-12', description: 'Festival of sacrifice.', icon: 'gift' },
  { id: 'new_year', title: 'Islamic New Year', hijriDate: '01-01', description: 'Beginning of the new Hijri year.', icon: 'calendar' },
  { id: 'ashura', title: 'Ashura', hijriDate: '10-01', description: 'Day of significance for various historical events.', icon: 'water' },
  { id: 'mawlid', title: 'Mawlid', hijriDate: '12-03', description: 'The birth of Prophet Muhammad (PBUH).', icon: 'heart' },
  { id: 'isra_miraj', title: 'Isra and Miraj', hijriDate: '27-07', description: 'The night journey and ascension of the Prophet (PBUH).', icon: 'airplane' },
];

export const getHijriDate = (date: Date = new Date()) => {
  const m = moment(date);
  return {
    day: m.iDate(),
    month: m.iMonth(), // 0-indexed
    year: m.iYear(),
    monthName: m.format('iMMMM'),
    fullDate: m.format('iDD iMMMM iYYYY'),
  };
};

export const getGregorianForHijri = (hDay: number, hMonth: number, hYear: number) => {
  return moment(`${hYear}/${hMonth + 1}/${hDay}`, 'iYYYY/iM/iD').toDate();
};

export const getUpcomingEvents = (currentYear: number) => {
  return ISLAMIC_EVENTS.map(event => {
    const [day, month] = event.hijriDate.split('-').map(Number);
    let eventDate = moment(`${currentYear}/${month}/${day}`, 'iYYYY/iM/iD');
    
    // If event already passed this year, look for next year
    if (eventDate.isBefore(moment())) {
      eventDate = moment(`${currentYear + 1}/${month}/${day}`, 'iYYYY/iM/iD');
    }
    
    return {
      ...event,
      gregorianDate: eventDate.toDate(),
      daysRemaining: eventDate.diff(moment(), 'days'),
    };
  }).sort((a, b) => a.daysRemaining - b.daysRemaining);
};

export const getRamadanCountdown = () => {
  const events = getUpcomingEvents(moment().iYear());
  const ramadan = events.find(e => e.id === 'ramadan');
  if (!ramadan) return null;
  
  const now = moment();
  const target = moment(ramadan.gregorianDate);
  const duration = moment.duration(target.diff(now));
  
  return {
    days: Math.floor(duration.asDays()),
    hours: duration.hours(),
    minutes: duration.minutes(),
  };
};

export const getEidCountdown = () => {
  const events = getUpcomingEvents(moment().iYear());
  const eidFitr = events.find(e => e.id === 'eid_ul_fitr');
  const eidAdha = events.find(e => e.id === 'eid_ul_adha');
  
  return {
    fitr: eidFitr ? Math.floor(moment.duration(moment(eidFitr.gregorianDate).diff(moment())).asDays()) : null,
    adha: eidAdha ? Math.floor(moment.duration(moment(eidAdha.gregorianDate).diff(moment())).asDays()) : null,
  };
};

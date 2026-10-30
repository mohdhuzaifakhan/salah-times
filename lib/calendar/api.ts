import moment from 'moment-hijri';

// Initialize moment-hijri
moment.locale('en');

export interface IslamicEvent {
  id: string;
  title: string;
  hijriDate: string; // "DD-MM" format
  hijriLabel?: string;
  description: string;
  icon: string;
}

export const ISLAMIC_EVENTS: IslamicEvent[] = [
  {
    id: 'new_year',
    title: 'Islamic New Year',
    hijriDate: '01-01',
    hijriLabel: '1 Muharram',
    description: 'Beginning of the new Hijri lunar year.',
    icon: 'calendar',
  },
  {
    id: 'ashura',
    title: 'Day of Ashura',
    hijriDate: '10-01',
    hijriLabel: '10 Muharram',
    description: 'Day of fasting and commemoration of historical events.',
    icon: 'water',
  },
  {
    id: 'mawlid',
    title: 'Mawlid-un-Nabi',
    hijriDate: '12-03',
    hijriLabel: '12 Rabi al-Awwal',
    description: 'The birth of Prophet Muhammad (peace be upon him).',
    icon: 'heart',
  },
  {
    id: 'isra_miraj',
    title: 'Shab-e-Meraj',
    hijriDate: '27-07',
    hijriLabel: '27 Rajab',
    description: 'The miraculous night journey and ascension of the Prophet (PBUH).',
    icon: 'star',
  },
  {
    id: 'shab_e_barat',
    title: 'Shab-e-Barat',
    hijriDate: '15-08',
    hijriLabel: '15 Sha’ban',
    description: 'The Night of Forgiveness and prayers for the coming year.',
    icon: 'moon',
  },
  {
    id: 'ramadan',
    title: 'First of Ramadan',
    hijriDate: '01-09',
    hijriLabel: '1 Ramadan',
    description: 'The blessed month of fasting, reflection, and the revelation of the Holy Quran.',
    icon: 'moon',
  },
  {
    id: 'laylatul_qadr',
    title: 'Laylatul Qadr',
    hijriDate: '27-09',
    hijriLabel: '27 Ramadan',
    description: 'The Night of Power, better than a thousand months (Al-Qadr).',
    icon: 'sparkles',
  },
  {
    id: 'eid_ul_fitr',
    title: 'Eid-ul-Fitr',
    hijriDate: '01-10',
    hijriLabel: '1 Shawwal',
    description: 'Festival of celebration upon the completion of Ramadan fasting.',
    icon: 'sunny',
  },
  {
    id: 'arafah',
    title: 'Day of Arafah',
    hijriDate: '09-12',
    hijriLabel: '9 Dhul-Hijjah',
    description: 'The paramount day of Hajj and day of supreme supplication.',
    icon: 'medal',
  },
  {
    id: 'eid_ul_adha',
    title: 'Eid-ul-Adha',
    hijriDate: '10-12',
    hijriLabel: '10 Dhul-Hijjah',
    description: 'Festival of sacrifice commemorating Prophet Ibrahim’s (AS) devotion.',
    icon: 'gift',
  },
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
  const now = moment().startOf('day');
  return ISLAMIC_EVENTS.map((event) => {
    const [day, month] = event.hijriDate.split('-').map(Number);
    let eventDate = moment(`${currentYear}/${month}/${day}`, 'iYYYY/iM/iD');

    // If event already passed this year, look for next year
    if (eventDate.isBefore(now)) {
      eventDate = moment(`${currentYear + 1}/${month}/${day}`, 'iYYYY/iM/iD');
    }

    const diffDays = eventDate.diff(now, 'days');

    return {
      ...event,
      gregorianDate: eventDate.toDate(),
      formattedGregorian: eventDate.format('D MMMM YYYY'),
      daysRemaining: diffDays,
      isUpcoming: diffDays >= 0,
    };
  }).sort((a, b) => a.daysRemaining - b.daysRemaining);
};

export const getRamadanCountdown = () => {
  const events = getUpcomingEvents(moment().iYear());
  const ramadan = events.find((e) => e.id === 'ramadan');
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
  const eidFitr = events.find((e) => e.id === 'eid_ul_fitr');
  const eidAdha = events.find((e) => e.id === 'eid_ul_adha');

  return {
    fitr: eidFitr
      ? Math.floor(moment.duration(moment(eidFitr.gregorianDate).diff(moment())).asDays())
      : null,
    adha: eidAdha
      ? Math.floor(moment.duration(moment(eidAdha.gregorianDate).diff(moment())).asDays())
      : null,
  };
};

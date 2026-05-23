import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSavedEvents, getCalendarPrefs, SavedEvent } from './db';
import { getHijriDate, getUpcomingEvents } from './api';
import { auth } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import * as Notifications from 'expo-notifications';

interface CalendarContextType {
  hijriDate: any;
  upcomingEvents: any[];
  savedEvents: SavedEvent[];
  loading: boolean;
  refreshSavedEvents: () => Promise<void>;
  scheduleEventReminder: (event: any) => Promise<void>;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export const CalendarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hijriDate, setHijriDate] = useState(getHijriDate());
  const [upcomingEvents, setUpcomingEvents] = useState(getUpcomingEvents(getHijriDate().year));
  const [savedEvents, setSavedEvents] = useState<SavedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUserData = async () => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [s, p] = await Promise.all([
        getSavedEvents(),
        getCalendarPrefs()
      ]);
      setSavedEvents(s);
    } catch (error) {
      console.error('Error loading Calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        loadUserData();
      } else {
        setSavedEvents([]);
        setLoading(false);
      }
    });

    // Update date periodically (at midnight)
    const interval = setInterval(() => {
      setHijriDate(getHijriDate());
    }, 1000 * 60 * 60);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const refreshSavedEvents = async () => {
    const s = await getSavedEvents();
    setSavedEvents(s);
  };

  const scheduleEventReminder = async (event: any) => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Upcoming Event: ${event.title}`,
          body: `Tomorrow is ${event.title}. Don't forget!`,
          data: { eventId: event.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(event.gregorianDate.getTime() - 24 * 60 * 60 * 1000), // 1 day before
        },
      });
    } catch (error) {
      console.warn('Notifications not supported in this environment:', error);
    }
  };

  return (
    <CalendarContext.Provider value={{
      hijriDate,
      upcomingEvents,
      savedEvents,
      loading,
      refreshSavedEvents,
      scheduleEventReminder
    }}>
      {children}
    </CalendarContext.Provider>
  );
};

export const useCalendar = () => {
  const context = useContext(CalendarContext);
  if (context === undefined) {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }
  return context;
};

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  SafeAreaView, 
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { useCalendar } from '@/lib/calendar/context';
import { useLanguage } from '@/lib/language-context';
import { getRamadanCountdown, getEidCountdown } from '@/lib/calendar/api';
import CalendarView from '@/components/calendar/CalendarView';
import CountdownCard from '@/components/calendar/CountdownCard';
import EventListCard from '@/components/calendar/EventListCard';

export default function IslamicCalendarScreen() {
  const { t } = useLanguage();
  const { hijriDate, upcomingEvents, loading } = useCalendar();
  const [ramadan, setRamadan] = useState<any>(null);
  const [eid, setEid] = useState<any>(null);

  useEffect(() => {
    setRamadan(getRamadanCountdown());
    setEid(getEidCountdown());
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ marginTop: 10, color: Colors.textMuted }}>{t('loading')}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 140 }]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t('islamic_calendar')}</Text>
          <View style={styles.todayCard}>
            <Text style={styles.hijriDate}>{hijriDate.fullDate}</Text>
            <Text style={styles.gregorianDate}>{new Date().toDateString()}</Text>
          </View>
        </View>

        <CalendarView />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('ramadan_countdown')}</Text>
          {ramadan && (
            <CountdownCard 
              title="Ramadan"
              days={ramadan.days}
              hours={ramadan.hours}
              minutes={ramadan.minutes}
              icon="moon"
              color={Colors.primary}
            />
          )}
          <View style={styles.row}>
            {eid && eid.fitr !== null && (
              <View style={{ flex: 1, marginRight: 8 }}>
                <CountdownCard 
                  title="Eid Fitr"
                  days={eid.fitr}
                  icon="sunny"
                  color={Colors.accent}
                />
              </View>
            )}
            {eid && eid.adha !== null && (
              <View style={{ flex: 1, marginLeft: 8 }}>
                <CountdownCard 
                  title="Eid Adha"
                  days={eid.adha}
                  icon="gift"
                  color="#B8860B"
                />
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('upcoming_events')}</Text>
          {upcomingEvents.slice(0, 5).map(event => (
            <EventListCard 
              key={event.id} 
              event={event} 
              onPress={() => router.push(`/calendar/event/${event.id}`)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    paddingVertical: 20,
  },
  title: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 28,
    color: Colors.primary,
    marginBottom: 16,
  },
  todayCard: {
    backgroundColor: Colors.surface,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
  },
  hijriDate: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 22,
    color: Colors.text,
  },
  gregorianDate: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: Colors.text,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});

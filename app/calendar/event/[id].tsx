import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  StatusBar, 
  TouchableOpacity,
  ScrollView,
  Platform
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { ISLAMIC_EVENTS } from '@/lib/calendar/api';
import { useCalendar } from '@/lib/calendar/context';
import { saveIslamicEvent, unsaveIslamicEvent } from '@/lib/calendar/db';
import { useLanguage } from '@/lib/language-context';

export default function EventDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const { upcomingEvents, savedEvents, refreshSavedEvents, scheduleEventReminder } = useCalendar();
  const { t } = useLanguage();
  
  const event = upcomingEvents.find(e => e.id === id) || ISLAMIC_EVENTS.find(e => e.id === id);
  const isSaved = savedEvents.some(s => s.eventId === id);

  if (!event) return null;

  const handleToggleSave = async () => {
    if (isSaved) {
      await unsaveIslamicEvent(String(id));
    } else {
      await saveIslamicEvent({
        eventId: String(id),
        title: event.title,
        gregorianDate: event.gregorianDate,
        remindMe: true
      });
      await scheduleEventReminder(event);
    }
    refreshSavedEvents();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 0 : insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('islamic_calendar')}</Text>
        <TouchableOpacity onPress={handleToggleSave} style={styles.backButton}>
          <Ionicons 
            name={isSaved ? "bookmark" : "bookmark-outline"} 
            size={24} 
            color={isSaved ? Colors.accent : Colors.text} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} style={styles.scrollView}>
        <View style={styles.iconContainer}>
          <Ionicons name={event.icon as any} size={64} color={Colors.primary} />
        </View>
        
        <Text style={styles.title}>{event.title}</Text>
        
        <View style={styles.dateContainer}>
          <View style={styles.dateBox}>
            <Text style={styles.dateLabel}>Hijri Date</Text>
            <Text style={styles.dateText}>{event.hijriDate}</Text>
          </View>
          <View style={[styles.dateBox, { borderLeftWidth: 1, borderLeftColor: Colors.borderLight }]}>
            <Text style={styles.dateLabel}>Gregorian</Text>
            <Text style={styles.dateText}>{new Date(event.gregorianDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
          </View>
        </View>

        <View style={styles.countdownContainer}>
          <Text style={styles.countdownValue}>{event.daysRemaining}</Text>
          <Text style={styles.countdownLabel}>{t('days')} {t('loading').toLowerCase()} {event.title}</Text>
        </View>

        <View style={styles.descriptionSection}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.descriptionText}>{event.description}</Text>
        </View>

        <TouchableOpacity 
          style={[styles.remindButton, isSaved && styles.remindButtonActive]}
          onPress={handleToggleSave}
        >
          <Ionicons 
            name={isSaved ? "notifications" : "notifications-outline"} 
            size={20} 
            color="#fff" 
          />
          <Text style={styles.remindButtonText}>
            {isSaved ? "Reminder Set" : "Notify Me"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: Colors.text,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    alignItems: 'center',
    paddingBottom: 60,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  title: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 28,
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 24,
  },
  dateContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  dateBox: {
    flex: 1,
    alignItems: 'center',
  },
  dateLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  dateText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: Colors.text,
  },
  countdownContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  countdownValue: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 64,
    color: Colors.primary,
  },
  countdownLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: -8,
  },
  descriptionSection: {
    width: '100%',
    marginBottom: 40,
  },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: Colors.text,
    marginBottom: 12,
  },
  descriptionText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  remindButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.textMuted,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 16,
    width: '100%',
  },
  remindButtonActive: {
    backgroundColor: Colors.primary,
  },
  remindButtonText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#fff',
    marginLeft: 10,
  },
});

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';

interface EventListCardProps {
  event: any;
  onPress: () => void;
}

const EventListCard: React.FC<EventListCardProps> = ({ event, onPress }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.iconContainer}>
        <Ionicons name={event.icon as any} size={24} color={Colors.primary} />
      </View>
      
      <View style={styles.infoContainer}>
        <Text style={styles.title}>{event.title}</Text>
        <Text style={styles.date}>{event.hijriDate} • {new Date(event.gregorianDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
      </View>
      
      <View style={styles.countdown}>
        <Text style={styles.days}>{event.daysRemaining}</Text>
        <Text style={styles.daysLabel}>Days left</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoContainer: {
    flex: 1,
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: Colors.text,
  },
  date: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  countdown: {
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  days: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: Colors.primary,
  },
  daysLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 8,
    color: Colors.textMuted,
    marginTop: -2,
  },
});

export default EventListCard;

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';

interface CountdownCardProps {
  title: string;
  days: number;
  hours?: number;
  minutes?: number;
  icon: string;
  color?: string;
}

const CountdownCard: React.FC<CountdownCardProps> = ({
  title,
  days,
  hours,
  minutes,
  icon,
  color = Colors.primary
}) => {
  return (
    <View style={[styles.container, { backgroundColor: color }]}>
      <View style={styles.header}>
        <Ionicons name={icon as any} size={20} color="rgba(255,255,255,0.8)" />
        <Text style={styles.title}>{title} Countdown</Text>
      </View>

      <View style={styles.timerContainer}>
        <View style={styles.timeBox}>
          <Text style={styles.timeText}>{days}</Text>
          <Text style={styles.label}>Days</Text>
        </View>
        {hours !== undefined && (
          <>
            <Text style={styles.separator}>:</Text>
            <View style={styles.timeBox}>
              <Text style={styles.timeText}>{hours}</Text>
              <Text style={styles.label}>Hours</Text>
            </View>
          </>
        )}
        {minutes !== undefined && (
          <>
            <Text style={styles.separator}>:</Text>
            <View style={styles.timeBox}>
              <Text style={styles.timeText}>{minutes}</Text>
              <Text style={styles.label}>Mins</Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#fff',
    marginLeft: 8,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBox: {
    alignItems: 'center',
    minWidth: 50,
  },
  timeText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 28,
    color: '#fff',
  },
  label: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    marginTop: -4,
  },
  separator: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 24,
    color: 'rgba(255,255,255,0.5)',
    marginHorizontal: 10,
    marginTop: -10,
  },
});

export default CountdownCard;

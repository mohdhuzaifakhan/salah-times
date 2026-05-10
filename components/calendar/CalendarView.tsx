import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment-hijri';
import Colors from '@/constants/colors';

const { width } = Dimensions.get('window');

const CalendarView = () => {
  const [currentMonth, setCurrentMonth] = useState(moment());

  const renderDays = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (
      <View style={styles.daysHeader}>
        {days.map(day => (
          <Text key={day} style={styles.dayHeaderText}>{day}</Text>
        ))}
      </View>
    );
  };

  const renderCells = () => {
    const startOfMonth = currentMonth.clone().startOf('month');
    const endOfMonth = currentMonth.clone().endOf('month');
    const startDate = startOfMonth.clone().startOf('week');
    const endDate = endOfMonth.clone().endOf('week');

    const rows = [];
    let days = [];
    let day = startDate.clone();

    while (day.isBefore(endDate)) {
      for (let i = 0; i < 7; i++) {
        const formattedDate = day.format('D');
        const hijriDay = day.iDate();
        const isSelected = day.isSame(moment(), 'day');
        const isCurrentMonth = day.isSame(currentMonth, 'month');

        days.push(
          <View
            key={day.toString()}
            style={[
              styles.cell,
              isSelected && styles.todayCell
            ]}
          >
            <Text style={[
              styles.cellText,
              !isCurrentMonth && styles.notCurrentMonthText,
              isSelected && styles.todayText
            ]}>
              {formattedDate}
            </Text>
            <Text style={[
              styles.hijriText,
              isSelected && styles.todayText
            ]}>
              {hijriDay}
            </Text>
          </View>
        );
        day.add(1, 'day');
      }
      rows.push(<View key={day.toString()} style={styles.row}>{days}</View>);
      days = [];
    }

    return <View style={styles.cellsContainer}>{rows}</View>;
  };

  const changeMonth = (direction: number) => {
    setCurrentMonth(currentMonth.clone().add(direction, 'month'));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => changeMonth(-1)}>
          <Ionicons name="chevron-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.monthText}>{currentMonth.format('MMMM YYYY')}</Text>
          <Text style={styles.hijriMonthText}>{currentMonth.format('iMMMM iYYYY')}</Text>
        </View>
        <TouchableOpacity onPress={() => changeMonth(1)}>
          <Ionicons name="chevron-forward" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {renderDays()}
      {renderCells()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    marginVertical: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    alignItems: 'center',
  },
  monthText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: Colors.text,
  },
  hijriMonthText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: Colors.primary,
  },
  daysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dayHeaderText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: Colors.textMuted,
    width: (width - 64) / 7,
    textAlign: 'center',
  },
  cellsContainer: {},
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cell: {
    width: (width - 64) / 7,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 2,
  },
  todayCell: {
    backgroundColor: Colors.primary,
  },
  cellText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: Colors.text,
  },
  notCurrentMonthText: {
    color: Colors.border,
  },
  hijriText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: -2,
  },
  todayText: {
    color: '#fff',
  },
});

export default CalendarView;

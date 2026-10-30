import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import moment from "moment-hijri";
import Colors from "@/constants/colors";
import {
  ISLAMIC_EVENTS,
  getUpcomingEvents,
  getRamadanCountdown,
  getEidCountdown,
  IslamicEvent,
} from "@/lib/calendar/api";

// Hijri month names in Arabic & English
const HIJRI_MONTHS = [
  { en: "Muharram", ar: "محرم", sacred: true },
  { en: "Safar", ar: "صفر", sacred: false },
  { en: "Rabi' al-Awwal", ar: "ربيع الأول", sacred: false },
  { en: "Rabi' al-Thani", ar: "ربيع الثاني", sacred: false },
  { en: "Jumada al-Awwal", ar: "جمادى الأولى", sacred: false },
  { en: "Jumada al-Thani", ar: "جمادى الثانية", sacred: false },
  { en: "Rajab", ar: "رجب", sacred: true },
  { en: "Sha'ban", ar: "شعبان", sacred: false },
  { en: "Ramadan", ar: "رمضان", sacred: false, holy: true },
  { en: "Shawwal", ar: "شوال", sacred: false },
  { en: "Dhul-Qi'dah", ar: "ذو القعدة", sacred: true },
  { en: "Dhul-Hijjah", ar: "ذو الحجة", sacred: true },
];

export default function IslamicCalendarScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<"Calendar View" | "Islamic Events">("Calendar View");
  const [currentMonth, setCurrentMonth] = useState(moment());
  const [selectedDate, setSelectedDate] = useState(moment());

  // Month navigation handlers
  const handlePrevMonth = () => {
    void Haptics.selectionAsync();
    setCurrentMonth((prev: any) => prev.clone().subtract(1, "month"));
  };

  const handleNextMonth = () => {
    void Haptics.selectionAsync();
    setCurrentMonth((prev: any) => prev.clone().add(1, "month"));
  };

  const handleGoToToday = () => {
    void Haptics.selectionAsync();
    const today = moment();
    setCurrentMonth(today.clone().startOf("month"));
    setSelectedDate(today);
  };

  // Build calendar month grid
  const startOfMonth = currentMonth.clone().startOf("month");
  const endOfMonth = currentMonth.clone().endOf("month");
  const startDate = startOfMonth.clone().startOf("week");
  const endDate = endOfMonth.clone().endOf("week");

  const calendarDays = [];
  let day = startDate.clone();
  while (day.isBefore(endDate)) {
    calendarDays.push(day.clone());
    day.add(1, "day");
  }

  // Selected date details
  const selectedGregorian = selectedDate.format("dddd, D MMMM YYYY");
  const selectedHijriDate = selectedDate.iDate();
  const selectedHijriMonthIndex = selectedDate.iMonth(); // 0-indexed
  const selectedHijriYear = selectedDate.iYear();
  const selectedMonthInfo = HIJRI_MONTHS[selectedHijriMonthIndex] || {
    en: selectedDate.format("iMMMM"),
    ar: "",
    sacred: false,
    holy: false,
  };
  const selectedHijriStr = `${selectedHijriDate} ${selectedMonthInfo.en} ${selectedHijriYear} AH`;
  const selectedHijriArabic = `${selectedHijriDate} ${selectedMonthInfo.ar} ${selectedHijriYear} ھ`;

  const isSelectedToday = selectedDate.isSame(moment(), "day");
  const isFriday = selectedDate.day() === 5;
  const isMonday = selectedDate.day() === 1;
  const isThursday = selectedDate.day() === 4;
  const isAyyamAlBeed = [13, 14, 15].includes(selectedHijriDate);
  const isSacredMonth = selectedMonthInfo.sacred;
  const isRamadan = selectedMonthInfo.holy || selectedHijriMonthIndex === 8;

  // Check if selected date corresponds to a specific major Islamic Event
  const selectedEventKey = `${String(selectedHijriDate).padStart(2, "0")}-${String(
    selectedHijriMonthIndex + 1
  ).padStart(2, "0")}`;
  const eventOnSelectedDay = ISLAMIC_EVENTS.find((e) => e.hijriDate === selectedEventKey);

  // Upcoming major Islamic events
  const upcomingEvents = useMemo(() => {
    return getUpcomingEvents(moment().iYear());
  }, []);

  // Countdowns to Ramadan & Eid
  const ramadanCountdown = useMemo(() => getRamadanCountdown(), []);
  const eidCountdown = useMemo(() => getEidCountdown(), []);

  // Helper to check if a calendar cell date has an Islamic Event
  const getEventForCell = (cellMoment: moment.Moment): IslamicEvent | undefined => {
    const key = `${String(cellMoment.iDate()).padStart(2, "0")}-${String(
      cellMoment.iMonth() + 1
    ).padStart(2, "0")}`;
    return ISLAMIC_EVENTS.find((e) => e.hijriDate === key);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor={Colors.background} />

      {/* Screen Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Islamic Calendar</Text>
          <Text style={styles.headerSubtitle}>تقویمِ ہجری</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Top Tab Switch: Calendar View | Islamic Events */}
        <View style={styles.tabSwitchContainer}>
          <TouchableOpacity
            style={[
              styles.tabSwitchBtn,
              activeTab === "Calendar View" && styles.tabSwitchBtnActive,
            ]}
            onPress={() => {
              void Haptics.selectionAsync();
              setActiveTab("Calendar View");
            }}
          >
            <Ionicons
              name="calendar"
              size={16}
              color={activeTab === "Calendar View" ? "#FFFFFF" : Colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.tabSwitchText,
                activeTab === "Calendar View" && styles.tabSwitchTextActive,
              ]}
            >
              Calendar View
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabSwitchBtn,
              activeTab === "Islamic Events" && styles.tabSwitchBtnActive,
            ]}
            onPress={() => {
              void Haptics.selectionAsync();
              setActiveTab("Islamic Events");
            }}
          >
            <Ionicons
              name="sparkles"
              size={16}
              color={activeTab === "Islamic Events" ? "#FFFFFF" : Colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.tabSwitchText,
                activeTab === "Islamic Events" && styles.tabSwitchTextActive,
              ]}
            >
              Islamic Events
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === "Calendar View" ? (
          <>
            {/* Month Header Switcher */}
            <View style={styles.monthHeaderRow}>
              <View style={styles.monthTitleBlock}>
                <TouchableOpacity onPress={handlePrevMonth} style={styles.monthNavBtn}>
                  <Ionicons name="chevron-back" size={20} color={Colors.primary} />
                </TouchableOpacity>
                <View style={styles.monthHeaderTextGroup}>
                  <Text style={styles.monthHeaderText}>{currentMonth.format("MMMM YYYY")}</Text>
                  <Text style={styles.monthHijriSubtext}>
                    {startOfMonth.format("iMMMM")} - {endOfMonth.format("iMMMM")} {endOfMonth.iYear()} AH
                  </Text>
                </View>
                <TouchableOpacity onPress={handleNextMonth} style={styles.monthNavBtn}>
                  <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
                </TouchableOpacity>
              </View>

              {!isSelectedToday && (
                <TouchableOpacity style={styles.todayPillBtn} onPress={handleGoToToday}>
                  <Ionicons name="today-outline" size={14} color={Colors.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.todayPillText}>Today</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Days of Week Row */}
            <View style={styles.daysOfWeekRow}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, idx) => (
                <Text
                  key={d}
                  style={[
                    styles.dayOfWeekText,
                    idx === 5 && styles.fridayDayOfWeekText, // Friday highlight
                  ]}
                >
                  {d}
                </Text>
              ))}
            </View>

            {/* Monthly Calendar Grid */}
            <View style={styles.calendarGrid}>
              {calendarDays.map((dItem, index) => {
                const isCurrentMonth = dItem.isSame(currentMonth, "month");
                const isSelected = dItem.isSame(selectedDate, "day");
                const isToday = dItem.isSame(moment(), "day");
                const isFri = dItem.day() === 5;
                const gDay = dItem.format("D");
                const hDay = dItem.iDate();
                const cellEvent = getEventForCell(dItem);
                const isCellBeed = [13, 14, 15].includes(hDay);

                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.calendarCell}
                    activeOpacity={0.7}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setSelectedDate(dItem);
                      if (!dItem.isSame(currentMonth, "month")) {
                        setCurrentMonth(dItem.clone().startOf("month"));
                      }
                    }}
                  >
                    <View
                      style={[
                        styles.dateCircle,
                        isToday && !isSelected && styles.dateCircleToday,
                        isSelected && styles.dateCircleSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.gregorianDayText,
                          !isCurrentMonth && styles.notCurrentMonthText,
                          isFri && !isSelected && styles.fridayDayText,
                          isSelected && styles.selectedDayText,
                        ]}
                      >
                        {gDay}
                      </Text>
                      <Text
                        style={[
                          styles.hijriDayText,
                          !isCurrentMonth && styles.notCurrentMonthText,
                          isSelected && styles.selectedHijriDayText,
                        ]}
                      >
                        {hDay}
                      </Text>
                    </View>

                    {/* Indicator Dots */}
                    <View style={styles.indicatorContainer}>
                      {cellEvent && <View style={styles.eventIndicatorDot} />}
                      {isToday && !isSelected && <View style={styles.todayIndicatorDot} />}
                      {isCellBeed && !cellEvent && !isToday && !isSelected && (
                        <View style={styles.beedIndicatorDot} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Selected Date Details Card */}
            <View style={styles.selectedDateCard}>
              <View style={styles.dateCardHeader}>
                <View style={styles.dateCardIconWrap}>
                  <Ionicons name="moon" size={22} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectedDateHijri}>{selectedHijriStr}</Text>
                  {selectedMonthInfo.ar ? (
                    <Text style={styles.selectedDateHijriArabic}>{selectedHijriArabic}</Text>
                  ) : null}
                  <Text style={styles.selectedDateGregorian}>{selectedGregorian}</Text>
                </View>
              </View>

              {/* Islamic Day Significance Badges */}
              <View style={styles.badgesRow}>
                {isFriday && (
                  <View style={[styles.badgePill, styles.badgeFriday]}>
                    <Ionicons name="star" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.badgeTextWhite}>Jummah Mubarak (جمعہ مبارک)</Text>
                  </View>
                )}

                {isAyyamAlBeed && (
                  <View style={[styles.badgePill, styles.badgeBeed]}>
                    <Ionicons name="sunny" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.badgeTextWhite}>Ayyam al-Beed (ایامِ بیض)</Text>
                  </View>
                )}

                {(isMonday || isThursday) && (
                  <View style={[styles.badgePill, styles.badgeSunnahFast]}>
                    <Ionicons name="heart" size={13} color="#0D7377" style={{ marginRight: 4 }} />
                    <Text style={styles.badgeTextTeal}>
                      {isMonday ? "Monday Sunnah Fast" : "Thursday Sunnah Fast"}
                    </Text>
                  </View>
                )}

                {isSacredMonth && (
                  <View style={[styles.badgePill, styles.badgeSacredMonth]}>
                    <Ionicons name="shield-checkmark" size={13} color="#D4A843" style={{ marginRight: 4 }} />
                    <Text style={styles.badgeTextGold}>Sacred Month (الشهر الحرام)</Text>
                  </View>
                )}

                {isRamadan && (
                  <View style={[styles.badgePill, styles.badgeRamadan]}>
                    <Ionicons name="moon" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.badgeTextWhite}>Holy Month of Ramadan</Text>
                  </View>
                )}
              </View>

              {/* Event Banner if selected day is an Islamic Event */}
              {eventOnSelectedDay && (
                <TouchableOpacity
                  style={styles.selectedDayEventBanner}
                  activeOpacity={0.8}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    router.push(`/calendar/event/${eventOnSelectedDay.id}`);
                  }}
                >
                  <View style={styles.eventBannerLeft}>
                    <Ionicons name="sparkles" size={20} color="#D4A843" style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.eventBannerTitle}>Special Occasion: {eventOnSelectedDay.title}</Text>
                      <Text style={styles.eventBannerDesc}>{eventOnSelectedDay.description}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#D4A843" />
                </TouchableOpacity>
              )}

              {/* Daily Guidance & Significance Box */}
              <View style={styles.guidanceBox}>
                <Ionicons name="book-outline" size={16} color={Colors.primary} style={{ marginRight: 8, marginTop: 1 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.guidanceTitle}>Islamic Significance of Today</Text>
                  <Text style={styles.guidanceText}>
                    {isFriday
                      ? "The best day upon which the sun has risen is Friday. It is recommended to send abundant blessings upon the Prophet (PBUH) and recite Surah Al-Kahf."
                      : isAyyamAlBeed
                      ? "The 13th, 14th, and 15th of the lunar month are the 'White Days'. Fasting during these days is equivalent to fasting the entire month (Sunan an-Nasa'i)."
                      : isMonday || isThursday
                      ? "Deeds are presented to Allah on Mondays and Thursdays; fasting on these days was the regular Sunnah of the Prophet Muhammad (PBUH)."
                      : isSacredMonth
                      ? "One of the four sacred months in Islam wherein righteous deeds carry magnified reward. Preserve good manners and avoid all wrongdoing."
                      : "A blessed day in the Islamic calendar. Begin with morning remembrance (Dhikr), maintain regular prayers, and perform acts of kindness."}
                  </Text>
                </View>
              </View>
            </View>

            {/* Sacred Countdowns Card: Ramadan & Eid */}
            <View style={styles.countdownCard}>
              <View style={styles.countdownCardHeader}>
                <Ionicons name="hourglass-outline" size={18} color={Colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.countdownCardTitle}>Sacred Occasions Countdown</Text>
              </View>

              <View style={styles.countdownGrid}>
                {ramadanCountdown && (
                  <View style={styles.countdownItem}>
                    <View style={styles.countdownIconWrap}>
                      <Ionicons name="moon" size={20} color={Colors.primary} />
                    </View>
                    <Text style={styles.countdownNumber}>
                      {ramadanCountdown.days > 0 ? ramadanCountdown.days : 0}
                    </Text>
                    <Text style={styles.countdownUnit}>Days</Text>
                    <Text style={styles.countdownLabel}>Until Ramadan</Text>
                  </View>
                )}

                {eidCountdown?.fitr !== null && (
                  <View style={styles.countdownItem}>
                    <View style={[styles.countdownIconWrap, { backgroundColor: "#FFF8E7" }]}>
                      <Ionicons name="sunny" size={20} color="#D4A843" />
                    </View>
                    <Text style={[styles.countdownNumber, { color: "#D4A843" }]}>
                      {eidCountdown.fitr! > 0 ? eidCountdown.fitr : 0}
                    </Text>
                    <Text style={styles.countdownUnit}>Days</Text>
                    <Text style={styles.countdownLabel}>Until Eid-ul-Fitr</Text>
                  </View>
                )}

                {eidCountdown?.adha !== null && (
                  <View style={styles.countdownItem}>
                    <View style={[styles.countdownIconWrap, { backgroundColor: "#EAF4F4" }]}>
                      <Ionicons name="gift" size={20} color={Colors.primary} />
                    </View>
                    <Text style={styles.countdownNumber}>
                      {eidCountdown.adha! > 0 ? eidCountdown.adha : 0}
                    </Text>
                    <Text style={styles.countdownUnit}>Days</Text>
                    <Text style={styles.countdownLabel}>Until Eid-ul-Adha</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Sacred Months & Fasting Guide Card */}
            <View style={styles.infoCard}>
              <View style={styles.infoCardHeader}>
                <Ionicons name="information-circle" size={18} color={Colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.infoCardTitle}>Islamic Calendar Guidelines</Text>
              </View>
              <Text style={styles.infoCardBody}>
                The Islamic (Hijri) calendar is a lunar calendar consisting of 12 months in a year of 354 or 355 days. Days begin at sunset (Maghrib). The four sacred months designated by the Holy Quran are Muharram, Rajab, Dhul-Qi'dah, and Dhul-Hijjah.
              </Text>
            </View>
          </>
        ) : (
          /* Islamic Events Tab */
          <View style={styles.eventsContainer}>
            <View style={styles.eventsHeaderBanner}>
              <Ionicons name="sparkles" size={20} color={Colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.eventsHeaderBannerText}>
                Major Islamic Events & Sacred Dates ({moment().iYear()} AH)
              </Text>
            </View>

            {upcomingEvents.map((event) => {
              const isPassed = event.daysRemaining < 0;
              const isToday = event.daysRemaining === 0;

              return (
                <TouchableOpacity
                  key={event.id}
                  style={styles.eventCard}
                  activeOpacity={0.8}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    router.push(`/calendar/event/${event.id}`);
                  }}
                >
                  <View style={styles.eventIconWrap}>
                    <Ionicons
                      name={
                        event.icon === "moon"
                          ? "moon"
                          : event.icon === "star" || event.icon === "sparkles"
                          ? "star"
                          : event.icon === "gift"
                          ? "gift-outline"
                          : event.icon === "water"
                          ? "water-outline"
                          : event.icon === "heart"
                          ? "heart-outline"
                          : "calendar-outline"
                      }
                      size={22}
                      color={Colors.primary}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.eventTitleRow}>
                      <Text style={styles.eventTitle}>{event.title}</Text>
                      <View
                        style={[
                          styles.countdownBadge,
                          isToday && styles.countdownBadgeToday,
                          isPassed && styles.countdownBadgePassed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.countdownBadgeText,
                            isToday && styles.countdownBadgeTodayText,
                            isPassed && styles.countdownBadgePassedText,
                          ]}
                        >
                          {isToday
                            ? "Today"
                            : event.daysRemaining === 1
                            ? "Tomorrow"
                            : isPassed
                            ? "Past"
                            : `In ${event.daysRemaining}d`}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.eventHijriDate}>
                      {event.hijriLabel || `${event.hijriDate} (Hijri)`} •{" "}
                      <Text style={styles.eventGregorianDate}>{event.formattedGregorian}</Text>
                    </Text>
                    <Text style={styles.eventDesc} numberOfLines={2}>
                      {event.description}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Safe Area Bottom Spacer */}
        <View style={{ height: Math.max(insets.bottom, 16) + 90 }} />
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    height: 54,
  },
  backBtn: {
    padding: 6,
  },
  headerCenter: {
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
    color: Colors.primary,
  },
  headerSubtitle: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: Colors.accent,
    marginTop: -4,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  /* Segmented Tab Switcher */
  tabSwitchContainer: {
    flexDirection: "row",
    backgroundColor: "#F0F4EC",
    borderRadius: 24,
    padding: 4,
    marginBottom: 16,
  },
  tabSwitchBtn: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  tabSwitchBtnActive: {
    backgroundColor: Colors.primary,
  },
  tabSwitchText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  tabSwitchTextActive: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
  },

  /* Month Header Switcher */
  monthHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  monthTitleBlock: {
    flexDirection: "row",
    alignItems: "center",
  },
  monthNavBtn: {
    padding: 6,
  },
  monthHeaderTextGroup: {
    marginHorizontal: 8,
  },
  monthHeaderText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 16,
    color: "#1A2E1A",
  },
  monthHijriSubtext: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: Colors.primary,
    marginTop: -2,
  },
  todayPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: "#EAF4F4",
    borderWidth: 1,
    borderColor: "#D2E9E9",
  },
  todayPillText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: Colors.primary,
  },

  /* Days of Week */
  daysOfWeekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  dayOfWeekText: {
    width: 42,
    textAlign: "center",
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  fridayDayOfWeekText: {
    color: Colors.primary,
    fontFamily: "Poppins_700Bold",
  },

  /* Monthly Calendar Grid */
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 8,
    borderWidth: 1,
    borderColor: "#EAEFE8",
    marginBottom: 16,
  },
  calendarCell: {
    width: "14%",
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  dateCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  dateCircleToday: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: "#F4FAF9",
  },
  dateCircleSelected: {
    backgroundColor: Colors.primary,
  },
  gregorianDayText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#1A2E1A",
  },
  fridayDayText: {
    color: Colors.primary,
  },
  hijriDayText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 9.5,
    color: "#8A998A",
    marginTop: -2,
  },
  notCurrentMonthText: {
    opacity: 0.28,
  },
  selectedDayText: {
    color: "#FFFFFF",
  },
  selectedHijriDayText: {
    color: "rgba(255, 255, 255, 0.85)",
  },
  indicatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 2,
    height: 5,
  },
  todayIndicatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  eventIndicatorDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.accent,
  },
  beedIndicatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#27AE60",
  },

  /* Selected Date Details Card */
  selectedDateCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EAEFE8",
    marginBottom: 14,
  },
  dateCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F4EC",
  },
  dateCardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  selectedDateHijri: {
    fontFamily: "Poppins_700Bold",
    fontSize: 16,
    color: "#1A2E1A",
  },
  selectedDateHijriArabic: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: Colors.accent,
    marginTop: -2,
  },
  selectedDateGregorian: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },

  /* Badges Row */
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 12,
  },
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeFriday: {
    backgroundColor: Colors.primary,
  },
  badgeBeed: {
    backgroundColor: "#27AE60",
  },
  badgeSunnahFast: {
    backgroundColor: "#EAF4F4",
    borderWidth: 1,
    borderColor: "#CBE8E8",
  },
  badgeSacredMonth: {
    backgroundColor: "#FFF9E6",
    borderWidth: 1,
    borderColor: "#F4E09E",
  },
  badgeRamadan: {
    backgroundColor: "#095456",
  },
  badgeTextWhite: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
    color: "#FFFFFF",
  },
  badgeTextTeal: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
    color: Colors.primary,
  },
  badgeTextGold: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
    color: "#9C7820",
  },

  /* Selected Day Event Banner */
  selectedDayEventBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFBF0",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#F7E3A9",
  },
  eventBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  eventBannerTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 13.5,
    color: "#7D5D0C",
    marginBottom: 2,
  },
  eventBannerDesc: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    color: "#6E5B26",
    lineHeight: 16,
  },

  /* Guidance Box */
  guidanceBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F4FAF9",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#D8EFEF",
  },
  guidanceTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12.5,
    color: Colors.primary,
    marginBottom: 3,
  },
  guidanceText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    color: Colors.textSecondary,
    lineHeight: 17,
  },

  /* Countdowns Card */
  countdownCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EAEFE8",
    marginBottom: 14,
  },
  countdownCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  countdownCardTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#1A2E1A",
  },
  countdownGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  countdownItem: {
    flex: 1,
    backgroundColor: "#FAFBF8",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEF2E8",
  },
  countdownIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EAF4F4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  countdownNumber: {
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
    color: Colors.primary,
  },
  countdownUnit: {
    fontFamily: "Poppins_400Regular",
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: -2,
    marginBottom: 2,
  },
  countdownLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 10,
    color: Colors.textSecondary,
    textAlign: "center",
  },

  /* Info Card */
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EAEFE8",
    marginBottom: 14,
  },
  infoCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  infoCardTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#1A2E1A",
  },
  infoCardBody: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    color: Colors.textSecondary,
    lineHeight: 17,
  },

  /* Islamic Events Tab Styles */
  eventsContainer: {
    gap: 10,
  },
  eventsHeaderBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EAF4F4",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#D2E8E8",
  },
  eventsHeaderBannerText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12.5,
    color: Colors.primary,
    flex: 1,
  },
  eventCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EAEFE8",
    alignItems: "center",
  },
  eventIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EAF4F4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  eventTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  eventTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 14,
    color: "#1A2E1A",
    flex: 1,
    marginRight: 6,
  },
  countdownBadge: {
    backgroundColor: "#F0F4EC",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countdownBadgeToday: {
    backgroundColor: "#27AE60",
  },
  countdownBadgePassed: {
    backgroundColor: "#EEEEEE",
  },
  countdownBadgeText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 10.5,
    color: Colors.primary,
  },
  countdownBadgeTodayText: {
    color: "#FFFFFF",
  },
  countdownBadgePassedText: {
    color: Colors.textMuted,
  },
  eventHijriDate: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11.5,
    color: Colors.primary,
    marginBottom: 3,
  },
  eventGregorianDate: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: Colors.textSecondary,
  },
  eventDesc: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
});

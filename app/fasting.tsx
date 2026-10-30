import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import * as Clipboard from "expo-clipboard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import moment from "moment-hijri";
import Colors from "@/constants/colors";
import { useLocation } from "@/lib/location-context";
import { usePrimaryMasjid } from "@/lib/primary-masjid-context";
import { calculateSolarPrayerTimes, getCoordsForCity, formatTo12Hour } from "@/lib/prayer-calculation";
import { showCustomAlert } from "@/lib/custom-alert";

const FASTING_TRACKER_KEY = "@fasting_logged_days_v1";

export default function FastingScreen() {
  const insets = useSafeAreaInsets();
  const { selectedCity, openLocationModal } = useLocation();
  const { primaryMasjid } = usePrimaryMasjid();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [loggedDays, setLoggedDays] = useState<string[]>([]);
  const [activeFaq, setActiveFaq] = useState<string | null>("faq_valid");

  // Keep live time clock ticking every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load logged fasts
  const loadFastingLog = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem(FASTING_TRACKER_KEY);
      if (data) {
        setLoggedDays(JSON.parse(data));
      }
    } catch (e) {
      console.error("Error loading fasting log:", e);
    }
  }, []);

  useEffect(() => {
    loadFastingLog();
  }, [loadFastingLog]);

  // Today key
  const todayKey = moment(currentTime).format("YYYY-MM-DD");
  const isFastedToday = loggedDays.includes(todayKey);

  // Toggle log for today
  const handleToggleFastToday = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    let updated: string[];
    if (isFastedToday) {
      updated = loggedDays.filter((d) => d !== todayKey);
      showCustomAlert("Fast Unmarked", "Today's fast record has been removed.");
    } else {
      updated = [...loggedDays, todayKey];
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showCustomAlert("Alhamdulillah! Fast Logged", "May Allah accept your fast and righteous deeds.");
    }
    setLoggedDays(updated);
    await AsyncStorage.setItem(FASTING_TRACKER_KEY, JSON.stringify(updated));
  };

  // Solar calculations for today
  const cityCoords = useMemo(() => getCoordsForCity(selectedCity), [selectedCity]);
  const solarTimes = useMemo(() => calculateSolarPrayerTimes(currentTime, cityCoords), [currentTime, cityCoords]);

  // Determine effective Sehri and Iftar
  const effectiveSehri = primaryMasjid?.timetable?.sehri || solarTimes.sehri;
  const effectiveIftar = primaryMasjid?.timetable?.iftar || solarTimes.maghrib;

  // Calculate live countdown to either Sehri or Iftar
  const countdownInfo = useMemo(() => {
    const nowMs = currentTime.getTime();

    // Construct Today's Sehri Date object
    const [sehriH, sehriM] = (effectiveSehri || "05:00").split(":").map(Number);
    const sehriDate = new Date(
      currentTime.getFullYear(),
      currentTime.getMonth(),
      currentTime.getDate(),
      sehriH,
      sehriM,
      0
    );

    // Construct Today's Iftar Date object
    const [iftarH, iftarM] = (effectiveIftar || "18:30").split(":").map(Number);
    const iftarDate = new Date(
      currentTime.getFullYear(),
      currentTime.getMonth(),
      currentTime.getDate(),
      iftarH,
      iftarM,
      0
    );

    // Is currently between Sehri and Iftar?
    const isFastingNow = nowMs >= sehriDate.getTime() && nowMs < iftarDate.getTime();

    let targetDate: Date;
    let title: string;
    let subtitle: string;
    let isCountForIftar = false;

    if (isFastingNow) {
      targetDate = iftarDate;
      title = "Time Remaining to Iftar";
      subtitle = "افطار میں باقی وقت • Break fast at Sunset";
      isCountForIftar = true;
    } else if (nowMs < sehriDate.getTime()) {
      targetDate = sehriDate;
      title = "Time Remaining to Sehri";
      subtitle = "سحری ختم ہونے میں باقی وقت • Stop eating before Fajr";
    } else {
      // After Iftar today, target tomorrow's Sehri
      const tomorrowSehri = new Date(
        currentTime.getFullYear(),
        currentTime.getMonth(),
        currentTime.getDate() + 1,
        sehriH,
        sehriM,
        0
      );
      targetDate = tomorrowSehri;
      title = "Time to Tomorrow's Sehri";
      subtitle = "کل کی سحری میں باقی وقت • Prepare for next fast";
    }

    const diffMs = Math.max(0, targetDate.getTime() - nowMs);
    const totalSecs = Math.floor(diffMs / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    // Progress percentage if fasting
    let progressPct = 0;
    if (isFastingNow) {
      const totalFastMs = iftarDate.getTime() - sehriDate.getTime();
      const elapsedMs = nowMs - sehriDate.getTime();
      progressPct = Math.min(100, Math.max(0, Math.round((elapsedMs / totalFastMs) * 100)));
    }

    return {
      isFastingNow,
      isCountForIftar,
      title,
      subtitle,
      hrs: hrs.toString().padStart(2, "0"),
      mins: mins.toString().padStart(2, "0"),
      secs: secs.toString().padStart(2, "0"),
      progressPct,
    };
  }, [currentTime, effectiveSehri, effectiveIftar]);

  // Islamic date info
  const m = moment(currentTime);
  const hijriDay = m.iDate();
  const hijriMonth = m.format("iMMMM");
  const hijriYear = m.iYear();
  const dayOfWeek = currentTime.getDay(); // 0 = Sun, 1 = Mon, 4 = Thu
  const isMondayOrThursday = dayOfWeek === 1 || dayOfWeek === 4;
  const isAyyamAlBeed = [13, 14, 15].includes(hijriDay);

  // Copy helper
  const handleCopyDua = async (title: string, arabic: string, translit: string, trans: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard.setStringAsync(`${title}\n\n${arabic}\n\n${translit}\n\n"${trans}"`);
    showCustomAlert("Copied to Clipboard", `${title} copied successfully.`);
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
          <Text style={styles.headerTitle}>Fasting & Ramadan</Text>
          <Text style={styles.headerSubtitle}>صوم و افطار • اوقات اور دعائیں</Text>
        </View>
        <TouchableOpacity
          style={styles.locationChip}
          onPress={openLocationModal}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="location" size={12} color={Colors.primary} style={{ marginRight: 3 }} />
          <Text style={styles.locationChipText} numberOfLines={1}>
            {selectedCity || "Rampur"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 40 },
        ]}
      >
        {/* Today's Live Countdown Card */}
        <View style={styles.liveCountdownCard}>
          <View style={styles.countdownStatusRow}>
            <View style={styles.statusBadge}>
              <View
                style={[
                  styles.statusDot,
                  countdownInfo.isFastingNow ? styles.statusDotActive : styles.statusDotRest,
                ]}
              />
              <Text style={styles.statusBadgeText}>
                {countdownInfo.isFastingNow ? "Currently Fasting" : "Non-Fasting Hours"}
              </Text>
            </View>

            <Text style={styles.hijriHeaderDate}>
              {hijriDay} {hijriMonth} {hijriYear} AH
            </Text>
          </View>

          <Text style={styles.countdownMainTitle}>{countdownInfo.title}</Text>
          <Text style={styles.countdownSubtitle}>{countdownInfo.subtitle}</Text>

          {/* Time Digits Clock */}
          <View style={styles.clockRow}>
            <View style={styles.digitBox}>
              <Text style={styles.digitValue}>{countdownInfo.hrs}</Text>
              <Text style={styles.digitLabel}>Hours</Text>
            </View>
            <Text style={styles.colonSeparator}>:</Text>
            <View style={styles.digitBox}>
              <Text style={styles.digitValue}>{countdownInfo.mins}</Text>
              <Text style={styles.digitLabel}>Minutes</Text>
            </View>
            <Text style={styles.colonSeparator}>:</Text>
            <View style={styles.digitBox}>
              <Text style={styles.digitValue}>{countdownInfo.secs}</Text>
              <Text style={styles.digitLabel}>Seconds</Text>
            </View>
          </View>

          {/* Progress Bar (if fasting) */}
          {countdownInfo.isFastingNow && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBackground}>
                <View style={[styles.progressBarFill, { width: `${countdownInfo.progressPct}%` }]} />
              </View>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressLabelText}>Fast Progress</Text>
                <Text style={styles.progressPercentText}>{countdownInfo.progressPct}% completed</Text>
              </View>
            </View>
          )}

          {/* Sehri & Iftar Quick Row */}
          <View style={styles.timingPillsRow}>
            <View style={styles.timingPill}>
              <View style={[styles.timingIconWrap, { backgroundColor: "#EAF4F4" }]}>
                <Ionicons name="alarm-outline" size={16} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.timingLabel}>Sehri Ends (سحری)</Text>
                <Text style={styles.timingTime}>{formatTo12Hour(effectiveSehri)}</Text>
              </View>
            </View>

            <View style={styles.timingPill}>
              <View style={[styles.timingIconWrap, { backgroundColor: "#FFF8E7" }]}>
                <Ionicons name="restaurant-outline" size={16} color="#D97706" />
              </View>
              <View>
                <Text style={styles.timingLabel}>Iftar Time (افطار)</Text>
                <Text style={styles.timingTimeGold}>{formatTo12Hour(effectiveIftar)}</Text>
              </View>
            </View>
          </View>

          {/* Primary Masjid Notice */}
          <View style={styles.masjidNoticeRow}>
            <Ionicons name="business-outline" size={13} color={Colors.primary} style={{ marginRight: 5 }} />
            <Text style={styles.masjidNoticeText}>
              Times for: <Text style={styles.masjidNoticeBold}>{primaryMasjid?.name || selectedCity || "Rampur"}</Text>
            </Text>
          </View>
        </View>

        {/* Voluntary / Sunnah Fasting Banner (if applicable) */}
        {(isMondayOrThursday || isAyyamAlBeed) && (
          <View style={styles.sunnahDayBanner}>
            <Ionicons name="sparkles" size={18} color="#D4A843" style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.sunnahBannerTitle}>
                {isAyyamAlBeed
                  ? "Ayyam al-Beed (White Days Fasting) Today!"
                  : "Sunnah Fasting Day Today!"}
              </Text>
              <Text style={styles.sunnahBannerDesc}>
                {isAyyamAlBeed
                  ? "The 13th, 14th, and 15th of the lunar month carry the reward of fasting the whole year."
                  : "The Prophet (PBUH) regularly fasted on Mondays and Thursdays."}
              </Text>
            </View>
          </View>
        )}

        {/* Interactive Fasting Tracker Card */}
        <View style={styles.trackerCard}>
          <View style={styles.trackerHeaderRow}>
            <View>
              <Text style={styles.trackerTitle}>Daily Fasting Tracker</Text>
              <Text style={styles.trackerSubtitle}>Track and log your completed fasts</Text>
            </View>
            <View style={styles.trackerCounterBadge}>
              <Text style={styles.trackerCounterNum}>{loggedDays.length}</Text>
              <Text style={styles.trackerCounterLabel}>Fasts Logged</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.trackerLogBtn, isFastedToday && styles.trackerLogBtnDone]}
            activeOpacity={0.85}
            onPress={handleToggleFastToday}
          >
            <Ionicons
              name={isFastedToday ? "checkmark-circle" : "checkbox-outline"}
              size={20}
              color={isFastedToday ? "#FFFFFF" : Colors.primary}
              style={{ marginRight: 8 }}
            />
            <Text style={[styles.trackerLogBtnText, isFastedToday && styles.trackerLogBtnTextDone]}>
              {isFastedToday ? "Today's Fast Logged (Completed ✓)" : "Mark Today as Fasted"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Essential Fasting Duas Section */}
        <View style={styles.duasSectionCard}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="book-outline" size={18} color={Colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitle}>Essential Fasting Duas (مسنون دعائیں)</Text>
          </View>

          {/* Dua 1: Niyyah for Fasting */}
          <View style={styles.duaItemCard}>
            <View style={styles.duaItemHeader}>
              <View style={styles.duaBadgeTeal}>
                <Text style={styles.duaBadgeText}>Sehri Niyyah</Text>
              </View>
              <Text style={styles.duaItemTitle}>Intention for Fasting (روزے کی نیت)</Text>
              <TouchableOpacity
                onPress={() =>
                  handleCopyDua(
                    "Fasting Intention (Niyyah)",
                    "وَبِصَوْمِ غَدٍ نَّوَيْتُ مِنْ شَهْرِ رَمَضَانَ",
                    "Wa bisawmi ghadin nawaytu min shahri Ramadan",
                    "I intend to keep the fast for tomorrow in the month of Ramadan."
                  )
                }
                style={styles.copyDuaBtn}
              >
                <Ionicons name="copy-outline" size={16} color={Colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.arabicDuaBox}>
              <Text style={styles.arabicDuaText}>وَبِصَوْمِ غَدٍ نَّوَيْتُ مِنْ شَهْرِ رَمَضَانَ</Text>
            </View>
            <Text style={styles.translitDuaText}>Wa bisawmi ghadin nawaytu min shahri Ramadan</Text>
            <Text style={styles.transDuaText}>
              "I intend to keep the fast for tomorrow in the month of Ramadan."
            </Text>
          </View>

          {/* Dua 2: Sunnah Iftar Dua */}
          <View style={styles.duaItemCard}>
            <View style={styles.duaItemHeader}>
              <View style={styles.duaBadgeGold}>
                <Text style={styles.duaBadgeGoldText}>Sunnah Iftar</Text>
              </View>
              <Text style={styles.duaItemTitle}>Dua when Breaking Fast (افطار کی مسنون دعا)</Text>
              <TouchableOpacity
                onPress={() =>
                  handleCopyDua(
                    "Sunnah Iftar Dua",
                    "ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ وَثَبَتَ الْأَجْرُ إِنْ شَاءَ اللَّهُ",
                    "Dhahabadh-dhama'u wabtallatil-'urooqu wa thabatal-ajru in sha' Allah",
                    "The thirst has gone, the veins are moistened, and the reward is confirmed, if Allah wills."
                  )
                }
                style={styles.copyDuaBtn}
              >
                <Ionicons name="copy-outline" size={16} color={Colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.arabicDuaBox}>
              <Text style={styles.arabicDuaText}>
                ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ وَثَبَتَ الْأَجْرُ إِنْ شَاءَ اللَّهُ
              </Text>
            </View>
            <Text style={styles.translitDuaText}>
              Dhahabadh-dhama'u wabtallatil-'urooqu wa thabatal-ajru in sha' Allah
            </Text>
            <Text style={styles.transDuaText}>
              "The thirst has gone, the veins are moistened, and the reward is confirmed, if Allah wills."
            </Text>
            <Text style={styles.sourceDuaText}>— Sunan Abu Dawud (2357)</Text>
          </View>

          {/* Dua 3: Alternate Iftar Dua */}
          <View style={[styles.duaItemCard, { marginBottom: 0 }]}>
            <View style={styles.duaItemHeader}>
              <View style={styles.duaBadgeGold}>
                <Text style={styles.duaBadgeGoldText}>Iftar Dua</Text>
              </View>
              <Text style={styles.duaItemTitle}>Alternate Iftar Supplication</Text>
              <TouchableOpacity
                onPress={() =>
                  handleCopyDua(
                    "Iftar Supplication",
                    "اللَّهُمَّ إِنِّي لَكَ صُمْتُ، وَعَلَى رِزْقِكَ أَفْطَرْتُ",
                    "Allahumma innee laka sumtu wa 'ala rizqika aftartu",
                    "O Allah, I fasted for You, and upon Your provision I have broken my fast."
                  )
                }
                style={styles.copyDuaBtn}
              >
                <Ionicons name="copy-outline" size={16} color={Colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.arabicDuaBox}>
              <Text style={styles.arabicDuaText}>اللَّهُمَّ إِنِّي لَكَ صُمْتُ، وَعَلَى رِزْقِكَ أَفْطَرْتُ</Text>
            </View>
            <Text style={styles.translitDuaText}>Allahumma innee laka sumtu wa 'ala rizqika aftartu</Text>
            <Text style={styles.transDuaText}>
              "O Allah, I fasted for You, and upon Your provision I have broken my fast."
            </Text>
            <Text style={styles.sourceDuaText}>— Sunan Abu Dawud (2358)</Text>
          </View>
        </View>

        {/* Fasting Rules & Guidelines Accordions */}
        <View style={styles.faqSectionCard}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitle}>Essential Fasting Rulings (مسائلِ صوم)</Text>
          </View>

          {/* Accordion 1: What Invalidates */}
          <TouchableOpacity
            style={styles.accordionHeader}
            activeOpacity={0.8}
            onPress={() => setActiveFaq(activeFaq === "faq_invalid" ? null : "faq_invalid")}
          >
            <Text style={styles.accordionTitle}>What Breaks the Fast (مفطراتِ صوم)</Text>
            <Ionicons
              name={activeFaq === "faq_invalid" ? "chevron-up" : "chevron-down"}
              size={18}
              color={Colors.primary}
            />
          </TouchableOpacity>
          {activeFaq === "faq_invalid" && (
            <View style={styles.accordionBody}>
              <Text style={styles.accordionBodyText}>
                • Deliberately eating or drinking anything after Sehri ends until Sunset.{"\n"}
                • Deliberately inducing vomiting in large amounts.{"\n"}
                • Marital intimacy during the fasting daylight hours.{"\n"}
                • Ingestion of medicinal nutritive fluids or intravenous nutritional drips.
              </Text>
            </View>
          )}

          {/* Accordion 2: What DOES NOT Invalidate */}
          <TouchableOpacity
            style={styles.accordionHeader}
            activeOpacity={0.8}
            onPress={() => setActiveFaq(activeFaq === "faq_valid" ? null : "faq_valid")}
          >
            <Text style={styles.accordionTitle}>What Does NOT Break the Fast (جو روزہ نہیں توڑتے)</Text>
            <Ionicons
              name={activeFaq === "faq_valid" ? "chevron-up" : "chevron-down"}
              size={18}
              color={Colors.primary}
            />
          </TouchableOpacity>
          {activeFaq === "faq_valid" && (
            <View style={styles.accordionBody}>
              <Text style={styles.accordionBodyText}>
                • Eating or drinking forgetfully (stop immediately once remembered; your fast is complete).{"\n"}
                • Using a dry Miswak or brushing teeth carefully without swallowing paste.{"\n"}
                • Eye drops, ear drops, or smelling perfume.{"\n"}
                • Blood tests, non-nutritional medical injections, and cupping.{"\n"}
                • Rinsing mouth and nose in Wudu without excessive inhalation.{"\n"}
                • Swallowing saliva naturally.
              </Text>
            </View>
          )}

          {/* Accordion 3: Exemptions & Qada */}
          <TouchableOpacity
            style={styles.accordionHeader}
            activeOpacity={0.8}
            onPress={() => setActiveFaq(activeFaq === "faq_exempt" ? null : "faq_exempt")}
          >
            <Text style={styles.accordionTitle}>Exemptions & Making Up Fasts (قضاء اور فدیہ)</Text>
            <Ionicons
              name={activeFaq === "faq_exempt" ? "chevron-up" : "chevron-down"}
              size={18}
              color={Colors.primary}
            />
          </TouchableOpacity>
          {activeFaq === "faq_exempt" && (
            <View style={styles.accordionBody}>
              <Text style={styles.accordionBodyText}>
                • Travelers and those with temporary illness may break fast and make up (Qada) equivalent days after Ramadan.{"\n"}
                • Pregnant or nursing mothers who fear for their or their baby's health are exempt and make up missed days later.{"\n"}
                • Those with chronic, incurable conditions or frail elderly pay Fidyah (feeding one poor person per day).
              </Text>
            </View>
          )}
        </View>

        {/* Safe Area Spacer */}
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
    paddingHorizontal: 16,
    height: 52,
  },
  backBtn: {
    padding: 6,
  },
  headerCenter: {
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 17,
    color: Colors.primary,
  },
  headerSubtitle: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: Colors.accent,
    marginTop: -3,
  },
  locationChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F7F7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D2EAEA",
    maxWidth: 95,
  },
  locationChipText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: Colors.primary,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  /* Live Countdown Card */
  liveCountdownCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EAEFE8",
    marginBottom: 14,
  },
  countdownStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFBF8",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEF2E8",
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  statusDotActive: {
    backgroundColor: "#27AE60",
  },
  statusDotRest: {
    backgroundColor: "#D97706",
  },
  statusBadgeText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
    color: "#1A2E1A",
  },
  hijriHeaderDate: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11.5,
    color: Colors.primary,
  },
  countdownMainTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 16,
    color: "#1A2E1A",
    textAlign: "center",
    marginTop: 2,
  },
  countdownSubtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 14,
  },

  /* Clock Digits */
  clockRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  digitBox: {
    backgroundColor: "#F4FAF9",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D2E8E8",
    minWidth: 70,
  },
  digitValue: {
    fontFamily: "Poppins_700Bold",
    fontSize: 26,
    color: Colors.primary,
  },
  digitLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: -2,
    textTransform: "uppercase",
  },
  colonSeparator: {
    fontFamily: "Poppins_700Bold",
    fontSize: 22,
    color: Colors.primary,
    marginHorizontal: 8,
    marginTop: -12,
  },

  /* Progress Bar */
  progressContainer: {
    marginBottom: 14,
  },
  progressBarBackground: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EAF4F4",
    overflow: "hidden",
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  progressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  progressLabelText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 10.5,
    color: Colors.textMuted,
  },
  progressPercentText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 10.5,
    color: Colors.primary,
  },

  /* Timing Pills */
  timingPillsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  timingPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFBF8",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#EEF2E8",
  },
  timingIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  timingLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 10.5,
    color: Colors.textSecondary,
  },
  timingTime: {
    fontFamily: "Poppins_700Bold",
    fontSize: 13.5,
    color: Colors.primary,
  },
  timingTimeGold: {
    fontFamily: "Poppins_700Bold",
    fontSize: 13.5,
    color: "#D97706",
  },
  masjidNoticeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#F4F7F2",
  },
  masjidNoticeText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: Colors.textSecondary,
  },
  masjidNoticeBold: {
    fontFamily: "Poppins_600SemiBold",
    color: Colors.primary,
  },

  /* Voluntary Sunnah Banner */
  sunnahDayBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBF0",
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#F7E3A9",
  },
  sunnahBannerTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 13,
    color: "#7D5D0C",
    marginBottom: 2,
  },
  sunnahBannerDesc: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: "#6E5B26",
    lineHeight: 15,
  },

  /* Tracker Card */
  trackerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EAEFE8",
    marginBottom: 14,
  },
  trackerHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  trackerTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 14.5,
    color: "#1A2E1A",
  },
  trackerSubtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    color: Colors.textMuted,
  },
  trackerCounterBadge: {
    backgroundColor: "#EAF4F4",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D2E8E8",
  },
  trackerCounterNum: {
    fontFamily: "Poppins_700Bold",
    fontSize: 15,
    color: Colors.primary,
  },
  trackerCounterLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 9.5,
    color: Colors.primary,
  },
  trackerLogBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F7F7",
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#D2EAEA",
  },
  trackerLogBtnDone: {
    backgroundColor: "#27AE60",
    borderColor: "#27AE60",
  },
  trackerLogBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: Colors.primary,
  },
  trackerLogBtnTextDone: {
    color: "#FFFFFF",
  },

  /* Duas Section */
  duasSectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EAEFE8",
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 14.5,
    color: "#1A2E1A",
  },
  duaItemCard: {
    backgroundColor: "#FAFBF8",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#EEF2E8",
    marginBottom: 12,
  },
  duaItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  duaBadgeTeal: {
    backgroundColor: "#EAF4F4",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 6,
  },
  duaBadgeText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 10,
    color: Colors.primary,
  },
  duaBadgeGold: {
    backgroundColor: "#FFF8E7",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 6,
  },
  duaBadgeGoldText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 10,
    color: "#D97706",
  },
  duaItemTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12.5,
    color: "#1A2E1A",
    flex: 1,
  },
  copyDuaBtn: {
    padding: 4,
  },
  arabicDuaBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#F0F4EC",
  },
  arabicDuaText: {
    fontFamily: "Amiri_700Bold",
    fontSize: 20,
    lineHeight: 34,
    color: Colors.primary,
    textAlign: "right",
    writingDirection: "rtl",
  },
  translitDuaText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    color: "#475569",
    fontStyle: "italic",
    marginBottom: 4,
    lineHeight: 16,
  },
  transDuaText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "#1A2E1A",
    lineHeight: 17,
  },
  sourceDuaText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 10.5,
    color: Colors.textMuted,
    marginTop: 4,
  },

  /* FAQ Accordion Section */
  faqSectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EAEFE8",
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F4EC",
  },
  accordionTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#1A2E1A",
    flex: 1,
    marginRight: 8,
  },
  accordionBody: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: "#FAFBF8",
    borderRadius: 10,
    marginVertical: 4,
  },
  accordionBodyText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});


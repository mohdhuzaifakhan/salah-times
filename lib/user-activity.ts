import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Moment } from "moment";
import moment from "moment-hijri";
import { DEFAULT_AMAL_LIST } from "./amal";
import {
  ALL_DUAS,
  getDuaRecitationsMonth,
  getDuaRecitationsTotal,
} from "./duas-data";
import { LOCAL_QURAN_KEYS } from "./quran/db";
import {
  getTasbihMonthCount,
  loadTasbihCounts,
  loadTasbihStats,
  TASBIH_ITEMS,
} from "./tasbih-data";

const FASTING_TRACKER_KEY = "@fasting_logged_days_v1";
const SAVED_DUAS_KEY = "@user_saved_duas_ids";
const AMAL_STORAGE_PREFIX = "@salah_times_amal_";

export interface UserMonthlyActivity {
  monthKey: string; // e.g. "2026-10"
  monthName: string; // e.g. "October 2026"
  isCurrentMonth: boolean;
  tasbih: {
    monthTotal: number;
    totalLifetime: number;
    todayCount: number;
    dhikrBreakdown: { id: string; title: string; arabic?: string; count: number }[];
    topDhikr: { title: string; count: number } | null;
  };
  quran: {
    lastReadPage: number | null;
    monthPagesRead: number;
    totalBookmarks: number;
    pageBookmarksCount: number;
    completionPercentage: number;
  };
  duas: {
    monthRecitations: number;
    totalRecitations: number;
    totalSaved: number;
    savedDuas: { id: string; title: string; category: string }[];
  };
  fasting: {
    monthFastsCount: number;
    totalLifetimeFasts: number;
    fastedDatesThisMonth: string[];
    currentStreak: number;
  };
  amal: {
    todayCompletedCount: number;
    totalAmalItems: number;
    monthlyEstimatedCompletions: number;
  };
}

/**
 * Loads comprehensive user activity stats cached in the phone for any selected month
 */
export async function loadUserMonthlyActivity(
  selectedMonth: Moment = moment()
): Promise<UserMonthlyActivity> {
  const monthKey = selectedMonth.format("YYYY-MM");
  const monthName = selectedMonth.format("MMMM YYYY");
  const isCurrentMonth = selectedMonth.isSame(moment(), "month");

  // ========================================================================
  // 1. TASBIH ACTIVITY
  // ========================================================================
  let tasbihLifetime = 0;
  let tasbihToday = 0;
  let tasbihMonth = 0;
  let dhikrBreakdown: { id: string; title: string; arabic?: string; count: number }[] = [];
  let topDhikr: { title: string; count: number } | null = null;

  try {
    const [countsRes, statsRes, monthCountRes] = await Promise.all([
      loadTasbihCounts().catch(() => ({})),
      loadTasbihStats().catch(() => ({ todayCount: 0, totalCount: 0, lastDate: "" })),
      getTasbihMonthCount(monthKey).catch(() => 0),
    ]);

    const counts = ((countsRes && typeof countsRes === "object") ? countsRes : {}) as Record<string, number>;
    const stats: any = (statsRes && typeof statsRes === "object") ? statsRes : { todayCount: 0, totalCount: 0 };
    const monthCount = typeof monthCountRes === "number" ? monthCountRes : 0;

    tasbihLifetime = typeof stats.totalCount === "number" ? stats.totalCount : 0;
    tasbihToday = typeof stats.todayCount === "number" ? stats.todayCount : 0;
    tasbihMonth = monthCount;

    // Map counts to tasbih titles
    const list: { id: string; title: string; arabic?: string; count: number }[] = [];
    let maxCount = 0;

    const tasbihList = Array.isArray(TASBIH_ITEMS) ? TASBIH_ITEMS : [];
    for (const item of tasbihList) {
      if (!item || !item.id) continue;
      const c = (counts && typeof counts[item.id] === "number") ? counts[item.id] : 0;
      if (c > 0) {
        const itemTitle = item.name || item.id;
        list.push({
          id: item.id,
          title: itemTitle,
          arabic: item.arabic || "",
          count: c,
        });
        if (c > maxCount) {
          maxCount = c;
          topDhikr = { title: itemTitle, count: c };
        }
      }
    }

    // Sort by count descending
    dhikrBreakdown = list.sort((a, b) => b.count - a.count);

    // Fallbacks if totalLifetime is 0 but individual items have counts
    if (tasbihLifetime === 0 && list.length > 0) {
      tasbihLifetime = list.reduce((sum, item) => sum + item.count, 0);
    }

    if (tasbihMonth === 0 && isCurrentMonth) {
      tasbihMonth = tasbihLifetime;
    }
  } catch (err) {
    console.error("Error loading tasbih activity:", err);
  }

  let lastReadPage: number | null = null;
  let monthPagesRead = 0;
  let totalBookmarks = 0;
  let pageBookmarksCount = 0;
  let completionPercentage = 0;

  try {
    const monthlyPagesKey = `${LOCAL_QURAN_KEYS.MONTHLY_PAGES_PREFIX}${monthKey}`;
    const [lastPageRaw, bookmarksRaw, pageBookmarksRaw, monthlyPagesRaw] = await Promise.all([
      AsyncStorage.getItem(LOCAL_QURAN_KEYS.LAST_READ_PAGE),
      AsyncStorage.getItem(LOCAL_QURAN_KEYS.BOOKMARKS),
      AsyncStorage.getItem(LOCAL_QURAN_KEYS.PAGE_BOOKMARKS),
      AsyncStorage.getItem(monthlyPagesKey),
    ]);

    if (lastPageRaw) {
      lastReadPage = parseInt(lastPageRaw, 10);
      if (!isNaN(lastReadPage)) {
        completionPercentage = Math.min(100, Math.round((lastReadPage / 604) * 100));
      }
    }

    if (bookmarksRaw) {
      try {
        const parsed = JSON.parse(bookmarksRaw);
        totalBookmarks = Array.isArray(parsed) ? parsed.length : 0;
      } catch { }
    }

    if (pageBookmarksRaw) {
      try {
        const parsedPages = JSON.parse(pageBookmarksRaw);
        pageBookmarksCount = Array.isArray(parsedPages) ? parsedPages.length : 0;
      } catch { }
    }

    if (monthlyPagesRaw) {
      try {
        const pArr = JSON.parse(monthlyPagesRaw);
        monthPagesRead = Array.isArray(pArr) ? pArr.length : 0;
      } catch { }
    } else if (lastReadPage && isCurrentMonth) {
      // Fallback: at least 1 page read if progress exists
      monthPagesRead = Math.min(lastReadPage, 1);
    }
  } catch (err) {
    console.error("Error loading quran activity:", err);
  }

  // ========================================================================
  // 3. DUAS ACTIVITY
  // ========================================================================
  let totalSavedDuas = 0;
  let monthRecitations = 0;
  let totalRecitations = 0;
  let savedDuasDetails: { id: string; title: string; category: string }[] = [];

  try {
    const [savedRaw, mRecitations, tRecitations] = await Promise.all([
      AsyncStorage.getItem(SAVED_DUAS_KEY),
      getDuaRecitationsMonth(monthKey).catch(() => 0),
      getDuaRecitationsTotal().catch(() => 0),
    ]);

    monthRecitations = typeof mRecitations === "number" ? mRecitations : 0;
    totalRecitations = typeof tRecitations === "number" ? tRecitations : 0;

    if (savedRaw) {
      try {
        const parsed = JSON.parse(savedRaw);
        const ids: string[] = Array.isArray(parsed) ? parsed : [];
        totalSavedDuas = ids.length;
        const allDuasList = Array.isArray(ALL_DUAS) ? ALL_DUAS : [];
        savedDuasDetails = allDuasList.filter((d) => ids.includes(d.id)).map((d) => ({
          id: d.id,
          title: d.title,
          category: d.category,
        }));
      } catch { }
    }
  } catch (err) {
    console.error("Error loading dua activity:", err);
  }

  // ========================================================================
  // 4. FASTING ACTIVITY
  // ========================================================================
  let monthFastsCount = 0;
  let totalLifetimeFasts = 0;
  let fastedDatesThisMonth: string[] = [];
  let currentStreak = 0;

  try {
    const fastingRaw = await AsyncStorage.getItem(FASTING_TRACKER_KEY);
    if (fastingRaw) {
      try {
        const parsed = JSON.parse(fastingRaw);
        const allDays: string[] = Array.isArray(parsed) ? parsed : [];
        totalLifetimeFasts = allDays.length;

        // Filter for this specific month
        fastedDatesThisMonth = allDays.filter((dateStr) => typeof dateStr === "string" && dateStr.startsWith(monthKey));
        monthFastsCount = fastedDatesThisMonth.length;

        // Calculate recent consecutive streak
        const sorted = [...allDays].sort().reverse();
        let streak = 0;
        let checkDate = moment();

        for (let i = 0; i < 30; i++) {
          const dStr = checkDate.format("YYYY-MM-DD");
          if (sorted.includes(dStr)) {
            streak++;
            checkDate.subtract(1, "day");
          } else if (i === 0) {
            // If today is not yet logged, check if yesterday was logged
            checkDate.subtract(1, "day");
          } else {
            break;
          }
        }
        currentStreak = streak;
      } catch { }
    }
  } catch (err) {
    console.error("Error loading fasting activity:", err);
  }

  // ========================================================================
  // 5. AMAL DAILY TRACKER
  // ========================================================================
  let todayCompletedAmal = 0;
  let monthlyEstimatedCompletions = 0;

  try {
    const todayAmalKey = `${AMAL_STORAGE_PREFIX}${moment().format("YYYY-MM-DD")}`;
    const todayAmalRaw = await AsyncStorage.getItem(todayAmalKey);
    if (todayAmalRaw) {
      try {
        const parsed = JSON.parse(todayAmalRaw);
        const items: string[] = Array.isArray(parsed) ? parsed : [];
        todayCompletedAmal = items.length;
      } catch { }
    }

    // Scan all keys in AsyncStorage for this month's amal
    const allKeys = await AsyncStorage.getAllKeys();
    const monthAmalKeys = allKeys.filter((k) => k.startsWith(`${AMAL_STORAGE_PREFIX}${monthKey}`));


    if (monthAmalKeys.length > 0) {
      const entries = await AsyncStorage.multiGet(monthAmalKeys);
      for (const [, val] of entries) {
        if (val) {
          try {
            const arr = JSON.parse(val);
            if (Array.isArray(arr)) {
              monthlyEstimatedCompletions += arr.length;
            }
          } catch { }
        }
      }
    }
  } catch (err) {
    console.error("Error loading amal activity:", err);
  }

  return {
    monthKey,
    monthName,
    isCurrentMonth,
    tasbih: {
      monthTotal: tasbihMonth,
      totalLifetime: tasbihLifetime,
      todayCount: tasbihToday,
      dhikrBreakdown,
      topDhikr,
    },
    quran: {
      lastReadPage,
      monthPagesRead,
      totalBookmarks,
      pageBookmarksCount,
      completionPercentage,
    },
    duas: {
      monthRecitations,
      totalRecitations,
      totalSaved: totalSavedDuas,
      savedDuas: savedDuasDetails,
    },
    fasting: {
      monthFastsCount,
      totalLifetimeFasts,
      fastedDatesThisMonth,
      currentStreak,
    },
    amal: {
      todayCompletedCount: todayCompletedAmal,
      totalAmalItems: (DEFAULT_AMAL_LIST && DEFAULT_AMAL_LIST.length) || 14,
      monthlyEstimatedCompletions,
    },
  };
}

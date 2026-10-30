import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebaseConfig";

export type NewsCategory =
  | "All"
  | "World"
  | "Ummah"
  | "Islamic"
  | "Education"
  | "Science"
  | "Hajj"
  | "Community";

export interface NewsArticle {
  id: string;
  title: string;
  category: NewsCategory;
  createdAt: number;
  tagColor: string;
  readTime: string;
  source: string;
  summary: string;
  content?: string;
  imageUrl?: string;
  isFeatured?: boolean;
  createdBy?: string;
}

const NEWS_COLLECTION = "news";
const CACHED_NEWS_KEY = "@salah_times_cached_news_v1";
const SAVED_NEWS_IDS_KEY = "@salah_times_saved_news_ids_v1";

export const NEWS_CATEGORIES: NewsCategory[] = [
  "All",
  "World",
  "Ummah",
  "Islamic",
  "Education",
  "Science",
  "Hajj",
  "Community",
];

export const CATEGORY_COLORS: Record<NewsCategory, string> = {
  All: "#0D7377",
  World: "#D97706",
  Ummah: "#DC2626",
  Islamic: "#0D7377",
  Education: "#2563EB",
  Science: "#059669",
  Hajj: "#B45309",
  Community: "#7C3AED",
};

export const NEWS_IMAGE_PRESETS = [
  { label: "Makkah / Kaaba", url: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=800&auto=format&fit=crop&q=80" },
  { label: "Grand Mosque", url: "https://images.unsplash.com/photo-1564769625905-50e93615e769?w=800&auto=format&fit=crop&q=80" },
  { label: "Istanbul / Türkiye", url: "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=800&auto=format&fit=crop&q=80" },
  { label: "Quran / Manuscripts", url: "https://images.unsplash.com/photo-1609599006353-e629aaabfeae?w=800&auto=format&fit=crop&q=80" },
  { label: "Humanitarian Relief", url: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop&q=80" },
  { label: "Nature & Ecology", url: "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=800&auto=format&fit=crop&q=80" },
  { label: "Islamic Arch", url: "https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?w=800&auto=format&fit=crop&q=80" },
];

export const DEFAULT_NEWS_ARTICLES: NewsArticle[] = [
  {
    id: "palestine_gaza_update",
    title: "Latest Relief Efforts and Humanitarian Convoys for Palestine",
    category: "Ummah",
    createdAt: Date.now() - 3600000 * 2, // 2 hours ago
    tagColor: "#DC2626",
    readTime: "4 min read",
    source: "Red Crescent & Relief Agencies",
    summary: "International charity organizations deploy water purification units and emergency medical supplies to affected families.",
    content: "International charity organizations and Muslim relief coalitions have deployed essential food supplies, mobile clinics, and water purification units. Relief coordinators stress the urgent need for open humanitarian corridors and medical resources.",
    imageUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop&q=80",
    isFeatured: true,
  },
  {
    id: "turkiye_aid",
    title: "Muslim Delegations Gather for Global Humanitarian Coordination",
    category: "World",
    createdAt: Date.now() - 3600000 * 5, // 5 hours ago
    tagColor: "#D97706",
    readTime: "3 min read",
    source: "Global Islamic News",
    summary: "Representatives gathered in Istanbul to establish coordinated disaster and emergency relief initiatives across member states.",
    content: "Representatives gathered in Istanbul to formulate unified disaster response protocols. The meeting resulted in agreements on rapid emergency deployment funds, medical aid stockpiles, and refugee support programs.",
    imageUrl: "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=800&auto=format&fit=crop&q=80",
    isFeatured: true,
  },
  {
    id: "environment_research",
    title: "Environmental Stewardship in Light of Islamic Traditions",
    category: "Science",
    createdAt: Date.now() - 3600000 * 12,
    tagColor: "#059669",
    readTime: "4 min read",
    source: "Islamic Ecology Journal",
    summary: "Scholars emphasize environmental conservation (Khilafah) through sustainable community models inspired by the Sunnah.",
    content: "A newly published paper outlines Islamic environmental ethics, calling on communities to eliminate water wastage during Wudu, install solar panels on masjid roofs, and engage in tree plantation as Sadaqah Jariyah.",
    imageUrl: "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=800&auto=format&fit=crop&q=80",
    isFeatured: false,
  },
  {
    id: "hajj_info",
    title: "Hajj 2026: Official Guidelines and Nusuk Digital Services",
    category: "Hajj",
    createdAt: Date.now() - 86400000,
    tagColor: "#B45309",
    readTime: "5 min read",
    source: "Ministry of Hajj & Umrah",
    summary: "New biometric registrations, health advisories, and updated Nusuk platform guidelines announced for international pilgrims.",
    content: "The Ministry has introduced enhanced Nusuk platform modules that streamline electronic visa issuance, hotel bookings near the Holy Mosques in Makkah and Madinah, and digitized transport services.",
    imageUrl: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=800&auto=format&fit=crop&q=80",
    isFeatured: false,
  },
  {
    id: "halal_economy",
    title: "Global Halal Economy Reaches New Landmark Milestone",
    category: "Islamic",
    createdAt: Date.now() - 86400000 * 2,
    tagColor: "#0D7377",
    readTime: "3 min read",
    source: "Islamic Finance Review",
    summary: "Ethical Islamic banking, halal pharmaceuticals, and modest lifestyle sectors witness significant worldwide trade growth.",
    content: "Industry metrics report that the global halal food and Islamic financial ecosystem continues to expand rapidly, driven by rising demand for ethical, transparent, and sustainable goods across Europe, Asia, and North America.",
    imageUrl: "https://images.unsplash.com/photo-1564769625905-50e93615e769?w=800&auto=format&fit=crop&q=80",
    isFeatured: false,
  },
  {
    id: "ancient_manuscripts",
    title: "Preserving Historic Islamic Manuscripts with AI Spectral Scanning",
    category: "Education",
    createdAt: Date.now() - 86400000 * 3,
    tagColor: "#2563EB",
    readTime: "4 min read",
    source: "Heritage Quarterly",
    summary: "Archivists restore rare century-old Hadith and Quranic manuscripts using advanced non-invasive digital imaging.",
    content: "A joint initiative by international research universities has digitized tens of thousands of centuries-old handwritten Quranic folios and classic jurisprudence texts, making them accessible to scholars worldwide for free.",
    imageUrl: "https://images.unsplash.com/photo-1609599006353-e629aaabfeae?w=800&auto=format&fit=crop&q=80",
    isFeatured: false,
  },
];

export function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? "s" : ""} ago`;
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay} days ago`;
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ============================================================================
// FIRESTORE & CACHE OPERATIONS
// ============================================================================

/**
 * Fetch news articles. If Firestore has articles, return them and cache locally.
 * Otherwise, seed with defaults.
 */
export async function getNewsArticles(): Promise<NewsArticle[]> {
  try {
    const q = query(collection(db, NEWS_COLLECTION), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const articles: NewsArticle[] = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      articles.push({
        id: docSnap.id,
        title: data.title || "",
        category: (data.category as NewsCategory) || "Islamic",
        createdAt: typeof data.createdAt === "number" ? data.createdAt : Date.now(),
        tagColor: data.tagColor || CATEGORY_COLORS[(data.category as NewsCategory) || "Islamic"],
        readTime: data.readTime || "3 min read",
        source: data.source || "Salah Times News",
        summary: data.summary || "",
        content: data.content || data.summary || "",
        imageUrl: data.imageUrl,
        isFeatured: data.isFeatured ?? false,
        createdBy: data.createdBy,
      });
    });

    if (articles.length > 0) {
      void AsyncStorage.setItem(CACHED_NEWS_KEY, JSON.stringify(articles));
      return articles;
    }
  } catch (error) {
    console.warn("[News] Firestore fetch failed, falling back to cache:", error);
  }

  // Fallback to local cache
  try {
    const cached = await AsyncStorage.getItem(CACHED_NEWS_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("[News] Cache read error:", e);
  }

  // Return default articles if nothing found
  void AsyncStorage.setItem(CACHED_NEWS_KEY, JSON.stringify(DEFAULT_NEWS_ARTICLES));
  return DEFAULT_NEWS_ARTICLES;
}

/**
 * Add a news article (Admin only)
 */
export async function addNewsArticle(
  article: Omit<NewsArticle, "id" | "createdAt">
): Promise<NewsArticle> {
  const id = `news_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const createdAt = Date.now();
  const newArticle: NewsArticle = {
    ...article,
    id,
    createdAt,
    tagColor: article.tagColor || CATEGORY_COLORS[article.category] || "#0D7377",
  };

  try {
    const docRef = doc(db, NEWS_COLLECTION, id);
    await setDoc(docRef, {
      ...newArticle,
      serverTime: serverTimestamp(),
    });
  } catch (error) {
    console.error("[News] Firestore add news error:", error);
  }

  // Update local cache
  try {
    const current = await getNewsArticles();
    const updated = [newArticle, ...current.filter((a) => a.id !== id)];
    await AsyncStorage.setItem(CACHED_NEWS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error("[News] Cache update error:", err);
  }

  return newArticle;
}

/**
 * Update an existing news article (Admin only)
 */
export async function updateNewsArticle(
  id: string,
  updates: Partial<NewsArticle>
): Promise<void> {
  try {
    const docRef = doc(db, NEWS_COLLECTION, id);
    await updateDoc(docRef, updates as any);
  } catch (error) {
    console.error("[News] Firestore update news error:", error);
  }

  // Update local cache
  try {
    const current = await getNewsArticles();
    const updated = current.map((item) => (item.id === id ? { ...item, ...updates } : item));
    await AsyncStorage.setItem(CACHED_NEWS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error("[News] Cache update error:", err);
  }
}

/**
 * Delete a news article (Admin only)
 */
export async function deleteNewsArticle(id: string): Promise<void> {
  try {
    const docRef = doc(db, NEWS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("[News] Firestore delete news error:", error);
  }

  // Remove from local cache
  try {
    const current = await getNewsArticles();
    const updated = current.filter((item) => item.id !== id);
    await AsyncStorage.setItem(CACHED_NEWS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error("[News] Cache delete error:", err);
  }
}

/**
 * Bookmark toggle for regular users
 */
export async function loadSavedNewsIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(SAVED_NEWS_IDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function toggleSaveNews(id: string): Promise<string[]> {
  try {
    const current = await loadSavedNewsIds();
    const updated = current.includes(id)
      ? current.filter((savedId) => savedId !== id)
      : [...current, id];
    await AsyncStorage.setItem(SAVED_NEWS_IDS_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}


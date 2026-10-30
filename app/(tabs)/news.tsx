import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  RefreshControl,
  Modal,
  ScrollView,
  Platform,
  Share,
  Pressable,
  Image,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { showCustomAlert } from "@/lib/custom-alert";
import {
  NewsArticle,
  NewsCategory,
  NEWS_CATEGORIES,
  CATEGORY_COLORS,
  getNewsArticles,
  formatTimeAgo,
  loadSavedNewsIds,
  toggleSaveNews,
} from "@/lib/news";

export default function NewsScreen() {
  const insets = useSafeAreaInsets();
  const { admin } = useAuth();
  const isSuperAdmin = admin?.role === "super_admin";

  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<NewsCategory | "Saved">("All");
  const [search, setSearch] = useState("");
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>([]);

  // Article Detail Modal
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);

  // Load articles & saved IDs
  const loadData = useCallback(async () => {
    try {
      const [newsData, savedData] = await Promise.all([
        getNewsArticles(),
        loadSavedNewsIds(),
      ]);
      setArticles(newsData);
      setSavedIds(savedData);
    } catch (error) {
      console.error("Error loading news data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadData();
  }, [loadData]);

  // Handle bookmark toggle
  const handleToggleBookmark = async (id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = await toggleSaveNews(id);
    setSavedIds(updated);
  };

  // Handle article share
  const handleShareArticle = async (article: NewsArticle) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        title: article.title,
        message: `📰 ${article.title}\n\n${article.summary}\n\nSource: ${article.source}\nShared via Pasted-Perfect App`,
      });
    } catch (e) {
      console.error("Error sharing news:", e);
    }
  };

  // Open Full Story Modal
  const handleOpenArticle = (article: NewsArticle) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedArticle(article);
  };

  // Filtered Articles
  const filteredArticles = useMemo(() => {
    let list = articles;

    // Filter by category or saved
    if (selectedCategory === "Saved") {
      list = list.filter((a) => savedIds.includes(a.id));
    } else if (selectedCategory !== "All") {
      list = list.filter((a) => a.category === selectedCategory);
    }

    // Filter by search keyword
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.summary.toLowerCase().includes(q) ||
          (a.content && a.content.toLowerCase().includes(q)) ||
          a.source.toLowerCase().includes(q)
      );
    }

    return list;
  }, [articles, selectedCategory, search, savedIds]);

  // Featured Hero Article (first featured article or first in list)
  const heroArticle = useMemo(() => {
    if (selectedCategory !== "All" || search.trim().length > 0) return null;
    return articles.find((a) => a.isFeatured) || articles[0] || null;
  }, [articles, selectedCategory, search]);

  // Remaining articles for flat list
  const remainingArticles = useMemo(() => {
    if (!heroArticle) return filteredArticles;
    return filteredArticles.filter((a) => a.id !== heroArticle.id);
  }, [filteredArticles, heroArticle]);

  // Render Single Article Card
  const renderArticleCard = ({ item }: { item: NewsArticle }) => {
    const isSaved = savedIds.includes(item.id);
    const categoryColor = CATEGORY_COLORS[item.category] || Colors.primary;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.88}
        onPress={() => handleOpenArticle(item)}
      >
        <View style={styles.cardHeaderRow}>
          <View style={[styles.categoryBadge, { backgroundColor: `${categoryColor}15` }]}>
            <Text style={[styles.categoryBadgeText, { color: categoryColor }]}>
              {item.category}
            </Text>
          </View>
          <Text style={styles.timeAgoText}>{formatTimeAgo(item.createdAt)}</Text>
        </View>

        <View style={styles.cardBodyRow}>
          <View style={styles.cardTextContent}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.cardSummary} numberOfLines={2}>
              {item.summary}
            </Text>
          </View>

          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.cardThumbnail}
              resizeMode="cover"
            />
          ) : null}
        </View>

        <View style={styles.cardFooterRow}>
          <View style={styles.sourceWrap}>
            <Ionicons name="newspaper-outline" size={13} color={Colors.textMuted} style={{ marginRight: 4 }} />
            <Text style={styles.sourceText} numberOfLines={1}>
              {item.source}
            </Text>
            <Text style={styles.dotSeparator}>•</Text>
            <Text style={styles.readTimeText}>{item.readTime}</Text>
          </View>

          <View style={styles.cardActionsRow}>
            <TouchableOpacity
              onPress={() => handleShareArticle(item)}
              style={styles.iconActionBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="share-social-outline" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleToggleBookmark(item.id)}
              style={styles.iconActionBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={isSaved ? "bookmark" : "bookmark-outline"}
                size={16}
                color={isSaved ? Colors.primary : Colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor={Colors.background} />

      {/* Screen Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Islamic News</Text>
          <Text style={styles.headerSubtitle}>Global Ummah & Community Updates</Text>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => {
              void Haptics.selectionAsync();
              setShowSearchBar((prev) => !prev);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={showSearchBar ? "close-outline" : "search-outline"}
              size={20}
              color={Colors.primary}
            />
          </TouchableOpacity>

          {isSuperAdmin && (
            <TouchableOpacity
              style={[styles.headerIconBtn, styles.adminManageBtn]}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/manage-news");
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="create-outline" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Expandable Search Input Bar */}
      {showSearchBar && (
        <View style={styles.searchBarWrap}>
          <Ionicons name="search" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search news by title, keyword, or source..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            autoFocus
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Category Chips Bar */}
      <View style={styles.categoryContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContent}
        >
          {NEWS_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.chipPill, isSelected && styles.chipPillActive]}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setSelectedCategory(cat);
                }}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Saved / Bookmarked Chip */}
          <TouchableOpacity
            style={[styles.chipPill, selectedCategory === "Saved" && styles.chipPillActive]}
            onPress={() => {
              void Haptics.selectionAsync();
              setSelectedCategory("Saved");
            }}
          >
            <Ionicons
              name="bookmark"
              size={12}
              color={selectedCategory === "Saved" ? "#FFFFFF" : Colors.primary}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.chipText,
                selectedCategory === "Saved" && styles.chipTextActive,
              ]}
            >
              Saved ({savedIds.length})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* News Articles List */}
      <FlatList
        data={remainingArticles}
        keyExtractor={(item) => item.id}
        renderItem={renderArticleCard}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 95 },
        ]}
        ListHeaderComponent={
          <>
            {/* Featured Hero News Card */}
            {heroArticle && (
              <TouchableOpacity
                style={styles.heroCard}
                activeOpacity={0.92}
                onPress={() => handleOpenArticle(heroArticle)}
              >
                {heroArticle.imageUrl ? (
                  <View style={styles.heroImageWrap}>
                    <Image
                      source={{ uri: heroArticle.imageUrl }}
                      style={styles.heroImage}
                      resizeMode="cover"
                    />
                    <View style={styles.heroImageOverlay} />
                    <View style={styles.heroFloatingBadges}>
                      <View style={styles.heroBreakingBadge}>
                        <View style={styles.breakingDot} />
                        <Text style={styles.breakingText}>BREAKING</Text>
                      </View>
                      <View
                        style={[
                          styles.categoryBadge,
                          {
                            backgroundColor: "rgba(0, 0, 0, 0.6)",
                          },
                        ]}
                      >
                        <Text style={[styles.categoryBadgeText, { color: "#FFFFFF" }]}>
                          {heroArticle.category}
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={styles.heroBadgeRow}>
                    <View style={styles.heroBreakingBadge}>
                      <View style={styles.breakingDot} />
                      <Text style={styles.breakingText}>BREAKING</Text>
                    </View>
                    <View
                      style={[
                        styles.categoryBadge,
                        {
                          backgroundColor: `${CATEGORY_COLORS[heroArticle.category] || Colors.primary}20`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.categoryBadgeText,
                          { color: CATEGORY_COLORS[heroArticle.category] || Colors.primary },
                        ]}
                      >
                        {heroArticle.category}
                      </Text>
                    </View>
                    <Text style={styles.heroTimeAgo}>{formatTimeAgo(heroArticle.createdAt)}</Text>
                  </View>
                )}

                <View style={styles.heroContentPadding}>
                  {heroArticle.imageUrl ? (
                    <Text style={styles.heroTimeAgoBelowImage}>
                      {formatTimeAgo(heroArticle.createdAt)}
                    </Text>
                  ) : null}
                  <Text style={styles.heroTitle}>{heroArticle.title}</Text>
                  <Text style={styles.heroSummary} numberOfLines={3}>
                    {heroArticle.summary}
                  </Text>

                  <View style={styles.heroFooter}>
                    <View style={styles.sourceWrap}>
                      <Ionicons name="newspaper-outline" size={13} color="#FFFFFF" style={{ opacity: 0.8, marginRight: 4 }} />
                      <Text style={styles.heroSourceText}>{heroArticle.source}</Text>
                      <Text style={styles.heroDot}>•</Text>
                      <Text style={styles.heroReadTime}>{heroArticle.readTime}</Text>
                    </View>
                    <Ionicons name="arrow-forward-circle" size={24} color="#FFFFFF" />
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {/* List Section Heading */}
            {filteredArticles.length > 0 && (
              <View style={styles.sectionHeadingRow}>
                <Text style={styles.sectionHeadingText}>
                  {selectedCategory === "All"
                    ? "Latest Articles"
                    : selectedCategory === "Saved"
                    ? "Saved Bookmarks"
                    : `${selectedCategory} News`}
                </Text>
                <Text style={styles.sectionCountText}>{filteredArticles.length} stories</Text>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="newspaper-outline" size={36} color={Colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No Articles Found</Text>
              <Text style={styles.emptySub}>
                {selectedCategory === "Saved"
                  ? "You haven't bookmarked any articles yet. Tap the bookmark icon on any story to save it."
                  : search.trim()
                  ? `No news matching "${search}". Try searching for another topic.`
                  : "Check back later for fresh Islamic and Ummah updates."}
              </Text>
            </View>
          ) : null
        }
      />

      {/* FULL ARTICLE DETAIL MODAL */}
      <Modal
        visible={!!selectedArticle}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedArticle(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setSelectedArticle(null)} />
          <View style={[styles.modalSheet, { maxHeight: "90%", paddingBottom: Math.max(insets.bottom, 20) }]}>
            {/* Sheet Handle */}
            <View style={styles.sheetHandle} />

            {selectedArticle && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetScroll}>
                {/* Header Actions */}
                <View style={styles.sheetHeaderRow}>
                  <View
                    style={[
                      styles.categoryBadge,
                      {
                        backgroundColor: `${CATEGORY_COLORS[selectedArticle.category] || Colors.primary}18`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryBadgeText,
                        { color: CATEGORY_COLORS[selectedArticle.category] || Colors.primary },
                      ]}
                    >
                      {selectedArticle.category}
                    </Text>
                  </View>

                  <View style={styles.sheetActionsRight}>
                    <TouchableOpacity
                      style={styles.sheetActionCircle}
                      onPress={() => handleShareArticle(selectedArticle)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="share-social-outline" size={18} color={Colors.primary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.sheetActionCircle}
                      onPress={() => handleToggleBookmark(selectedArticle.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name={savedIds.includes(selectedArticle.id) ? "bookmark" : "bookmark-outline"}
                        size={18}
                        color={savedIds.includes(selectedArticle.id) ? Colors.primary : Colors.textSecondary}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.sheetActionCircle}
                      onPress={() => setSelectedArticle(null)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close" size={20} color={Colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Article Cover Image */}
                {selectedArticle.imageUrl ? (
                  <View style={styles.sheetImageWrap}>
                    <Image
                      source={{ uri: selectedArticle.imageUrl }}
                      style={styles.sheetImage}
                      resizeMode="cover"
                    />
                  </View>
                ) : null}

                {/* Article Title */}
                <Text style={styles.sheetArticleTitle}>{selectedArticle.title}</Text>

                {/* Meta Source & Timestamp */}
                <View style={styles.sheetMetaRow}>
                  <View style={styles.sheetAuthorBox}>
                    <Ionicons name="newspaper" size={14} color={Colors.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.sheetSourceText}>{selectedArticle.source}</Text>
                  </View>
                  <Text style={styles.sheetTimeText}>
                    {formatTimeAgo(selectedArticle.createdAt)} • {selectedArticle.readTime}
                  </Text>
                </View>

                <View style={styles.sheetDivider} />

                {/* Summary Callout Box */}
                <View style={styles.summaryCallout}>
                  <Ionicons name="information-circle-outline" size={18} color={Colors.primary} style={{ marginRight: 8, marginTop: 1 }} />
                  <Text style={styles.summaryCalloutText}>{selectedArticle.summary}</Text>
                </View>

                {/* Full Article Content */}
                <Text style={styles.sheetBodyText}>
                  {selectedArticle.content || selectedArticle.summary}
                </Text>

                {/* Footer Tag & Info */}
                <View style={styles.sheetFooterNotice}>
                  <Ionicons name="shield-checkmark-outline" size={15} color={Colors.textMuted} style={{ marginRight: 6 }} />
                  <Text style={styles.sheetNoticeText}>
                    Verified Islamic & Ummah news bulletin published on Salah Times News Network.
                  </Text>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
    paddingVertical: 10,
    backgroundColor: Colors.background,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 22,
    color: "#1A2E1A",
  },
  headerSubtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: -2,
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EAEFE8",
  },
  adminManageBtn: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },

  /* Search Bar */
  searchBarWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 8 : 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EAEFE8",
  },
  searchInput: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: "#1A2E1A",
    padding: 0,
  },

  /* Category Chips */
  categoryContainer: {
    marginBottom: 10,
  },
  categoryScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  chipPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5ECE5",
  },
  chipPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
  },

  /* Feed List */
  listContent: {
    paddingHorizontal: 16,
  },

  /* Featured Hero Card */
  heroCard: {
    backgroundColor: "#0D7377",
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#0D7377",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  heroImageWrap: {
    width: "100%",
    height: 165,
    position: "relative",
    backgroundColor: "#084245",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(13, 115, 119, 0.25)",
  },
  heroFloatingBadges: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heroContentPadding: {
    padding: 16,
  },
  heroTimeAgoBelowImage: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.75)",
    marginBottom: 6,
  },
  heroBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 10,
  },
  heroBreakingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DC2626",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  breakingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
    marginRight: 4,
  },
  breakingText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 9.5,
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  heroTimeAgo: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.75)",
    marginLeft: "auto",
  },
  heroTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 16.5,
    color: "#FFFFFF",
    lineHeight: 23,
    marginBottom: 8,
  },
  heroSummary: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12.5,
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 18,
    marginBottom: 14,
  },
  heroFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.15)",
    paddingTop: 10,
  },
  heroSourceText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: "#FFFFFF",
  },
  heroDot: {
    color: "rgba(255, 255, 255, 0.5)",
    marginHorizontal: 4,
    fontSize: 10,
  },
  heroReadTime: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.8)",
  },

  /* Section Heading */
  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionHeadingText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    color: "#1A2E1A",
  },
  sectionCountText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
  },

  /* Article Card */
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#EAEFE8",
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 10.5,
  },
  timeAgoText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
  },
  cardBodyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 8,
  },
  cardTextContent: {
    flex: 1,
  },
  cardThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: "#F1F5F0",
  },
  cardTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14.5,
    color: "#1A2E1A",
    lineHeight: 21,
    marginBottom: 4,
  },
  cardSummary: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  cardFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#F3F6F2",
    paddingTop: 8,
  },
  sourceWrap: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  sourceText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: Colors.textMuted,
    maxWidth: 140,
  },
  dotSeparator: {
    color: Colors.textMuted,
    marginHorizontal: 4,
    fontSize: 10,
  },
  readTimeText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
  },
  cardActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconActionBtn: {
    padding: 4,
  },

  /* Empty State */
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F3F7F4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: "#1A2E1A",
    marginBottom: 6,
  },
  emptySub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12.5,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },

  /* Article Detail Modal */
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  modalBackdrop: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetScroll: {
    paddingBottom: 20,
  },
  sheetHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sheetActionsRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sheetActionCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F4F7F4",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetImageWrap: {
    width: "100%",
    height: 190,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 14,
    backgroundColor: "#F1F5F0",
  },
  sheetImage: {
    width: "100%",
    height: "100%",
  },
  sheetArticleTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
    color: "#1A2E1A",
    lineHeight: 25,
    marginBottom: 10,
  },
  sheetMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sheetAuthorBox: {
    flexDirection: "row",
    alignItems: "center",
  },
  sheetSourceText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: Colors.primary,
  },
  sheetTimeText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
  },
  sheetDivider: {
    height: 1,
    backgroundColor: "#EEF2E8",
    marginBottom: 14,
  },
  summaryCallout: {
    flexDirection: "row",
    backgroundColor: "#F2F9F9",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  summaryCalloutText: {
    flex: 1,
    fontFamily: "Poppins_500Medium",
    fontSize: 12.5,
    color: "#0F4648",
    lineHeight: 18,
  },
  sheetBodyText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: "#2D3748",
    lineHeight: 22,
    marginBottom: 20,
  },
  sheetFooterNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFBF8",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#EEF2E8",
  },
  sheetNoticeText: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 15,
  },
});


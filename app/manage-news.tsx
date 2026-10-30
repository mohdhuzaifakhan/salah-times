import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Switch,
  ActivityIndicator,
  ScrollView,
  Platform,
  Alert,
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
  NEWS_IMAGE_PRESETS,
  getNewsArticles,
  addNewsArticle,
  updateNewsArticle,
  deleteNewsArticle,
  formatTimeAgo,
} from "@/lib/news";

export default function ManageNewsScreen() {
  const insets = useSafeAreaInsets();
  const { admin, isLoading } = useAuth();
  const isAuthorized = admin?.role === "super_admin";

  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<NewsCategory>("Islamic");
  const [source, setSource] = useState("Salah Times News");
  const [readTime, setReadTime] = useState("3 min read");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getNewsArticles();
      setArticles(data);
    } catch (e) {
      console.error("Failed to load news for admin:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Reset form
  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setCategory("Islamic");
    setSource("Salah Times News");
    setReadTime("3 min read");
    setSummary("");
    setContent("");
    setImageUrl("");
    setIsFeatured(false);
  };

  // Populate form for editing
  const handleStartEdit = (article: NewsArticle) => {
    void Haptics.selectionAsync();
    setEditingId(article.id);
    setTitle(article.title);
    setCategory(article.category);
    setSource(article.source || "Salah Times News");
    setReadTime(article.readTime || "3 min read");
    setSummary(article.summary || "");
    setContent(article.content || article.summary || "");
    setImageUrl(article.imageUrl || "");
    setIsFeatured(!!article.isFeatured);
  };

  // Save (Create or Update)
  const handleSubmit = async () => {
    if (!title.trim()) {
      showCustomAlert("Title Required", "Please enter a news article title.");
      return;
    }
    if (!summary.trim()) {
      showCustomAlert("Summary Required", "Please enter a short news summary.");
      return;
    }

    setSubmitting(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (editingId) {
        // Update existing article
        await updateNewsArticle(editingId, {
          title: title.trim(),
          category,
          source: source.trim() || "Salah Times News",
          readTime: readTime.trim() || "3 min read",
          summary: summary.trim(),
          content: (content.trim() || summary.trim()),
          imageUrl: imageUrl.trim() || undefined,
          isFeatured,
          tagColor: CATEGORY_COLORS[category] || "#0D7377",
        });
        showCustomAlert("Article Updated", "The news article has been updated successfully.");
      } else {
        // Create new article
        await addNewsArticle({
          title: title.trim(),
          category,
          source: source.trim() || "Salah Times News",
          readTime: readTime.trim() || "3 min read",
          summary: summary.trim(),
          content: (content.trim() || summary.trim()),
          imageUrl: imageUrl.trim() || undefined,
          isFeatured,
          tagColor: CATEGORY_COLORS[category] || "#0D7377",
          createdBy: admin?.email || "Super Admin",
        });
        showCustomAlert("Article Published", "New Islamic news article is now live for all users.");
      }

      resetForm();
      await loadData();
    } catch (err: any) {
      console.error("Save news failed:", err);
      showCustomAlert("Error", err.message || "Failed to save news article.");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete article with confirmation
  const handleDelete = (article: NewsArticle) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    showCustomAlert(
      "Delete Article",
      `Are you sure you want to delete "${article.title}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteNewsArticle(article.id);
              if (editingId === article.id) resetForm();
              await loadData();
              showCustomAlert("Deleted", "Article has been removed.");
            } catch (err: any) {
              showCustomAlert("Error", err.message || "Failed to delete article.");
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.centeredContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!isAuthorized) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.unauthorizedBox}>
          <View style={styles.lockCircle}>
            <Ionicons name="lock-closed" size={32} color="#DC2626" />
          </View>
          <Text style={styles.unauthorizedTitle}>Access Restricted</Text>
          <Text style={styles.unauthorizedSub}>
            Only Super Admins can publish, edit, or delete Islamic news articles. Please log in with admin credentials.
          </Text>
          <TouchableOpacity
            style={styles.backButtonLarge}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
          <Text style={styles.headerTitle}>Manage News</Text>
          <Text style={styles.headerSubtitle}>Super Admin Publishing Hub</Text>
        </View>

        <TouchableOpacity
          style={styles.previewBtn}
          onPress={() => router.push("/(tabs)/news")}
        >
          <Ionicons name="eye-outline" size={16} color={Colors.primary} style={{ marginRight: 4 }} />
          <Text style={styles.previewBtnText}>Feed</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) + 40 },
        ]}
      >
        {/* PUBLISH / EDIT FORM CARD */}
        <View style={styles.formCard}>
          <View style={styles.formCardHeader}>
            <View style={styles.formTitleRow}>
              <Ionicons
                name={editingId ? "create-outline" : "add-circle-outline"}
                size={20}
                color={Colors.primary}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.formTitle}>
                {editingId ? "Edit News Article" : "Create New Article"}
              </Text>
            </View>

            {editingId && (
              <TouchableOpacity onPress={resetForm} style={styles.cancelEditBtn}>
                <Text style={styles.cancelEditBtnText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Title Input */}
          <Text style={styles.inputLabel}>Article Headline *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Humanitarian Aid Initiative Launched..."
            placeholderTextColor="#94A3B8"
            value={title}
            onChangeText={setTitle}
          />

          {/* Category Selector Chips */}
          <Text style={styles.inputLabel}>Category *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {NEWS_CATEGORIES.filter((c) => c !== "All").map((cat) => {
              const isSelected = category === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catChip, isSelected && styles.catChipActive]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.catChipText, isSelected && styles.catChipTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Source & Read Time Inputs Row */}
          <View style={styles.rowInputs}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.inputLabel}>Source / Publisher</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Salah Times News"
                placeholderTextColor="#94A3B8"
                value={source}
                onChangeText={setSource}
              />
            </View>
            <View style={{ width: 110 }}>
              <Text style={styles.inputLabel}>Read Time</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 3 min read"
                placeholderTextColor="#94A3B8"
                value={readTime}
                onChangeText={setReadTime}
              />
            </View>
          </View>

          {/* Short Summary Input */}
          <Text style={styles.inputLabel}>Short Summary (Card Preview) *</Text>
          <TextInput
            style={[styles.textInput, styles.textAreaSmall]}
            placeholder="A concise 1-2 sentence preview that appears on the feed card..."
            placeholderTextColor="#94A3B8"
            value={summary}
            onChangeText={setSummary}
            multiline
            numberOfLines={2}
          />

          {/* Full Content Input */}
          <Text style={styles.inputLabel}>Full Story / Content</Text>
          <TextInput
            style={[styles.textInput, styles.textAreaLarge]}
            placeholder="Write or paste the complete news report and statements..."
            placeholderTextColor="#94A3B8"
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={5}
          />

          {/* Article Cover Image Input & Preset Selector */}
          <View style={styles.imageHeaderRow}>
            <Text style={styles.inputLabel}>Article Cover Image (Optional)</Text>
            {imageUrl ? (
              <TouchableOpacity
                onPress={() => setImageUrl("")}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.clearImageBtnText}>Clear Image</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Text Input for Custom Image URL */}
          <View style={styles.imageInputWrap}>
            <Ionicons name="image-outline" size={17} color="#94A3B8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.imageTextInput}
              placeholder="Paste image URL (https://...)"
              placeholderTextColor="#94A3B8"
              value={imageUrl}
              onChangeText={setImageUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {imageUrl.length > 0 && (
              <TouchableOpacity onPress={() => setImageUrl("")} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Preset Buttons */}
          <Text style={styles.presetHeading}>Or pick a curated preset image:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.presetsRow}
          >
            {NEWS_IMAGE_PRESETS.map((preset) => {
              const isSelected = imageUrl === preset.url;
              return (
                <TouchableOpacity
                  key={preset.label}
                  style={[styles.presetPill, isSelected && styles.presetPillActive]}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setImageUrl(preset.url);
                  }}
                >
                  <Ionicons
                    name="sparkles"
                    size={11}
                    color={isSelected ? "#FFFFFF" : Colors.primary}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.presetPillText, isSelected && styles.presetPillTextActive]}>
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Live Image Preview */}
          {imageUrl.trim().length > 0 && (
            <View style={styles.previewBox}>
              <Image
                source={{ uri: imageUrl.trim() }}
                style={styles.previewImg}
                resizeMode="cover"
              />
              <View style={styles.previewStatusTag}>
                <Ionicons name="checkmark-circle" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.previewStatusText}>Image Attached</Text>
              </View>
            </View>
          )}

          {/* Featured / Hero Breaking Toggle */}
          <View style={styles.toggleRow}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.toggleTitle}>Breaking / Featured Story</Text>
              <Text style={styles.toggleSub}>
                Pins this article in the high-contrast Hero Card at top of News Feed.
              </Text>
            </View>
            <Switch
              value={isFeatured}
              onValueChange={setIsFeatured}
              trackColor={{ false: "#E2E8F0", true: Colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, submitting && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons
                  name={editingId ? "save-outline" : "paper-plane-outline"}
                  size={18}
                  color="#FFFFFF"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.submitButtonText}>
                  {editingId ? "Update News Article" : "Publish to News Feed"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* EXISTING PUBLISHED ARTICLES LIST */}
        <View style={styles.listSectionHeader}>
          <Text style={styles.listSectionTitle}>Published Articles ({articles.length})</Text>
        </View>

        {loading ? (
          <View style={{ paddingVertical: 24, alignItems: "center" }}>
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        ) : articles.length === 0 ? (
          <View style={styles.emptyListBox}>
            <Text style={styles.emptyListText}>No articles published yet.</Text>
          </View>
        ) : (
          articles.map((item) => {
            const catColor = CATEGORY_COLORS[item.category] || Colors.primary;

            return (
              <View key={item.id} style={styles.articleAdminCard}>
                <View style={styles.articleHeaderRow}>
                  <View style={[styles.badge, { backgroundColor: `${catColor}15` }]}>
                    <Text style={[styles.badgeText, { color: catColor }]}>{item.category}</Text>
                  </View>
                  {item.isFeatured && (
                    <View style={styles.featuredBadge}>
                      <Text style={styles.featuredBadgeText}>FEATURED</Text>
                    </View>
                  )}
                  <Text style={styles.articleTimeText}>{formatTimeAgo(item.createdAt)}</Text>
                </View>

                <View style={styles.adminArticleBodyRow}>
                  <View style={styles.adminArticleTextWrap}>
                    <Text style={styles.articleAdminTitle}>{item.title}</Text>
                    <Text style={styles.articleAdminSummary} numberOfLines={2}>
                      {item.summary}
                    </Text>
                  </View>
                  {item.imageUrl ? (
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={styles.adminArticleThumb}
                      resizeMode="cover"
                    />
                  ) : null}
                </View>

                <View style={styles.articleAdminFooter}>
                  <Text style={styles.articleAdminSource}>Source: {item.source}</Text>
                  <View style={styles.articleActionGroup}>
                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() => handleStartEdit(item)}
                    >
                      <Ionicons name="create-outline" size={15} color={Colors.primary} style={{ marginRight: 3 }} />
                      <Text style={styles.editBtnText}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDelete(item)}
                    >
                      <Ionicons name="trash-outline" size={15} color="#DC2626" style={{ marginRight: 3 }} />
                      <Text style={styles.deleteBtnText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centeredContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2E8",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EAEFE8",
  },
  headerCenter: {
    flex: 1,
    marginLeft: 10,
  },
  headerTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
    color: "#1A2E1A",
  },
  headerSubtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    color: Colors.textMuted,
    marginTop: -2,
  },
  previewBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EAF4F4",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  previewBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: Colors.primary,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  /* Form Card */
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EAEFE8",
    marginBottom: 20,
  },
  formCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F0",
    paddingBottom: 8,
  },
  formTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  formTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 15.5,
    color: "#1A2E1A",
  },
  cancelEditBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  cancelEditBtnText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: "#DC2626",
  },

  inputLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: "#334155",
    marginBottom: 5,
    marginTop: 8,
  },
  textInput: {
    backgroundColor: "#FAFBF8",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: "#1A2E1A",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  textAreaSmall: {
    height: 58,
    textAlignVertical: "top",
  },
  textAreaLarge: {
    height: 90,
    textAlignVertical: "top",
  },
  imageHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 5,
  },
  clearImageBtnText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11.5,
    color: "#DC2626",
  },
  imageInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFBF8",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 8 : 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  imageTextInput: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 12.5,
    color: "#1A2E1A",
    padding: 0,
  },
  presetHeading: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 8,
    marginBottom: 6,
  },
  presetsRow: {
    gap: 6,
    flexDirection: "row",
    paddingBottom: 4,
  },
  presetPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: "#F3F7F4",
    borderWidth: 1,
    borderColor: "#E5ECE5",
  },
  presetPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  presetPillText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: "#334155",
  },
  presetPillTextActive: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
  },
  previewBox: {
    width: "100%",
    height: 140,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    marginTop: 10,
    backgroundColor: "#F1F5F0",
  },
  previewImg: {
    width: "100%",
    height: "100%",
  },
  previewStatusTag: {
    position: "absolute",
    bottom: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  previewStatusText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 10.5,
    color: "#FFFFFF",
  },
  categoryScroll: {
    marginBottom: 6,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: "#FAFBF8",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginRight: 6,
  },
  catChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  catChipText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11.5,
    color: Colors.textSecondary,
  },
  catChipTextActive: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
  },
  rowInputs: {
    flexDirection: "row",
    alignItems: "center",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAF7",
    padding: 10,
    borderRadius: 10,
    marginTop: 14,
    marginBottom: 14,
  },
  toggleTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#1A2E1A",
  },
  toggleSub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 6,
  },
  submitButtonText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#FFFFFF",
  },

  /* Articles List */
  listSectionHeader: {
    marginBottom: 10,
  },
  listSectionTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 15,
    color: "#1A2E1A",
  },
  emptyListBox: {
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyListText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: Colors.textMuted,
  },
  articleAdminCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#EAEFE8",
  },
  adminArticleBodyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },
  adminArticleTextWrap: {
    flex: 1,
  },
  adminArticleThumb: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: "#F1F5F0",
  },
  articleHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 10,
  },
  featuredBadge: {
    backgroundColor: "#DC2626",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  featuredBadgeText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 9,
    color: "#FFFFFF",
  },
  articleTimeText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 10.5,
    color: Colors.textMuted,
    marginLeft: "auto",
  },
  articleAdminTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13.5,
    color: "#1A2E1A",
    marginBottom: 4,
  },
  articleAdminSummary: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    color: Colors.textSecondary,
    marginBottom: 10,
    lineHeight: 16,
  },
  articleAdminFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#F4F7F2",
    paddingTop: 8,
  },
  articleAdminSource: {
    fontFamily: "Poppins_400Regular",
    fontSize: 10.5,
    color: Colors.textMuted,
  },
  articleActionGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EAF4F4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  editBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
    color: Colors.primary,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  deleteBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
    color: "#DC2626",
  },

  /* Unauthorized */
  unauthorizedBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  lockCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  unauthorizedTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
    color: "#1A2E1A",
    marginBottom: 6,
  },
  unauthorizedSub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 20,
  },
  backButtonLarge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  backButtonText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#FFFFFF",
  },
});


import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  ScrollView,
  Switch,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Type, Check } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useQuran, QuranScriptFont, QuranLineSpacing } from '@/lib/quran/context';
import * as Haptics from 'expo-haptics';

interface CalligraphySettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SCRIPT_FONTS: { id: QuranScriptFont; label: string; subLabel: string; fontFamily: string }[] = [
  {
    id: 'amiri',
    label: 'Amiri Naskh',
    subLabel: 'Classic book calligraphy',
    fontFamily: 'Amiri_400Regular',
  },
  {
    id: 'scheherazade',
    label: 'Scheherazade New',
    subLabel: 'Clear & spacious marks',
    fontFamily: 'ScheherazadeNew_400Regular',
  },
  {
    id: 'lateef',
    label: 'Lateef Indo-Pak',
    subLabel: 'Nastaliq / Asian style script',
    fontFamily: 'Lateef_400Regular',
  },
];

export const LINE_SPACINGS: { id: QuranLineSpacing; label: string; multiplier: number }[] = [
  { id: 'compact', label: 'Compact', multiplier: 1.6 },
  { id: 'normal', label: 'Normal', multiplier: 2.0 },
  { id: 'relaxed', label: 'Relaxed', multiplier: 2.4 },
];

export function CalligraphySettingsModal({ visible, onClose }: CalligraphySettingsModalProps) {
  const { preferences, updatePreferences } = useQuran();

  const handleFontSelect = (fontId: QuranScriptFont) => {
    void Haptics.selectionAsync();
    updatePreferences({ scriptFont: fontId });
  };

  const handleLineSpacingSelect = (spacingId: QuranLineSpacing) => {
    void Haptics.selectionAsync();
    updatePreferences({ lineSpacing: spacingId });
  };

  const handleFontSizeChange = (delta: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newSize = Math.max(18, Math.min(38, preferences.fontSize + delta));
    updatePreferences({ fontSize: newSize });
  };

  const currentFontFamily = SCRIPT_FONTS.find(f => f.id === preferences.scriptFont)?.fontFamily || 'Amiri_400Regular';
  const currentSpacingMultiplier = LINE_SPACINGS.find(s => s.id === preferences.lineSpacing)?.multiplier || 2.0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.contentCard} onPress={(e) => e.stopPropagation()}>
          {/* Header Bar */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIconBadge}>
                <Type size={18} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Calligraphy & Display</Text>
                <Text style={styles.headerSubtitle}>Customize Quran script for smooth recitation</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Live Calligraphy Preview Box */}
            <View style={styles.previewContainer}>
              <Text style={styles.previewLabel}>Calligraphy Live Preview</Text>
              <View style={styles.previewBox}>
                <Text
                  style={[
                    styles.previewArabicText,
                    {
                      fontFamily: currentFontFamily,
                      fontSize: preferences.fontSize,
                      lineHeight: preferences.fontSize * currentSpacingMultiplier,
                    },
                  ]}
                >
                  بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                </Text>

                {preferences.showTransliteration && (
                  <Text style={styles.previewTransliteration}>
                    Bismillaahir-Rahmaanir-Rahiim
                  </Text>
                )}

                {preferences.showTranslation && (
                  <Text style={styles.previewTranslation}>
                    In the name of Allah, the Entirely Merciful, the Especially Merciful.
                  </Text>
                )}
              </View>
            </View>

            {/* Arabic Script Calligraphy Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Arabic Script Style</Text>
              <Text style={styles.sectionDescription}>Select font for maximum reading clarity</Text>
              <View style={styles.scriptList}>
                {SCRIPT_FONTS.map((font) => {
                  const isSelected = preferences.scriptFont === font.id;
                  return (
                    <TouchableOpacity
                      key={font.id}
                      style={[styles.scriptCard, isSelected && styles.scriptCardSelected]}
                      onPress={() => handleFontSelect(font.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.scriptCardLeft}>
                        <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                          {isSelected && <Check size={12} color="#FFF" />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.scriptLabel, isSelected && styles.scriptLabelSelected]}>
                            {font.label}
                          </Text>
                          <Text style={styles.scriptSubLabel}>{font.subLabel}</Text>
                        </View>
                      </View>
                      <Text style={[styles.scriptSampleText, { fontFamily: font.fontFamily }]}>
                        الْحَمْدُ لِلَّهِ
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Font Size & Line Spacing */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sizing & Line Spacing</Text>
              
              {/* Font Size Controls */}
              <View style={styles.sizeControlRow}>
                <Text style={styles.controlLabel}>Font Size</Text>
                <View style={styles.stepperContainer}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => handleFontSizeChange(-2)}
                    disabled={preferences.fontSize <= 18}
                  >
                    <Ionicons name="remove" size={18} color={preferences.fontSize <= 18 ? Colors.textMuted : Colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.sizeValueText}>{preferences.fontSize} pt</Text>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => handleFontSizeChange(2)}
                    disabled={preferences.fontSize >= 38}
                  >
                    <Ionicons name="add" size={18} color={preferences.fontSize >= 38 ? Colors.textMuted : Colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Line Spacing Buttons */}
              <View style={styles.spacingRow}>
                <Text style={styles.controlLabel}>Line Height</Text>
                <View style={styles.spacingPills}>
                  {LINE_SPACINGS.map((spacing) => {
                    const isSelected = preferences.lineSpacing === spacing.id;
                    return (
                      <TouchableOpacity
                        key={spacing.id}
                        style={[styles.spacingPill, isSelected && styles.spacingPillSelected]}
                        onPress={() => handleLineSpacingSelect(spacing.id)}
                      >
                        <Text style={[styles.spacingPillText, isSelected && styles.spacingPillTextSelected]}>
                          {spacing.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* Non-Arabic Reciter Helper Toggles */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recitation Helpers</Text>
              
              {/* Transliteration Toggle */}
              <View style={styles.toggleRow}>
                <View style={styles.toggleTextContainer}>
                  <View style={styles.toggleHeader}>
                    <Text style={styles.toggleTitle}>English Transliteration</Text>
                    <View style={styles.badgeRecommended}>
                      <Text style={styles.badgeRecommendedText}>For Non-Arabic</Text>
                    </View>
                  </View>
                  <Text style={styles.toggleSubtitle}>Show English phonetic pronunciation below Arabic</Text>
                </View>
                <Switch
                  value={preferences.showTransliteration}
                  onValueChange={(val) => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    updatePreferences({ showTransliteration: val });
                  }}
                  trackColor={{ false: Colors.borderLight, true: Colors.primary }}
                  thumbColor={Platform.OS === 'android' ? '#FFF' : undefined}
                />
              </View>

              {/* Translation Toggle */}
              <View style={styles.toggleRow}>
                <View style={styles.toggleTextContainer}>
                  <Text style={styles.toggleTitle}>Translation</Text>
                  <Text style={styles.toggleSubtitle}>Display English verse translation</Text>
                </View>
                <Switch
                  value={preferences.showTranslation}
                  onValueChange={(val) => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    updatePreferences({ showTranslation: val });
                  }}
                  trackColor={{ false: Colors.borderLight, true: Colors.primary }}
                  thumbColor={Platform.OS === 'android' ? '#FFF' : undefined}
                />
              </View>
            </View>
          </ScrollView>

          {/* Footer Action */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
              <Text style={styles.doneBtnText}>Apply & Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  contentCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: Colors.text,
  },
  headerSubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
  },
  closeBtn: {
    padding: 6,
  },
  scrollArea: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  previewContainer: {
    marginBottom: 20,
  },
  previewLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewBox: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
  },
  previewArabicText: {
    color: Colors.primary,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  previewTransliteration: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: Colors.accent,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
  previewTranslation: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
  },
  section: {
    marginBottom: 22,
  },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: Colors.text,
    marginBottom: 2,
  },
  sectionDescription: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 12,
  },
  scriptList: {
    gap: 10,
  },
  scriptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  scriptCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceAlt,
  },
  scriptCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  scriptLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: Colors.text,
  },
  scriptLabelSelected: {
    color: Colors.primary,
    fontFamily: 'Poppins_600SemiBold',
  },
  scriptSubLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: Colors.textMuted,
  },
  scriptSampleText: {
    fontSize: 20,
    color: Colors.primary,
  },
  sizeControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  controlLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: Colors.text,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  stepperBtn: {
    padding: 8,
  },
  sizeValueText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: Colors.text,
    minWidth: 50,
    textAlign: 'center',
  },
  spacingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  spacingPills: {
    flexDirection: 'row',
    gap: 8,
  },
  spacingPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  spacingPillSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  spacingPillText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: Colors.textMuted,
  },
  spacingPillTextSelected: {
    color: '#FFF',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  toggleTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  toggleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleTitle: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: Colors.text,
  },
  badgeRecommended: {
    backgroundColor: 'rgba(217, 119, 6, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeRecommendedText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10,
    color: Colors.accent,
  },
  toggleSubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  doneBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: '#FFF',
  },
});

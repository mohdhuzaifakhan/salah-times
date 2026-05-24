import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Linking, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { isAdmobSupported, BannerAd, BannerAdSize, AD_UNIT_IDS } from '@/lib/ads';

interface PremiumBannerAdProps {
  adUnitId?: string;
  inTabBar?: boolean;
}

export const PremiumBannerAd: React.FC<PremiumBannerAdProps> = ({ adUnitId, inTabBar = false }) => {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(true);
  const [admobFailed, setAdmobFailed] = useState(false);

  if (!visible) return null;

  const bottomPosition = inTabBar
    ? (Platform.OS === 'web' ? 84 : 49) + insets.bottom
    : 0;

  const paddingBottomVal = inTabBar
    ? 8
    : Math.max(insets.bottom, 8);

  // If AdMob is supported and hasn't failed to load, render the Google BannerAd
  if (isAdmobSupported() && BannerAd && !admobFailed) {
    return (
      <View style={[
        styles.adContainer,
        {
          bottom: bottomPosition,
          paddingBottom: paddingBottomVal,
          paddingTop: 4
        }
      ]}>
        <View style={styles.divider} />
        <View style={styles.googleAdWrap}>
          <Pressable
            style={styles.closeBtnOverlay}
            onPress={() => setVisible(false)}
          >
            <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
          </Pressable>
          <BannerAd
            unitId={adUnitId || AD_UNIT_IDS.BANNER}
            size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
            onAdFailedToLoad={(error: any) => {
              console.log('[AdMob] Banner ad failed to load, showing simulated ad instead:', error);
              setAdmobFailed(true);
            }}
          />
        </View>
      </View>
    );
  }

  // Fallback beautiful simulated ad
  const handlePress = () => {
    Linking.openURL('https://salah-times-premium.app');
  };

  return (
    <View style={[
      styles.adContainer,
      {
        bottom: bottomPosition,
        paddingBottom: inTabBar ? 12 : Math.max(insets.bottom, 12)
      }
    ]}>
      <View style={styles.divider} />
      <Pressable
        style={({ pressed }) => [
          styles.adBody,
          pressed && styles.adBodyPressed
        ]}
        onPress={handlePress}
      >
        <View style={styles.adLeft}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Ad</Text>
          </View>
          <Ionicons name="sparkles-outline" size={16} color={Colors.accent} />
          <Text style={styles.adText} numberOfLines={1}>
            Go Ad-Free! Get Salah Times Premium Companion.
          </Text>
        </View>

        <View style={styles.adRight}>
          <Text style={styles.ctaText}>Upgrade</Text>
          <Pressable
            style={styles.closeBtn}
            onPress={(e) => {
              e.stopPropagation(); // Avoid triggering navigation
              setVisible(false);
            }}
          >
            <Ionicons name="close" size={16} color={Colors.textMuted} />
          </Pressable>
        </View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  adContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background,
    paddingTop: 8,
    paddingHorizontal: 16,
    zIndex: 100,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginBottom: 8,
  },
  googleAdWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minHeight: 50,
  },
  closeBtnOverlay: {
    position: 'absolute',
    right: 0,
    top: -24,
    zIndex: 101,
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 2,
  },
  adBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  adBodyPressed: {
    opacity: 0.92,
  },
  adLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  badgeText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 8,
    color: '#FFF',
  },
  adText: {
    flex: 1,
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: Colors.text,
  },
  adRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ctaText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: Colors.primary,
  },
  closeBtn: {
    padding: 2,
  },
});

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import {
  isAdmobSupported,
  NativeAd,
  NativeAdView,
  NativeAsset,
  NativeAssetType,
  AD_UNIT_IDS
} from '@/lib/ads';

interface NativeHadithAdCardProps {
  headline?: string;
  body?: string;
  callToAction?: string;
  url?: string;
}

export const NativeHadithAdCard: React.FC<NativeHadithAdCardProps> = ({
  headline = "Daily Islamic Reminders",
  body = "Receive beautiful Quranic verses and daily Hadiths directly on your lockscreen with widgets.",
  callToAction = "Download App",
  url = "https://example.com/reminders",
}) => {
  const [nativeAd, setNativeAd] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (isAdmobSupported() && NativeAd) {
      NativeAd.createForAdRequest(AD_UNIT_IDS.NATIVE)
        .then((ad: any) => {
          setNativeAd(ad);
          setLoading(false);
        })
        .catch((error: any) => {
          console.log('[AdMob] Native Hadith ad failed to load, using simulated:', error);
          setFailed(true);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const handleSimulatedPress = () => {
    Linking.openURL(url);
  };

  // Render real AdMob native ad when loaded
  if (isAdmobSupported() && nativeAd && !failed) {
    return (
      <NativeAdView nativeAd={nativeAd} style={styles.container}>
        <View style={styles.iconContainer}>
          <Ionicons name="sparkles" size={24} color={Colors.accent} />
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.headlineRow}>
            <NativeAsset assetType={NativeAssetType.HEADLINE} style={styles.flex1}>
              <Text style={styles.name} numberOfLines={1}>{nativeAd.headline}</Text>
            </NativeAsset>
            <View style={styles.adBadge}>
              <Text style={styles.adBadgeText}>Ad</Text>
            </View>
          </View>

          <NativeAsset assetType={NativeAssetType.BODY}>
            <Text style={styles.description} numberOfLines={2}>{nativeAd.body}</Text>
          </NativeAsset>

          <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
            <View style={styles.actionBadge}>
              <Text style={styles.actionText}>{nativeAd.callToAction || 'Learn More'}</Text>
            </View>
          </NativeAsset>
        </View>

        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      </NativeAdView>
    );
  }

  // Render mock simulated ad if not loaded, loading, or not supported
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handleSimulatedPress}
      activeOpacity={0.8}
    >
      <View style={styles.iconContainer}>
        <Ionicons name="sparkles" size={24} color={Colors.accent} />
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.headlineRow}>
          <Text style={styles.name} numberOfLines={1}>{headline}</Text>
          <View style={styles.adBadge}>
            <Text style={styles.adBadgeText}>Ad</Text>
          </View>
        </View>

        <Text style={styles.description} numberOfLines={2}>{body}</Text>

        <View style={styles.actionBadge}>
          <Text style={styles.actionText}>{callToAction}</Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(212, 168, 67, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoContainer: {
    flex: 1,
  },
  headlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  flex1: {
    flex: 1,
  },
  name: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: Colors.text,
    flex: 1,
  },
  adBadge: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  adBadgeText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 8,
    color: '#FFF',
  },
  description: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 6,
    lineHeight: 16,
  },
  actionBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  actionText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10,
    color: '#fff',
  },
});

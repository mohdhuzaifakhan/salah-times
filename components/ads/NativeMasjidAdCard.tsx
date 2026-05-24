import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
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

interface NativeMasjidAdCardProps {
  headline?: string;
  body?: string;
  advertiser?: string;
  callToAction?: string;
  url?: string;
}

export const NativeMasjidAdCard: React.FC<NativeMasjidAdCardProps> = ({
  headline = "Sadaqah & Zakat Foundation",
  body = "Calculate your zakat accurately and donate to verified campaigns serving the global community.",
  advertiser = "MuslimAid Zakat",
  callToAction = "Calculate Zakat",
  url = "https://example.com/zakat",
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
          console.log('[AdMob] Native Masjid ad failed to load, using simulated:', error);
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
      <NativeAdView nativeAd={nativeAd} style={styles.card}>
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <Ionicons name="gift" size={20} color={Colors.accent} />
          </View>
          <View style={styles.headerText}>
            <View style={styles.titleRow}>
              <NativeAsset assetType={NativeAssetType.HEADLINE} style={styles.flex1}>
                <Text style={styles.name} numberOfLines={1}>
                  {nativeAd.headline}
                </Text>
              </NativeAsset>
              <View style={styles.sponsoredBadge}>
                <Text style={styles.sponsoredText}>SPONSORED</Text>
              </View>
            </View>
            <View style={styles.locationRow}>
              <Ionicons name="globe-outline" size={13} color={Colors.textMuted} />
              <NativeAsset assetType={NativeAssetType.ADVERTISER}>
                <Text style={styles.advertiser} numberOfLines={1}>
                  {nativeAd.advertiser || 'Sponsored'}
                </Text>
              </NativeAsset>
            </View>
          </View>
        </View>

        <NativeAsset assetType={NativeAssetType.BODY}>
          <Text style={styles.bodyText} numberOfLines={2}>
            {nativeAd.body}
          </Text>
        </NativeAsset>

        <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
          <View style={styles.ctaButton}>
            <Text style={styles.ctaText}>{nativeAd.callToAction || 'Learn More'}</Text>
            <Ionicons name="arrow-forward" size={14} color="#FFF" />
          </View>
        </NativeAsset>
      </NativeAdView>
    );
  }

  // Render mock simulated ad if not loaded, loading, or not supported
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
      onPress={handleSimulatedPress}
    >
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons name="gift" size={20} color={Colors.accent} />
        </View>
        <View style={styles.headerText}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1}>
              {headline}
            </Text>
            <View style={styles.sponsoredBadge}>
              <Text style={styles.sponsoredText}>SPONSORED</Text>
            </View>
          </View>
          <View style={styles.locationRow}>
            <Ionicons name="globe-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.advertiser} numberOfLines={1}>
              {advertiser}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.bodyText} numberOfLines={2}>
        {body}
      </Text>

      <View style={styles.ctaButton}>
        <Text style={styles.ctaText}>{callToAction}</Text>
        <Ionicons name="arrow-forward" size={14} color="#FFF" />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cardPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(212, 168, 67, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  sponsoredBadge: {
    backgroundColor: Colors.accent,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  sponsoredText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 8,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  advertiser: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
  },
  bodyText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  ctaText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
});

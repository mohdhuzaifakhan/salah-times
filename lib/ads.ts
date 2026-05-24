import { NativeModules, Platform } from 'react-native';

/**
 * Checks if react-native-google-mobile-ads's native module exists in the current runtime.
 * Standard Expo Go or Web environments will not compile this native binary, so this safely returns false.
 */
export const isAdmobSupported = (): boolean => {
  if (Platform.OS === 'web') return false;
  return !!(
    NativeModules.RNGoogleMobileAdsModule ||
    NativeModules.RNGoogleMobileAds ||
    NativeModules.RNGoogleMobileAdsConsentModule
  );
};

let mobileAds: any = null;
let BannerAd: any = null;
let BannerAdSize: any = null;
let TestIds: any = null;
let NativeAdView: any = null;
let NativeAsset: any = null;
let NativeAssetType: any = null;
let NativeAd: any = null;

if (isAdmobSupported()) {
  try {
    // Dynamic import to prevent crash in Expo Go / Web environments
    const googleMobileAds = require('react-native-google-mobile-ads');
    mobileAds = googleMobileAds.default;
    BannerAd = googleMobileAds.BannerAd;
    BannerAdSize = googleMobileAds.BannerAdSize;
    TestIds = googleMobileAds.TestIds;
    NativeAdView = googleMobileAds.NativeAdView;
    NativeAsset = googleMobileAds.NativeAsset;
    NativeAssetType = googleMobileAds.NativeAssetType;
    NativeAd = googleMobileAds.NativeAd;
  } catch (error) {
    console.warn('Failed to dynamically require react-native-google-mobile-ads:', error);
  }
}

export {
  mobileAds,
  BannerAd,
  BannerAdSize,
  TestIds,
  NativeAdView,
  NativeAsset,
  NativeAssetType,
  NativeAd,
};

/**
 * Single source of truth for Ad Unit IDs.
 * Uses official Google Test Ad IDs during development (`__DEV__`),
 * and falls back to environment variables or production IDs for production release.
 */
export const AD_UNIT_IDS = {
  BANNER: __DEV__
    ? (TestIds?.BANNER || 'ca-app-pub-3940256099942544/6300978111')
    : (process.env.EXPO_PUBLIC_ADMOB_BANNER_ID || 'ca-app-pub-3940256099942544/6300978111'),
  NATIVE: __DEV__
    ? (TestIds?.NATIVE || 'ca-app-pub-3940256099942544/2247696110')
    : (process.env.EXPO_PUBLIC_ADMOB_NATIVE_ID || 'ca-app-pub-3940256099942544/2247696110'),
};

/**
 * Initializes the Google Mobile Ads SDK safely if supported.
 */
export const initializeAds = async () => {
  if (isAdmobSupported() && mobileAds) {
    try {
      await mobileAds().initialize();
      console.log('[AdMob] Google Mobile Ads SDK Initialized successfully.');
    } catch (error) {
      console.warn('[AdMob] Failed to initialize Google Mobile Ads SDK:', error);
    }
  } else {
    console.log('[AdMob] Not supported in this environment (Expo Go/Web). Fallback simulated ads enabled.');
  }
};

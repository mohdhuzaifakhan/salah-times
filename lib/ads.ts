import { NativeModules, Platform } from 'react-native';

/**
 * Checks if react-native-google-mobile-ads's native module exists in the current runtime.
 * Works seamlessly across both Old Architecture & New Architecture (TurboModules) in native builds,
 * while safely returning false in Expo Go or Web environments.
 */
export const isAdmobSupported = (): boolean => {
  if (Platform.OS === 'web') return false;
  try {
    const googleMobileAds = require('react-native-google-mobile-ads');
    return !!(
      googleMobileAds?.default ||
      googleMobileAds?.BannerAd ||
      NativeModules.RNGoogleMobileAdsModule ||
      NativeModules.RNGoogleMobileAds
    );
  } catch (error) {
    return false;
  }
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
    console.warn('Failed to require react-native-google-mobile-ads:', error);
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
 * and falls back to production IDs or environment variables for production release.
 */
export const AD_UNIT_IDS = {
  BANNER: __DEV__
    ? (TestIds?.BANNER || (Platform.OS === 'ios' ? 'ca-app-pub-3940256099942544/2934735716' : 'ca-app-pub-3940256099942544/6300978111'))
    : (process.env.EXPO_PUBLIC_ADMOB_BANNER_ID || TestIds?.BANNER || 'ca-app-pub-3940256099942544/6300978111'),
  NATIVE: __DEV__
    ? (TestIds?.NATIVE || (Platform.OS === 'ios' ? 'ca-app-pub-3940256099942544/3986624511' : 'ca-app-pub-3940256099942544/2247696110'))
    : (process.env.EXPO_PUBLIC_ADMOB_NATIVE_ID || TestIds?.NATIVE || 'ca-app-pub-3940256099942544/2247696110'),
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
    console.log('[AdMob] Not supported in standard Expo Go sandbox. Run a Development Build (npx expo run:android) to load real native ads.');
  }
};

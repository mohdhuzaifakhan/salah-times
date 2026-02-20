import AsyncStorage from '@react-native-async-storage/async-storage';
import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';

// Use Test ID if not configured
// const adUnitId = __DEV__ ? TestIds.INTERSTITIAL : 'ca-app-pub-3940256099942544/1033173712';

const AD_CAP_KEY = '@ad_frequency_cap';
const AD_DATE_KEY = '@ad_frequency_date';
const DAILY_LIMIT = 5;

let interstitial: InterstitialAd | null = null;
let loaded = false;

export const AdManager = {
    initialize: () => {
        // Preload an interstitial
        AdManager.loadInterstitial();
    },

    loadInterstitial: () => {
        if (loaded || interstitial) return;

        interstitial = InterstitialAd.createForAdRequest(TestIds.INTERSTITIAL, {
            requestNonPersonalizedAdsOnly: true,
        });

        interstitial.addAdEventListener(AdEventType.LOADED, () => {
            loaded = true;
        });

        interstitial.addAdEventListener(AdEventType.CLOSED, () => {
            loaded = false;
            interstitial = null;
            AdManager.loadInterstitial();
        });

        interstitial.load();
    },

    checkCap: async (): Promise<boolean> => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const lastDate = await AsyncStorage.getItem(AD_DATE_KEY);
            const capStr = await AsyncStorage.getItem(AD_CAP_KEY);
            let count = 0;

            if (lastDate === today && capStr) {
                count = parseInt(capStr, 10);
            } else {
                await AsyncStorage.setItem(AD_DATE_KEY, today);
                await AsyncStorage.setItem(AD_CAP_KEY, '0');
            }

            return count < DAILY_LIMIT;
        } catch (e) {
            console.error('Error checking ad cap', e);
            return false; // Fail safe: don't show ad if error
        }
    },

    incrementCap: async () => {
        try {
            const capStr = await AsyncStorage.getItem(AD_CAP_KEY);
            const count = capStr ? parseInt(capStr, 10) : 0;
            await AsyncStorage.setItem(AD_CAP_KEY, (count + 1).toString());
        } catch (e) {
            console.error('Error incrementing ad cap', e);
        }
    },

    showInterstitial: async () => {
        const canShow = await AdManager.checkCap();
        if (!canShow) {
            console.log('Ad frequency limit reached for today.');
            return;
        }

        if (loaded && interstitial) {
            interstitial.show();
            await AdManager.incrementCap();
            loaded = false; // Reset loaded state immediately
        } else {
            console.log('Interstitial not loaded yet.');
            // Try loading for next time
            AdManager.loadInterstitial();
        }
    }
};

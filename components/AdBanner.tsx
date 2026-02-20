import Colors from '@/constants/colors';
import React from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

// Use Test ID if not configured (user needs to replace with real ID)
// For Android Emulators/Simulators, TestIds.BANNER is required to show ads.
const adUnitId = __DEV__ ? TestIds.BANNER : 'ca-app-pub-6969484458852988/1465372597';

export function AdBanner() {
    return (
        <View style={styles.container}>
            <BannerAd
                unitId={TestIds.BANNER}
                size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                requestOptions={{
                    requestNonPersonalizedAdsOnly: true,
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 2,
        backgroundColor: Colors.background,
    },
});

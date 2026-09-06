import React, { useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Platform,
  Share,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import Colors from '@/constants/colors';
import { showCustomAlert } from '@/lib/custom-alert';

interface ShareAppModalProps {
  visible: boolean;
  onClose: () => void;
}

const APP_STORE_URL = 'https://play.google.com/store/apps/details?id=com.huzaifa.salahtimes';

export function ShareAppModal({ visible, onClose }: ShareAppModalProps) {
  const insets = useSafeAreaInsets();
  const qrRef = useRef<any>(null);

  const handleDownloadQR = () => {
    if (!qrRef.current) {
      showCustomAlert('Error', 'QR code is not ready yet.');
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    qrRef.current.toDataURL(async (data: string) => {
      try {
        if (Platform.OS === 'web') {
          const link = document.createElement('a');
          link.href = `data:image/png;base64,${data}`;
          link.download = 'SalahTimes_App_QRScanner.png';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          showCustomAlert('Downloaded!', 'App QR Code scanner image downloaded successfully.');
        } else {
          const fileUri = `${FileSystem.cacheDirectory}SalahTimes_App_QRScanner.png`;
          await FileSystem.writeAsStringAsync(fileUri, data, {
            encoding: FileSystem.EncodingType.Base64,
          });

          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
              mimeType: 'image/png',
              dialogTitle: 'Save & Share Salah Times QR Scanner',
              UTI: 'public.png',
            });
          } else {
            showCustomAlert('Saved!', 'QR Code scanner image saved to cache.');
          }
        }
      } catch (err) {
        console.error('Failed to save QR code image:', err);
        showCustomAlert('Error', 'Could not save QR code scanner image.');
      }
    });
  };

  const handleShareLink = async () => {
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Share.share({
        message: `Assalamu Alaikum! Download the Salah Times app to track active masjid prayer times, read Quran, and view the Islamic calendar: ${APP_STORE_URL}`,
        url: APP_STORE_URL,
        title: 'Salah Times App',
      });
    } catch (error) {
      console.error('Share link failed:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
          {/* Header Bar */}
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <View style={styles.headerIconWrap}>
                <Ionicons name="qr-code" size={20} color={Colors.primary} />
              </View>
              <Text style={styles.title}>Share & Download App</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Scan the QR code below using any phone camera to install the app or download & share the QR scanner card!
          </Text>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Visual QR Code Card */}
            <View style={styles.qrCard}>
              <View style={styles.cardBadge}>
                <Ionicons name="moon-outline" size={14} color="#B08E35" />
                <Text style={styles.cardBadgeText}>SALAH TIMES APP</Text>
              </View>

              <Text style={styles.appName}>Salah Times</Text>
              <Text style={styles.appTagline}>Active Masjid Prayer Timetable & Quran</Text>

              {/* QR Code Frame */}
              <View style={styles.qrFrame}>
                <QRCode
                  value={APP_STORE_URL}
                  size={170}
                  color={Colors.primaryDark}
                  backgroundColor="#FFFFFF"
                  getRef={(ref) => (qrRef.current = ref)}
                />
              </View>

              <View style={styles.scanInstructionRow}>
                <Ionicons name="camera-outline" size={16} color={Colors.primary} />
                <Text style={styles.scanInstructionText}>Point phone camera to scan & download</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionSection}>
              <TouchableOpacity
                style={styles.downloadBtn}
                onPress={handleDownloadQR}
                activeOpacity={0.8}
              >
                <Ionicons name="download-outline" size={20} color="#FFFFFF" />
                <Text style={styles.downloadBtnText}>Save / Share QR Scanner Image</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shareLinkBtn}
                onPress={handleShareLink}
                activeOpacity={0.8}
              >
                <Ionicons name="share-social-outline" size={18} color={Colors.primary} />
                <Text style={styles.shareLinkBtnText}>Share App Download Link</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 19,
    fontFamily: 'Poppins_700Bold',
    color: Colors.text,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: Colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 10,
  },
  qrCard: {
    width: '100%',
    backgroundColor: '#FAF7F0',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#EADBB6',
    marginBottom: 20,
  },
  cardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(212, 168, 67, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  cardBadgeText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: '#B08E35',
    letterSpacing: 0.5,
  },
  appName: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    color: Colors.primaryDark,
  },
  appTagline: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: Colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  qrFrame: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  scanInstructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scanInstructionText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: Colors.primary,
  },
  actionSection: {
    width: '100%',
    gap: 10,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  downloadBtnText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
  shareLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  shareLinkBtnText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.primary,
  },
});

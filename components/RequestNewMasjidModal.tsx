import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { showCustomAlert } from '@/lib/custom-alert';
import { createMasjidRequest } from '@/lib/store';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';

interface RequestNewMasjidModalProps {
  visible: boolean;
  onClose: () => void;
  defaultCity?: string;
  defaultState?: string;
}

export function RequestNewMasjidModal({
  visible,
  onClose,
  defaultCity = '',
  defaultState = '',
}: RequestNewMasjidModalProps) {
  const insets = useSafeAreaInsets();

  const [masjidName, setMasjidName] = useState('');
  const [city, setCity] = useState(defaultCity);
  const [subDivision, setSubDivision] = useState('');
  const [state, setState] = useState(defaultState);
  const [address, setAddress] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  const [masjidPhoto, setMasjidPhoto] = useState<string | null>(null);
  const [timetablePhoto, setTimetablePhoto] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setMasjidName('');
    setCity(defaultCity);
    setSubDivision('');
    setState(defaultState);
    setAddress('');
    setWhatsappNumber('');
    setEmail('');
    setNotes('');
    setMasjidPhoto(null);
    setTimetablePhoto(null);
  };

  const handlePickImage = async (type: 'masjid' | 'timetable') => {
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showCustomAlert(
          'Permission Required',
          'Please grant access to your photo library to select a picture.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const formattedUri = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;

        if (type === 'masjid') {
          setMasjidPhoto(formattedUri);
        } else {
          setTimetablePhoto(formattedUri);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showCustomAlert('Error', 'Failed to pick image.');
    }
  };

  const handleSubmit = async () => {
    const cleanName = masjidName.trim();
    const cleanCity = city.trim();
    const cleanAddress = address.trim();
    const cleanWhatsapp = whatsappNumber.trim();
    const cleanEmail = email.trim();

    if (!cleanName) {
      showCustomAlert('Masjid Name Required', 'Please enter the name of the masjid.');
      return;
    }

    if (!cleanCity) {
      showCustomAlert('City Required', 'Please enter the city where the masjid is located.');
      return;
    }

    if (!cleanAddress) {
      showCustomAlert('Address Required', 'Please enter the complete address or location of the masjid.');
      return;
    }

    if (!cleanWhatsapp || cleanWhatsapp.length < 8) {
      showCustomAlert(
        'WhatsApp Number Required',
        'Please enter a valid WhatsApp contact number so super admin can reach you directly.'
      );
      return;
    }

    if (cleanEmail && !/\S+@\S+\.\S+/.test(cleanEmail)) {
      showCustomAlert('Invalid Email', 'Please enter a valid email address or leave it blank.');
      return;
    }

    setSubmitting(true);
    try {
      await createMasjidRequest({
        masjidName: cleanName,
        city: cleanCity,
        subDivision: subDivision.trim() || undefined,
        state: state.trim() || undefined,
        address: cleanAddress,
        whatsappNumber: cleanWhatsapp,
        email: cleanEmail || undefined,
        notes: notes.trim() || undefined,
        masjidPhotoBase64: masjidPhoto || undefined,
        timetablePhotoBase64: timetablePhoto || undefined,
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showCustomAlert(
        'Request Submitted Successfully!',
        'Thank you! Your request to register this masjid has been sent to Super Admin. Admin will contact you on WhatsApp shortly.',
        [
          {
            text: 'OK',
            onPress: () => {
              resetForm();
              onClose();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Failed to submit masjid request:', error);
      showCustomAlert(
        'Submission Failed',
        'Something went wrong while submitting your request. Please check your network connection.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />

        <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconWrap}>
                <Ionicons name="business" size={20} color={Colors.primary} />
              </View>
              <Text style={styles.title}>Request New Masjid</Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Submit your local masjid details and photos. Super admin will review and contact you on WhatsApp.
          </Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.formContainer}
          >
            {/* Masjid Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Masjid Name *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="business-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Masjid Al-Noor"
                  placeholderTextColor={Colors.textMuted}
                  value={masjidName}
                  onChangeText={setMasjidName}
                  editable={!submitting}
                />
              </View>
            </View>

            {/* City & Sub-Division */}
            <View style={styles.rowFields}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.label}>City / Town *</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="location-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Mumbai"
                    placeholderTextColor={Colors.textMuted}
                    value={city}
                    onChangeText={setCity}
                    editable={!submitting}
                  />
                </View>
              </View>

              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.label}>Area / Sub-Division</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="map-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Bandra West"
                    placeholderTextColor={Colors.textMuted}
                    value={subDivision}
                    onChangeText={setSubDivision}
                    editable={!submitting}
                  />
                </View>
              </View>
            </View>

            {/* State */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>State / Region</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="compass-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Maharashtra"
                  placeholderTextColor={Colors.textMuted}
                  value={state}
                  onChangeText={setState}
                  editable={!submitting}
                />
              </View>
            </View>

            {/* Full Address */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Full Address *</Text>
              <View style={[styles.inputWrapper, styles.multilineWrapper]}>
                <Ionicons
                  name="navigate-outline"
                  size={18}
                  color={Colors.textMuted}
                  style={[styles.inputIcon, styles.multilineIcon]}
                />
                <TextInput
                  style={[styles.input, styles.shortMultilineInput]}
                  placeholder="Street name, landmark, colony..."
                  placeholderTextColor={Colors.textMuted}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                  value={address}
                  onChangeText={setAddress}
                  editable={!submitting}
                />
              </View>
            </View>

            {/* Contact Details Header */}
            <View style={styles.divider} />
            <Text style={styles.sectionHeaderTitle}>Contact Details for Admin</Text>

            {/* WhatsApp Number (Mandatory) */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>WhatsApp Number *</Text>
                <Text style={styles.mandatoryBadge}>Required for WhatsApp contact</Text>
              </View>
              <View style={styles.inputWrapper}>
                <Ionicons name="logo-whatsapp" size={18} color="#25D366" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="+91 9876543210 (With country code)"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="phone-pad"
                  value={whatsappNumber}
                  onChangeText={setWhatsappNumber}
                  editable={!submitting}
                />
              </View>
            </View>

            {/* Email (Optional) */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email Address (Optional)</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="your.email@example.com"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  editable={!submitting}
                />
              </View>
            </View>

            {/* Photos Header */}
            <View style={styles.divider} />
            <Text style={styles.sectionHeaderTitle}>Masjid Photos & Timetable Board</Text>

            <View style={styles.photosRow}>
              {/* Photo 1: Masjid Photo */}
              <View style={styles.photoBox}>
                <Text style={styles.photoLabel}>Masjid Photo</Text>
                {masjidPhoto ? (
                  <View style={styles.previewContainer}>
                    <Image source={{ uri: masjidPhoto }} style={styles.previewImage} />
                    <TouchableOpacity
                      style={styles.removeImageBtn}
                      onPress={() => setMasjidPhoto(null)}
                    >
                      <Ionicons name="close-circle" size={22} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.uploadBtn}
                    onPress={() => handlePickImage('masjid')}
                  >
                    <Ionicons name="camera-outline" size={24} color={Colors.primary} />
                    <Text style={styles.uploadBtnText}>Upload Photo</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Photo 2: Timetable Board Photo */}
              <View style={styles.photoBox}>
                <Text style={styles.photoLabel}>Timetable Board</Text>
                {timetablePhoto ? (
                  <View style={styles.previewContainer}>
                    <Image source={{ uri: timetablePhoto }} style={styles.previewImage} />
                    <TouchableOpacity
                      style={styles.removeImageBtn}
                      onPress={() => setTimetablePhoto(null)}
                    >
                      <Ionicons name="close-circle" size={22} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.uploadBtn}
                    onPress={() => handlePickImage('timetable')}
                  >
                    <Ionicons name="time-outline" size={24} color={Colors.primary} />
                    <Text style={styles.uploadBtnText}>Upload Board</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Additional Notes */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Additional Notes (Optional)</Text>
              <View style={[styles.inputWrapper, styles.multilineWrapper]}>
                <Ionicons
                  name="document-text-outline"
                  size={18}
                  color={Colors.textMuted}
                  style={[styles.inputIcon, styles.multilineIcon]}
                />
                <TextInput
                  style={[styles.input, styles.shortMultilineInput]}
                  placeholder="Any extra prayer timing details or remarks..."
                  placeholderTextColor={Colors.textMuted}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                  value={notes}
                  onChangeText={setNotes}
                  editable={!submitting}
                />
              </View>
            </View>
          </ScrollView>

          {/* Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleClose}
              disabled={submitting}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="send" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.submitBtnText}>Submit Request</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerLeft: {
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
    fontFamily: 'Poppins_700Bold',
    fontSize: 19,
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
    fontFamily: 'Poppins_400Regular',
    fontSize: 12.5,
    color: Colors.textSecondary,
    marginBottom: 14,
    lineHeight: 18,
  },
  formContainer: {
    gap: 12,
    paddingBottom: 16,
  },
  fieldGroup: {
    gap: 5,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 10,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12.5,
    color: Colors.text,
  },
  mandatoryBadge: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    color: '#25D366',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    fontFamily: 'Poppins_400Regular',
    flex: 1,
    height: 46,
    fontSize: 13.5,
    color: Colors.text,
  },
  multilineWrapper: {
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  multilineIcon: {
    marginTop: 2,
  },
  shortMultilineInput: {
    height: 54,
    paddingTop: 0,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 4,
  },
  sectionHeaderTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
    color: Colors.primary,
    marginTop: 2,
  },
  photosRow: {
    flexDirection: 'row',
    gap: 12,
  },
  photoBox: {
    flex: 1,
    gap: 6,
  },
  photoLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  uploadBtn: {
    height: 90,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  uploadBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    color: Colors.primary,
  },
  previewContainer: {
    position: 'relative',
    height: 90,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: Colors.textSecondary,
  },
  submitBtn: {
    flex: 1.5,
    height: 46,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
});

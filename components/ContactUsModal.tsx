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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { showCustomAlert } from '@/lib/custom-alert';
import { createAppMessage } from '@/lib/store';
import * as Haptics from 'expo-haptics';

interface ContactUsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ContactUsModal({ visible, onClose }: ContactUsModalProps) {
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmedPhone = phone.trim();
    const trimmedMessage = message.trim();

    if (!trimmedPhone || trimmedPhone.length < 8) {
      showCustomAlert(
        'Phone Number Required',
        'Please enter a valid contact phone number so our support team can reach you.'
      );
      return;
    }

    if (!trimmedMessage) {
      showCustomAlert('Message Required', 'Please enter your message.');
      return;
    }

    setSubmitting(true);
    try {
      await createAppMessage('Contact Us Message', trimmedPhone, trimmedMessage);

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showCustomAlert(
        'Message Sent',
        'Thank you! Your message has been submitted successfully.',
        [
          {
            text: 'OK',
            onPress: () => {
              setPhone('');
              setMessage('');
              onClose();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Failed to submit contact message:', error);
      showCustomAlert(
        'Submission Failed',
        'Something went wrong while sending your message. Please check your network connection.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    setPhone('');
    setMessage('');
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
          {/* Top Bar */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconWrap}>
                <Ionicons name="call" size={20} color={Colors.primary} />
              </View>
              <Text style={styles.title}>Contact Us</Text>
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
            Have questions, feedback, or need help? Send us a message directly.
          </Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.formContainer}
          >
            {/* Phone Number Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Phone Number *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your phone number..."
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  editable={!submitting}
                />
              </View>
            </View>

            {/* Message Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Message *</Text>
              <View style={[styles.inputWrapper, styles.multilineWrapper]}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={18}
                  color={Colors.textMuted}
                  style={[styles.inputIcon, styles.multilineIcon]}
                />
                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  placeholder="Type your message or feedback here..."
                  placeholderTextColor={Colors.textMuted}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  value={message}
                  onChangeText={setMessage}
                  editable={!submitting}
                />
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
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
                  <Text style={styles.submitBtnText}>Send Message</Text>
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
    paddingBottom: 20,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
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
    fontSize: 20,
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
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  formContainer: {
    gap: 14,
    paddingBottom: 10,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: Colors.text,
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
    height: 48,
    fontSize: 14,
    color: Colors.text,
  },
  multilineWrapper: {
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  multilineIcon: {
    marginTop: 2,
  },
  multilineInput: {
    height: 100,
    paddingTop: 0,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: Colors.textSecondary,
  },
  submitBtn: {
    flex: 1.5,
    height: 48,
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
    fontSize: 15,
    color: '#FFFFFF',
  },
});

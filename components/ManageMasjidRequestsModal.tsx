import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Image,
  Linking,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { showCustomAlert } from '@/lib/custom-alert';
import { getMasjidRequests, updateMasjidRequestStatus, deleteMasjidRequest, cleanCompletedMasjidRequests } from '@/lib/store';
import { MasjidRequest } from '@/lib/types';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

interface ManageMasjidRequestsModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectForCreation?: (req: MasjidRequest) => void;
}

export function ManageMasjidRequestsModal({
  visible,
  onClose,
  onSelectForCreation,
}: ManageMasjidRequestsModalProps) {
  const insets = useSafeAreaInsets();
  const [requests, setRequests] = useState<MasjidRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<{ title: string; uri: string } | null>(null);

  useEffect(() => {
    if (visible) {
      loadRequests();
    }
  }, [visible]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await getMasjidRequests();
      setRequests(data);
    } catch (error) {
      console.error('Failed to load masjid requests:', error);
      showCustomAlert('Error', 'Failed to load masjid requests.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenWhatsApp = (whatsappNumber: string, masjidName: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    let cleanNumber = whatsappNumber.replace(/[^0-9]/g, '');
    if (!cleanNumber) {
      showCustomAlert('Invalid Phone Number', 'Could not open WhatsApp for this number.');
      return;
    }
    const text = encodeURIComponent(
      `Assalamu Alaikum! Regarding your request to add "${masjidName}" on Salah Times app...`
    );
    const url = `https://wa.me/${cleanNumber}?text=${text}`;

    Linking.openURL(url).catch((err) => {
      console.error('Failed to open WhatsApp:', err);
      showCustomAlert(
        'WhatsApp Not Found',
        'Could not launch WhatsApp. Make sure WhatsApp is installed on your device.'
      );
    });
  };

  const handleOpenEmail = (email: string, masjidName: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const subject = encodeURIComponent(`Regarding your request to add ${masjidName} on Salah Times`);
    const url = `mailto:${email}?subject=${subject}`;
    Linking.openURL(url).catch((err) => {
      console.error('Failed to open email app:', err);
      showCustomAlert('Error', 'Could not open mail app.');
    });
  };

  const handleApproveAndCreate = (item: MasjidRequest) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showCustomAlert(
      'Create Masjid from Request',
      `Would you like to register "${item.masjidName}" now? Request details will be pre-filled.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Proceed to Register',
          onPress: async () => {
            await updateMasjidRequestStatus(item.id, 'approved');
            setRequests((prev) =>
              prev.map((r) => (r.id === item.id ? { ...r, status: 'approved' } : r))
            );
            onClose();
            if (onSelectForCreation) {
              onSelectForCreation(item);
            } else {
              router.push({
                pathname: '/(auth)/register',
                params: {
                  prefillName: item.masjidName,
                  prefillCity: item.city,
                  prefillSubDivision: item.subDivision || '',
                  prefillAddress: item.address,
                },
              });
            }
          },
        },
      ]
    );
  };

  const handleDelete = (id: string, name: string) => {
    showCustomAlert(
      'Delete Request & Images',
      `Are you sure you want to permanently delete the request and submitted images for "${name}" from the database?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const ok = await deleteMasjidRequest(id);
            if (ok) {
              setRequests((prev) => prev.filter((r) => r.id !== id));
            } else {
              showCustomAlert('Error', 'Failed to delete request.');
            }
          },
        },
      ]
    );
  };

  const handleCleanCompleted = () => {
    const completedCount = requests.filter(
      (r) => r.status === 'approved' || r.status === 'rejected'
    ).length;

    if (completedCount === 0) {
      showCustomAlert('Clean Storage', 'No approved or rejected requests to clean up.');
      return;
    }

    showCustomAlert(
      'Clean Completed Requests',
      `Delete ${completedCount} completed (approved/rejected) request(s) and their uploaded images to clean up database storage?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clean Database',
          style: 'destructive',
          onPress: async () => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const count = await cleanCompletedMasjidRequests();
            if (count > 0) {
              setRequests((prev) =>
                prev.filter((r) => r.status !== 'approved' && r.status !== 'rejected')
              );
              showCustomAlert(
                'Storage Cleaned',
                `Successfully deleted ${count} completed request(s) and freed up database storage.`
              );
            } else {
              showCustomAlert('Error', 'Failed to clean completed requests.');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: MasjidRequest }) => {
    const isPending = item.status === 'pending';
    const isApproved = item.status === 'approved';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleWrap}>
            <Text style={styles.masjidName}>{item.masjidName}</Text>
            <Text style={styles.locationText}>
              <Ionicons name="location" size={13} color={Colors.primary} /> {item.city}
              {item.subDivision ? `, ${item.subDivision}` : ''}
              {item.state ? `, ${item.state}` : ''}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              isApproved
                ? styles.badgeApproved
                : isPending
                ? styles.badgePending
                : styles.badgeRejected,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                isApproved
                  ? styles.statusApproved
                  : isPending
                  ? styles.statusPending
                  : styles.statusRejected,
              ]}
            >
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="navigate-outline" size={14} color={Colors.textMuted} />
          <Text style={styles.addressText}>{item.address}</Text>
        </View>

        {item.notes && (
          <View style={styles.notesBox}>
            <Text style={styles.notesTitle}>User Notes:</Text>
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        )}

        {/* Contact Buttons */}
        <View style={styles.contactBar}>
          <TouchableOpacity
            style={styles.whatsappBtn}
            onPress={() => handleOpenWhatsApp(item.whatsappNumber, item.masjidName)}
          >
            <Ionicons name="logo-whatsapp" size={16} color="#FFFFFF" />
            <Text style={styles.whatsappBtnText}>WhatsApp ({item.whatsappNumber})</Text>
          </TouchableOpacity>

          {item.email && (
            <TouchableOpacity
              style={styles.emailBtn}
              onPress={() => handleOpenEmail(item.email!, item.masjidName)}
            >
              <Ionicons name="mail" size={16} color={Colors.primary} />
              <Text style={styles.emailBtnText}>Email</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Photos Preview Section */}
        {(item.masjidPhotoBase64 || item.timetablePhotoBase64) && (
          <View style={styles.photosContainer}>
            <Text style={styles.photosSectionTitle}>Submitted Images:</Text>
            <View style={styles.photoRow}>
              {item.masjidPhotoBase64 && (
                <TouchableOpacity
                  style={styles.photoThumbWrap}
                  onPress={() =>
                    setSelectedPhoto({
                      title: `${item.masjidName} Photo`,
                      uri: item.masjidPhotoBase64!,
                    })
                  }
                >
                  <Image source={{ uri: item.masjidPhotoBase64 }} style={styles.thumbImage} />
                  <Text style={styles.thumbBadge}>Masjid Photo</Text>
                </TouchableOpacity>
              )}

              {item.timetablePhotoBase64 && (
                <TouchableOpacity
                  style={styles.photoThumbWrap}
                  onPress={() =>
                    setSelectedPhoto({
                      title: `${item.masjidName} Timetable Board`,
                      uri: item.timetablePhotoBase64!,
                    })
                  }
                >
                  <Image source={{ uri: item.timetablePhotoBase64 }} style={styles.thumbImage} />
                  <Text style={styles.thumbBadge}>Timetable Board</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Action Controls */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(item.id, item.masjidName)}
          >
            <Ionicons name="trash-outline" size={16} color={Colors.error} />
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.createBtn, isApproved && styles.createBtnApproved]}
            onPress={() => handleApproveAndCreate(item)}
          >
            <Ionicons name="add-circle" size={16} color="#FFFFFF" />
            <Text style={styles.createBtnText}>
              {isApproved ? 'Register Again' : 'Approve & Register Masjid'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
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

        <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconWrap}>
                <Ionicons name="business" size={20} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.title}>Masjid Requests</Text>
                <Text style={styles.subtitle}>Requests submitted by app users</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              {requests.some((r) => r.status === 'approved' || r.status === 'rejected') && (
                <TouchableOpacity
                  onPress={handleCleanCompleted}
                  style={styles.cleanHeaderBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-bin-outline" size={13} color={Colors.error} />
                  <Text style={styles.cleanHeaderBtnText}>Clean</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : requests.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No Masjid Requests</Text>
              <Text style={styles.emptyText}>
                There are currently no pending requests from users to add new masjids.
              </Text>
            </View>
          ) : (
            <FlatList
              data={requests}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>

      {/* Expanded Photo Viewer Modal */}
      {selectedPhoto && (
        <Modal
          visible={!!selectedPhoto}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedPhoto(null)}
        >
          <View style={styles.fullViewerOverlay}>
            <TouchableOpacity
              style={styles.fullViewerCloseBtn}
              onPress={() => setSelectedPhoto(null)}
            >
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.fullViewerTitle}>{selectedPhoto.title}</Text>
            <Image source={{ uri: selectedPhoto.uri }} style={styles.fullViewerImage} />
          </View>
        </Modal>
      )}
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
    paddingHorizontal: 16,
    paddingTop: 18,
    height: '88%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cleanHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  cleanHeaderBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    color: Colors.error,
  },
  headerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: Colors.text,
  },
  subtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: Colors.text,
  },
  emptyText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  listContent: {
    gap: 14,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardTitleWrap: {
    flex: 1,
    marginRight: 8,
  },
  masjidName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: Colors.text,
  },
  locationText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: Colors.primary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgePending: {
    backgroundColor: '#FFF3CD',
  },
  badgeApproved: {
    backgroundColor: '#D4EDDA',
  },
  badgeRejected: {
    backgroundColor: '#F8D7DA',
  },
  statusText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 10,
  },
  statusPending: {
    color: '#856404',
  },
  statusApproved: {
    color: '#155724',
  },
  statusRejected: {
    color: '#721C24',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addressText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12.5,
    color: Colors.textSecondary,
    flex: 1,
  },
  notesBox: {
    backgroundColor: Colors.surface,
    padding: 10,
    borderRadius: 10,
    gap: 2,
  },
  notesTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    color: Colors.textMuted,
  },
  notesText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: Colors.text,
  },
  contactBar: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  whatsappBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },
  whatsappBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  emailBtn: {
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.overlay,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
  },
  emailBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: Colors.primary,
  },
  photosContainer: {
    gap: 6,
    marginTop: 2,
  },
  photosSectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: Colors.text,
  },
  photoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  photoThumbWrap: {
    flex: 1,
    height: 100,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  thumbBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    color: '#FFFFFF',
    fontFamily: 'Poppins_500Medium',
    fontSize: 10,
    textAlign: 'center',
    paddingVertical: 2,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  deleteBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: Colors.error,
  },
  createBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  createBtnApproved: {
    backgroundColor: Colors.primaryDark,
  },
  createBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  fullViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  fullViewerCloseBtn: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  fullViewerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 16,
  },
  fullViewerImage: {
    width: '100%',
    height: '80%',
    resizeMode: 'contain',
  },
});

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';

interface AudioPlayerControlsProps {
  isPlaying: boolean;
  onToggle: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  isLoading?: boolean;
  title?: string;
  subtitle?: string;
}

const AudioPlayerControls: React.FC<AudioPlayerControlsProps> = ({
  isPlaying,
  onToggle,
  onNext,
  onPrev,
  isLoading,
  title,
  subtitle
}) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingBottom: Math.max(16, insets.bottom) }]}>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{title || 'Playing Audio'}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{subtitle || 'Recitation'}</Text>
      </View>

      <View style={styles.controls}>
        {onPrev && (
          <TouchableOpacity onPress={onPrev} style={styles.button}>
            <Ionicons name="play-skip-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={onToggle} style={styles.playButton}>
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Ionicons name={isPlaying ? "pause" : "play"} size={32} color="#fff" />
          )}
        </TouchableOpacity>

        {onNext && (
          <TouchableOpacity onPress={onNext} style={styles.button}>
            <Ionicons name="play-skip-forward" size={24} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  info: {
    flex: 1,
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: Colors.text,
  },
  subtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    padding: 8,
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
  },
});

export default AudioPlayerControls;

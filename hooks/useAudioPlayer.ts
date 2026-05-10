import { useState, useEffect, useRef } from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';

export const useAudioPlayer = () => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis);
      setDuration(status.durationMillis || 0);
      setIsPlaying(status.isPlaying);
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
      }
    } else {
      if (status.error) {
        console.error(`Playback Error: ${status.error}`);
      }
    }
  };

  const playAudio = async (url: string) => {
    try {
      if (sound) {
        if (currentUrl === url) {
          await sound.playAsync();
          return;
        }
        await sound.unloadAsync();
      }

      setIsLoading(true);
      setCurrentUrl(url);
      
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );
      
      setSound(newSound);
      setIsLoading(false);
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsLoading(false);
    }
  };

  const pauseAudio = async () => {
    if (sound) {
      await sound.pauseAsync();
    }
  };

  const stopAudio = async () => {
    if (sound) {
      await sound.stopAsync();
    }
  };

  const togglePlayback = async () => {
    if (isPlaying) {
      await pauseAudio();
    } else if (sound) {
      await sound.playAsync();
    }
  };

  const seekTo = async (millis: number) => {
    if (sound) {
      await sound.setPositionAsync(millis);
    }
  };

  return {
    isPlaying,
    position,
    duration,
    isLoading,
    playAudio,
    pauseAudio,
    stopAudio,
    togglePlayback,
    seekTo,
    currentUrl
  };
};

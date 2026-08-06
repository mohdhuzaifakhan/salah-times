import { useState, useEffect, useRef } from 'react';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';

export const useAudioPlayer = () => {
  const playerRef = useRef<AudioPlayer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.pause();
      }
    };
  }, []);

  const playAudio = async (url: string) => {
    try {
      if (playerRef.current && currentUrl === url) {
        playerRef.current.play();
        setIsPlaying(true);
        return;
      }
      if (playerRef.current) {
        playerRef.current.pause();
      }

      setIsLoading(true);
      setCurrentUrl(url);

      const player = createAudioPlayer(url);
      playerRef.current = player;

      player.play();
      setIsPlaying(true);
      setIsLoading(false);
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsLoading(false);
    }
  };

  const pauseAudio = async () => {
    if (playerRef.current) {
      playerRef.current.pause();
      setIsPlaying(false);
    }
  };

  const stopAudio = async () => {
    if (playerRef.current) {
      playerRef.current.pause();
      playerRef.current.seekTo(0);
      setIsPlaying(false);
    }
  };

  const togglePlayback = async () => {
    if (isPlaying) {
      await pauseAudio();
    } else if (playerRef.current) {
      playerRef.current.play();
      setIsPlaying(true);
    }
  };

  const seekTo = async (millis: number) => {
    if (playerRef.current) {
      playerRef.current.seekTo(millis / 1000);
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

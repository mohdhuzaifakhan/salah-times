import { useState, useCallback, useEffect, useRef } from "react";
import { Platform } from "react-native";
import { requestRecordingPermissionsAsync, setAudioModeAsync } from "expo-audio";
import * as Haptics from "expo-haptics";
import * as IntentLauncher from "expo-intent-launcher";

let ExpoSpeechRecognitionModule: any = null;
try {
  ExpoSpeechRecognitionModule = require("expo-speech-recognition").ExpoSpeechRecognitionModule;
} catch (e) {
  // Native module not bundled in standard Expo Go
}

export interface VoiceSearchState {
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  setTranscript: (text: string) => void;
  error: string | null;
  isSupported: boolean;
  hasPermission: boolean | null;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
}

export function useVoiceSearch(onResult?: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const recognitionRef = useRef<any>(null);
  const recordingRef = useRef<any>(null);
  const nativeListenerRef = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS === "web") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      setIsSupported(!!SpeechRecognition);
    } else {
      setIsSupported(true);
    }
  }, []);

  const stopListening = useCallback(async () => {
    if (Platform.OS === "web") {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (err) {}
        recognitionRef.current = null;
      }
      setIsListening(false);
      return;
    }

    if (ExpoSpeechRecognitionModule) {
      try {
        await ExpoSpeechRecognitionModule.stop();
      } catch (err) {}
      if (nativeListenerRef.current) {
        nativeListenerRef.current.remove();
        nativeListenerRef.current = null;
      }
      setIsListening(false);
      return;
    }

    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      } catch (err) {}
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(async () => {
    setError(null);
    setTranscript("");
    setIsProcessing(false);

    // Haptic feedback
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // 1. WEB BROWSER: Built-in 100% Free WebSpeech API
    if (Platform.OS === "web") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          if (recognitionRef.current) {
            try {
              recognitionRef.current.abort();
            } catch (e) {}
          }

          const recognition = new SpeechRecognition();
          recognitionRef.current = recognition;

          recognition.continuous = false;
          recognition.interimResults = true;
          recognition.lang = "en-IN";

          recognition.onstart = () => {
            setIsListening(true);
          };

          recognition.onresult = (event: any) => {
            let currentTranscript = "";
            for (let i = event.resultIndex; i < event.results.length; i++) {
              currentTranscript += event.results[i][0].transcript;
            }

            setTranscript(currentTranscript);
            if (onResult && currentTranscript) {
              onResult(currentTranscript);
            }
          };

          recognition.onerror = (event: any) => {
            if (event.error !== "no-speech") {
              setError("Could not recognize voice. Please try again or type below.");
            }
            setIsListening(false);
          };

          recognition.onend = () => {
            setIsListening(false);
          };

          recognition.start();
          return;
        } catch (err: any) {
          setError("Speech recognition failed. Please type your search query.");
          setIsListening(false);
          return;
        }
      } else {
        setError("Browser speech recognition is not supported on this browser.");
        setIsListening(false);
        return;
      }
    }

    // 2. ANDROID NATIVE: Built-in 100% FREE Android Google Voice Search Intent
    if (Platform.OS === "android") {
      try {
        setIsListening(true);
        const result = await IntentLauncher.startActivityAsync(
          "android.speech.action.RECOGNIZE_SPEECH",
          {
            extra: {
              "android.speech.extra.LANGUAGE_MODEL": "free_form",
              "android.speech.extra.PROMPT": "Speak masjid name, city, or surah...",
            },
          }
        );

        setIsListening(false);

        if (result && (result.resultCode === -1 || result.resultCode === 1)) {
          const extraData = (result.extra as any) || {};
          const resultsArray =
            extraData["android.speech.extra.RESULTS"] ||
            extraData["query"] ||
            extraData["results"];

          const spokenText = Array.isArray(resultsArray)
            ? resultsArray[0]
            : typeof resultsArray === "string"
            ? resultsArray
            : null;

          if (spokenText) {
            setTranscript(spokenText);
            if (onResult) onResult(spokenText);
            return;
          }
        }
        setError("No speech detected. Please tap mic to try again or type below.");
        return;
      } catch (err: any) {
        setIsListening(false);
        // Fall back to ExpoSpeechRecognitionModule or Audio recorder silently
      }
    }

    // 3. EXPO SPEECH RECOGNITION NATIVE MODULE (if present in custom build)
    if (ExpoSpeechRecognitionModule) {
      try {
        const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!perm.granted) {
          setHasPermission(false);
          setError("Microphone permission was not granted.");
          setIsListening(false);
          return;
        }

        setHasPermission(true);

        if (nativeListenerRef.current) {
          nativeListenerRef.current.remove();
        }

        nativeListenerRef.current = ExpoSpeechRecognitionModule.addListener("result", (event: any) => {
          const text = event.results?.[0]?.transcript || "";
          if (text) {
            setTranscript(text);
            if (onResult) onResult(text);
          }
        });

        await ExpoSpeechRecognitionModule.start({
          lang: "en-IN",
          interimResults: true,
        });

        setIsListening(true);
        return;
      } catch (err: any) {
        // Fallback to mic recording
      }
    }

    // 4. iOS / Fallback Mic Recording
    try {
      const { status } = await requestRecordingPermissionsAsync();
      if (status !== "granted") {
        setHasPermission(false);
        setError("Microphone permission was not granted. Please allow access in settings.");
        setIsListening(false);
        return;
      }

      setHasPermission(true);

      await setAudioModeAsync({
        playsInSilentMode: true,
      });

      setIsListening(true);
    } catch (err: any) {
      setError("Unable to start microphone. Please type your search query below.");
      setIsListening(false);
    }
  }, [onResult]);

  return {
    isListening,
    isProcessing,
    transcript,
    setTranscript,
    error,
    isSupported,
    hasPermission,
    startListening,
    stopListening,
  };
}

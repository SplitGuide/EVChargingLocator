import { useState, useEffect, useCallback } from 'react';
import voiceRecognitionService from '@/lib/voiceRecognitionService';
import { useToast } from '@/hooks/use-toast';

type VoiceRecognitionOptions = {
  continuous?: boolean;
  language?: string;
  autoStart?: boolean;
  onResult?: (transcript: string) => void;
  onError?: (error: Error) => void;
};

export function useVoiceRecognition(options: VoiceRecognitionOptions = {}) {
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(!!options.autoStart);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Handle initial state and set up listeners
  useEffect(() => {
    const supported = voiceRecognitionService.isSupported();
    setIsSupported(supported);
    
    if (!supported) {
      setError(new Error('Speech recognition is not supported in your browser'));
      toast({
        title: "Speech Recognition Not Supported",
        description: "Your browser doesn't support speech recognition. Try using Chrome or Edge.",
        variant: "destructive",
      });
      return;
    }

    // Set up event handlers
    voiceRecognitionService.onResult((text) => {
      setTranscript(text);
      if (options.onResult) {
        options.onResult(text);
      }
    });

    voiceRecognitionService.onError((err) => {
      setError(err);
      setIsListening(false);
      
      if (options.onError) {
        options.onError(err);
      }
      
      toast({
        title: "Voice Recognition Error",
        description: err.message,
        variant: "destructive",
      });
    });

    // Start recognition if autoStart is true
    if (options.autoStart && supported) {
      startListening();
    }

    // Cleanup
    return () => {
      stopListening();
    };
  }, []);

  // Start listening
  const startListening = useCallback(() => {
    if (!isSupported) {
      return;
    }

    try {
      voiceRecognitionService.start({
        continuous: options.continuous,
        lang: options.language || 'en-US',
      });
      setIsListening(true);
      setError(null);
      
      toast({
        title: "Voice Recognition Active",
        description: "Speak now. Say 'find charging stations' or 'stations near me'.",
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to start voice recognition'));
      setIsListening(false);
      
      toast({
        title: "Failed to Start Voice Recognition",
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: "destructive",
      });
    }
  }, [isSupported, options.continuous, options.language]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (isListening) {
      voiceRecognitionService.stop();
      setIsListening(false);
      
      toast({
        title: "Voice Recognition Stopped",
        description: "Voice input has been turned off.",
      });
    }
  }, [isListening]);

  // Reset transcript
  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  // Toggle listening state
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    transcript,
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript,
    toggleListening,
  };
}
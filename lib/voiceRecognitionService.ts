// Voice Recognition Service
// This service handles speech recognition using the Web Speech API

type VoiceRecognitionOptions = {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
};

type VoiceRecognitionCallback = (transcript: string) => void;
type VoiceRecognitionErrorCallback = (error: Error) => void;

export class VoiceRecognitionService {
  private recognition: SpeechRecognition | null = null;
  private isListening: boolean = false;
  private transcript: string = '';
  private onResultCallback: VoiceRecognitionCallback | null = null;
  private onErrorCallback: VoiceRecognitionErrorCallback | null = null;

  constructor() {
    this.initializeRecognition();
  }

  private initializeRecognition() {
    // Check for browser support
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      console.error('Speech recognition not supported in this browser');
      return;
    }

    // Initialize the SpeechRecognition object
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();

    // Default settings
    this.recognition.lang = 'en-US';
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;

    // Set up event handlers
    this.recognition.onresult = (event) => {
      this.handleResult(event);
    };

    this.recognition.onerror = (event) => {
      this.handleError(event);
    };

    this.recognition.onend = () => {
      if (this.isListening) {
        // If we're supposed to be listening but recognition ended, restart it
        this.recognition?.start();
      }
    };
  }

  private handleResult(event: SpeechRecognitionEvent) {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    this.transcript = finalTranscript || interimTranscript;

    if (this.onResultCallback && (finalTranscript || !this.recognition?.continuous)) {
      this.onResultCallback(this.transcript);
    }
  }

  private handleError(event: SpeechRecognitionErrorEvent) {
    const error = new Error(`Speech recognition error: ${event.error}`);
    console.error(error);
    
    if (this.onErrorCallback) {
      this.onErrorCallback(error);
    }

    this.isListening = false;
  }

  public start(options?: VoiceRecognitionOptions) {
    if (!this.recognition) {
      this.initializeRecognition();
      if (!this.recognition) {
        throw new Error('Could not initialize speech recognition');
      }
    }

    if (options) {
      if (options.lang) this.recognition.lang = options.lang;
      if (options.continuous !== undefined) this.recognition.continuous = options.continuous;
      if (options.interimResults !== undefined) this.recognition.interimResults = options.interimResults;
      if (options.maxAlternatives) this.recognition.maxAlternatives = options.maxAlternatives;
    }

    try {
      this.recognition.start();
      this.isListening = true;
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      throw error;
    }
  }

  public stop() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  public onResult(callback: VoiceRecognitionCallback) {
    this.onResultCallback = callback;
  }

  public onError(callback: VoiceRecognitionErrorCallback) {
    this.onErrorCallback = callback;
  }

  public isSupported(): boolean {
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  }

  public getTranscript(): string {
    return this.transcript;
  }
}

// Add TypeScript interface for the Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

// Create and export a singleton instance
const voiceRecognitionService = new VoiceRecognitionService();
export default voiceRecognitionService;
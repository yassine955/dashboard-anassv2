import { audioGenerator } from './audio-generator';

class SoundService {
  private sounds: { [key: string]: HTMLAudioElement } = {};
  private enabled: boolean = true;
  private volume: number = 0.5;
  private useGeneratedAudio: boolean = false;

  constructor() {
    this.preloadSounds();
  }

  private preloadSounds() {
    // Only load sounds in browser environment
    if (typeof window === 'undefined') return;

    const soundFiles = {
      success: '/sounds/success-ping.mp3',
      notification: '/sounds/notification-ping.mp3',
      warning: '/sounds/warning-beep.mp3',
      delete: '/sounds/delete-woosh.mp3',
      button: '/sounds/button-click.mp3'
    };

    Object.entries(soundFiles).forEach(([key, path]) => {
      try {
        const audio = new Audio(path);
        audio.volume = this.volume;
        audio.preload = 'auto';

        // Test if audio can be loaded
        audio.addEventListener('canplaythrough', () => {
          this.sounds[key] = audio;
        });

        audio.addEventListener('error', () => {
          console.debug(`Audio file not found for ${key}, will use generated audio`);
          this.useGeneratedAudio = true;
        });

      } catch (error) {
        console.debug(`Failed to load sound: ${key}, falling back to generated audio`);
        this.useGeneratedAudio = true;
      }
    });

    // Default to generated audio if no files are found
    setTimeout(() => {
      if (Object.keys(this.sounds).length === 0) {
        this.useGeneratedAudio = true;
        console.debug('No audio files found, using generated audio');
      }
    }, 1000);
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    Object.values(this.sounds).forEach(audio => {
      audio.volume = this.volume;
    });
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  private async playSound(soundName: string) {
    if (!this.enabled || typeof window === 'undefined') return;

    try {
      // Try to play loaded audio file first
      const audio = this.sounds[soundName];
      if (audio && !this.useGeneratedAudio) {
        audio.currentTime = 0;
        await audio.play();
        return;
      }

      // Fallback to generated audio
      await this.playGeneratedSound(soundName);
    } catch (error) {
      console.debug(`Audio play failed for ${soundName}:`, error);
      // Try generated audio as final fallback
      try {
        await this.playGeneratedSound(soundName);
      } catch (genError) {
        console.debug(`Generated audio also failed for ${soundName}:`, genError);
      }
    }
  }

  private async playGeneratedSound(soundName: string) {
    switch (soundName) {
      case 'success':
        await audioGenerator.generateSuccessSound();
        break;
      case 'notification':
        await audioGenerator.generateNotificationSound();
        break;
      case 'warning':
        await audioGenerator.generateWarningSound();
        break;
      case 'delete':
        await audioGenerator.generateDeleteSound();
        break;
      case 'button':
        await audioGenerator.generateButtonClickSound();
        break;
      case 'payment':
        await audioGenerator.generatePaymentSound();
        break;
    }
  }

  // Public methods for different sound types
  playSuccess() {
    this.playSound('success');
  }

  playNotification() {
    this.playSound('notification');
  }

  playWarning() {
    this.playSound('warning');
  }

  playDelete() {
    this.playSound('delete');
  }

  playButtonClick() {
    this.playSound('button');
  }

  // Method to play payment success with extra celebration
  playPaymentReceived() {
    if (this.useGeneratedAudio) {
      this.playGeneratedSound('payment');
    } else {
      this.playSound('success');
      // Add a slight delay for a second ping for extra celebration
      setTimeout(() => this.playSound('notification'), 200);
    }
  }

  // Check if user has enabled sound in their preferences
  private checkUserPreferences(): boolean {
    if (typeof window === 'undefined') return false;

    // Check for user's reduced motion preference (accessibility)
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return false;

    // Check localStorage for user preference
    const soundPreference = localStorage.getItem('soundEnabled');
    return soundPreference !== 'false';
  }

  // Save user preferences
  saveUserPreferences(enabled: boolean, volume: number = 0.5) {
    if (typeof window === 'undefined') return;

    localStorage.setItem('soundEnabled', enabled.toString());
    localStorage.setItem('soundVolume', volume.toString());

    this.setEnabled(enabled);
    this.setVolume(volume);
  }

  // Load user preferences
  loadUserPreferences() {
    if (typeof window === 'undefined') return;

    const savedVolume = localStorage.getItem('soundVolume');
    if (savedVolume) {
      this.setVolume(parseFloat(savedVolume));
    }

    const soundEnabled = this.checkUserPreferences();
    this.setEnabled(soundEnabled);
  }

  // Get current settings for UI
  getSettings() {
    return {
      enabled: this.enabled,
      volume: this.volume,
      useGeneratedAudio: this.useGeneratedAudio
    };
  }

  async init() {
    this.loadUserPreferences();

    // Initialize audio context on first user interaction
    if (typeof window !== 'undefined') {
      const initAudioContext = async () => {
        try {
          await audioGenerator.generateTone(0, 0); // Silent tone to initialize context
        } catch (error) {
          console.debug('AudioContext initialization delayed until user interaction');
        }

        // Remove listeners after first interaction
        document.removeEventListener('click', initAudioContext);
        document.removeEventListener('keydown', initAudioContext);
        document.removeEventListener('touchstart', initAudioContext);
      };

      // Listen for first user interaction to initialize audio
      document.addEventListener('click', initAudioContext, { once: true });
      document.addEventListener('keydown', initAudioContext, { once: true });
      document.addEventListener('touchstart', initAudioContext, { once: true });
    }
  }
}

export const soundService = new SoundService();

// Initialize sound service when imported
if (typeof window !== 'undefined') {
  soundService.init().catch(console.debug);
}
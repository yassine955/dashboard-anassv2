// Generate simple audio tones using Web Audio API
export class AudioGenerator {
  private audioContext: AudioContext | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  private async ensureAudioContext() {
    if (!this.audioContext) return null;

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    return this.audioContext;
  }

  async generateTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3): Promise<void> {
    const audioContext = await this.ensureAudioContext();
    if (!audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.type = type;

    // Envelope for smooth attack and decay
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);

    return new Promise((resolve) => {
      oscillator.onended = () => resolve();
    });
  }

  async generateSuccessSound(): Promise<void> {
    // Pleasant ascending chime (C -> E -> G)
    try {
      await this.generateTone(523, 0.1, 'sine', 0.2); // C5
      await this.generateTone(659, 0.1, 'sine', 0.2); // E5
      await this.generateTone(784, 0.15, 'sine', 0.25); // G5
    } catch (error) {
      console.debug('Audio generation failed:', error);
    }
  }

  async generateNotificationSound(): Promise<void> {
    // Gentle notification (A4)
    try {
      await this.generateTone(440, 0.1, 'sine', 0.2);
    } catch (error) {
      console.debug('Audio generation failed:', error);
    }
  }

  async generateWarningSound(): Promise<void> {
    // Subtle warning tone (F4)
    try {
      await this.generateTone(349, 0.15, 'triangle', 0.15);
    } catch (error) {
      console.debug('Audio generation failed:', error);
    }
  }

  async generateDeleteSound(): Promise<void> {
    // Soft whoosh (frequency sweep down)
    try {
      const audioContext = await this.ensureAudioContext();
      if (!audioContext) return;

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.3);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.debug('Audio generation failed:', error);
    }
  }

  async generateButtonClickSound(): Promise<void> {
    // Quick click (high frequency, short duration)
    try {
      await this.generateTone(1000, 0.05, 'sine', 0.1);
    } catch (error) {
      console.debug('Audio generation failed:', error);
    }
  }

  async generatePaymentSound(): Promise<void> {
    // Success sound followed by a celebration chime
    try {
      await this.generateSuccessSound();
      // Small delay
      setTimeout(async () => {
        await this.generateTone(880, 0.1, 'sine', 0.15); // A5 celebration note
      }, 200);
    } catch (error) {
      console.debug('Audio generation failed:', error);
    }
  }
}

export const audioGenerator = new AudioGenerator();
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
    // Professional success chime with harmonies
    try {
      const audioContext = await this.ensureAudioContext();
      if (!audioContext) return;

      // Create a more complex success sound with harmonies
      const playChord = async (frequencies: number[], duration: number, volume: number) => {
        const oscillators = frequencies.map(() => audioContext.createOscillator());
        const gainNodes = frequencies.map(() => audioContext.createGain());

        oscillators.forEach((osc, i) => {
          osc.connect(gainNodes[i]);
          gainNodes[i].connect(audioContext.destination);

          osc.frequency.setValueAtTime(frequencies[i], audioContext.currentTime);
          osc.type = 'sine';

          // Smooth envelope
          gainNodes[i].gain.setValueAtTime(0, audioContext.currentTime);
          gainNodes[i].gain.linearRampToValueAtTime(volume / frequencies.length, audioContext.currentTime + 0.01);
          gainNodes[i].gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

          osc.start(audioContext.currentTime);
          osc.stop(audioContext.currentTime + duration);
        });

        return new Promise<void>((resolve) => {
          oscillators[0].onended = () => resolve();
        });
      };

      // C major triad progression
      await playChord([523, 659], 0.1, 0.15); // C5 + E5
      await new Promise(resolve => setTimeout(resolve, 50));
      await playChord([659, 784], 0.1, 0.15); // E5 + G5
      await new Promise(resolve => setTimeout(resolve, 50));
      await playChord([523, 659, 784], 0.2, 0.2); // Full C major chord
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
    // Celebration sound with rising notes and harmony
    try {
      const audioContext = await this.ensureAudioContext();
      if (!audioContext) return;

      // Create a celebration sequence
      const playNote = (frequency: number, duration: number, delay: number = 0) => {
        setTimeout(async () => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);

          oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
          oscillator.type = 'sine';

          gainNode.gain.setValueAtTime(0, audioContext.currentTime);
          gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + duration);
        }, delay);
      };

      // Success chord progression with celebration
      await this.generateSuccessSound();

      // Add celebration notes
      playNote(1047, 0.1, 300); // C6 high note
      playNote(1175, 0.1, 400); // D6
      playNote(1319, 0.15, 500); // E6 final celebration note

    } catch (error) {
      console.debug('Audio generation failed:', error);
    }
  }

  async generateEmailSentSound(): Promise<void> {
    // Professional email sent confirmation - ascending chime
    try {
      const audioContext = await this.ensureAudioContext();
      if (!audioContext) return;

      // Create a professional "sent" melody
      const playMelody = async () => {
        const notes = [
          { freq: 523, duration: 0.12 }, // C5
          { freq: 659, duration: 0.12 }, // E5
          { freq: 784, duration: 0.18 }  // G5 (longer final note)
        ];

        for (let i = 0; i < notes.length; i++) {
          const { freq, duration } = notes[i];
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);

          oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
          oscillator.type = 'sine';

          // Professional envelope
          gainNode.gain.setValueAtTime(0, audioContext.currentTime);
          gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + duration);

          // Wait for note to complete before next one
          if (i < notes.length - 1) {
            await new Promise(resolve => setTimeout(resolve, duration * 1000 * 0.8));
          }
        }
      };

      await playMelody();
    } catch (error) {
      console.debug('Audio generation failed:', error);
    }
  }

  async generateLoginSound(): Promise<void> {
    // Welcoming login sound - warm rising tone
    try {
      const audioContext = await this.ensureAudioContext();
      if (!audioContext) return;

      // Create a warm welcome chord progression
      const playWelcomeChord = async (frequencies: number[], duration: number) => {
        const oscillators = frequencies.map(() => audioContext.createOscillator());
        const gainNodes = frequencies.map(() => audioContext.createGain());

        oscillators.forEach((osc, i) => {
          osc.connect(gainNodes[i]);
          gainNodes[i].connect(audioContext.destination);

          osc.frequency.setValueAtTime(frequencies[i], audioContext.currentTime);
          osc.type = 'sine';

          // Soft, welcoming volume
          gainNodes[i].gain.setValueAtTime(0, audioContext.currentTime);
          gainNodes[i].gain.linearRampToValueAtTime(0.12 / frequencies.length, audioContext.currentTime + 0.02);
          gainNodes[i].gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

          osc.start(audioContext.currentTime);
          osc.stop(audioContext.currentTime + duration);
        });

        return new Promise<void>((resolve) => {
          oscillators[0].onended = () => resolve();
        });
      };

      // Warm F major chord (F-A-C) - professional and welcoming
      await playWelcomeChord([349, 440, 523], 0.4);
    } catch (error) {
      console.debug('Audio generation failed:', error);
    }
  }
}

export const audioGenerator = new AudioGenerator();
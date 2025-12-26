let audioContext: AudioContext | null = null;
let isInitialized = false;

const createAudioContext = () => {
  if (typeof window !== 'undefined' && !audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.error("Web Audio API is not supported in this browser", e);
    }
  }
};

// Attempt to create the context on load. On mobile, it will likely start in a 'suspended' state.
createAudioContext();

export const audioService = {
  /**
   * Initializes or resumes the global AudioContext.
   * This MUST be called from within a user-initiated event handler (e.g., a click or tap)
   * to comply with browser autoplay policies, especially on mobile.
   */
  init: () => {
    if (isInitialized || !audioContext) {
      return;
    }
    
    // If the context is in a suspended state, it needs to be resumed.
    if (audioContext.state === 'suspended') {
      audioContext.resume().then(() => {
        console.log("AudioContext resumed successfully.");
        isInitialized = true;
      }).catch(e => console.error("Error resuming AudioContext:", e));
    } else {
      isInitialized = true;
    }
  },

  /**
   * Checks if the global AudioContext is initialized and running.
   * @returns {boolean} True if audio is likely to play.
   */
  isAudioReady: (): boolean => {
    return !!audioContext && audioContext.state === 'running';
  },

  /**
   * Plays a pre-defined sound effect using the global AudioContext.
   * @param type The type of sound to play.
   */
  playSound: (
    type: 'high-pitch' | 'low-pitch' | 'error-buzz' | 'success-chime'
  ) => {
    if (!audioService.isAudioReady()) {
      console.warn("AudioContext not ready or running. Cannot play sound.");
      return;
    }

    const osc = audioContext!.createOscillator();
    const gain = audioContext!.createGain();

    osc.connect(gain);
    gain.connect(audioContext!.destination);

    let freq: number;
    let oscType: OscillatorType;
    let volume = 0.2;
    let duration = 150;

    switch (type) {
      case 'high-pitch': // For Divi
        oscType = 'square';
        freq = 1500;
        volume = 0.35;
        duration = 300;
        break;
      case 'low-pitch': // For Divi
        oscType = 'sine';
        freq = 150;
        volume = 0.35;
        duration = 300;
        break;
      case 'success-chime': // For Reak
        oscType = 'sine';
        freq = 800;
        volume = 0.1;
        duration = 150;
        break;
      case 'error-buzz': // For Reak
        oscType = 'sawtooth';
        freq = 150;
        volume = 0.2;
        duration = 150;
        break;
    }

    osc.type = oscType;
    osc.frequency.setValueAtTime(freq, audioContext!.currentTime);

    // Apply a fade-out for the Divi sounds to make them less harsh
    if (type === 'high-pitch' || type === 'low-pitch') {
       gain.gain.setValueAtTime(volume, audioContext!.currentTime);
       gain.gain.exponentialRampToValueAtTime(0.001, audioContext!.currentTime + duration / 1000);
    } else {
       gain.gain.value = volume;
    }
    
    osc.start(audioContext!.currentTime);
    osc.stop(audioContext!.currentTime + duration / 1000);
  }
};
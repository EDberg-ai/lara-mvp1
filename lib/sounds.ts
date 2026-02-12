// Pleasant, calming notification sounds using Web Audio API
// Uses multi-oscillator layering and proper ADSR envelopes for warmth

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  // Resume context if suspended (browser autoplay policy)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

// Helper to create an oscillator with gain envelope
function createTone(
  ctx: AudioContext,
  frequency: number,
  volume: number,
  attackTime: number,
  decayTime: number,
  startTime: number
): { oscillator: OscillatorNode; gainNode: GainNode } {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.frequency.setValueAtTime(frequency, startTime);
  oscillator.type = 'sine';

  // Soft attack - start from near-zero and ramp up
  gainNode.gain.setValueAtTime(0.001, startTime);
  gainNode.gain.linearRampToValueAtTime(volume, startTime + attackTime);
  // Exponential decay for natural sound
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + attackTime + decayTime);

  return { oscillator, gainNode };
}

// Warm welcoming chime for student joining
// Two-note ascending pattern (G4 → B4) with layered octave harmonics
export function playJoinSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const masterVolume = 0.15;
    const attackTime = 0.05; // 50ms soft attack
    const noteDecay = 0.35;

    // First note: G4 (392Hz) with soft octave harmonic
    const g4Fundamental = createTone(ctx, 392, masterVolume, attackTime, noteDecay, now);
    const g4Harmonic = createTone(ctx, 784, masterVolume * 0.3, attackTime, noteDecay, now); // G5 at 30% volume

    // Second note: B4 (493.88Hz) with soft octave harmonic - starts slightly after
    const noteOffset = 0.12;
    const b4Fundamental = createTone(ctx, 493.88, masterVolume, attackTime, noteDecay, now + noteOffset);
    const b4Harmonic = createTone(ctx, 987.77, masterVolume * 0.25, attackTime, noteDecay, now + noteOffset); // B5 at 25% volume

    // Start and stop all oscillators
    const totalDuration = 0.5;

    g4Fundamental.oscillator.start(now);
    g4Fundamental.oscillator.stop(now + totalDuration);

    g4Harmonic.oscillator.start(now);
    g4Harmonic.oscillator.stop(now + totalDuration);

    b4Fundamental.oscillator.start(now + noteOffset);
    b4Fundamental.oscillator.stop(now + totalDuration);

    b4Harmonic.oscillator.start(now + noteOffset);
    b4Harmonic.oscillator.stop(now + totalDuration);

  } catch (e) {
    // Silently fail if audio not supported
  }
}

// Gentle bell-like confirmation for submissions
// Single D5 note with harmonically related overtones for richness
export function playSubmitSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const baseFreq = 587.33; // D5
    const masterVolume = 0.12;
    const attackTime = 0.03; // 30ms very soft attack
    const decayTime = 0.47; // Long decay for bell resonance

    // Fundamental frequency
    const fundamental = createTone(ctx, baseFreq, masterVolume, attackTime, decayTime, now);

    // Second harmonic (octave) at lower volume
    const harmonic2 = createTone(ctx, baseFreq * 2, masterVolume * 0.4, attackTime, decayTime * 0.8, now);

    // Third harmonic at even lower volume for shimmer
    const harmonic3 = createTone(ctx, baseFreq * 3, masterVolume * 0.2, attackTime, decayTime * 0.6, now);

    const totalDuration = 0.6;

    fundamental.oscillator.start(now);
    fundamental.oscillator.stop(now + totalDuration);

    harmonic2.oscillator.start(now);
    harmonic2.oscillator.stop(now + totalDuration);

    harmonic3.oscillator.start(now);
    harmonic3.oscillator.stop(now + totalDuration);

  } catch (e) {
    // Silently fail if audio not supported
  }
}

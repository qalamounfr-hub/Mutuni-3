// Paramètres ajustables du flux audio.
export const AUDIO_WINDOW_SECONDS=3.0;
export const AUDIO_HOP_SECONDS=1.5;
export const AUDIO_WINDOW=Math.round(16000*AUDIO_WINDOW_SECONDS);
export const AUDIO_HOP=Math.round(16000*AUDIO_HOP_SECONDS);
export const AUDIO_MIN_TAIL=4000;
export const CONSTRAINED_DECODING_ENABLED=true;
export const ALIGNMENT_BAND=15;

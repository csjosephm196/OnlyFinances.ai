// services/ttsService.ts - ElevenLabs Text-to-Speech service

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

/**
 * Convert text to speech using ElevenLabs API
 * 
 * @param text - Text to convert to speech
 * @param apiKey - ElevenLabs API key
 * @param voiceId - Voice ID to use (defaults to env variable or Rachel voice)
 * @returns Audio blob
 */
export async function textToSpeech(
  text: string,
  apiKey: string,
  voiceId?: string
): Promise<Blob> {
  const defaultVoiceId = import.meta.env.VITE_ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
  const selectedVoiceId = voiceId || defaultVoiceId;

  const response = await fetch(
    `${ELEVENLABS_API_URL}/text-to-speech/${selectedVoiceId}`,
    {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error: ${response.statusText} - ${errorText}`);
  }

  return await response.blob();
}

/**
 * Play audio blob
 * 
 * @param blob - Audio blob to play
 * @returns Promise that resolves when audio finishes playing
 */
export function playAudio(blob: Blob): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(URL.createObjectURL(blob));
    
    audio.onended = () => {
      URL.revokeObjectURL(audio.src);
      resolve();
    };
    
    audio.onerror = (error) => {
      URL.revokeObjectURL(audio.src);
      reject(new Error('Audio playback failed'));
    };
    
    audio.play().catch(reject);
  });
}

/**
 * Stop currently playing audio
 */
let currentAudio: HTMLAudioElement | null = null;

export function stopAudio(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    if (currentAudio.src.startsWith('blob:')) {
      URL.revokeObjectURL(currentAudio.src);
    }
    currentAudio = null;
  }
}

/**
 * Play audio with ability to stop
 */
export function playAudioWithControl(blob: Blob): { audio: HTMLAudioElement; promise: Promise<void> } {
  stopAudio(); // Stop any currently playing audio
  
  const audio = new Audio(URL.createObjectURL(blob));
  currentAudio = audio;
  
  const promise = new Promise<void>((resolve, reject) => {
    audio.onended = () => {
      URL.revokeObjectURL(audio.src);
      if (currentAudio === audio) {
        currentAudio = null;
      }
      resolve();
    };
    
    audio.onerror = () => {
      URL.revokeObjectURL(audio.src);
      if (currentAudio === audio) {
        currentAudio = null;
      }
      reject(new Error('Audio playback failed'));
    };
    
    audio.play().catch(reject);
  });
  
  return { audio, promise };
}

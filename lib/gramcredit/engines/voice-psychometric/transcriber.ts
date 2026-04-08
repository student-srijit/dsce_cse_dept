/**
 * Voice Psychometric Engine - Transcriber
 * Converts audio blob to text using OpenAI-compatible Whisper STT APIs
 */

import { GramCreditTraceLogger } from "../../core/trace-logger";
import {
  validateConfidence,
  createErrorOutput,
  logModuleError,
} from "../../core/module-utils";

export interface TranscriptionResult {
  text: string;
  confidence: number;
  language: string;
  duration: number; // seconds
  speechQualityScore: number; // 0-100
}

/**
 * Transcribe audio blob to text using OpenAI-compatible transcription APIs.
 * Default provider is Groq (free tier available).
 */
export async function transcribeAudio(
  audioBlob: string, // base64 encoded
  logger: GramCreditTraceLogger,
  language?: string,
): Promise<TranscriptionResult> {
  const startTime = Date.now();

  try {
    logger.logInput("voice_transcriber", {
      audioLength: audioBlob.length,
      language: language || "auto",
    });

    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audioBlob, "base64");

    if (audioBuffer.length === 0) {
      throw new Error("Audio blob is empty");
    }

    // Log validation
    logger.logValidation(
      "voice_transcriber",
      audioBuffer.length > 1000,
      `Audio buffer size: ${audioBuffer.length} bytes`,
    );

    // ========== Call STT API ==========
    const formData = new FormData();
    const audioFile = new File([audioBuffer], "audio.wav", {
      type: "audio/wav",
    });

    const sttProvider = (
      process.env.GRAMCREDIT_STT_PROVIDER || "groq"
    ).toLowerCase();
    const sttModel =
      process.env.GRAMCREDIT_STT_MODEL ||
      (sttProvider === "groq" ? "whisper-large-v3-turbo" : "whisper-1");

    let endpoint = "";
    let apiKey = "";

    if (sttProvider === "groq") {
      endpoint = "https://api.groq.com/openai/v1/audio/transcriptions";
      apiKey = process.env.GROQ_API_KEY || "";
    } else if (sttProvider === "openai") {
      endpoint = "https://api.openai.com/v1/audio/transcriptions";
      apiKey = process.env.OPENAI_API_KEY || "";
    } else {
      throw new Error(
        `Unsupported STT provider '${sttProvider}'. Use 'groq' or 'openai'.`,
      );
    }

    if (!apiKey) {
      throw new Error(
        `Missing API key for STT provider '${sttProvider}'. Set ${
          sttProvider === "groq" ? "GROQ_API_KEY" : "OPENAI_API_KEY"
        }.`,
      );
    }

    formData.append("file", audioFile);
    formData.append("model", sttModel);
    if (language && language !== "auto") {
      formData.append("language", language);
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(
        `STT API error (${sttProvider}): ${response.status} ${errorData}`,
      );
    }

    const result = await response.json();

    // ========== Estimate Speech Quality ==========
    // Quality estimated from transcript confidence and audio characteristics
    const speechQualityScore = estimateSpeechQuality(
      audioBuffer,
      result.text || "",
    );

    const duration = estimateAudioDuration(audioBuffer);

    const transcription: TranscriptionResult = {
      text: result.text || "",
      confidence: validateConfidence(0.85), // Whisper doesn't return confidence
      language: result.language || language || "en",
      duration,
      speechQualityScore,
    };

    logger.logOutput(
      "voice_transcriber",
      {
        textLength: transcription.text.length,
        confidence: transcription.confidence,
        speechQuality: speechQualityScore,
        duration,
      },
      Date.now() - startTime,
    );

    return transcription;
  } catch (error) {
    logModuleError(logger, "voice_transcriber", error);
    throw error;
  }
}

/**
 * Estimate speech quality from audio characteristics
 * Returns 0-100 score
 */
function estimateSpeechQuality(
  audioBuffer: Buffer,
  transcript: string,
): number {
  let quality = 50; // baseline

  // Check for sufficient transcript length (indicates clear speech)
  if (transcript.length > 100) {
    quality += 20;
  } else if (transcript.length > 50) {
    quality += 10;
  }

  // Check for audio silence (very low amplitude values)
  const samples = Math.min(audioBuffer.length / 2, 10000); // Sample every Nth byte
  const step = Math.max(1, Math.floor(audioBuffer.length / samples));
  let silenceCount = 0;

  for (let i = 0; i < audioBuffer.length; i += step) {
    if (audioBuffer[i] < 10 && audioBuffer[i + 1] < 10) {
      silenceCount++;
    }
  }

  const silenceRatio = silenceCount / samples;
  if (silenceRatio > 0.7) {
    quality -= 30;
  } else if (silenceRatio > 0.3) {
    quality -= 10;
  }

  // Check for word repetitions (may indicate hesitation or poor clarity)
  const words = transcript.toLowerCase().split(/\s+/);
  const uniqueWords = new Set(words);
  const repetitionRatio = 1 - uniqueWords.size / Math.max(1, words.length);

  if (repetitionRatio > 0.5) {
    quality -= 15;
  }

  return Math.max(0, Math.min(100, quality));
}

/**
 * Estimate audio duration in seconds from buffer size
 * Assumes 16-bit 16kHz mono PCM
 */
function estimateAudioDuration(audioBuffer: Buffer): number {
  const bytesPerSecond = 16000 * 2; // 16kHz * 16-bit = 2 bytes per sample
  return audioBuffer.length / bytesPerSecond;
}

/**
 * Fallback transcriber for testing (mock)
 * Returns a realistic OCEAN-testable transcript
 */
export function mockTranscribeAudio(audioLength: number): TranscriptionResult {
  const mockTranscripts = [
    "I believe I am responsible for my actions and always deliver what I promise. I try to stay organized and plan ahead. I get nervous sometimes but I work through it. I enjoy working with others and helping them succeed.",
    "It's important to be careful and think things through before acting. I like to keep things in order and respect rules. I can be anxious about new situations, but I adapt well. I value my relationships with family and friends.",
    "I prefer to try new things and take some risks. Planning isn't really my strength, I like to go with the flow. I'm generally pretty calm, even in stressful situations. I can be direct sometimes, but I care about people.",
  ];

  const transcript =
    mockTranscripts[Math.floor(Math.random() * mockTranscripts.length)];

  return {
    text: transcript,
    confidence: 0.85,
    language: "en",
    duration: audioLength / (16000 * 2), // Estimate
    speechQualityScore: 75 + Math.random() * 20,
  };
}

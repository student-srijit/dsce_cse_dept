/**
 * Voice Psychometric Module - Main Entry
 * Coordinates transcription + OCEAN trait scoring
 */

import { GramCreditTraceLogger } from "../../core/trace-logger";
import type {
  VoiceModuleOutput,
  OceanTraits,
} from "../../core/types";
import { transcribeAudio } from "./transcriber";
import { scoreOceanTraits } from "./trait-scorer";
import { getGramCreditConfig } from "../../core/config";
import {
  normalizeMinMax,
  validateScore,
  validateConfidence,
  createErrorOutput,
} from "../../core/module-utils";

/**
 * Main voice psychometric scoring function
 * Converts audio → transcript → OCEAN traits → score
 */
export async function scoreVoiceModule(
  audioBlob: string | undefined,
  audioUrl: string | undefined,
  preferredLanguage: string,
  logger: GramCreditTraceLogger,
  mockMode: boolean = false
): Promise<VoiceModuleOutput> {
  const config = getGramCreditConfig();
  const startTime = Date.now();

  try {
    logger.logInput("voice_psychometric", {
      audioSourceType: audioBlob ? "blob" : audioUrl ? "url" : "none",
      language: preferredLanguage,
    });

    // ========== Get Audio Input ==========
    let audioData = audioBlob;

    if (mockMode) {
      throw new Error(
        "Voice mock mode is disabled. Provide a real audio recording.",
      );
    }

    if (!audioData && audioUrl) {
      // Fetch audio from URL if provided
      const response = await fetch(audioUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio from URL: ${response.status}`);
      }
      const buffer = await response.arrayBuffer();
      audioData = Buffer.from(buffer).toString("base64");
    }

    if (!audioData) {
      return createErrorOutput(
        "voice_psychometric",
        "No audio data provided",
        "VOICE_NO_AUDIO_INPUT",
        0,
        {}
      );
    }

    // ========== Transcription ==========
    // Use auto language detection so code-switching and different spoken languages are handled.
    const transcription = await transcribeAudio(
      audioData,
      logger,
      "auto",
    );

    if (transcription.duration > config.voice.maxAudioDuration) {
      throw new Error(
        `Audio exceeds maximum duration of ${config.voice.maxAudioDuration} seconds`
      );
    }

    logger.logProcessing("voice_psychometric", "transcription_complete", {
      textLength: transcription.text.length,
      speechQuality: transcription.speechQualityScore,
    });

    // ========== Trait Scoring ==========
    const traitResult = await scoreOceanTraits(
      transcription.text,
      transcription.speechQualityScore,
      preferredLanguage,
      logger,
    );

    // ========== Compute Final Voice Score ==========
    // Voice score is based on OCEAN profile's relevance to creditworthiness
    const voiceScore = computeVoiceScore(
      traitResult.traits,
      transcription.speechQualityScore,
      config.voice.requiredConfidence
    );

    // Adjust confidence based on speech quality
    const adjustedConfidence = (traitResult.confidence * transcription.speechQualityScore) / 100;

    logger.logOutput("voice_psychometric", {
      voiceScore,
      traitScores: {
        openness: traitResult.traits.openness,
        conscientiousness: traitResult.traits.conscientiousness,
        extraversion: traitResult.traits.extraversion,
        agreeableness: traitResult.traits.agreeableness,
        neuroticism: traitResult.traits.neuroticism,
      },
      confidence: adjustedConfidence,
      reasonCodes: traitResult.reasonCodes,
    }, Date.now() - startTime);

    const response: VoiceModuleOutput = {
      score: voiceScore,
      confidence: adjustedConfidence,
      reasonCode: traitResult.reasonCodes[0] || "VOICE_TRAITS_EXTRACTED",
      details: {
        ...traitResult.traits,
      },
      metadata: {
        moduleId: "voice_psychometric",
        timestamp: Date.now(),
        processingTimeMs: Date.now() - startTime,
      },
    };

    return response;
  } catch (error) {
    logger.logError("voice_psychometric", error);

    return createErrorOutput(
      "voice_psychometric",
      error instanceof Error ? error.message : String(error),
      "VOICE_PROCESSING_ERROR",
      0,
      {}
    );
  }
}

/**
 * Compute creditworthiness score from OCEAN traits
 * Weights traits that correlate with loan repayment
 *
 * Key traits for rural credit:
 * - Conscientiousness: responsibility, follow-through (HIGH impact)
 * - Agreeableness: trustworthiness, cooperation (MEDIUM-HIGH)
 * - Low Neuroticism: emotional stability (MEDIUM)
 * - Openness: adaptability (LOW)
 */
function computeVoiceScore(
  traits: OceanTraits,
  speechQuality: number,
  requiredConfidence: number
): number {
  // Conscientiousness is the strongest predictor of loan repayment
  const conscientiousnessScore = traits.conscientiousness * 0.4;

  // Agreeableness indicates trustworthiness and cooperation
  const agreeablenessScore = traits.agreeableness * 0.25;

  // Low neuroticism indicates emotional stability and ability to handle stress
  const stabilityscore = (100 - traits.neuroticism) * 0.2;

  // Moderate extraversion helps with communication and community engagement
  // but extreme extraversion can indicate impulsivity
  const extraversionPenalty =
    Math.abs(traits.extraversion - 50) > 35 ? -5 : 0;

  // Openness is less critical for rural credit but indicates adaptability
  const opennessBonus = traits.openness >= 60 ? 5 : 0;

  let score =
    conscientiousnessScore +
    agreeablenessScore +
    stabilityscore +
    opennessBonus +
    extraversionPenalty;

  // Apply speech quality penalty
  const qualityFactor = speechQuality / 100;
  score *= qualityFactor;

  // Normalize to 0-100
  score = validateScore(score, 0, 100, 50);

  return score;
}

/**
 * Export all voice-related types and functions
 */
export type { OceanTraits };
export { transcribeAudio, scoreOceanTraits };

/**
 * Voice Psychometric Engine - Trait Scorer
 * Extracts OCEAN (Big Five) personality traits from interview transcript
 * Uses Groq LLM for fast structured extraction
 */

import { GramCreditTraceLogger } from "../../core/trace-logger";
import type { OceanTraits } from "../../core/types";
import {
  validateScore,
  validateConfidence,
  logModuleError,
  logModuleProcessing,
} from "../../core/module-utils";

export interface OceanScoringResult {
  traits: OceanTraits;
  confidence: number;
  reasonCodes: string[];
}

/**
 * Score OCEAN traits from interview transcript using Groq
 */
export async function scoreOceanTraits(
  transcript: string,
  speechQualityScore: number,
  language: string,
  logger: GramCreditTraceLogger,
): Promise<OceanScoringResult> {
  const startTime = Date.now();

  try {
    logger.logInput("voice_trait_scorer", {
      transcriptLength: transcript.length,
      speechQuality: speechQualityScore,
      language,
    });

    if (transcript.length < 20) {
      throw new Error("Transcript too short for reliable OCEAN scoring");
    }

    const prompt = buildOceanPrompt(transcript, language);

    logger.logProcessing("voice_trait_scorer", "groq_call", {
      promptLength: prompt.length,
      model: "mixtral-8x7b-32768",
    });

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mixtral-8x7b-32768",
        messages: [
          {
            role: "system",
            content: OCEAN_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Groq API error: ${response.status} ${errorData}`);
    }

    const result = await response.json();
    const contentStr = result.choices?.[0]?.message?.content || "{}";
    const parsed = parseStructuredJson(contentStr);

    const traits: OceanTraits = {
      openness: validateScore(parsed.openness || 50),
      conscientiousness: validateScore(parsed.conscientiousness || 50),
      extraversion: validateScore(parsed.extraversion || 50),
      agreeableness: validateScore(parsed.agreeableness || 50),
      neuroticism: validateScore(parsed.neuroticism || 50),
      transcriptSnippet: transcript.substring(0, 200),
      speechQualityScore,
    };

    let confidence = 0.5;

    if (speechQualityScore >= 80) {
      confidence += 0.15;
    } else if (speechQualityScore >= 60) {
      confidence += 0.08;
    }

    if (transcript.length >= 500) {
      confidence += 0.15;
    } else if (transcript.length >= 200) {
      confidence += 0.08;
    }

    if (parsed.confidence_score !== undefined) {
      confidence = Math.min(
        0.95,
        confidence + validateConfidence(Number(parsed.confidence_score)),
      );
    }

    confidence = validateConfidence(confidence);

    const reasonCodes = generateReasonCodes(traits, speechQualityScore);

    logModuleProcessing(
      logger,
      "voice_trait_scorer",
      "scoring_complete",
      {
        traits: {
          openness: traits.openness,
          conscientiousness: traits.conscientiousness,
          extraversion: traits.extraversion,
          agreeableness: traits.agreeableness,
          neuroticism: traits.neuroticism,
        },
        confidence,
        reasonCodes,
      },
      Date.now() - startTime,
    );

    return {
      traits,
      confidence,
      reasonCodes,
    };
  } catch (error) {
    const normalizedError =
      error instanceof Error ? error : new Error(String(error));

    logModuleError(logger, "voice_trait_scorer", normalizedError, {
      transcriptPreview: transcript.substring(0, 100),
    });
    throw normalizedError;
  }
}

function parseStructuredJson(rawContent: string): Record<string, any> {
  const trimmed = rawContent.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const startIdx = trimmed.indexOf("{");
    const endIdx = trimmed.lastIndexOf("}");
    if (startIdx >= 0 && endIdx > startIdx) {
      const candidate = trimmed.slice(startIdx, endIdx + 1);
      return JSON.parse(candidate);
    }
    throw new Error("Trait scorer returned invalid JSON payload");
  }
}

/**
 * Build structured prompt for OCEAN scoring
 */
function buildOceanPrompt(transcript: string, language: string): string {
  const languageInstructions: Record<string, string> = {
    en: "Score based on personality indicators in the transcript language.",
    hi: "ट्रांसक्रिप्ट में हिंदी या मिश्रित भाषा संकेतकों के आधार पर स्कोर करें।",
    ta: "தமிழ் அல்லது கலப்பு மொழி குறிகாட்டிகளின் அடிப்படையில் மதிப்பிடுங்கள்.",
    te: "ట్రాన్స్‌క్రిప్ట్‌లో తెలుగు లేదా మిశ్రమ భాష సూచనల ఆధారంగా స్కోర్ చేయండి.",
    kn: "ಟ್ರಾನ್ಸ್ಕ್ರಿಪ್ಟ್‌ನ ಕನ್ನಡ ಅಥವಾ ಮಿಶ್ರ ಭಾಷಾ ಸೂಚನೆಗಳ ಆಧಾರದಲ್ಲಿ ಸ್ಕೋರ್ ಮಾಡಿ.",
  };

  const langInstruction = languageInstructions[language] || languageInstructions.en;

  return `
You are a personality assessment expert. Analyze the following interview transcript and score the person on the Big Five personality traits (OCEAN).

Transcript:
"${transcript}"

Instructions:
1. ${langInstruction}
2. The speaker may code-switch across multiple Indian languages; infer meaning semantically.
3. Score each trait on a 0-100 scale
4. 0 = Low/Disagree, 50 = Moderate, 100 = High/Strongly Agree
5. Return a JSON object ONLY with the following structure:
{
  "openness": <number 0-100>,
  "conscientiousness": <number 0-100>,
  "extraversion": <number 0-100>,
  "agreeableness": <number 0-100>,
  "neuroticism": <number 0-100>,
  "confidence_score": <number 0-1>,
  "reasoning": "<brief explanation of scores>"
}

Scoring guidelines:
- Openness: How curious, creative, adventurous. Look for: novel ideas, trying new things, imaginative language.
- Conscientiousness: Responsibility, organization, planning. Look for: planning ahead, delivering promises, organization.
- Extraversion: Sociability, energy, assertiveness. Look for: enthusiasm, group participation, initiative.
- Agreeableness: Cooperation, empathy, kindness. Look for: concern for others, teamwork, helping behavior.
- Neuroticism: Emotional instability, anxiety, stress. Look for: worry, anxiety mentions, emotional reactions.

Return ONLY the JSON object, no additional text.
`;
}

/**
 * System prompt for Groq OCEAN scoring
 */
const OCEAN_SYSTEM_PROMPT = `You are an expert psychometrician specializing in the Big Five personality assessment.
Your task is to analyze interview transcripts and provide accurate, calibrated OCEAN trait scores.
Focus on behavioral indicators rather than self-descriptions.
Respond with valid JSON only.`;

/**
 * Generate reason codes based on OCEAN trait profiles
 */
function generateReasonCodes(traits: OceanTraits, speechQuality: number): string[] {
  const codes: string[] = [];

  if (traits.openness >= 70) {
    codes.push("VOICE_HIGH_OPENNESS");
  } else if (traits.openness <= 30) {
    codes.push("VOICE_LOW_OPENNESS");
  }

  if (traits.conscientiousness >= 70) {
    codes.push("VOICE_HIGH_CONSCIENTIOUSNESS");
  } else if (traits.conscientiousness <= 30) {
    codes.push("VOICE_LOW_CONSCIENTIOUSNESS");
  }

  if (traits.neuroticism >= 70) {
    codes.push("VOICE_HIGH_NEUROTICISM");
  } else if (traits.neuroticism <= 30) {
    codes.push("VOICE_LOW_NEUROTICISM");
  }

  if (traits.extraversion >= 70) {
    codes.push("VOICE_HIGH_EXTRAVERSION");
  } else if (traits.extraversion <= 30) {
    codes.push("VOICE_LOW_EXTRAVERSION");
  }

  if (traits.agreeableness >= 70) {
    codes.push("VOICE_HIGH_AGREEABLENESS");
  } else if (traits.agreeableness <= 30) {
    codes.push("VOICE_LOW_AGREEABLENESS");
  }

  if (speechQuality < 50) {
    codes.push("VOICE_LOW_AUDIO_QUALITY");
  }

  return codes;
}

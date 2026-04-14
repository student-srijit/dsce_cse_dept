import { NextRequest, NextResponse } from "next/server";

type SupportedLanguage = "en" | "hi" | "ta" | "te" | "kn";

type FarmerProfileForQuestions = {
  name?: string;
  age?: number;
  village?: string;
  state?: string;
  cropType?: string;
  landSizeHectares?: number;
  annualIncome?: number;
  yearsFarming?: number;
  requestedLoanAmount?: number;
  loanPurpose?: string;
  preferredLanguage?: SupportedLanguage;
};

function asLanguage(value: unknown): SupportedLanguage {
  if (value === "hi" || value === "ta" || value === "te" || value === "kn") {
    return value;
  }
  return "en";
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function fallbackQuestions(
  profile: FarmerProfileForQuestions,
  language: SupportedLanguage,
): string[] {
  const amount = profile.requestedLoanAmount ?? 20000;
  const crop = profile.cropType || "main crop";
  const land = profile.landSizeHectares ?? 1.5;
  const purpose = profile.loanPurpose || "emergency";

  const variants: Record<SupportedLanguage, string[][]> = {
    en: [
      [
        `Why do you need INR ${amount.toLocaleString("en-IN")} for ${purpose}, and when exactly will you use it?`,
        `How will your ${crop} income from ${land} hectares support repayment?`,
        "What are your family's top monthly expenses and your repayment plan?",
        "If income is delayed, what backup repayment option will you use?",
        "Who in your village can confirm your payment discipline?",
      ],
      [
        `Please explain your need for INR ${amount.toLocaleString("en-IN")} and the exact spending timeline.`,
        `What production or sales do you expect from ${crop} on ${land} hectares this season?`,
        "How do you prioritize household spending and loan repayment together?",
        "If crop yield is lower than expected, how will you still repay on time?",
        "Name one or two community references who can vouch for you.",
      ],
    ],
    hi: [
      [
        `आपको ₹${amount.toLocaleString("en-IN")} ${purpose} के लिए क्यों चाहिए और इसे कब खर्च करेंगे?`,
        `${land} हेक्टेयर में ${crop} से आपकी आय पुनर्भुगतान में कैसे मदद करेगी?`,
        "परिवार के मुख्य मासिक खर्च क्या हैं और EMI की आपकी योजना क्या है?",
        "अगर आय देर से आए तो समय पर भुगतान के लिए आपका बैकअप क्या होगा?",
        "गांव में कौन आपकी भुगतान अनुशासन की पुष्टि कर सकता है?",
      ],
      [
        `₹${amount.toLocaleString("en-IN")} की ज़रूरत और खर्च की पूरी टाइमलाइन बताइए।`,
        `${crop} खेती (${land} हेक्टेयर) से इस सीज़न में आपकी क्या अपेक्षित कमाई है?`,
        "घरेलू खर्च और ऋण भुगतान को आप साथ में कैसे मैनेज करते हैं?",
        "अगर फसल कम निकली तो भी भुगतान समय पर कैसे करेंगे?",
        "1-2 ऐसे लोगों के नाम बताइए जो आपके भरोसे की गवाही दे सकें।",
      ],
    ],
    ta: [
      [
        `₹${amount.toLocaleString("en-IN")} தொகை ${purpose} தேவைக்காக ஏன் வேண்டும், எப்போது பயன்படுத்துவீர்கள்?`,
        `${land} ஹெக்டேரில் ${crop} மூலம் வரும் வருமானம் தவணைக்கு எப்படி உதவும்?`,
        "குடும்ப மாத செலவுகள் என்ன, EMI செலுத்தும் திட்டம் என்ன?",
        "வருமானம் தாமதமானால் மாற்று கட்டணம் திட்டம் என்ன?",
        "உங்கள் கட்டண ஒழுக்கத்தை கிராமத்தில் யார் உறுதிப்படுத்தலாம்?",
      ]
    ],
    te: [
      [
        `₹${amount.toLocaleString("en-IN")}ను ${purpose} కోసం ఎందుకు కావాలి, ఎప్పుడు ఖర్చు చేస్తారు?`,
        `${land} హెక్టార్లలో ${crop} నుంచి వచ్చే ఆదాయం రీపేమెంట్‌కు ఎలా ఉపయోగపడుతుంది?`,
        "మీ కుటుంబ నెలవారీ ఖర్చులు ఏమిటి, EMI చెల్లింపు ప్లాన్ ఏమిటి?",
        "ఆదాయం ఆలస్యమైతే బ్యాకప్ చెల్లింపు మార్గం ఏమిటి?",
        "మీ చెల్లింపు క్రమశిక్షణకు గ్రామంలో ఎవరు సాక్ష్యం చెబుతారు?",
      ]
    ],
    kn: [
      [
        `₹${amount.toLocaleString("en-IN")}ನ್ನು ${purpose}ಗಾಗಿ ಏಕೆ ಬೇಕು, ಅದನ್ನು ಯಾವಾಗ ಬಳಸುತ್ತೀರಿ?`,
        `${land} ಹೆಕ್ಟೇರ್‌ನಲ್ಲಿ ${crop} ಆದಾಯವು ಮರುಪಾವತಿಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡುತ್ತದೆ?`,
        "ನಿಮ್ಮ ಕುಟುಂಬದ ತಿಂಗಳ ಖರ್ಚುಗಳು ಮತ್ತು EMI ಪಾವತಿ ಯೋಜನೆ ಏನು?",
        "ಆದಾಯ ತಡವಾದರೆ ಬ್ಯಾಕಪ್ ಪಾವತಿ ಯೋಜನೆ ಏನು?",
        "ನಿಮ್ಮ ಪಾವತಿ ಶಿಸ್ತಿಗೆ ಗ್ರಾಮದಲ್ಲಿ ಯಾರು ಸಾಕ್ಷಿ ಕೊಡುತ್ತಾರೆ?",
      ]
    ],
  };

  const options = variants[language] || variants.en;
  return options[Math.floor(Math.random() * options.length)].slice(0, 5);
}

async function generateWithGroq(
  profile: FarmerProfileForQuestions,
  language: SupportedLanguage,
): Promise<string[] | null> {
  if (!process.env.GROQ_API_KEY) {
    return null;
  }

  const prompt = `Generate EXACTLY 5 distinct, practical voice interview questions for a rural micro-credit applicant.

Requirements:
- Output JSON only: {"questions":["...","...","...","...","..."]}
- Language: ${language}
- Questions must be conversational and easy for low-literacy farmers.
- Use applicant context to personalize wording.
- The 5 questions must cover:
  1) why loan is needed now
  2) income + repayment capability
  3) crop/work plan and timeline
  4) fallback plan if income is delayed
  5) community trust/reference signal
- Avoid repeating the same sentence structure.
- Keep each question under 28 words.

Applicant context JSON:
${JSON.stringify(profile)}
`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.GRAMCREDIT_GROQ_MODEL || "mixtral-8x7b-32768",
      temperature: 0.9,
      max_tokens: 700,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You generate interview questions for inclusive credit underwriting. Return valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  const raw = payload?.choices?.[0]?.message?.content;
  if (typeof raw !== "string") {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as { questions?: unknown };
    const questions = Array.isArray(parsed.questions)
      ? parsed.questions.filter((q): q is string => typeof q === "string" && q.trim().length > 0)
      : [];
    if (questions.length >= 5) {
      return questions.slice(0, 5);
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      farmerProfile?: FarmerProfileForQuestions;
      requestedLoanAmount?: number;
      loanPurpose?: string;
      language?: SupportedLanguage;
    };

    const profile = {
      ...(body.farmerProfile || {}),
      requestedLoanAmount:
        asNumber(body.requestedLoanAmount ?? body.farmerProfile?.requestedLoanAmount) ||
        undefined,
      loanPurpose: body.loanPurpose || body.farmerProfile?.loanPurpose || undefined,
    };

    const language = asLanguage(body.language || body.farmerProfile?.preferredLanguage);

    const generated = await generateWithGroq(profile, language);
    const questions = generated || fallbackQuestions(profile, language);

    return NextResponse.json({
      questions,
      source: generated ? "groq" : "fallback",
      language,
      generatedAt: Date.now(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: "Failed to generate interview questions",
        details: message,
      },
      { status: 500 },
    );
  }
}

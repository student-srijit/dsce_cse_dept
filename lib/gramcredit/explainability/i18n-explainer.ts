/**
 * Multilingual Explainability Layer
 * Generates human-readable explanations in farmer's preferred language
 * Supports: English, Hindi, Tamil, Telugu, Kannada
 */

import { GramCreditTraceLogger } from "../core/trace-logger";
import type {
  DecisionOutput,
  FeatureAttribution,
  GramScoreOutput,
} from "../core/types";
import { logModuleProcessing } from "../core/module-utils";

type Language = "en" | "hi" | "ta" | "te" | "kn";

// ========== Translation Keys & Templates ==========

const explanationTemplates: Record<Language, Record<string, string>> = {
  en: {
    approved_standard: `Congratulations! Your loan application has been approved.

Your GramScore: {gramScore}/100
Approved Loan Amount: ₹{loanAmount}
Repayment Period: {tenure} months
Monthly Payment: ₹{monthlyPayment}

Why you were approved:
{attributions}

Next Steps:
1. Review your repayment schedule
2. Confirm your bank account details
3. Sign the loan agreement
4. Funds will be disbursed within 2-3 business days`,

    approved_mini: `Your loan application has been approved!

Your GramScore: {gramScore}/100
Approved Loan Amount: ₹{loanAmount}
Repayment Period: {tenure} months
Monthly Payment: ₹{monthlyPayment}

Key Strengths:
{attributions}

Remember: Start with this loan to build your credit history. Timely repayments will help you access larger loans in the future.`,

    approved_micro: `Your loan application has been approved.

Your GramScore: {gramScore}/100
Approved Loan Amount: ₹{loanAmount}
Repayment Period: {tenure} months
Monthly Payment: ₹{monthlyPayment}

This is your first step with us. Make timely payments to build trust and access bigger loans.

Key factors in your approval:
{attributions}`,

    rejected: `We regret to inform you that we cannot approve your loan application at this time.

Your GramScore: {gramScore}/100

Reasons for rejection:
{rejectionReasons}

How to improve:
{improvements}

You can reapply after 6 months with improved documentation and stronger financial history.`,

    under_review: `Your loan application is under review.

Your GramScore: {gramScore}/100

We need more information:
{missingInfo}

Our team will contact you shortly. Please have your documents ready:
- Land ownership proof
- Recent bank statements
- Farming records`,

    signal_strong: `✓ {signalName}: Strong ({score}/100)
   {reason}`,

    signal_moderate: `≈ {signalName}: Moderate ({score}/100)
   {reason}`,

    signal_weak: `✗ {signalName}: Needs Improvement ({score}/100)
   {reason}`,

    improvement_voice: "Consider providing a clearer recording for better assessment.",
    improvement_social: "Build stronger relationships with your SHG community.",
    improvement_satellite: "Ensure your farm is healthy by next harvest season.",
    improvement_behavior: "Maintain regular mobile and UPI transactions.",
  },

  hi: {
    approved_standard: `बहुत खुशी है! आपकी ऋण आवेदन स्वीकृत हो गई है।

आपका GramScore: {gramScore}/100
स्वीकृत ऋण राशि: ₹{loanAmount}
चुकौती अवधि: {tenure} माह
मासिक भुगतान: ₹{monthlyPayment}

आपको क्यों स्वीकृति दी गई:
{attributions}

अगले कदम:
1. अपनी चुकौती योजना की समीक्षा करें
2. अपने बैंक खाते का विवरण पुष्टि करें
3. ऋण समझौते पर हस्ताक्षर करें
4. 2-3 कार्य दिवसों में धन जमा हो जाएगा`,

    approved_mini: `आपकी ऋण आवेदन स्वीकृत हो गई है!

आपका GramScore: {gramScore}/100
स्वीकृत ऋण राशि: ₹{loanAmount}
चुकौती अवधि: {tenure} माह
मासिक भुगतान: ₹{monthlyPayment}

मुख्य शक्तियां:
{attributions}

याद रखें: समय पर भुगतान करें और अपना क्रेडिट इतिहास बनाएं।`,

    approved_micro: `आपकी ऋण आवेदन स्वीकृत हो गई है।

आपका GramScore: {gramScore}/100
स्वीकृत ऋण राशि: ₹{loanAmount}
चुकौती अवधि: {tenure} माह
मासिक भुगतान: ₹{monthlyPayment}

यह आपके साथ हमारा पहला कदम है। समय पर भुगतान करें।`,

    rejected: `हमें खेद है कि हम आपकी ऋण आवेदन को स्वीकृत नहीं कर सके।

आपका GramScore: {gramScore}/100

अस्वीकृति के कारण:
{rejectionReasons}

सुधार के लिए:
{improvements}

6 माह बाद पुनः आवेदन कर सकते हैं।`,

    signal_strong: `✓ {signalName}: मजबूत ({score}/100)
   {reason}`,

    signal_moderate: `≈ {signalName}: औसत ({score}/100)
   {reason}`,

    signal_weak: `✗ {signalName}: सुधार की जरूरत ({score}/100)
   {reason}`,

    improvement_voice: "बेहतर मूल्यांकन के लिए स्पष्ट रिकॉर्डिंग दें।",
    improvement_social: "अपने SHG समुदाय के साथ मजबूत संबंध बनाएं।",
    improvement_satellite: "अगली फसल तक अपने खेत को स्वस्थ रखें।",
    improvement_behavior: "नियमित मोबाइल और UPI लेनदेन बनाए रखें।",
  },

  ta: {
    approved_standard: `வாழ்த்துக்கள்! உங்கள் கடன் விண்ணப்பம் ஏற்கப்பட்டுள்ளது.

உங்கள் GramScore: {gramScore}/100
ஒப்புக்கொள்ளப்பட்ட கடன் தொகை: ₹{loanAmount}
திருப்பிச் செலுத்தும் காலம்: {tenure} மாதங்கள்
மாதாந்திர பணம்: ₹{monthlyPayment}

நீங்கள் ஏற்றுக்கொள்ளப்பட்ட காரணங்கள்:
{attributions}

அடுத்த படிகள்:
1. உங்கள் திருப்பிச் செலுத்தும் அட்டவணை மதிப்பாய்வு செய்யுங்கள்
2. உங்கள் வங்கி கணக்கு விவரங்களை உறுதிப்படுத்தவும்
3. கடன் ஒப்பந்தத்தில் கையெழுத்து இடுங்கள்
4. 2-3 வணிக நாட்களில் நிதி வழங்கப்படும்`,

    approved_mini: `உங்கள் கடன் விண்ணப்பம் ஏற்கப்பட்டுள்ளது!

உங்கள் GramScore: {gramScore}/100
ஒப்புக்கொள்ளப்பட்ட கடன் தொகை: ₹{loanAmount}
திருப்பிச் செலுத்தும் காலம்: {tenure} மாதங்கள்
மாதாந்திர பணம்: ₹{monthlyPayment}

நேர்மையான பணம் செலுத்துதல் உங்களுக்கு பெரிய கடன் வாய்ப்பை எடுக்கும்.`,

    approved_micro: `உங்கள் கடன் விண்ணப்பம் ஏற்கப்பட்டுள்ளது.

உங்கள் GramScore: {gramScore}/100
ஒப்புக்கொள்ளப்பட்ட கடன் தொகை: ₹{loanAmount}
திருப்பிச் செலுத்தும் காலம்: {tenure} மாதங்கள்
மாதாந்திர பணம்: ₹{monthlyPayment}

இது உங்களுடன் நமது முதல் படி. நேர்மையாக பணம் செலுத்துங்கள்.`,

    rejected: `உங்கள் கடன் விண்ணப்பம் ஏற்றுக்கொள்ள முடியவில்லை.

உங்கள் GramScore: {gramScore}/100

மாறுபாட்டுக்கான காரணங்கள்:
{rejectionReasons}

மேம்பாட்டுக்கான குறிப்புகள்:
{improvements}

6 மாதங்களுக்குப் பிறகு மீண்டும் விண்ணப்பிக்க முடியும்.`,

    signal_strong: `✓ {signalName}: வலுவான ({score}/100)
   {reason}`,

    signal_moderate: `≈ {signalName}: நடுநிலை ({score}/100)
   {reason}`,

    signal_weak: `✗ {signalName}: மேம்பாடு தேவை ({score}/100)
   {reason}`,

    improvement_voice: "சிறந்த மதிப்பீட்டுக்கு தெளிவான பதிவு கொடுங்கள்.",
    improvement_social: "உங்கள் SHG சமூகத்துடன் வலுவான உறவு கட்டவும்.",
    improvement_satellite: "அடுத்த பயிர் வரை உங்கள் பண்ணையை ஆரோக்கியமாக வைத்திருங்கள்.",
    improvement_behavior: "சீரான மொபைல் மற்றும் UPI பரிவர்த்தனைகளைப் பராமரிக்கவும்.",
  },

  te: {
    approved_standard: `అభినందనలు! మీ రుణ దరఖాస్తు ఆమోదించబడింది.

మీ GramScore: {gramScore}/100
ఆమోదించిన రుణ మొత్తం: ₹{loanAmount}
పరిష్కार కాలం: {tenure} నెలలు
నెలవారీ చెల్లింపు: ₹{monthlyPayment}

మీరు ఆమోదించిన కారణాలు:
{attributions}

తరువాతి దశలు:
1. మీ పరిష్కార షెడ్యూల్‌ను సమీక్షించండి
2. మీ బ్యాంక్ ఖాతా వివరాలను నిర్ధారించండి
3. రుణ ఒప్పందంపై సంతకం చేయండి
4. 2-3 వ్యాపార రోజుల్లో నిధులు జమ చేయబడతాయి`,

    approved_mini: `మీ రుణ దరఖాస్తు ఆమోదించబడింది!

మీ GramScore: {gramScore}/100
ఆమోదించిన రుణ మొత్తం: ₹{loanAmount}
పరిష్కार కాలం: {tenure} నెలలు
నెలవారీ చెల్లింపు: ₹{monthlyPayment}

సకాలంలో చెల్లింపులను చేయండి మరియు మీ క్రెడిట్ చరిత్రను నిర్మించండి.`,

    approved_micro: `మీ రుణ దరఖాస్తు ఆమోదించబడింది.

మీ GramScore: {gramScore}/100
ఆమోదించిన రుణ మొత్తం: ₹{loanAmount}
పరిష్కార కాలం: {tenure} నెలలు
నెలవారీ చెల్లింపు: ₹{monthlyPayment}

ఇది మాతో మీ మొదటి పদక్షేపం. సకాలంలో చెల్లింపులను చేయండి.`,

    rejected: `మీ రుణ దరఖాస్తును ఆమోదించలేకపోయాము.

మీ GramScore: {gramScore}/100

తిరస్కరణకు కారణాలు:
{rejectionReasons}

మెరుగుదల కోసం:
{improvements}

6 నెలల తర్వాత మళ్లీ దరఖాస్తు చేయవచ్చు.`,

    signal_strong: `✓ {signalName}: బలంగా ({score}/100)
   {reason}`,

    signal_moderate: `≈ {signalName}: మధ్యస్థంగా ({score}/100)
   {reason}`,

    signal_weak: `✗ {signalName}: మెరుగుదల అవసరం ({score}/100)
   {reason}`,

    improvement_voice: "మెరుగైన మూల్యాంకనం కోసం స్పష్టమైన రికార్డింగ ఇవ్వండి.",
    improvement_social: "మీ SHG సమాజంతో బలమైన సంబంధాలను నిర్మించండి.",
    improvement_satellite: "వచ్చే పంట వరకు మీ గని ఆరోగ్యకరంగా ఉంచండి.",
    improvement_behavior: "సాధారణ మొబైల్ మరియు UPI లేనిదేనులను నిర్వహించండి.",
  },

  kn: {
    approved_standard: `ಅಭಿನಂದನೆಗಳು! ನಿಮ್ಮ ಸಾಲ ಅರ್ಜಿ ಅನುಮೋದಿಸಲಾಗಿದೆ.

ನಿಮ್ಮ GramScore: {gramScore}/100
ಅನುಮೋದಿತ ಸಾಲ ಮೊತ್ತ: ₹{loanAmount}
ಮರುಪಾವತಿ ಅವಧಿ: {tenure} ತಿಂಗಳುಗಳು
ಮಾಸಿಕ ಪಾವತಿ: ₹{monthlyPayment}

ನೀವು ಅನುಮೋದಿತರಾದ ಕಾರಣಗಳು:
{attributions}

ಮುಂದಿನ ಹಂತಗಳು:
1. ನಿಮ್ಮ ಮರುಪಾವತಿ ವೇಳಾಪಟ್ಟಿಯನ್ನು ಪರಿಶೀಲಿಸಿ
2. ನಿಮ್ಮ ಬ್ಯಾಂಕ್ ಖಾತೆ ವಿವರಗಳನ್ನು ದೃಢೀಕರಿಸಿ
3. ಸಾಲ ಒಪ್ಪಂದದಲ್ಲಿ ಸಹಿ ಮಾಡಿ
4. 2-3 ವ್ಯವಹಾರ ದಿನಗಳಲ್ಲಿ ನಿಧಿಗಳನ್ನು ವಿತರಿಸಲಾಗುತ್ತದೆ`,

    approved_mini: `ನಿಮ್ಮ ಸಾಲ ಅರ್ಜಿ ಅನುಮೋದಿಸಲಾಗಿದೆ!

ನಿಮ್ಮ GramScore: {gramScore}/100
ಅನುಮೋದಿತ ಸಾಲ ಮೊತ್ತ: ₹{loanAmount}
ಮರುಪಾವತಿ ಅವಧಿ: {tenure} ತಿಂಗಳುಗಳು
ಮಾಸಿಕ ಪಾವತಿ: ₹{monthlyPayment}

ಸಾರಿಸಾಗಿ ಪಾವತಿಗಳನ್ನು ನಿರ್ವಹಿಸಿ ಮತ್ತು ನಿಮ್ಮ ಕ್ರೆಡಿಟ್ ಇತಿಹಾಸವನ್ನು ನಿರ್ಮಿಸಿ.`,

    approved_micro: `ನಿಮ್ಮ ಸಾಲ ಅರ್ಜಿ ಅನುಮೋದಿಸಲಾಗಿದೆ.

ನಿಮ್ಮ GramScore: {gramScore}/100
ಅನುಮೋದಿತ ಸಾಲ ಮೊತ್ತ: ₹{loanAmount}
ಮರುಪಾವತಿ ಅವಧಿ: {tenure} ತಿಂಗಳುಗಳು
ಮಾಸಿಕ ಪಾವತಿ: ₹{monthlyPayment}

ಇದು ನಮ್ಮೊಂದಿಗೆ ನಿಮ್ಮ ಮೊದಲ ಹಂತ. ಸಾರಿಸಾಗಿ ಪಾವತಿಗಳನ್ನು ಮಾಡಿ.`,

    rejected: `ನಿಮ್ಮ ಸಾಲ ಅರ್ಜಿಯನ್ನು ಅನುಮೋದಿಸಲಾಗಲಿಲ್ಲ.

ನಿಮ್ಮ GramScore: {gramScore}/100

ನಿರಾಕರಣೆಯ ಕಾರಣಗಳು:
{rejectionReasons}

ಸುಧಾರಣೆಗಾಗಿ:
{improvements}

6 ತಿಂಗಳುಗಳ ನಂತರ ಮತ್ತೆ ಅರ್ಜಿ ಸಲ್ಲಿಸಬಹುದು.`,

    signal_strong: `✓ {signalName}: ಪ್ರಬಲ ({score}/100)
   {reason}`,

    signal_moderate: `≈ {signalName}: ಮಾಧ್ಯಮ ({score}/100)
   {reason}`,

    signal_weak: `✗ {signalName}: ಸುಧಾರಣೆ ಅಗತ್ಯ ({score}/100)
   {reason}`,

    improvement_voice: "ಉತ್ತಮ ಮೌಲ್ಯಮಾಪನಕ್ಕಾಗಿ ಸ್ಪಷ್ಟ ರೆಕಾರ್ಡಿಂಗ ನೀಡಿ.",
    improvement_social: "ನಿಮ್ಮ SHG ಸಮುದಾಯದೊಂದಿಗೆ ಪ್ರಬಲ ಸಂಬಂಧಗಳನ್ನು ನಿರ್ಮಿಸಿ.",
    improvement_satellite: "ಮುಂದಿನ ಸುಗ್ಗಿ ವರೆಗೆ ನಿಮ್ಮ ಪೌಂಡನನ್ನು ಆರೋಗ್ಯಕರವಾಗಿ ಇಟ್ಟುಕೊಳ್ಳಿ.",
    improvement_behavior: "ನಿಯಮಿತ ಮೊಬೈಲ್ ಮತ್ತು UPI ವಹಿವಾಟುಗಳನ್ನು ನಿರ್ವಹಿಸಿ.",
  },
};

// ========== Explanation Generation ==========

/**
 * Generate multilingual explanation for loan decision
 */
export async function generateExplanation(
  decision: DecisionOutput,
  attributions: FeatureAttribution[],
  gramScore: number,
  loanAmount: number,
  tenure: number,
  monthlyPayment: number,
  language: Language = "en",
  logger?: GramCreditTraceLogger
): Promise<string> {
  if (logger) {
    logger.logInput("i18n_explainer", {
      decision: decision.decision,
      language,
      gramScore,
    });
  }

  const templates = explanationTemplates[language] || explanationTemplates.en;

  let template = "";

  if (decision.decision === "APPROVED") {
    if (gramScore >= 75) {
      template = templates.approved_standard;
    } else if (gramScore >= 60) {
      template = templates.approved_mini;
    } else {
      template = templates.approved_micro;
    }
  } else if (decision.decision === "REJECTED") {
    template = templates.rejected;
  } else {
    template = templates.under_review;
  }

  // Generate attribution text
  const attributionText = formatAttributions(attributions, language, templates);

  // Fill in template variables
  let explanation = template
    .replace("{gramScore}", Math.round(gramScore).toString())
    .replace("{loanAmount}", loanAmount.toLocaleString("en-IN"))
    .replace("{tenure}", tenure.toString())
    .replace("{monthlyPayment}", Math.round(monthlyPayment).toLocaleString("en-IN"))
    .replace("{attributions}", attributionText);

  if (decision.decision === "REJECTED") {
    const rejectionReasons = (decision.reasonCodes || [])
      .map((code) => formatReasonCode(code, language))
      .join("\n");
    explanation = explanation.replace("{rejectionReasons}", rejectionReasons);

    const improvements = generateImprovements(attributions, language, templates);
    explanation = explanation.replace("{improvements}", improvements);
  }

  if (logger) {
    logger.logOutput("i18n_explainer", {
      explanationLength: explanation.length,
      language,
    });
  }

  return explanation;
}

/**
 * Format attributions for explanation
 */
function formatAttributions(
  attributions: FeatureAttribution[],
  language: Language,
  templates: Record<string, string>
): string {
  const templates_lang = explanationTemplates[language] || explanationTemplates.en;

  return attributions
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .map((attr) => {
      let template = "";
      if (attr.direction === "positive") {
        template = templates_lang.signal_strong;
      } else if (attr.direction === "negative") {
        template = templates_lang.signal_weak;
      } else {
        template = templates_lang.signal_moderate;
      }

      return template
        .replace("{signalName}", formatSignalName(attr.signalId, language))
        .replace("{score}", Math.round(attr.contribution + 50).toString())
        .replace("{reason}", formatReason(attr.reasonCode, language));
    })
    .join("\n");
}

/**
 * Generate improvement suggestions
 */
function generateImprovements(
  attributions: FeatureAttribution[],
  language: Language,
  templates: Record<string, string>
): string {
  const templates_lang = explanationTemplates[language] || explanationTemplates.en;
  const weak = attributions.filter((a) => a.direction === "negative");

  return weak
    .map((attr) => `• ${formatSignalName(attr.signalId, language)}: ${templates_lang[`improvement_${attr.signalId}`] || ""}`)
    .join("\n");
}

// ========== Formatting Helpers ==========

function formatSignalName(signalId: string, language: Language): string {
  const names: Record<Language, Record<string, string>> = {
    en: {
      voice: "Voice Interview",
      social: "Social Network",
      satellite: "Crop Health",
      behavior: "Mobile Behavior",
    },
    hi: {
      voice: "वॉयस साक्षात्कार",
      social: "सामाजिक नेटवर्क",
      satellite: "फसल स्वास्थ्य",
      behavior: "मोबाइल व्यवहार",
    },
    ta: {
      voice: "குரல் பேட்டை",
      social: "சामाजிக நெटவொர்க்",
      satellite: "பயிர் ஆரோக்கியம்",
      behavior: "மொபைல் நடத்தை",
    },
    te: {
      voice: "వాయిస్ ఇంటర్‌వ్యూ",
      social: "సామాజిక నెట్‌వర్క్",
      satellite: "పంట ఆరోగ్యం",
      behavior: "మొబైల్ ప్రవర్తన",
    },
    kn: {
      voice: "ವಾಯಿಸ್ ಇಂಟರ್‍ವ್ಯೂ",
      social: "ಸಾಮಾಜಿಕ ನೆಟ್‌ವರ್ಕ್",
      satellite: "ಪೌಂಡ ಆರೋಗ್ಯ",
      behavior: "ಮೊಬೈಲ್ ನಡವಳಿಕೆ",
    },
  };

  return names[language]?.[signalId] || signalId;
}

function formatReason(reasonCode: string, language: Language): string {
  const reasons: Record<Language, Record<string, string>> = {
    en: {
      VOICE_HIGH_CONSCIENTIOUSNESS: "You show responsibility and reliability.",
      SOCIAL_STRONG_NETWORK: "You have a strong support network.",
      SATELLITE_HEALTHY_CROP: "Your crop is in good health.",
      BEHAVIOR_CONSISTENT_DISCIPLINE: "You maintain regular financial discipline.",
      VOICE_LOW_AUDIO_QUALITY: "Audio quality affected assessment.",
      SOCIAL_WEAK_NETWORK: "Your network connections need strengthening.",
      SATELLITE_CROP_STRESS: "Your crop shows signs of stress.",
      BEHAVIOR_IRREGULAR_PATTERN: "Your financial patterns are inconsistent.",
    },
    hi: {
      VOICE_HIGH_CONSCIENTIOUSNESS: "आप जिम्मेदारी दिखाते हैं।",
      SOCIAL_STRONG_NETWORK: "आपका मजबूत समर्थन नेटवर्क है।",
      SATELLITE_HEALTHY_CROP: "आपकी फसल अच्छी स्थिति में है।",
      BEHAVIOR_CONSISTENT_DISCIPLINE: "आप नियमित वित्तीय अनुशासन बनाए रखते हैं।",
      VOICE_LOW_AUDIO_QUALITY: "ऑडियो गुणवत्ता ने मूल्यांकन को प्रभावित किया।",
      SOCIAL_WEAK_NETWORK: "आपके नेटवर्क को मजबूत करने की जरूरत है।",
      SATELLITE_CROP_STRESS: "आपकी फसल में तनाव के संकेत हैं।",
      BEHAVIOR_IRREGULAR_PATTERN: "आपके वित्तीय पैटर्न असंगत हैं।",
    },
    ta: {
      VOICE_HIGH_CONSCIENTIOUSNESS: "நீங்கள் பொறுப்பைக் காட்டுகிறீர்கள்.",
      SOCIAL_STRONG_NETWORK: "உங்களுக்கு வலுவான ஆதரவு நெட்வொர்க் உள்ளது.",
      SATELLITE_HEALTHY_CROP: "உங்கள் பயிர் நல்ல நிலையில் உள்ளது.",
      BEHAVIOR_CONSISTENT_DISCIPLINE: "நீங்கள் சீரான நிதி ஒழுங்குமுறையைப் பராமரிக்கிறீர்கள்.",
      VOICE_LOW_AUDIO_QUALITY: "ஆடியோ தரம் மதிப்பீட்டைப் பாதித்தது.",
      SOCIAL_WEAK_NETWORK: "உங்கள் நெட்வொர்க்கை வலுப்படுத்த வேண்டும்.",
      SATELLITE_CROP_STRESS: "உங்கள் பயிர் மன அழுத்தத்தின் அறிகுறிகளைக் காட்டுகிறது.",
      BEHAVIOR_IRREGULAR_PATTERN: "உங்கள் நிதி பैட்டர்ன் சீரற்றவை.",
    },
    te: {
      VOICE_HIGH_CONSCIENTIOUSNESS: "మీరు జిమ్మేదారితనం చూపుతారు.",
      SOCIAL_STRONG_NETWORK: "మీకు బలమైన సపోర్ట్ నెట్‌వర్క్ ఉంది.",
      SATELLITE_HEALTHY_CROP: "మీ పంట ఎంత బాగా ఉంది.",
      BEHAVIOR_CONSISTENT_DISCIPLINE: "మీరు సాధారణ ఆర్థిక సంయమనాన్ని నిర్వహిస్తారు.",
      VOICE_LOW_AUDIO_QUALITY: "ఆడియో నాణ్యత అంచనాను ప్రభావితం చేసింది.",
      SOCIAL_WEAK_NETWORK: "మీ నెట్‌వర్క్‌ను బలపరచాలి.",
      SATELLITE_CROP_STRESS: "మీ పంట ఒత్తిడి సంకేతాలు చూపుతుంది.",
      BEHAVIOR_IRREGULAR_PATTERN: "మీ ఆర్థిక నమూనాలు అసంగతంగా ఉన్నాయి.",
    },
    kn: {
      VOICE_HIGH_CONSCIENTIOUSNESS: "ನೀವು ಜವಾಬ್ದಾರಿತ್ವ ತೋರಿಸುತ್ತೀರಿ.",
      SOCIAL_STRONG_NETWORK: "ನೀವು ಬಲವಾದ ಬೆಂಬಲ ನೆಟ್‌ವರ್ಕ್ ಅನ್ನು ಹೊಂದಿದ್ದೀರಿ.",
      SATELLITE_HEALTHY_CROP: "ನಿಮ್ಮ ಪೌಂಡ ಉತ್ತಮ ಸ್ಥಿತಿಯಲ್ಲಿದೆ.",
      BEHAVIOR_CONSISTENT_DISCIPLINE: "ನೀವು ನಿಯಮಿತ ಆರ್ಥಿಕ ಶಾಸನವನ್ನು ನಿರ್ವಹಿಸುತ್ತೀರಿ.",
      VOICE_LOW_AUDIO_QUALITY: "ಆಡಿಯೊ ಗುಣಮಟ್ಟ ನಿರ್ಧಾರಕ್ಕೆ ಪ್ರಭಾವ ಬೀರಿದೆ.",
      SOCIAL_WEAK_NETWORK: "ನಿಮ್ಮ ನೆಟ್‌ವರ್ಕ್‌ ಅನ್ನು ಬಲಪರಿಸಬೇಕು.",
      SATELLITE_CROP_STRESS: "ನಿಮ್ಮ ಪೌಂಡ ಒತ್ತಡದ ಚಿಹ್ನೆಗಳನ್ನು ತೋರಿಸುತ್ತದೆ.",
      BEHAVIOR_IRREGULAR_PATTERN: "ನಿಮ್ಮ ಆರ್ಥಿಕ ನಿದರ್ಶನಗಳು ಅಸಂಗತವಾಗಿವೆ.",
    },
  };

  return reasons[language]?.[reasonCode] || reasonCode;
}

function formatReasonCode(reasonCode: string, language: Language): string {
  const codeNames: Record<Language, Record<string, string>> = {
    en: {
      FAILED_ELIGIBILITY_CHECK: "You did not meet eligibility criteria.",
      INSUFFICIENT_MODEL_CONFIDENCE: "We need more information to assess your application.",
      SCORE_BELOW_MINIMUM_THRESHOLD: "Your score was below our minimum requirement.",
    },
    hi: {
      FAILED_ELIGIBILITY_CHECK: "आप पात्रता मानदंड को पूरा नहीं करते।",
      INSUFFICIENT_MODEL_CONFIDENCE: "हमें आपके आवेदन का आकलन करने के लिए अधिक जानकारी की आवश्यकता है।",
      SCORE_BELOW_MINIMUM_THRESHOLD: "आपका स्कोर हमारी न्यूनतम आवश्यकता से नीचे था।",
    },
    ta: {
      FAILED_ELIGIBILITY_CHECK: "நீங்கள் தகுதி நிபந்தனைகளை பூர்த்திசெய்யவில்லை.",
      INSUFFICIENT_MODEL_CONFIDENCE: "உங்கள் விண்ணப்பத்தை மதிப்பிட எங்களுக்கு கூடுதல் தகவல் தேவை.",
      SCORE_BELOW_MINIMUM_THRESHOLD: "உங்கள் மதிப்பெண் எங்கள் குறைந்தபட்ச தேவைக்கு கீழே இருந்தது.",
    },
    te: {
      FAILED_ELIGIBILITY_CHECK: "మీరు పాత్రత ప్రమాణాలను నెరవేర్చలేదు.",
      INSUFFICIENT_MODEL_CONFIDENCE: "మీ దరఖాస్తును అంచనా వేయడానికి మాకు మరిన్ని సమాచారం అవసరం.",
      SCORE_BELOW_MINIMUM_THRESHOLD: "మీ స్కోర్ మా కనీస అవసరానికి కంటే తక్కువ ఉంది.",
    },
    kn: {
      FAILED_ELIGIBILITY_CHECK: "ನೀವು ಅರ್ಹತೆ ನಿಕಷಗಳನ್ನು ಪೂರೈಸಿಲ್ಲ.",
      INSUFFICIENT_MODEL_CONFIDENCE: "ನಿಮ್ಮ ಅರ್ಜಿಯನ್ನು ನಿರ್ಧರಿಸಲು ನಮಗೆ ಹೆಚ್ಚಿನ ಸಂಚಿಕೆ ಅವಶ್ಯಕ.",
      SCORE_BELOW_MINIMUM_THRESHOLD: "ನಿಮ್ಮ ಸ್ಕೋರ್ ನಮ್ಮ ಕನಿಷ್ಠ ಅವಶ್ಯಕತೆಗಿಂತ ಕಡಿಮೆ ಇದೆ.",
    },
  };

  return codeNames[language]?.[reasonCode] || reasonCode;
}

export type { Language };

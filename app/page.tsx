"use client";

import Link from "next/link";
import {
  ArrowRight,
  Cpu,
  Globe2,
  Mic2,
  Orbit,
  Satellite,
  ShieldCheck,
} from "lucide-react";
import { Space_Grotesk, Fraunces } from "next/font/google";
import {
  useLanguage,
  type SupportedLanguage,
} from "@/components/language/language-provider";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"] });
const fraunces = Fraunces({ subsets: ["latin"] });

const copy: Record<
  SupportedLanguage,
  {
    headerCta: string;
    badge: string;
    heroTitle: string;
    heroSubtitle: string;
    heroButton: string;
    targetDecision: string;
    whyItMatters: string;
    why1: string;
    why2: string;
    why3: string;
    fourSignalTitle: string;
    buildPlanTitle: string;
    signals: Array<{ title: string; detail: string }>;
    phases: Array<{ phase: string; title: string; detail: string }>;
  }
> = {
  en: {
    headerCta: "Try Live Demo",
    badge: "AI Hackathon 2026",
    heroTitle:
      "Emergency rural credit in under 2 minutes, powered by trust graphs and AI signals.",
    heroSubtitle:
      "GramCredit converts invisible village trust into measurable creditworthiness using a social GNN, voice psychometrics, satellite crop intelligence, and behavior analytics.",
    heroButton: "Start The Demo",
    targetDecision: "Target decision time: 87 seconds",
    whyItMatters: "Why It Matters",
    why1:
      "Rural borrowers often choose between KCC misuse and predatory moneylenders.",
    why2: "GramCredit creates a fair score for people with zero CIBIL history.",
    why3:
      "All decisions are explainable in local language, not black-box approvals.",
    fourSignalTitle: "Four-Signal Credit Intelligence",
    buildPlanTitle: "Hackathon Build Plan",
    signals: [
      {
        title: "Social Trust GNN",
        detail:
          "Village transaction graph + SHG links scored with message passing.",
      },
      {
        title: "Voice Psychometrics",
        detail:
          "Regional language interview mapped to OCEAN personality traits.",
      },
      {
        title: "Satellite Crop Health",
        detail:
          "NDVI-based crop vitality and fraud anomaly checks from remote sensing.",
      },
      {
        title: "Behavior Signal",
        detail:
          "UPI and recharge regularity patterns as informal repayment discipline.",
      },
    ],
    phases: [
      {
        phase: "Phase 1",
        title: "Data + Trust Graph",
        detail:
          "Model village entities, SHG links, and transaction metadata with reproducible mock generators.",
      },
      {
        phase: "Phase 2",
        title: "GNN + Signal Engines",
        detail:
          "Run social message passing, voice trait extraction, crop NDVI scoring, and behavior analytics in parallel.",
      },
      {
        phase: "Phase 3",
        title: "Fusion + Explainability",
        detail:
          "Fuse all signals into GramScore and return multilingual, human-readable loan reasons.",
      },
      {
        phase: "Phase 4",
        title: "87-Second Demo",
        detail:
          "Profile -> voice recording -> instant decision with repayment schedule and clear attribution cards.",
      },
    ],
  },
  hi: {
    headerCta: "लाइव डेमो आज़माएं",
    badge: "एआई हैकाथॉन 2026",
    heroTitle:
      "ट्रस्ट ग्राफ और AI संकेतों से 2 मिनट से कम समय में ग्रामीण आपातकालीन क्रेडिट।",
    heroSubtitle:
      "GramCredit सामाजिक GNN, वॉइस साइकोमेट्रिक्स, सैटेलाइट फसल विश्लेषण और व्यवहार संकेतों से गांव के भरोसे को मापने योग्य क्रेडिट स्कोर में बदलता है।",
    heroButton: "डेमो शुरू करें",
    targetDecision: "लक्ष्य निर्णय समय: 87 सेकंड",
    whyItMatters: "यह क्यों महत्वपूर्ण है",
    why1: "ग्रामीण उधारकर्ता अक्सर KCC दुरुपयोग और सूदखोरों के बीच फंस जाते हैं।",
    why2: "GramCredit बिना CIBIL इतिहास वाले लोगों के लिए निष्पक्ष स्कोर बनाता है।",
    why3: "सभी निर्णय स्थानीय भाषा में समझाए जाते हैं, ब्लैक-बॉक्स नहीं।",
    fourSignalTitle: "चार-संकेत क्रेडिट इंटेलिजेंस",
    buildPlanTitle: "हैकाथॉन निर्माण योजना",
    signals: [
      {
        title: "सोशल ट्रस्ट GNN",
        detail: "गांव लेनदेन ग्राफ और SHG लिंक को संदेश-पासिंग से स्कोर किया जाता है।",
      },
      {
        title: "वॉइस साइकोमेट्रिक्स",
        detail: "स्थानीय भाषा इंटरव्यू को OCEAN व्यक्तित्व गुणों से मैप किया जाता है।",
      },
      {
        title: "सैटेलाइट फसल स्वास्थ्य",
        detail: "NDVI आधारित फसल स्वास्थ्य और धोखाधड़ी संकेतों की जांच।",
      },
      {
        title: "व्यवहार संकेत",
        detail: "UPI और रिचार्ज नियमितता से अनौपचारिक पुनर्भुगतान अनुशासन का आकलन।",
      },
    ],
    phases: [
      {
        phase: "चरण 1",
        title: "डेटा + ट्रस्ट ग्राफ",
        detail: "गांव इकाइयां, SHG लिंक और लेनदेन मेटाडेटा मॉडल करना।",
      },
      {
        phase: "चरण 2",
        title: "GNN + सिग्नल इंजन",
        detail: "सामाजिक ग्राफ, वॉइस, फसल NDVI और व्यवहार विश्लेषण समानांतर चलाना।",
      },
      {
        phase: "चरण 3",
        title: "फ्यूज़न + व्याख्या",
        detail: "सभी संकेतों को मिलाकर GramScore और कारण तैयार करना।",
      },
      {
        phase: "चरण 4",
        title: "87 सेकंड डेमो",
        detail: "प्रोफाइल -> वॉइस रिकॉर्डिंग -> तुरंत निर्णय और पुनर्भुगतान विवरण।",
      },
    ],
  },
  ta: {
    headerCta: "லைவ் டெமோ முயற்சிக்கவும்",
    badge: "AI ஹாக்கத்தான் 2026",
    heroTitle:
      "நம்பிக்கை வரைபடங்கள் மற்றும் AI சிக்னல்களுடன் 2 நிமிடங்களுக்குள் அவசர கிராமக் கடன்.",
    heroSubtitle:
      "GramCredit சமூக GNN, குரல் உளவியல், செயற்கைக்கோள் பயிர் தகவல் மற்றும் நடத்தை பகுப்பாய்வின் மூலம் கிராம நம்பிக்கையை அளவிடக்கூடிய கடன் மதிப்பாக மாற்றுகிறது.",
    heroButton: "டெமோ தொடங்கு",
    targetDecision: "இலக்கு தீர்மான நேரம்: 87 விநாடிகள்",
    whyItMatters: "ஏன் இது முக்கியம்",
    why1: "கிராம கடன் பெறுபவர்கள் பலமுறை தவறான கடன் வழிகளுக்கும் அதிக வட்டி கடன்களுக்கும் இடையில் சிக்குகிறார்கள்.",
    why2: "CIBIL வரலாறு இல்லாதவர்களுக்கும் GramCredit நியாயமான மதிப்பெண் தருகிறது.",
    why3: "அனைத்து முடிவுகளும் உள்ளூர் மொழியில் விளக்கப்படுகின்றன.",
    fourSignalTitle: "நான்கு-சிக்னல் கடன் நுண்ணறிவு",
    buildPlanTitle: "ஹாக்கத்தான் கட்டுமான திட்டம்",
    signals: [
      {
        title: "சமூக நம்பிக்கை GNN",
        detail: "கிராம பரிவர்த்தனை வரைபடம் மற்றும் SHG இணைப்புகள் மதிப்பிடப்படுகின்றன.",
      },
      {
        title: "குரல் உளவியல்",
        detail: "பிராந்திய மொழி பேட்டி OCEAN தன்மைக் கூறுகளுடன் பொருத்தப்படுகிறது.",
      },
      {
        title: "செயற்கைக்கோள் பயிர் ஆரோக்கியம்",
        detail: "NDVI அடிப்படையில் பயிர் நிலை மற்றும் மோசடி சாத்தியம் கண்காணிப்பு.",
      },
      {
        title: "நடத்தை சிக்னல்",
        detail: "UPI மற்றும் ரீசார்ஜ் ஒழுங்கை அடிப்படையாகக் கொண்டு திருப்பிச் செலுத்தும் ஒழுக்கம் மதிப்பீடு.",
      },
    ],
    phases: [
      {
        phase: "கட்டம் 1",
        title: "தரவு + நம்பிக்கை வரைபடம்",
        detail: "கிராம தரவு, SHG இணைப்புகள் மற்றும் பரிவர்த்தனை தகவல் மாதிரியாக்கம்.",
      },
      {
        phase: "கட்டம் 2",
        title: "GNN + சிக்னல் என்ஜின்கள்",
        detail: "சமூக, குரல், NDVI மற்றும் நடத்தை சிக்னல்களை இணைந்து செயலாக்குதல்.",
      },
      {
        phase: "கட்டம் 3",
        title: "இணைப்பு + விளக்கம்",
        detail: "அனைத்து சிக்னல்களையும் இணைத்து GramScore மற்றும் காரண விளக்கம் வழங்குதல்.",
      },
      {
        phase: "கட்டம் 4",
        title: "87 விநாடி டெமோ",
        detail: "சுயவிவரம் -> குரல் பதிவு -> உடனடி தீர்மானம் மற்றும் தவணை திட்டம்.",
      },
    ],
  },
  te: {
    headerCta: "లైవ్ డెమో ప్రయత్నించండి",
    badge: "AI హ్యాకథాన్ 2026",
    heroTitle: "ట్రస్ట్ గ్రాఫ్‌లు మరియు AI సంకేతాలతో 2 నిమిషాల్లో గ్రామీణ అత్యవసర రుణం.",
    heroSubtitle:
      "GramCredit సామాజిక GNN, వాయిస్ సైకోమెట్రిక్స్, ఉపగ్రహ పంట విశ్లేషణ, ప్రవర్తన సంకేతాలతో గ్రామ విశ్వాసాన్ని కొలిచే క్రెడిట్ స్కోర్‌గా మారుస్తుంది.",
    heroButton: "డెమో ప్రారంభించండి",
    targetDecision: "లక్ష్య నిర్ణయ సమయం: 87 సెకన్లు",
    whyItMatters: "ఇది ఎందుకు ముఖ్యము",
    why1: "గ్రామీణ రుణగ్రహీతలు తరచుగా అధిక వడ్డీ అప్పుల మధ్య చిక్కుకుంటారు.",
    why2: "CIBIL చరిత్ర లేనివారికి కూడా GramCredit న్యాయమైన స్కోర్ ఇస్తుంది.",
    why3: "ప్రతి నిర్ణయం స్థానిక భాషలో వివరణతో అందుతుంది.",
    fourSignalTitle: "నాలుగు-సంకేత క్రెడిట్ ఇంటెలిజెన్స్",
    buildPlanTitle: "హ్యాకథాన్ నిర్మాణ ప్రణాళిక",
    signals: [
      {
        title: "సోషల్ ట్రస్ట్ GNN",
        detail: "గ్రామ లావాదేవీ గ్రాఫ్ మరియు SHG లింక్‌లను సందేశ ఆధారంగా స్కోర్ చేస్తుంది.",
      },
      {
        title: "వాయిస్ సైకోమెట్రిక్స్",
        detail: "ప్రాంతీయ భాష ఇంటర్వ్యూని OCEAN వ్యక్తిత్వ లక్షణాలకు మ్యాప్ చేస్తుంది.",
      },
      {
        title: "ఉపగ్రహ పంట ఆరోగ్యం",
        detail: "NDVI ఆధారంగా పంట స్థితి మరియు మోసం సంకేతాలను గుర్తిస్తుంది.",
      },
      {
        title: "ప్రవర్తన సంకేతం",
        detail: "UPI మరియు రీచార్జ్ క్రమబద్ధత ద్వారా తిరిగి చెల్లింపు క్రమశిక్షణను అంచనా వేస్తుంది.",
      },
    ],
    phases: [
      {
        phase: "దశ 1",
        title: "డేటా + ట్రస్ట్ గ్రాఫ్",
        detail: "గ్రామ యూనిట్లు, SHG లింకులు, లావాదేవీ మెటాడేటా మోడలింగ్.",
      },
      {
        phase: "దశ 2",
        title: "GNN + సిగ్నల్ ఇంజిన్లు",
        detail: "సామాజిక, వాయిస్, NDVI, ప్రవర్తన విశ్లేషణలను సమాంతరంగా అమలు చేయడం.",
      },
      {
        phase: "దశ 3",
        title: "ఫ్యూజన్ + వివరణ",
        detail: "అన్ని సంకేతాలను కలిపి GramScore మరియు లోకల్ వివరణ అందించడం.",
      },
      {
        phase: "దశ 4",
        title: "87-సెకన్ల డెమో",
        detail: "ప్రొఫైల్ -> వాయిస్ రికార్డింగ్ -> వెంటనే నిర్ణయం మరియు చెల్లింపు షెడ్యూల్.",
      },
    ],
  },
  kn: {
    headerCta: "ಲೈವ್ ಡೆಮೋ ಪ್ರಯತ್ನಿಸಿ",
    badge: "AI ಹ್ಯಾಕಥಾನ್ 2026",
    heroTitle:
      "ಟ್ರಸ್ಟ್ ಗ್ರಾಫ್ ಮತ್ತು AI ಸಂಕೇತಗಳ ನೆರವಿನಿಂದ 2 ನಿಮಿಷಗಳಲ್ಲಿ ತುರ್ತು ಗ್ರಾಮೀಣ ಸಾಲ.",
    heroSubtitle:
      "GramCredit ಸಾಮಾಜಿಕ GNN, ಧ್ವನಿ ಮನೋವೈಜ್ಞಾನಿಕ ವಿಶ್ಲೇಷಣೆ, ಉಪಗ್ರಹ ಬೆಳೆ ಮಾಹಿತಿ ಮತ್ತು ವರ್ತನೆ ವಿಶ್ಲೇಷಣೆಯಿಂದ ಗ್ರಾಮೀಣ ವಿಶ್ವಾಸವನ್ನು ಅಳೆಯಬಹುದಾದ ಕ್ರೆಡಿಟ್ ಸ್ಕೋರ್ ಆಗಿ ರೂಪಿಸುತ್ತದೆ.",
    heroButton: "ಡೆಮೋ ಆರಂಭಿಸಿ",
    targetDecision: "ಗುರಿ ನಿರ್ಧಾರ ಸಮಯ: 87 ಸೆಕೆಂಡುಗಳು",
    whyItMatters: "ಇದು ಏಕೆ ಮುಖ್ಯ",
    why1: "ಗ್ರಾಮೀಣ ಸಾಲಗಾರರು ಹಲವುವೇಳೆ ಅತಿಹೆಚ್ಚು ಬಡ್ಡಿ ಸಾಲದ ನಡುವೆ ಸಿಲುಕುತ್ತಾರೆ.",
    why2: "CIBIL ಇತಿಹಾಸವಿಲ್ಲದವರಿಗೂ GramCredit ನ್ಯಾಯಸಮ್ಮತ ಸ್ಕೋರ್ ನೀಡುತ್ತದೆ.",
    why3: "ಎಲ್ಲಾ ನಿರ್ಧಾರಗಳು ಸ್ಥಳೀಯ ಭಾಷೆಯಲ್ಲಿ ಸ್ಪಷ್ಟವಾಗಿ ತಿಳಿಸಲಾಗುತ್ತವೆ.",
    fourSignalTitle: "ನಾಲ್ಕು-ಸಂಕೇತ ಕ್ರೆಡಿಟ್ ಬುದ್ಧಿಮತ್ತೆ",
    buildPlanTitle: "ಹ್ಯಾಕಥಾನ್ ನಿರ್ಮಾಣ ಯೋಜನೆ",
    signals: [
      {
        title: "ಸಾಮಾಜಿಕ ನಂಬಿಕೆ GNN",
        detail: "ಗ್ರಾಮ ವ್ಯವಹಾರ ಗ್ರಾಫ್ ಮತ್ತು SHG ಸಂಪರ್ಕಗಳನ್ನು ಸಂದೇಶ ಪಾಸಿಂಗ್ ಮೂಲಕ ಅಂಕಿಸುತ್ತದೆ.",
      },
      {
        title: "ಧ್ವನಿ ಮನೋಮಾಪನ",
        detail: "ಪ್ರಾದೇಶಿಕ ಭಾಷಾ ಸಂದರ್ಶನವನ್ನು OCEAN ವ್ಯಕ್ತಿತ್ವ ಗುಣಗಳಿಗೆ ಮ್ಯಾಪ್ ಮಾಡುತ್ತದೆ.",
      },
      {
        title: "ಉಪಗ್ರಹ ಬೆಳೆ ಆರೋಗ್ಯ",
        detail: "NDVI ಆಧಾರದ ಮೇಲೆ ಬೆಳೆ ಸ್ಥಿತಿ ಮತ್ತು ವಂಚನೆ ಸೂಚನೆಗಳನ್ನು ಪತ್ತೆಹಿಡಿಯುತ್ತದೆ.",
      },
      {
        title: "ವರ್ತನೆ ಸಂಕೇತ",
        detail: "UPI ಮತ್ತು ರೀಚಾರ್ಜ್ ನಿಯಮಿತತೆಯಿಂದ ಪಾವತಿ ಶಿಸ್ತು ಅಳೆಯುತ್ತದೆ.",
      },
    ],
    phases: [
      {
        phase: "ಹಂತ 1",
        title: "ಡೇಟಾ + ಟ್ರಸ್ಟ್ ಗ್ರಾಫ್",
        detail: "ಗ್ರಾಮ ಘಟಕಗಳು, SHG ಲಿಂಕ್‌ಗಳು ಮತ್ತು ವ್ಯವಹಾರ ಮಾಹಿತಿಯ ಮಾದರಿಕರಣ.",
      },
      {
        phase: "ಹಂತ 2",
        title: "GNN + ಸಂಕೇತ ಎಂಜಿನ್",
        detail: "ಸಾಮಾಜಿಕ, ಧ್ವನಿ, NDVI ಮತ್ತು ವರ್ತನೆ ವಿಶ್ಲೇಷಣೆಯನ್ನು ಸಮಾಂತರವಾಗಿ ನಡೆಸುವುದು.",
      },
      {
        phase: "ಹಂತ 3",
        title: "ಫ್ಯೂಷನ್ + ವಿವರಣೆ",
        detail: "ಎಲ್ಲಾ ಸಂಕೇತಗಳನ್ನು ಸೇರಿಸಿ GramScore ಮತ್ತು ಕಾರಣ ವಿವರಣೆ ನೀಡುವುದು.",
      },
      {
        phase: "ಹಂತ 4",
        title: "87-ಸೆಕೆಂಡು ಡೆಮೋ",
        detail: "ಪ್ರೊಫೈಲ್ -> ಧ್ವನಿ ದಾಖಲೆ -> ತಕ್ಷಣದ ನಿರ್ಧಾರ ಮತ್ತು ಮರುಪಾವತಿ ವೇಳಾಪಟ್ಟಿ.",
      },
    ],
  },
};

export default function HomePage() {
  const { language } = useLanguage();
  const t = copy[language];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_10%_10%,#dcfce7_0%,#fef3c7_35%,#fff7ed_68%,#f0fdfa_100%)] pb-8 pt-20 text-zinc-900 md:pt-24">
      <div className="pointer-events-none absolute -left-16 top-20 h-52 w-52 rounded-full bg-emerald-300/40 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-40 h-64 w-64 rounded-full bg-amber-300/40 blur-3xl" />

      <section className="mx-auto max-w-6xl px-6 pb-16 pt-6 md:pb-24 md:pt-8">
        <header className="mb-14 flex items-center justify-between rounded-2xl border border-zinc-900/10 bg-white/60 px-5 py-4 backdrop-blur">
          <p
            className={`${spaceGrotesk.className} text-xl font-bold tracking-tight`}
          >
            GramCredit
          </p>
          <div className="flex items-center gap-2">
            <Link
              href="/try"
              className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700"
            >
              {t.headerCta}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/prahari"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-900/15 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100"
            >
              PRAHARI
            </Link>
          </div>
        </header>

        <div className="grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div className="space-y-6">
            <p className="inline-flex rounded-full border border-emerald-700/30 bg-emerald-100 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-900">
              {t.badge}
            </p>
            <h1
              className={`${fraunces.className} text-balance text-4xl leading-tight md:text-6xl`}
            >
              {t.heroTitle}
            </h1>
            <p className="max-w-xl text-pretty text-base text-zinc-700 md:text-lg">
              {t.heroSubtitle}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/try"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                {t.heroButton}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/prahari"
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-900/15 bg-white px-5 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50"
              >
                PRAHARI Farmer Safety
              </Link>
              <span className="text-sm text-zinc-700">{t.targetDecision}</span>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-900/10 bg-white/70 p-6 shadow-xl shadow-zinc-900/5 backdrop-blur">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.15em] text-zinc-700">
              {t.whyItMatters}
            </h2>
            <ul className="space-y-4 text-sm text-zinc-700">
              <li className="rounded-xl border border-red-200 bg-red-50 p-4">
                {t.why1}
              </li>
              <li className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                {t.why2}
              </li>
              <li className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                {t.why3}
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16 md:pb-24">
        <div className="mb-8 flex items-center gap-2 text-zinc-800">
          <ShieldCheck className="h-5 w-5" />
          <h3 className="text-xl font-semibold">{t.fourSignalTitle}</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {t.signals.map((signal, idx) => {
            const icons = [Orbit, Mic2, Satellite, Cpu];
            const Icon = icons[idx] ?? Orbit;
            return (
              <article
                key={signal.title}
                className="rounded-2xl border border-zinc-900/10 bg-white/75 p-5 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="mb-3 inline-flex rounded-lg bg-zinc-900 p-2 text-white">
                  <Icon className="h-4 w-4" />
                </div>
                <h4 className="text-lg font-semibold">{signal.title}</h4>
                <p className="mt-2 text-sm text-zinc-700">{signal.detail}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16 md:pb-24">
        <div className="mb-8 flex items-center gap-2 text-zinc-800">
          <Globe2 className="h-5 w-5" />
          <h3 className="text-xl font-semibold">{t.buildPlanTitle}</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {t.phases.map((phase) => (
            <article
              key={phase.phase + phase.title}
              className="rounded-2xl border border-zinc-900/10 bg-white/80 p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-600">
                {phase.phase}
              </p>
              <h4 className="mt-2 text-lg font-semibold">{phase.title}</h4>
              <p className="mt-2 text-sm text-zinc-700">{phase.detail}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

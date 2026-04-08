import type { SupportedLanguage } from "@/components/language/language-provider";

type LocalizedRecord = Record<SupportedLanguage, string>;

function localized(
  en: string,
  hi: string,
  ta: string,
  te: string,
  kn: string,
): LocalizedRecord {
  return { en, hi, ta, te, kn };
}

export function pickText(text: LocalizedRecord, language: SupportedLanguage) {
  return text[language] || text.en;
}

export const tryPageText = {
  liveDemo: localized("Live Demo", "लाइव डेमो", "லைவ் டெமோ", "లైవ్ డెమో", "ಲೈವ್ ಡೆಮೋ"),
  title: localized("Try GramCredit", "GramCredit आज़माएं", "GramCredit முயற்சி", "GramCredit ప్రయత్నించండి", "GramCredit ಪ್ರಯತ್ನಿಸಿ"),
  subtitle: localized(
    "Complete profile, record voice, and get a loan decision in under two minutes.",
    "प्रोफाइल पूरा करें, आवाज रिकॉर्ड करें और दो मिनट से कम में ऋण निर्णय पाएं।",
    "சுயவிவரம் நிரப்பி, குரல் பதிவு செய்து, இரண்டு நிமிடங்களில் கடன் முடிவைப் பெறுங்கள்.",
    "ప్రొఫైల్ పూర్తి చేసి, వాయిస్ రికార్డ్ చేసి, రెండు నిమిషాల్లో రుణ నిర్ణయం పొందండి.",
    "ಪ್ರೊಫೈಲ್ ಪೂರ್ಣಗೊಳಿಸಿ, ಧ್ವನಿ ದಾಖಲಿಸಿ, ಎರಡು ನಿಮಿಷಗಳಲ್ಲಿ ಸಾಲ ನಿರ್ಧಾರ ಪಡೆಯಿರಿ.",
  ),
  processingTitle: localized(
    "Processing Your Application",
    "आपका आवेदन प्रोसेस हो रहा है",
    "உங்கள் விண்ணப்பம் செயலாக்கப்படுகிறது",
    "మీ అప్లికేషన్ ప్రాసెస్ అవుతోంది",
    "ನಿಮ್ಮ ಅರ್ಜಿ ಸಂಸ್ಕರಿಸಲಾಗುತ್ತಿದೆ",
  ),
  processingDetail: localized(
    "Analyzing voice psychometrics, social GNN trust graph, satellite crop health, and mobile behavior before generating your GramScore.",
    "GramScore बनाने से पहले वॉइस, सोशल GNN, सैटेलाइट फसल और मोबाइल व्यवहार का विश्लेषण किया जा रहा है।",
    "GramScore உருவாக்குவதற்கு முன் குரல், சமூக GNN, செயற்கைக்கோள் பயிர் மற்றும் மொபைல் நடத்தை பகுப்பாய்வு நடைபெறுகிறது.",
    "GramScore రూపొందించే ముందు వాయిస్, సోషల్ GNN, ఉపగ్రహ పంట, మొబైల్ ప్రవర్తన విశ్లేషణ జరుగుతోంది.",
    "GramScore ರಚಿಸುವ ಮೊದಲು ಧ್ವನಿ, ಸಾಮಾಜಿಕ GNN, ಉಪಗ್ರಹ ಬೆಳೆ ಮತ್ತು ಮೊಬೈಲ್ ವರ್ತನೆ ವಿಶ್ಲೇಷಿಸಲಾಗುತ್ತಿದೆ.",
  ),
  newApplication: localized("Start New Application", "नया आवेदन शुरू करें", "புதிய விண்ணப்பம் தொடங்கு", "కొత్త అప్లికేషన్ ప్రారంభించండి", "ಹೊಸ ಅರ್ಜಿ ಪ್ರಾರಂಭಿಸಿ"),
  appId: localized("Application ID", "आवेदन आईडी", "விண்ணப்ப ஐடி", "అప్లికేషన్ ఐడి", "ಅರ್ಜಿ ಐಡಿ"),
  checkStatus: localized("Check Application Status", "आवेदन स्थिति जांचें", "விண்ணப்ப நிலை பார்க்க", "అప్లికేషన్ స్థితి చూడండి", "ಅರ್ಜಿ ಸ್ಥಿತಿ ಪರಿಶೀಲಿಸಿ"),
  checkingStatus: localized("Checking status...", "स्थिति जांची जा रही है...", "நிலை சரிபார்க்கப்படுகிறது...", "స్థితి చెక్ అవుతోంది...", "ಸ್ಥಿತಿ ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ..."),
  currentStatus: localized("Current Status", "वर्तमान स्थिति", "தற்போதைய நிலை", "ప్రస్తుత స్థితి", "ಪ್ರಸ್ತುತ ಸ್ಥಿತಿ"),
  decision: localized("Decision", "निर्णय", "முடிவு", "నిర్ణయం", "ನಿರ್ಧಾರ"),
  reason: localized("Reason", "कारण", "காரணம்", "కారణం", "ಕಾರಣ"),
  missingProfile: localized(
    "Farmer profile is missing. Please start again.",
    "किसान प्रोफाइल नहीं मिला। कृपया फिर से शुरू करें।",
    "விவசாயி சுயவிவரம் இல்லை. மீண்டும் தொடங்குங்கள்.",
    "రైతు ప్రొఫైల్ లేదు. దయచేసి మళ్లీ ప్రారంభించండి.",
    "ರೈತರ ಪ್ರೊಫೈಲ್ ಕಾಣೆಯಾಗಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಾರಂಭಿಸಿ.",
  ),
  missingKyc: localized(
    "Consent and KYC details are missing. Please start again.",
    "सहमति और KYC विवरण नहीं मिले। कृपया फिर से शुरू करें।",
    "ஒப்புதல் மற்றும் KYC விவரங்கள் இல்லை. மீண்டும் தொடங்குங்கள்.",
    "సమ్మతి మరియు KYC వివరాలు లేవు. మళ్లీ ప్రారంభించండి.",
    "ಒಪ್ಪಿಗೆ ಮತ್ತು KYC ವಿವರಗಳು ಕಾಣೆಯಾಗಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಾರಂಭಿಸಿ.",
  ),
  statusFetchError: localized(
    "Unable to fetch application status",
    "आवेदन स्थिति प्राप्त नहीं हो सकी",
    "விண்ணப்ப நிலையை பெற முடியவில்லை",
    "అప్లికేషన్ స్థితి పొందలేకపోయాం",
    "ಅರ್ಜಿ ಸ್ಥಿತಿಯನ್ನು ಪಡೆಯಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ",
  ),
};

export const reasonCodeText: Record<string, LocalizedRecord> = {
  VOICE_HIGH_CONSCIENTIOUSNESS: localized(
    "Your voice interview shows strong discipline and planning behavior.",
    "आपके वॉइस इंटरव्यू में मजबूत अनुशासन और योजना दिखाई देती है।",
    "உங்கள் குரல் பேட்டி நல்ல ஒழுக்கத்தையும் திட்டமிடலையும் காட்டுகிறது.",
    "మీ వాయిస్ ఇంటర్వ్యూ క్రమశిక్షణ మరియు ప్రణాళికను చూపుతోంది.",
    "ನಿಮ್ಮ ಧ್ವನಿ ಸಂದರ್ಶನವು ಉತ್ತಮ ಶಿಸ್ತು ಮತ್ತು ಯೋಜನೆಯನ್ನು ತೋರಿಸುತ್ತದೆ.",
  ),
  VOICE_HIGH_AGREEABLENESS: localized(
    "Your responses suggest high trustworthiness and cooperative behavior.",
    "आपके उत्तर भरोसेमंद और सहयोगी व्यवहार दिखाते हैं।",
    "உங்கள் பதில்கள் நம்பகத்தன்மை மற்றும் ஒத்துழைப்பை காட்டுகின்றன.",
    "మీ సమాధానాలు విశ్వసనీయత మరియు సహకారాన్ని సూచిస్తున్నాయి.",
    "ನಿಮ್ಮ ಉತ್ತರಗಳು ವಿಶ್ವಾಸಾರ್ಹತೆ ಮತ್ತು ಸಹಕಾರವನ್ನು ಸೂಚಿಸುತ್ತವೆ.",
  ),
  SOCIAL_STRONG_NETWORK: localized(
    "Your village transaction graph shows strong community trust links.",
    "आपके गांव नेटवर्क में मजबूत सामुदायिक भरोसा दिखाई देता है।",
    "உங்கள் கிராம பரிவர்த்தனை வலையமைப்பில் நல்ல நம்பிக்கை இணைப்புகள் உள்ளன.",
    "మీ గ్రామ లావాదేవీ గ్రాఫ్‌లో బలమైన కమ్యూనిటీ విశ్వాసం ఉంది.",
    "ನಿಮ್ಮ ಗ್ರಾಮ ವ್ಯವಹಾರ ಗ್ರಾಫ್‌ನಲ್ಲಿ ಬಲವಾದ ಸಮುದಾಯ ನಂಬಿಕೆ ಕಂಡುಬಂದಿದೆ.",
  ),
  SOCIAL_MODERATE_NETWORK: localized(
    "Your social trust network is stable, with room for stronger peer connectivity.",
    "आपका सामाजिक भरोसा नेटवर्क स्थिर है, इसे और मजबूत किया जा सकता है।",
    "உங்கள் சமூக நம்பிக்கை வலையமைப்பு நிலையாக உள்ளது, மேலும் மேம்படுத்தலாம்.",
    "మీ సామాజిక విశ్వాస నెట్‌వర్క్ స్థిరంగా ఉంది, ఇంకా మెరుగుపరచవచ్చు.",
    "ನಿಮ್ಮ ಸಾಮಾಜಿಕ ನಂಬಿಕೆ ಜಾಲ ಸ್ಥಿರವಾಗಿದೆ, ಇನ್ನಷ್ಟು ಬಲಪಡಿಸಬಹುದು.",
  ),
  SOCIAL_FRAUD_INDICATORS: localized(
    "Your social graph has unusual patterns that need verification.",
    "आपके सामाजिक ग्राफ में असामान्य पैटर्न हैं जिनकी जांच जरूरी है।",
    "உங்கள் சமூக வரைபடத்தில் சரிபார்க்க வேண்டிய விதிவிலக்கான அமைப்புகள் உள்ளன.",
    "మీ సామాజిక గ్రాఫ్‌లో ధృవీకరించాల్సిన అసాధారణ నమూనాలు ఉన్నాయి.",
    "ನಿಮ್ಮ ಸಾಮಾಜಿಕ ಗ್ರಾಫ್‌ನಲ್ಲಿ ಪರಿಶೀಲನೆ ಅಗತ್ಯವಿರುವ ಅಸಾಮಾನ್ಯ ಮಾದರಿಗಳು ಕಂಡುಬಂದಿವೆ.",
  ),
  SATELLITE_HEALTHY_CROP: localized(
    "Satellite analysis indicates healthy crop growth in your field.",
    "सैटेलाइट विश्लेषण से आपकी फसल स्वस्थ दिखती है।",
    "செயற்கைக்கோள் பகுப்பாய்வு உங்கள் பயிர் ஆரோக்கியமாக இருப்பதை காட்டுகிறது.",
    "ఉపగ్రహ విశ్లేషణ మీ పంట ఆరోగ్యంగా ఉందని చూపిస్తోంది.",
    "ಉಪಗ್ರಹ ವಿಶ್ಲೇಷಣೆ ನಿಮ್ಮ ಬೆಳೆ ಉತ್ತಮವಾಗಿದೆ ಎಂದು ಸೂಚಿಸುತ್ತದೆ.",
  ),
  SATELLITE_STRESSED_CROP: localized(
    "Satellite data shows crop stress, which slightly increases repayment risk.",
    "सैटेलाइट डेटा में फसल तनाव दिखता है, जिससे जोखिम थोड़ा बढ़ता है।",
    "செயற்கைக்கோள் தரவு பயிர் அழுத்தத்தை காட்டுகிறது; இது அபாயத்தை உயர்த்துகிறது.",
    "ఉపగ్రహ డేటా పంట ఒత్తిడిని చూపుతోంది, ఇది ప్రమాదాన్ని కొద్దిగా పెంచుతుంది.",
    "ಉಪಗ್ರಹ ಡೇಟಾ ಬೆಳೆ ಒತ್ತಡ ತೋರಿಸುತ್ತದೆ, ಇದರಿಂದ ಅಪಾಯ ಸ್ವಲ್ಪ ಹೆಚ್ಚಾಗುತ್ತದೆ.",
  ),
  BEHAVIOR_HIGH_REGULARITY: localized(
    "Your UPI and recharge behavior is consistent across recent months.",
    "हाल के महीनों में आपका UPI और रिचार्ज व्यवहार नियमित है।",
    "சமீப மாதங்களில் உங்கள் UPI மற்றும் ரீசார்ஜ் நடத்தை ஒழுங்காக உள்ளது.",
    "ఇటీవలి నెలల్లో మీ UPI మరియు రీచార్జ్ ప్రవర్తన స్థిరంగా ఉంది.",
    "ಇತ್ತೀಚಿನ ತಿಂಗಳಲ್ಲಿ ನಿಮ್ಮ UPI ಮತ್ತು ರೀಚಾರ್ಜ್ ವರ್ತನೆ ನಿಯಮಿತವಾಗಿದೆ.",
  ),
  BEHAVIOR_LOW_REGULARITY: localized(
    "Your mobile payment behavior appears irregular and affects your score.",
    "मोबाइल भुगतान व्यवहार अनियमित है और स्कोर को प्रभावित करता है।",
    "மொபைல் செலுத்தும் பழக்கம் சீரற்றதாக உள்ளது; இது மதிப்பெண்ணை பாதிக்கிறது.",
    "మీ మొబైల్ చెల్లింపు ప్రవర్తన అసమానంగా ఉంది; ఇది స్కోరుపై ప్రభావం చూపుతుంది.",
    "ನಿಮ್ಮ ಮೊಬೈಲ್ ಪಾವತಿ ವರ್ತನೆ ಅನಿಯಮಿತವಾಗಿದೆ; ಇದು ಸ್ಕೋರ್‌ಗೆ ಪರಿಣಾಮ ಬೀರುತ್ತದೆ.",
  ),
};

export const consentText = {
  title: localized("Consent and KYC Verification", "सहमति और KYC सत्यापन", "ஒப்புதல் மற்றும் KYC சரிபார்ப்பு", "సమ్మతి మరియు KYC ధృవీకరణ", "ಒಪ್ಪಿಗೆ ಮತ್ತು KYC ಪರಿಶೀಲನೆ"),
  subtitle: localized(
    "We need your consent and one ID document for responsible underwriting.",
    "जिम्मेदार ऋण मूल्यांकन के लिए आपकी सहमति और एक आईडी दस्तावेज़ चाहिए।",
    "பொறுப்பான கடன் மதிப்பீட்டிற்கு உங்கள் ஒப்புதல் மற்றும் ஒரு அடையாள ஆவணம் தேவை.",
    "బాధ్యతాయుత రుణ అంచనాకు మీ సమ్మతి మరియు ఒక ఐడి పత్రం అవసరం.",
    "ಜವಾಬ್ದಾರಿಯುತ ಸಾಲ ಮೌಲ್ಯಮಾಪನಕ್ಕೆ ನಿಮ್ಮ ಒಪ್ಪಿಗೆ ಮತ್ತು ಒಂದು ಗುರುತಿನ ದಾಖಲೆ ಅಗತ್ಯ.",
  ),
  terms: localized(
    "I accept the terms of service and understand this application may require manual review.",
    "मैं सेवा शर्तें स्वीकार करता/करती हूं और समझता/समझती हूं कि आवेदन की मैनुअल समीक्षा हो सकती है।",
    "சேவை விதிமுறைகளை ஏற்கிறேன்; இந்த விண்ணப்பத்திற்கு கைமுறை மதிப்பாய்வு தேவைப்படலாம் என்பதை புரிந்துகொள்கிறேன்.",
    "నేను సేవా నిబంధనలు అంగీకరిస్తున్నాను, ఈ అప్లికేషన్‌కు మాన్యువల్ సమీక్ష అవసరం కావచ్చు అని అర్థం చేసుకున్నాను.",
    "ನಾನು ಸೇವಾ ನಿಯಮಗಳನ್ನು ಅಂಗೀಕರಿಸುತ್ತೇನೆ; ಈ ಅರ್ಜಿಗೆ ಕೈಯಾರೆ ಪರಿಶೀಲನೆ ಬೇಕಾಗಬಹುದು ಎಂದು ಅರ್ಥವಾಗಿದೆ.",
  ),
  dataConsent: localized(
    "I consent to audio, profile, and transaction data processing for credit assessment.",
    "मैं क्रेडिट आकलन के लिए ऑडियो, प्रोफाइल और लेनदेन डेटा प्रोसेसिंग की सहमति देता/देती हूं।",
    "கடன் மதிப்பீட்டிற்காக ஒலி, சுயவிவரம் மற்றும் பரிவர்த்தனை தரவை செயலாக்க ஒப்புக்கொள்கிறேன்.",
    "క్రెడిట్ అంచనాకు ఆడియో, ప్రొఫైల్, లావాదేవీ డేటా ప్రాసెసింగ్‌కు నేను సమ్మతిస్తున్నాను.",
    "ಕ್ರೆಡಿಟ್ ಮೌಲ್ಯಮಾಪನಕ್ಕಾಗಿ ಆಡಿಯೊ, ಪ್ರೊಫೈಲ್ ಮತ್ತು ವ್ಯವಹಾರ ಡೇಟಾ ಪ್ರಕ್ರಿಯೆಗೆ ನಾನು ಒಪ್ಪುತ್ತೇನೆ.",
  ),
  kycDocType: localized("KYC Document Type", "KYC दस्तावेज़ प्रकार", "KYC ஆவண வகை", "KYC పత్రం రకం", "KYC ದಾಖಲೆ ಪ್ರಕಾರ"),
  kycNumber: localized("KYC ID Number", "KYC आईडी नंबर", "KYC ஐடி எண்", "KYC ఐడి నంబర్", "KYC ಐಡಿ ಸಂಖ್ಯೆ"),
  kycPlaceholder: localized("Enter document number", "दस्तावेज़ संख्या दर्ज करें", "ஆவண எண்ணை உள்ளிடவும்", "పత్రం నంబర్ నమోదు చేయండి", "ದಾಖಲೆ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ"),
  continueProfile: localized("Continue to Farmer Profile", "किसान प्रोफाइल पर जाएं", "விவசாயி சுயவிவரத்துக்கு செல்லவும்", "రైతు ప్రొఫైల్‌కు కొనసాగండి", "ರೈತರ ಪ್ರೊಫೈಲ್‌ಗೆ ಮುಂದುವರಿಸಿ"),
  errTerms: localized("You must accept terms to continue", "जारी रखने के लिए शर्तें स्वीकार करें", "தொடர நிபந்தனைகளை ஏற்க வேண்டும்", "కొనసాగడానికి నిబంధనలు అంగీకరించాలి", "ಮುಂದುವರಿಸಲು ನಿಯಮಗಳನ್ನು ಒಪ್ಪಿಕೊಳ್ಳಬೇಕು"),
  errData: localized("You must consent to data processing", "डेटा प्रोसेसिंग की सहमति आवश्यक है", "தரவு செயலாக்கத்திற்கு ஒப்புதல் அவசியம்", "డేటా ప్రాసెసింగ్‌కు సమ్మతి అవసరం", "ಡೇಟಾ ಪ್ರಕ್ರಿಯೆಗೆ ಒಪ್ಪಿಗೆ ಅಗತ್ಯ"),
  errKyc: localized("KYC ID number must be at least 4 characters", "KYC आईडी कम से कम 4 अक्षर होनी चाहिए", "KYC ஐடி எண் குறைந்தது 4 எழுத்துகள் இருக்க வேண்டும்", "KYC ఐడి కనీసం 4 అక్షరాలు ఉండాలి", "KYC ಐಡಿ ಕನಿಷ್ಠ 4 ಅಕ್ಷರಗಳಿರಬೇಕು"),
};

export const voiceText = {
  title: localized("Voice Interview", "वॉइस इंटरव्यू", "குரல் நேர்காணல்", "వాయిస్ ఇంటర్వ్యూ", "ಧ್ವನಿ ಸಂದರ್ಶನ"),
  subtitle: localized(
    "Record your voice response to the interview questions. This helps us understand your creditworthiness better.",
    "इंटरव्यू सवालों के लिए अपनी आवाज रिकॉर्ड करें। इससे आपकी क्रेडिट योग्यता बेहतर समझी जाती है।",
    "நேர்காணல் கேள்விகளுக்கான உங்கள் குரல் பதிலை பதிவு செய்யவும். இது உங்கள் கடன் திறனை நன்கு புரிந்து கொள்ள உதவும்.",
    "ఇంటర్వ్యూ ప్రశ్నలకు మీ వాయిస్ సమాధానం రికార్డ్ చేయండి. ఇది మీ క్రెడిట్ సామర్థ్యాన్ని అర్థం చేసుకోవడంలో సహాయపడుతుంది.",
    "ಸಂದರ್ಶನ ಪ್ರಶ್ನೆಗಳಿಗೆ ನಿಮ್ಮ ಧ್ವನಿ ಉತ್ತರವನ್ನು ದಾಖಲಿಸಿ. ಇದು ನಿಮ್ಮ ಸಾಲಪಾತ್ರತೆಯನ್ನು ಚೆನ್ನಾಗಿ ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲು ಸಹಾಯ ಮಾಡುತ್ತದೆ.",
  ),
  start: localized("Start Recording", "रिकॉर्डिंग शुरू करें", "பதிவு தொடங்கு", "రికార్డింగ్ ప్రారంభించండి", "ದಾಖಲೆ ಪ್ರಾರಂಭಿಸಿ"),
  stop: localized("Stop Recording", "रिकॉर्डिंग रोकें", "பதிவு நிறுத்து", "రికార్డింగ్ ఆపు", "ದಾಖಲೆ ನಿಲ್ಲಿಸಿ"),
  captured: localized("Recording captured", "रिकॉर्डिंग तैयार", "பதிவு பிடிக்கப்பட்டது", "రికార్డింగ్ సిద్ధం", "ದಾಖಲೆ ಸಿದ್ಧವಾಗಿದೆ"),
  duration: localized("Duration", "अवधि", "நேரம்", "వ్యవధి", "ಅವಧಿ"),
  size: localized("Size", "आकार", "அளவு", "పరిమాణం", "ಗಾತ್ರ"),
  processing: localized("Processing...", "प्रोसेस हो रहा है...", "செயலாக்கப்படுகிறது...", "ప్రాసెస్ అవుతోంది...", "ಸಂಸ್ಕರಿಸಲಾಗುತ್ತಿದೆ..."),
  useRecording: localized("Use This Recording", "इस रिकॉर्डिंग का उपयोग करें", "இந்த பதிவைப் பயன்படுத்தவும்", "ఈ రికార్డింగ్ ఉపయోగించండి", "ಈ ದಾಖಲಿಕೆಯನ್ನು ಬಳಸಿ"),
  rerecord: localized("Re-record", "फिर से रिकॉर्ड करें", "மீண்டும் பதிவு", "మళ్లీ రికార్డ్ చేయండి", "ಮತ್ತೆ ದಾಖಲೆ ಮಾಡಿ"),
  micError: localized("Failed to access microphone. Please check permissions.", "माइक्रोफोन एक्सेस नहीं मिला। अनुमति जांचें।", "மைக்ரோஃபோன் அணுக முடியவில்லை. அனுமதி சரிபார்க்கவும்.", "మైక్రోఫోన్ యాక్సెస్ విఫలమైంది. అనుమతులు చూడండి.", "ಮೈಕ್ರೋಫೋನ್ ಪ್ರವೇಶ ವಿಫಲವಾಗಿದೆ. ಅನುಮತಿಗಳನ್ನು ಪರಿಶೀಲಿಸಿ."),
  minDuration: localized(
    "Please record for at least {seconds} seconds for reliable analysis.",
    "विश्वसनीय विश्लेषण के लिए कम से कम {seconds} सेकंड रिकॉर्ड करें।",
    "நம்பத்தகுந்த பகுப்பாய்விற்கு குறைந்தது {seconds} விநாடிகள் பதிவு செய்யவும்.",
    "నమ్మదగిన విశ్లేషణ కోసం కనీసం {seconds} సెకన్లు రికార్డ్ చేయండి.",
    "ನಂಬಿಕೆಗೂಡಿದ ವಿಶ್ಲೇಷಣೆಗೆ ಕನಿಷ್ಠ {seconds} ಸೆಕೆಂಡುಗಳು ದಾಖಲಿಸಿ.",
  ),
};

export function formatWithValues(
  template: string,
  values: Record<string, string | number>,
) {
  let output = template;
  for (const [key, value] of Object.entries(values)) {
    output = output.replaceAll(`{${key}}`, String(value));
  }
  return output;
}

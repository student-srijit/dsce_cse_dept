"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field";
import {
  useLanguage,
  type SupportedLanguage,
} from "@/components/language/language-provider";

interface FarmerProfile {
  name: string;
  age: number;
  gender: "male" | "female" | "other";
  mobileNumber: string;
  state: string;
  village: string;
  cropType: string;
  landSizeHectares: number;
  yearsFarming: number;
  annualIncome: number;
  hasIrrigation: boolean;
  hasStorage: boolean;
  pastLoanCount: number;
  landOwnershipType: "owned" | "leased" | "shared";
  requestedLoanAmount: number;
  loanPurpose: "medical" | "education" | "farming" | "emergency";
  location: {
    lat: number;
    lon: number;
  };
  preferredLanguage: "en" | "hi" | "ta" | "te" | "kn";
}

interface FarmerProfileFormProps {
  onSubmit: (profile: FarmerProfile) => void;
  isLoading?: boolean;
}

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

const CROP_TYPES = [
  "wheat",
  "rice",
  "cotton",
  "maize",
  "sugarcane",
  "pulses",
  "oilseeds",
  "vegetables",
  "fruits",
  "spices",
];

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी (Hindi)" },
  { code: "ta", label: "தமிழ் (Tamil)" },
  { code: "te", label: "తెలుగు (Telugu)" },
  { code: "kn", label: "ಕನ್ನಡ (Kannada)" },
];

const LOAN_PURPOSE_OPTIONS = [
  "medical",
  "education",
  "farming",
  "emergency",
] as const;

export function FarmerProfileForm({ onSubmit, isLoading = false }: FarmerProfileFormProps) {
  const { language, setLanguage } = useLanguage();
  const [formData, setFormData] = useState<FarmerProfile>({
    name: "",
    age: 35,
    gender: "male",
    mobileNumber: "",
    state: "Maharashtra",
    village: "",
    cropType: "wheat",
    landSizeHectares: 1.5,
    yearsFarming: 8,
    annualIncome: 180000,
    hasIrrigation: true,
    hasStorage: false,
    pastLoanCount: 0,
    landOwnershipType: "owned",
    requestedLoanAmount: 20000,
    loanPurpose: "farming",
    location: {
      lat: 20.5937,
      lon: 78.9629,
    },
    preferredLanguage: language,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const translate = (
    en: string,
    hi: string,
    ta: string,
    te: string,
    kn: string,
  ) => {
    const mapping: Record<SupportedLanguage, string> = { en, hi, ta, te, kn };
    return mapping[language] || en;
  };

  useEffect(() => {
    setFormData((prev) => ({ ...prev, preferredLanguage: language }));
  }, [language]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = translate("Name is required", "नाम आवश्यक है", "பெயர் அவசியம்", "పేరు అవసరం", "ಹೆಸರು ಅಗತ್ಯ");
    }
    if (!formData.mobileNumber.trim()) {
      newErrors.mobileNumber = translate("Mobile number is required", "मोबाइल नंबर आवश्यक है", "மொபைல் எண் அவசியம்", "మొబైల్ నంబర్ అవసరం", "ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ಅಗತ್ಯ");
    } else if (!/^\d{10}$/.test(formData.mobileNumber.trim())) {
      newErrors.mobileNumber = translate("Mobile number must be 10 digits", "मोबाइल नंबर 10 अंकों का होना चाहिए", "மொபைல் எண் 10 இலக்கங்கள் இருக்க வேண்டும்", "మొబైల్ నంబర్ 10 అంకెలు ఉండాలి", "ಮೊಬೈಲ್ ಸಂಖ್ಯೆ 10 ಅಂಕಿಗಳಿರಬೇಕು");
    }
    if (!formData.village.trim()) {
      newErrors.village = translate("Village is required", "गांव का नाम आवश्यक है", "கிராமம் அவசியம்", "గ్రామం అవసరం", "ಗ್ರಾಮದ ಹೆಸರು ಅಗತ್ಯ");
    }
    if (formData.age < 18 || formData.age > 100) {
      newErrors.age = translate("Age must be between 18 and 100", "आयु 18 से 100 के बीच होनी चाहिए", "வயது 18 முதல் 100 வரை இருக்க வேண்டும்", "వయసు 18 నుండి 100 మధ్య ఉండాలి", "ವಯಸ್ಸು 18 ರಿಂದ 100ರ ನಡುವೆ ಇರಬೇಕು");
    }
    if (formData.landSizeHectares <= 0 || formData.landSizeHectares > 100) {
      newErrors.landSize = translate("Land size must be between 0.1 and 100 hectares", "भूमि आकार 0.1 से 100 हेक्टेयर होना चाहिए", "நில அளவு 0.1 முதல் 100 ஹெக்டேர் வரை இருக்க வேண்டும்", "భూమి పరిమాణం 0.1 నుండి 100 హెక్టార్లు ఉండాలి", "ಭೂಮಿ ಗಾತ್ರ 0.1 ರಿಂದ 100 ಹೆಕ್ಟೇರ್ ಇರಬೇಕು");
    }
    if (formData.yearsFarming < 0 || formData.yearsFarming > 80) {
      newErrors.yearsFarming = translate("Years farming must be between 0 and 80", "खेती के वर्ष 0 से 80 के बीच होने चाहिए", "விவசாய ஆண்டுகள் 0 முதல் 80 வரை இருக்க வேண்டும்", "వ్యవసాయ సంవత్సరాలు 0 నుండి 80 మధ్య ఉండాలి", "ಕೃಷಿ ಅನುಭವ 0 ರಿಂದ 80 ವರ್ಷದ ನಡುವೆ ಇರಬೇಕು");
    }
    if (formData.annualIncome <= 0) {
      newErrors.annualIncome = translate("Annual income must be greater than 0", "वार्षिक आय 0 से अधिक होनी चाहिए", "வருமானம் 0-ஐ விட அதிகமாக இருக்க வேண்டும்", "వార్షిక ఆదాయం 0 కంటే ఎక్కువ ఉండాలి", "ವಾರ್ಷಿಕ ಆದಾಯ 0 ಕ್ಕಿಂತ ಹೆಚ್ಚು ಇರಬೇಕು");
    }
    if (formData.requestedLoanAmount < 5000 || formData.requestedLoanAmount > 50000) {
      newErrors.requestedLoanAmount = translate("Requested amount must be between INR 5,000 and 50,000", "मांगी गई राशि 5,000 से 50,000 के बीच होनी चाहिए", "கோரிய தொகை INR 5,000 முதல் 50,000 வரை இருக்க வேண்டும்", "అభ్యర్థించిన మొత్తం INR 5,000 నుండి 50,000 మధ్య ఉండాలి", "ಅಭ್ಯರ್ಥಿಸಿದ ಮೊತ್ತ INR 5,000 ರಿಂದ 50,000 ನಡುವೆ ಇರಬೇಕು");
    }
    if (!LOAN_PURPOSE_OPTIONS.includes(formData.loanPurpose)) {
      newErrors.loanPurpose = translate("Loan purpose must be one of medical, education, farming, or emergency", "ऋण उद्देश्य medical, education, farming या emergency में से एक होना चाहिए", "கடன் நோக்கம் medical, education, farming அல்லது emergency ஆக இருக்க வேண்டும்", "రుణ ప్రయోజనం medical, education, farming లేదా emergency లో ఒకటి కావాలి", "ಸಾಲ ಉದ್ದೇಶ medical, education, farming ಅಥವಾ emergency ಆಗಿರಬೇಕು");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{translate("Farmer Profile", "किसान प्रोफाइल", "விவசாயி சுயவிவரம்", "రైతు ప్రొఫైల్", "ರೈತರ ಪ್ರೊಫೈಲ್")}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {translate("Please provide your details to complete the loan application.", "ऋण आवेदन पूरा करने के लिए अपने विवरण भरें।", "கடன் விண்ணப்பத்தை முடிக்க உங்கள் விவரங்களை வழங்கவும்.", "రుణ అప్లికేషన్ పూర్తి చేయడానికి మీ వివరాలు ఇవ్వండి.", "ಸಾಲ ಅರ್ಜಿಯನ್ನು ಪೂರ್ಣಗೊಳಿಸಲು ನಿಮ್ಮ ವಿವರಗಳನ್ನು ನೀಡಿ.")}
          </p>
        </div>

        <FieldGroup>
          <Field>
            <FieldLabel>{translate("Full Name", "पूरा नाम", "முழு பெயர்", "పూర్తి పేరు", "ಪೂರ್ಣ ಹೆಸರು")}</FieldLabel>
            <Input
              type="text"
              placeholder={translate("Your full name", "आपका पूरा नाम", "உங்கள் முழு பெயர்", "మీ పూర్తి పేరు", "ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರು")}
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name}</p>
            )}
          </Field>

          <Field>
            <FieldLabel>{translate("Age", "आयु", "வயது", "వయసు", "ವಯಸ್ಸು")}</FieldLabel>
            <Input
              type="number"
              placeholder={translate("Your age", "आपकी आयु", "உங்கள் வயது", "మీ వయసు", "ನಿಮ್ಮ ವಯಸ್ಸು")}
              value={formData.age}
              onChange={(e) =>
                setFormData({ ...formData, age: parseInt(e.target.value) || 0 })
              }
              disabled={isLoading}
              min="18"
              max="100"
            />
            {errors.age && (
              <p className="text-sm text-red-600 mt-1">{errors.age}</p>
            )}
          </Field>
        </FieldGroup>

        <FieldGroup>
          <Field>
            <FieldLabel>{translate("Gender", "लिंग", "பாலினம்", "లింగం", "ಲಿಂಗ")}</FieldLabel>
            <Select
              value={formData.gender}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  gender: value as "male" | "female" | "other",
                })
              }
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">{translate("Male", "पुरुष", "ஆண்", "పురుషుడు", "ಪುರುಷ")}</SelectItem>
                <SelectItem value="female">{translate("Female", "महिला", "பெண்", "మహిళ", "ಮಹಿಳೆ")}</SelectItem>
                <SelectItem value="other">{translate("Other", "अन्य", "மற்றவை", "ఇతర", "ಇತರೆ")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel>{translate("Mobile Number", "मोबाइल नंबर", "மொபைல் எண்", "మొబైల్ నంబర్", "ಮೊಬೈಲ್ ಸಂಖ್ಯೆ")}</FieldLabel>
            <Input
              type="tel"
              placeholder={translate("10-digit mobile number", "10 अंकों का मोबाइल नंबर", "10 இலக்க மொபைல் எண்", "10 అంకెల మొబైల్ నంబర్", "10 ಅಂಕಿಯ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ")}
              value={formData.mobileNumber}
              onChange={(e) =>
                setFormData({ ...formData, mobileNumber: e.target.value })
              }
              disabled={isLoading}
              maxLength={10}
            />
            {errors.mobileNumber && (
              <p className="text-sm text-red-600 mt-1">{errors.mobileNumber}</p>
            )}
          </Field>
        </FieldGroup>

        <FieldGroup>
          <Field>
            <FieldLabel>{translate("State", "राज्य", "மாநிலம்", "రాష్ట్రం", "ರಾಜ್ಯ")}</FieldLabel>
            <Select
              value={formData.state}
              onValueChange={(value) =>
                setFormData({ ...formData, state: value })
              }
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INDIAN_STATES.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel>{translate("Village", "गांव", "கிராமம்", "గ్రామం", "ಗ್ರಾಮ")}</FieldLabel>
            <Input
              type="text"
              placeholder={translate("Village name", "गांव का नाम", "கிராம பெயர்", "గ్రామం పేరు", "ಗ್ರಾಮದ ಹೆಸರು")}
              value={formData.village}
              onChange={(e) =>
                setFormData({ ...formData, village: e.target.value })
              }
              disabled={isLoading}
            />
            {errors.village && (
              <p className="text-sm text-red-600 mt-1">{errors.village}</p>
            )}
          </Field>

          <Field>
            <FieldLabel>{translate("Preferred Language", "पसंदीदा भाषा", "விரும்பிய மொழி", "ఇష్టమైన భాష", "ಆದ್ಯತೆಯ ಭಾಷೆ")}</FieldLabel>
            <Select
              value={formData.preferredLanguage}
              onValueChange={(value) =>
                (() => {
                  const nextLanguage = value as "en" | "hi" | "ta" | "te" | "kn";
                  setFormData({ ...formData, preferredLanguage: nextLanguage });
                  setLanguage(nextLanguage);
                })()
              }
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>

        <FieldGroup>
          <Field>
            <FieldLabel>{translate("Primary Crop Type", "मुख्य फसल प्रकार", "முக்கிய பயிர் வகை", "ప్రధాన పంట రకం", "ಪ್ರಮುಖ ಬೆಳೆ ಪ್ರಕಾರ")}</FieldLabel>
            <Select
              value={formData.cropType}
              onValueChange={(value) =>
                setFormData({ ...formData, cropType: value })
              }
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CROP_TYPES.map((crop) => (
                  <SelectItem key={crop} value={crop}>
                    {crop.charAt(0).toUpperCase() + crop.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel>{translate("Land Size (Hectares)", "भूमि आकार (हेक्टेयर)", "நில அளவு (ஹெக்டேர்)", "భూమి పరిమాణం (హెక్టార్లు)", "ಭೂಮಿ ಗಾತ್ರ (ಹೆಕ್ಟೇರ್)")}</FieldLabel>
            <Input
              type="number"
              placeholder={translate("Land size in hectares", "हेक्टेयर में भूमि आकार", "ஹெக்டேரில் நில அளவு", "హెక్టార్లలో భూమి పరిమాణం", "ಹೆಕ್ಟೇರ್‌ನಲ್ಲಿ ಭೂಮಿ ಗಾತ್ರ")}
              value={formData.landSizeHectares}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  landSizeHectares: parseFloat(e.target.value) || 0,
                })
              }
              disabled={isLoading}
              step="0.1"
              min="0.1"
              max="100"
            />
            {errors.landSize && (
              <p className="text-sm text-red-600 mt-1">{errors.landSize}</p>
            )}
          </Field>
        </FieldGroup>

        <FieldGroup>
          <Field>
            <FieldLabel>{translate("Years of Farming Experience", "खेती का अनुभव (वर्ष)", "விவசாய அனுபவ ஆண்டுகள்", "వ్యవసాయ అనుభవ సంవత్సరాలు", "ಕೃಷಿ ಅನುಭವ (ವರ್ಷಗಳು)")}</FieldLabel>
            <Input
              type="number"
              value={formData.yearsFarming}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  yearsFarming: parseInt(e.target.value, 10) || 0,
                })
              }
              disabled={isLoading}
              min="0"
              max="80"
            />
            {errors.yearsFarming && (
              <p className="text-sm text-red-600 mt-1">{errors.yearsFarming}</p>
            )}
          </Field>

          <Field>
            <FieldLabel>{translate("Annual Income (INR)", "वार्षिक आय (INR)", "வருடாந்திர வருமானம் (INR)", "వార్షిక ఆదాయం (INR)", "ವಾರ್ಷಿಕ ಆದಾಯ (INR)")}</FieldLabel>
            <Input
              type="number"
              value={formData.annualIncome}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  annualIncome: parseFloat(e.target.value) || 0,
                })
              }
              disabled={isLoading}
              min="0"
            />
            {errors.annualIncome && (
              <p className="text-sm text-red-600 mt-1">{errors.annualIncome}</p>
            )}
          </Field>
        </FieldGroup>

        <FieldGroup>
          <Field>
            <FieldLabel>{translate("Land Ownership Type", "भूमि स्वामित्व प्रकार", "நில உரிமை வகை", "భూమి యాజమాన్య రకం", "ಭೂಮಿ ಮಾಲೀಕತ್ವ ಪ್ರಕಾರ")}</FieldLabel>
            <Select
              value={formData.landOwnershipType}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  landOwnershipType: value as "owned" | "leased" | "shared",
                })
              }
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owned">{translate("Owned", "स्वामित्व", "சொந்தம்", "సొంతం", "ಸ್ವಂತ")}</SelectItem>
                <SelectItem value="leased">{translate("Leased", "पट्टे पर", "வாடகை", "లీజ్", "ಭಾಡಿಗೆ")}</SelectItem>
                <SelectItem value="shared">{translate("Shared", "साझा", "பகிர்வு", "పంచుకున్న", "ಹಂಚಿಕೆ")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel>{translate("Past Formal Loan Count", "पिछले औपचारिक ऋण", "முந்தைய அதிகாரப்பூர்வ கடன் எண்ணிக்கை", "మునుపటి అధికారిక రుణాల సంఖ్య", "ಹಿಂದಿನ ಅಧಿಕೃತ ಸಾಲಗಳ ಸಂಖ್ಯೆ")}</FieldLabel>
            <Input
              type="number"
              value={formData.pastLoanCount}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  pastLoanCount: Math.max(0, parseInt(e.target.value, 10) || 0),
                })
              }
              disabled={isLoading}
              min="0"
            />
          </Field>
        </FieldGroup>

        <FieldGroup>
          <Field>
            <FieldLabel>{translate("Irrigation Access", "सिंचाई सुविधा", "நீர்ப்பாசன அணுகல்", "పారుదల సౌకర్యం", "ನೀರಾವರಿ ಸೌಲಭ್ಯ")}</FieldLabel>
            <Select
              value={formData.hasIrrigation ? "yes" : "no"}
              onValueChange={(value) =>
                setFormData({ ...formData, hasIrrigation: value === "yes" })
              }
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">{translate("Yes", "हाँ", "ஆம்", "అవును", "ಹೌದು")}</SelectItem>
                <SelectItem value="no">{translate("No", "नहीं", "இல்லை", "లేదు", "ಇಲ್ಲ")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel>{translate("Storage Availability", "भंडारण उपलब्धता", "சேமிப்பு கிடைப்பது", "నిల్వ అందుబాటు", "ಸಂಗ್ರಹಣ ಲಭ್ಯತೆ")}</FieldLabel>
            <Select
              value={formData.hasStorage ? "yes" : "no"}
              onValueChange={(value) =>
                setFormData({ ...formData, hasStorage: value === "yes" })
              }
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">{translate("Yes", "हाँ", "ஆம்", "అవును", "ಹೌದು")}</SelectItem>
                <SelectItem value="no">{translate("No", "नहीं", "இல்லை", "లేదు", "ಇಲ್ಲ")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>

        <FieldGroup>
          <Field>
            <FieldLabel>{translate("Loan Purpose", "ऋण का उद्देश्य", "கடன் நோக்கம்", "రుణ ప్రయోజనం", "ಸಾಲ ಉದ್ದೇಶ")}</FieldLabel>
            <Select
              value={formData.loanPurpose}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  loanPurpose: value as FarmerProfile["loanPurpose"],
                })
              }
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="medical">{translate("Medical", "चिकित्सा", "மருத்துவம்", "మెడికల్", "ವೈದ್ಯಕೀಯ")}</SelectItem>
                <SelectItem value="education">{translate("Education", "शिक्षा", "கல்வி", "విద్య", "ಶಿಕ್ಷಣ")}</SelectItem>
                <SelectItem value="farming">{translate("Farming", "खेती", "விவசாயம்", "వ్యవసాయం", "ಕೃಷಿ")}</SelectItem>
                <SelectItem value="emergency">{translate("Emergency", "आपातकाल", "அவசரம்", "అత్యవసరం", "ತುರ್ತು")}</SelectItem>
              </SelectContent>
            </Select>
            {errors.loanPurpose && (
              <p className="text-sm text-red-600 mt-1">{errors.loanPurpose}</p>
            )}
          </Field>

          <Field>
            <FieldLabel>{translate("Requested Loan Amount (INR 5,000 - 50,000)", "मांगी गई ऋण राशि (INR 5,000 - 50,000)", "கோரிய கடன் தொகை (INR 5,000 - 50,000)", "అభ్యర్థించిన రుణ మొత్తం (INR 5,000 - 50,000)", "ಅಭ್ಯರ್ಥಿಸಿದ ಸಾಲ ಮೊತ್ತ (INR 5,000 - 50,000)")}</FieldLabel>
            <div className="space-y-3">
              <Slider
                value={[formData.requestedLoanAmount]}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    requestedLoanAmount: value[0] ?? formData.requestedLoanAmount,
                  })
                }
                min={5000}
                max={50000}
                step={1000}
                disabled={isLoading}
              />
              <p className="text-sm font-medium text-foreground">
                INR {formData.requestedLoanAmount.toLocaleString("en-IN")}
              </p>
            </div>
            {errors.requestedLoanAmount && (
              <p className="text-sm text-red-600 mt-1">
                {errors.requestedLoanAmount}
              </p>
            )}
          </Field>
        </FieldGroup>

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading
            ? translate("Processing...", "प्रोसेस हो रहा है...", "செயலாக்கப்படுகிறது...", "ప్రాసెస్ అవుతోంది...", "ಸಂಸ್ಕರಿಸಲಾಗುತ್ತಿದೆ...")
            : translate("Next: Voice Interview", "अगला: वॉइस इंटरव्यू", "அடுத்து: குரல் நேர்காணல்", "తదుపరి: వాయిస్ ఇంటర్వ్యూ", "ಮುಂದೆ: ಧ್ವನಿ ಸಂದರ್ಶನ")}
        </Button>
      </form>
    </Card>
  );
}

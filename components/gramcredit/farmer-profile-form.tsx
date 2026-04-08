"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field";

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
  loanPurpose: string;
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

export function FarmerProfileForm({ onSubmit, isLoading = false }: FarmerProfileFormProps) {
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
    requestedLoanAmount: 50000,
    loanPurpose: "Seasonal crop working capital",
    location: {
      lat: 20.5937,
      lon: 78.9629,
    },
    preferredLanguage: "en",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }
    if (!formData.mobileNumber.trim()) {
      newErrors.mobileNumber = "Mobile number is required";
    } else if (!/^\d{10}$/.test(formData.mobileNumber.trim())) {
      newErrors.mobileNumber = "Mobile number must be 10 digits";
    }
    if (!formData.village.trim()) {
      newErrors.village = "Village is required";
    }
    if (formData.age < 18 || formData.age > 100) {
      newErrors.age = "Age must be between 18 and 100";
    }
    if (formData.landSizeHectares <= 0 || formData.landSizeHectares > 100) {
      newErrors.landSize = "Land size must be between 0.1 and 100 hectares";
    }
    if (formData.yearsFarming < 0 || formData.yearsFarming > 80) {
      newErrors.yearsFarming = "Years farming must be between 0 and 80";
    }
    if (formData.annualIncome <= 0) {
      newErrors.annualIncome = "Annual income must be greater than 0";
    }
    if (formData.requestedLoanAmount <= 0) {
      newErrors.requestedLoanAmount = "Requested amount must be greater than 0";
    }
    if (!formData.loanPurpose.trim()) {
      newErrors.loanPurpose = "Loan purpose is required";
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
          <h3 className="text-lg font-semibold text-foreground">Farmer Profile</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Please provide your details to complete the loan application.
          </p>
        </div>

        <FieldGroup>
          <Field>
            <FieldLabel>Full Name</FieldLabel>
            <Input
              type="text"
              placeholder="Your full name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={isLoading}
            />
            {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
          </Field>

          <Field>
            <FieldLabel>Age</FieldLabel>
            <Input
              type="number"
              placeholder="Your age"
              value={formData.age}
              onChange={(e) =>
                setFormData({ ...formData, age: parseInt(e.target.value) || 0 })
              }
              disabled={isLoading}
              min="18"
              max="100"
            />
            {errors.age && <p className="text-sm text-red-600 mt-1">{errors.age}</p>}
          </Field>
        </FieldGroup>

        <FieldGroup>
          <Field>
            <FieldLabel>Gender</FieldLabel>
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
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel>Mobile Number</FieldLabel>
            <Input
              type="tel"
              placeholder="10-digit mobile number"
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
            <FieldLabel>State</FieldLabel>
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
            <FieldLabel>Village</FieldLabel>
            <Input
              type="text"
              placeholder="Village name"
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
            <FieldLabel>Preferred Language</FieldLabel>
            <Select
              value={formData.preferredLanguage}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  preferredLanguage: value as "en" | "hi" | "ta" | "te" | "kn",
                })
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
            <FieldLabel>Primary Crop Type</FieldLabel>
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
            <FieldLabel>Land Size (Hectares)</FieldLabel>
            <Input
              type="number"
              placeholder="Land size in hectares"
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
            <FieldLabel>Years of Farming Experience</FieldLabel>
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
            <FieldLabel>Annual Income (INR)</FieldLabel>
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
            <FieldLabel>Land Ownership Type</FieldLabel>
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
                <SelectItem value="owned">Owned</SelectItem>
                <SelectItem value="leased">Leased</SelectItem>
                <SelectItem value="shared">Shared</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel>Past Formal Loan Count</FieldLabel>
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
            <FieldLabel>Irrigation Access</FieldLabel>
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
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel>Storage Availability</FieldLabel>
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
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>

        <FieldGroup>
          <Field>
            <FieldLabel>Requested Loan Amount (INR)</FieldLabel>
            <Input
              type="number"
              value={formData.requestedLoanAmount}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  requestedLoanAmount: parseFloat(e.target.value) || 0,
                })
              }
              disabled={isLoading}
              min="1000"
            />
            {errors.requestedLoanAmount && (
              <p className="text-sm text-red-600 mt-1">{errors.requestedLoanAmount}</p>
            )}
          </Field>

          <Field>
            <FieldLabel>Loan Purpose</FieldLabel>
            <Input
              type="text"
              value={formData.loanPurpose}
              onChange={(e) =>
                setFormData({ ...formData, loanPurpose: e.target.value })
              }
              disabled={isLoading}
            />
            {errors.loanPurpose && (
              <p className="text-sm text-red-600 mt-1">{errors.loanPurpose}</p>
            )}
          </Field>
        </FieldGroup>

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? "Processing..." : "Next: Voice Interview"}
        </Button>
      </form>
    </Card>
  );
}

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
  state: string;
  cropType: string;
  landSizeHectares: number;
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
    state: "Maharashtra",
    cropType: "wheat",
    landSizeHectares: 1.5,
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
    if (formData.age < 18 || formData.age > 100) {
      newErrors.age = "Age must be between 18 and 100";
    }
    if (formData.landSizeHectares <= 0 || formData.landSizeHectares > 100) {
      newErrors.landSize = "Land size must be between 0.1 and 100 hectares";
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

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? "Processing..." : "Next: Voice Interview"}
        </Button>
      </form>
    </Card>
  );
}

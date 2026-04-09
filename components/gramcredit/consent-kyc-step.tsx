"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field";
import { useLanguage } from "@/components/language/language-provider";
import { consentText, pickText } from "@/lib/gramcredit/ui-i18n";

export interface ConsentKycData {
  consent: {
    termsAccepted: boolean;
    dataProcessingAccepted: boolean;
    policyVersion: string;
    acceptedAt: number;
  };
  kyc: {
    idType: "aadhaar" | "pan" | "voter_id" | "driving_license";
    idNumber: string;
    verified: boolean;
    verificationMethod: "manual" | "pan_ocr";
    ocrConfidence?: number;
  };
}

interface ConsentKycStepProps {
  onSubmit: (data: ConsentKycData) => void;
  isLoading?: boolean;
}

export function ConsentKycStep({
  onSubmit,
  isLoading = false,
}: ConsentKycStepProps) {
  const { language } = useLanguage();
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [dataProcessingAccepted, setDataProcessingAccepted] = useState(false);
  const [kycIdType, setKycIdType] = useState<
    "aadhaar" | "pan" | "voter_id" | "driving_license"
  >("aadhaar");
  const [kycIdNumber, setKycIdNumber] = useState("");
  const [panImageBase64, setPanImageBase64] = useState<string | null>(null);
  const [panVerified, setPanVerified] = useState(false);
  const [ocrConfidence, setOcrConfidence] = useState<number | undefined>(
    undefined,
  );
  const [panVerificationMessage, setPanVerificationMessage] = useState("");
  const [isPanVerificationLoading, setIsPanVerificationLoading] =
    useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const onKycTypeChange = (
    value: "aadhaar" | "pan" | "voter_id" | "driving_license",
  ) => {
    setKycIdType(value);
    setPanVerified(false);
    setOcrConfidence(undefined);
    setPanVerificationMessage("");
    if (value !== "pan") {
      setPanImageBase64(null);
    }
  };

  const handlePanFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        setPanVerificationMessage("Unable to read PAN image. Please retry.");
        return;
      }

      setPanImageBase64(result);
      setPanVerified(false);
      setOcrConfidence(undefined);
      setPanVerificationMessage("PAN image uploaded. Verify to continue.");
    };
    reader.onerror = () => {
      setPanVerificationMessage("Unable to read PAN image. Please retry.");
    };
    reader.readAsDataURL(selectedFile);
  };

  const verifyPanUsingOcr = async () => {
    if (!panImageBase64) {
      setPanVerificationMessage("Upload PAN image before verification.");
      return;
    }

    setIsPanVerificationLoading(true);
    setPanVerificationMessage("");

    try {
      const response = await fetch("/api/gramcredit/kyc/verify-pan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageBase64: panImageBase64,
          declaredPan: kycIdNumber,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "PAN OCR verification failed.");
      }

      const extractedPan = String(payload.extractedPan || "").toUpperCase();
      const matched = Boolean(payload.matched);
      const confidence =
        typeof payload.confidence === "number" ? payload.confidence : undefined;

      setKycIdNumber(extractedPan);
      setOcrConfidence(confidence);

      if (!panRegex.test(extractedPan)) {
        setPanVerified(false);
        setPanVerificationMessage(
          "OCR result could not detect a valid PAN number. Please retry with a clearer image.",
        );
        return;
      }

      if (!matched) {
        setPanVerified(false);
        setPanVerificationMessage(
          "PAN number in image does not match entered PAN. Please correct and retry.",
        );
        return;
      }

      setPanVerified(true);
      setPanVerificationMessage(
        `PAN verified successfully with OCR${
          confidence !== undefined ? ` (confidence ${confidence.toFixed(1)}%)` : ""
        }.`,
      );
    } catch (error) {
      setPanVerified(false);
      setPanVerificationMessage(
        error instanceof Error ? error.message : "PAN OCR verification failed.",
      );
    } finally {
      setIsPanVerificationLoading(false);
    }
  };

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};

    if (!termsAccepted) {
      nextErrors.terms = pickText(consentText.errTerms, language);
    }

    if (!dataProcessingAccepted) {
      nextErrors.data = pickText(consentText.errData, language);
    }

    const normalizedId = kycIdNumber.trim().toUpperCase();
    if (!normalizedId || normalizedId.length < 4) {
      nextErrors.kycId = pickText(consentText.errKyc, language);
    }

    if (kycIdType === "pan") {
      if (!panRegex.test(normalizedId)) {
        nextErrors.kycId = "PAN must match format ABCDE1234F";
      }
      if (!panImageBase64) {
        nextErrors.panImage = "PAN image is required for OCR verification";
      }
      if (!panVerified) {
        nextErrors.panVerification =
          "PAN OCR verification is required before continuing";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      consent: {
        termsAccepted: true,
        dataProcessingAccepted: true,
        policyVersion: "v1.0",
        acceptedAt: Date.now(),
      },
      kyc: {
        idType: kycIdType,
        idNumber: kycIdNumber.trim().toUpperCase(),
        verified: kycIdType === "pan" ? panVerified : false,
        verificationMethod: kycIdType === "pan" ? "pan_ocr" : "manual",
        ocrConfidence,
      },
    });
  };

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">
          {pickText(consentText.title, language)}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {pickText(consentText.subtitle, language)}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <FieldGroup>
          <Field className="gap-3">
            <div className="flex items-start gap-3">
              <Checkbox
                id="termsAccepted"
                checked={termsAccepted}
                onCheckedChange={(checked) =>
                  setTermsAccepted(checked === true)
                }
                disabled={isLoading}
              />
              <label htmlFor="termsAccepted" className="text-sm text-foreground">
                {pickText(consentText.terms, language)}
              </label>
            </div>
            {errors.terms && (
              <p className="text-sm text-red-600">{errors.terms}</p>
            )}
          </Field>

          <Field className="gap-3">
            <div className="flex items-start gap-3">
              <Checkbox
                id="dataProcessingAccepted"
                checked={dataProcessingAccepted}
                onCheckedChange={(checked) =>
                  setDataProcessingAccepted(checked === true)
                }
                disabled={isLoading}
              />
              <label
                htmlFor="dataProcessingAccepted"
                className="text-sm text-foreground"
              >
                {pickText(consentText.dataConsent, language)}
              </label>
            </div>
            {errors.data && (
              <p className="text-sm text-red-600">{errors.data}</p>
            )}
          </Field>
        </FieldGroup>

        <FieldGroup>
          <Field>
            <FieldLabel>{pickText(consentText.kycDocType, language)}</FieldLabel>
            <Select
              value={kycIdType}
              onValueChange={(value) =>
                onKycTypeChange(
                  value as "aadhaar" | "pan" | "voter_id" | "driving_license",
                )
              }
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aadhaar">Aadhaar</SelectItem>
                <SelectItem value="pan">PAN</SelectItem>
                <SelectItem value="voter_id">Voter ID</SelectItem>
                <SelectItem value="driving_license">Driving License</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel>{pickText(consentText.kycNumber, language)}</FieldLabel>
            <Input
              value={kycIdNumber}
              onChange={(e) => {
                setKycIdNumber(e.target.value.toUpperCase());
                setPanVerified(false);
              }}
              placeholder={pickText(consentText.kycPlaceholder, language)}
              disabled={isLoading}
            />
            {errors.kycId && (
              <p className="text-sm text-red-600 mt-1">{errors.kycId}</p>
            )}
          </Field>
        </FieldGroup>

        {kycIdType === "pan" && (
          <FieldGroup>
            <Field>
              <FieldLabel>PAN Card Image</FieldLabel>
              <Input
                type="file"
                accept="image/*"
                onChange={handlePanFileUpload}
                disabled={isLoading || isPanVerificationLoading}
              />
              {errors.panImage && (
                <p className="text-sm text-red-600 mt-1">{errors.panImage}</p>
              )}
            </Field>

            <Field>
              <FieldLabel>PAN OCR Verification</FieldLabel>
              <Button
                type="button"
                variant="outline"
                onClick={verifyPanUsingOcr}
                disabled={isLoading || isPanVerificationLoading || !panImageBase64}
                className="w-full"
              >
                {isPanVerificationLoading ? "Verifying PAN..." : "Verify PAN with OCR"}
              </Button>
              {panVerificationMessage && (
                <p
                  className={`text-sm mt-2 ${
                    panVerified ? "text-green-700" : "text-amber-700"
                  }`}
                >
                  {panVerificationMessage}
                </p>
              )}
              {errors.panVerification && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.panVerification}
                </p>
              )}
            </Field>
          </FieldGroup>
        )}

        <Button type="submit" disabled={isLoading} className="w-full">
          {pickText(consentText.continueProfile, language)}
        </Button>
      </form>
    </Card>
  );
}

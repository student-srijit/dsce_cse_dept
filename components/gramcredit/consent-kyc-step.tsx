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
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [dataProcessingAccepted, setDataProcessingAccepted] = useState(false);
  const [kycIdType, setKycIdType] = useState<
    "aadhaar" | "pan" | "voter_id" | "driving_license"
  >("aadhaar");
  const [kycIdNumber, setKycIdNumber] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};

    if (!termsAccepted) {
      nextErrors.terms = "You must accept terms to continue";
    }

    if (!dataProcessingAccepted) {
      nextErrors.data = "You must consent to data processing";
    }

    if (!kycIdNumber.trim() || kycIdNumber.trim().length < 4) {
      nextErrors.kycId = "KYC ID number must be at least 4 characters";
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
        idNumber: kycIdNumber.trim(),
      },
    });
  };

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">
          Consent and KYC Verification
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          We need your consent and one ID document for responsible underwriting.
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
                I accept the terms of service and understand this application may
                require manual review.
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
                I consent to audio, profile, and transaction data processing for
                credit assessment.
              </label>
            </div>
            {errors.data && <p className="text-sm text-red-600">{errors.data}</p>}
          </Field>
        </FieldGroup>

        <FieldGroup>
          <Field>
            <FieldLabel>KYC Document Type</FieldLabel>
            <Select
              value={kycIdType}
              onValueChange={(value) =>
                setKycIdType(
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
            <FieldLabel>KYC ID Number</FieldLabel>
            <Input
              value={kycIdNumber}
              onChange={(e) => setKycIdNumber(e.target.value)}
              placeholder="Enter document number"
              disabled={isLoading}
            />
            {errors.kycId && (
              <p className="text-sm text-red-600 mt-1">{errors.kycId}</p>
            )}
          </Field>
        </FieldGroup>

        <Button type="submit" disabled={isLoading} className="w-full">
          Continue to Farmer Profile
        </Button>
      </form>
    </Card>
  );
}

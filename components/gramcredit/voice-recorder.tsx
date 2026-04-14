"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Play } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/components/language/language-provider";
import {
  formatWithValues,
  pickText,
  voiceText,
} from "@/lib/gramcredit/ui-i18n";

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  isLoading?: boolean;
  interviewQuestions?: string[];
  questionsLoading?: boolean;
}

export function VoiceRecorder({
  onRecordingComplete,
  isLoading = false,
  interviewQuestions = [],
  questionsLoading = false,
}: VoiceRecorderProps) {
  const { language } = useLanguage();
  const minDurationSeconds = 15;
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [recordingDurationSeconds, setRecordingDurationSeconds] = useState(0);
  const [error, setError] = useState<string>("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const elapsedMs = recordingStartedAtRef.current
          ? Date.now() - recordingStartedAtRef.current
          : 0;
        const elapsedSeconds = Math.max(0, Math.round(elapsedMs / 1000));

        setRecordingDurationSeconds(elapsedSeconds);

        if (elapsedSeconds < minDurationSeconds) {
          setError(
            formatWithValues(pickText(voiceText.minDuration, language), {
              seconds: minDurationSeconds,
            }),
          );
          setRecordedAudio(null);
          setAudioUrl("");
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        setRecordedAudio(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      recordingStartedAtRef.current = Date.now();
      setIsRecording(true);
    } catch (err) {
      setError(pickText(voiceText.micError, language));
      console.error("Microphone access error:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSubmit = () => {
    if (recordedAudio) {
      onRecordingComplete(recordedAudio);
    }
  };

  const clearRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setRecordedAudio(null);
    setAudioUrl("");
    setRecordingDurationSeconds(0);
  };

  return (
    <Card className="p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">{pickText(voiceText.title, language)}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {pickText(voiceText.subtitle, language)}
        </p>
      </div>

      {questionsLoading && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
          <p className="text-sm text-blue-800">
            {language === "hi"
              ? "आपके प्रोफाइल के आधार पर इंटरव्यू प्रश्न तैयार हो रहे हैं..."
              : language === "ta"
                ? "உங்கள் சுயவிவரத்தின் அடிப்படையில் கேள்விகள் தயாராகின்றன..."
                : language === "te"
                  ? "మీ ప్రొఫైల్ ఆధారంగా ఇంటర్వ్యూ ప్రశ్నలు సిద్ధమవుతున్నాయి..."
                  : language === "kn"
                    ? "ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ಆಧಾರದ ಮೇಲೆ ಪ್ರಶ್ನೆಗಳು ಸಿದ್ಧವಾಗುತ್ತಿವೆ..."
                    : "Generating interview questions from your profile..."}
          </p>
        </div>
      )}

      {interviewQuestions.length > 0 && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
          <p className="text-sm font-semibold text-blue-900">
            {language === "hi"
              ? "रिकॉर्डिंग में इन सवालों का जवाब दें:"
              : language === "ta"
                ? "பதிவில் இந்த கேள்விகளுக்கு பதிலளிக்கவும்:"
                : language === "te"
                  ? "రికార్డింగ్‌లో ఈ ప్రశ్నలకు సమాధానం ఇవ్వండి:"
                  : language === "kn"
                    ? "ದಾಖಲೆ ಮಾಡುವಾಗ ಈ ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರಿಸಿ:"
                    : "Please answer these questions in your recording:"}
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-blue-800">
            {interviewQuestions.map((question, index) => (
              <li key={`${index}-${question}`}>{question}</li>
            ))}
          </ol>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        {!recordedAudio ? (
          <div className="flex gap-2">
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading}
              variant={isRecording ? "destructive" : "default"}
              className="flex-1"
            >
              {isRecording ? (
                <>
                  <Square className="w-4 h-4 mr-2" />
                  {pickText(voiceText.stop, language)}
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 mr-2" />
                  {pickText(voiceText.start, language)}
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-700 font-medium">{pickText(voiceText.captured, language)}</p>
              <p className="text-xs text-green-600 mt-1">
                {pickText(voiceText.duration, language)}: {recordingDurationSeconds}s | {pickText(voiceText.size, language)}: {(recordedAudio.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <audio src={audioUrl} controls className="w-full h-8" />
            <div className="flex gap-2">
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading
                  ? pickText(voiceText.processing, language)
                  : pickText(voiceText.useRecording, language)}
              </Button>
              <Button
                onClick={clearRecording}
                variant="outline"
              >
                {pickText(voiceText.rerecord, language)}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

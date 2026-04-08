"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Play } from "lucide-react";
import { Card } from "@/components/ui/card";

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  isLoading?: boolean;
}

export function VoiceRecorder({ onRecordingComplete, isLoading = false }: VoiceRecorderProps) {
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
            `Please record for at least ${minDurationSeconds} seconds for reliable analysis.`,
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
      setError("Failed to access microphone. Please check permissions.");
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
        <h3 className="text-lg font-semibold text-foreground">Voice Interview</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Record your voice response to the interview questions. This helps us understand your creditworthiness better.
        </p>
      </div>

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
                  Stop Recording
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 mr-2" />
                  Start Recording
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-700 font-medium">Recording captured</p>
              <p className="text-xs text-green-600 mt-1">
                Duration: {recordingDurationSeconds}s | Size: {(recordedAudio.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <audio src={audioUrl} controls className="w-full h-8" />
            <div className="flex gap-2">
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? "Processing..." : "Use This Recording"}
              </Button>
              <Button
                onClick={clearRecording}
                variant="outline"
              >
                Re-record
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

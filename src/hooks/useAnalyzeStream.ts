import { useCallback } from "react";
import { useAnalyzerStore } from "../stores/analyzer";
import type { DetectionBook, ExtractionResult } from "../api";

interface DetectionsEventData {
  total: number;
  books: DetectionBook[];
}

interface ErrorEventData {
  message: string;
}

/**
 * Parse SSE events from a text chunk
 * SSE format: "event: <name>\ndata: <json>\n\n"
 */
function parseSSEEvents(
  buffer: string
): { events: Array<{ event: string; data: string }>; remaining: string } {
  const events: Array<{ event: string; data: string }> = [];
  const parts = buffer.split("\n\n");

  // The last part might be incomplete, keep it in the buffer
  const remaining = parts.pop() ?? "";

  for (const part of parts) {
    if (!part.trim()) continue;

    const lines = part.split("\n");
    let eventName = "";
    let data = "";

    for (const line of lines) {
      if (line.startsWith("event: ")) {
        eventName = line.slice(7);
      } else if (line.startsWith("data: ")) {
        data = line.slice(6);
      }
    }

    if (eventName) {
      events.push({ event: eventName, data });
    }
  }

  return { events, remaining };
}

export function useAnalyzeStream() {
  const {
    startAnalysis,
    setDetections,
    addExtraction,
    setComplete,
    setError,
  } = useAnalyzerStore();

  const analyze = useCallback(async (imageBase64: string) => {
    if (!imageBase64) {
      setError("No image selected");
      return;
    }

    startAnalysis();

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64 }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to analyze image");
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // Process any remaining buffer
          if (buffer.trim()) {
            const { events } = parseSSEEvents(buffer + "\n\n");
            for (const { event, data } of events) {
              handleEvent(event, data);
            }
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const { events, remaining } = parseSSEEvents(buffer);
        buffer = remaining;

        for (const { event, data } of events) {
          handleEvent(event, data);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze image");
    }

    function handleEvent(event: string, data: string) {
      switch (event) {
        case "detections": {
          const parsed = JSON.parse(data) as DetectionsEventData;
          setDetections(parsed.books);
          break;
        }
        case "extraction": {
          const parsed = JSON.parse(data) as ExtractionResult;
          addExtraction(parsed);
          break;
        }
        case "complete": {
          setComplete();
          break;
        }
        case "error": {
          const parsed = JSON.parse(data) as ErrorEventData;
          setError(parsed.message);
          break;
        }
      }
    }
  }, [startAnalysis, setDetections, addExtraction, setComplete, setError]);

  return { analyze };
}

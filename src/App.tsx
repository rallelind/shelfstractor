import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ImageUpload } from "./components/ImageUpload";
import { BookshelfViewer } from "./components/BookshelfViewer";
import { BookCard } from "./components/BookCard";
import type { AnalyzeResponse } from "./api";
import "./index.css";

async function analyzeImage(imageBase64: string): Promise<AnalyzeResponse> {
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64 }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to analyze image");
  }

  return response.json();
}

function useAnalyzeImage() {
  return useMutation({
    mutationFn: analyzeImage,
  });
}

export function App() {
  return (
    <div className="p-4">
      <p className="text-xl font-bold">Hello World</p>
    </div>
  );
}

export default App;

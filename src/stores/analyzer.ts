import { create } from "zustand";
import type { BoundingBox, DetectionBook, ExtractionResult } from "../api";

// Book with merged detection + extraction data
export interface Book {
  id: string;
  boundingBox: BoundingBox;
  detectionConfidence: number;
  // Extraction data (null until streamed)
  title: string | null;
  author: string | null;
  // User state
  status: "pending" | "extracted" | "accepted" | "edited";
}

export type AnalyzerStatus = "idle" | "detecting" | "extracting" | "complete" | "error";

interface AnalyzerState {
  // Image
  imageBase64: string | null;

  // Books with merged detection + extraction
  books: Book[];

  // Navigation
  currentBookIndex: number;

  // Status
  status: AnalyzerStatus;
  extractedCount: number;
  error: string | null;

  // Actions
  setImage: (base64: string) => void;
  startAnalysis: () => void;
  setDetections: (detections: DetectionBook[]) => void;
  addExtraction: (extraction: ExtractionResult) => void;
  setComplete: () => void;
  setError: (error: string) => void;
  setCurrentBook: (index: number) => void;
  nextBook: () => void;
  prevBook: () => void;
  updateBook: (id: string, updates: Partial<Pick<Book, "title" | "author">>) => void;
  acceptBook: (id: string) => void;
  reset: () => void;
}

const initialState = {
  imageBase64: null,
  books: [],
  currentBookIndex: 0,
  status: "idle" as AnalyzerStatus,
  extractedCount: 0,
  error: null,
};

export const useAnalyzerStore = create<AnalyzerState>((set, get) => ({
  ...initialState,

  setImage: (base64: string) => {
    set({ imageBase64: base64 });
  },

  startAnalysis: () => {
    set({ status: "detecting", error: null, books: [], extractedCount: 0 });
  },

  setDetections: (detections: DetectionBook[]) => {
    // Convert DetectionBook[] to Book[] with pending extraction status
    const books: Book[] = detections.map((det) => ({
      id: det.id,
      boundingBox: det.boundingBox,
      detectionConfidence: det.detectionConfidence,
      title: null,
      author: null,
      status: "pending",
    }));
    set({ books, status: "extracting" });
  },

  addExtraction: (extraction: ExtractionResult) => {
    set((state) => {
      const books = state.books.map((book) =>
        book.id === extraction.id
          ? {
              ...book,
              title: extraction.title,
              author: extraction.author,
              status: "extracted" as const,
            }
          : book
      );
      return {
        books,
        extractedCount: state.extractedCount + 1,
      };
    });
  },

  setComplete: () => {
    set({ status: "complete" });
  },

  setError: (error: string) => {
    set({ status: "error", error });
  },

  setCurrentBook: (index: number) => {
    const { books } = get();
    if (index >= 0 && index < books.length) {
      set({ currentBookIndex: index });
    }
  },

  nextBook: () => {
    const { currentBookIndex, books } = get();
    if (currentBookIndex < books.length - 1) {
      set({ currentBookIndex: currentBookIndex + 1 });
    }
  },

  prevBook: () => {
    const { currentBookIndex } = get();
    if (currentBookIndex > 0) {
      set({ currentBookIndex: currentBookIndex - 1 });
    }
  },

  updateBook: (id: string, updates: Partial<Pick<Book, "title" | "author">>) => {
    set((state) => ({
      books: state.books.map((book) =>
        book.id === id
          ? { ...book, ...updates, status: "edited" as const }
          : book
      ),
    }));
  },

  acceptBook: (id: string) => {
    set((state) => ({
      books: state.books.map((book) =>
        book.id === id ? { ...book, status: "accepted" as const } : book
      ),
    }));
  },

  reset: () => {
    set(initialState);
  },
}));


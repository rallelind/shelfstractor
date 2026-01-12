import { create } from "zustand";
import type { BoundingBox, DetectionBook, ExtractionResult, BookCandidate } from "../api";

export interface Book {
  id: string;
  boundingBox: BoundingBox;
  detectionConfidence: number;
  title: string | null;
  author: string | null;
  verified: boolean;
  coverImage: string | null;
  verifiedTitle: string | null;
  verifiedAuthor: string | null;
  candidates: BookCandidate[];
  failureReason: string | null;
  status: "pending" | "extracted" | "accepted";
}

export type AnalyzerStatus = "idle" | "detecting" | "extracting" | "complete" | "error";

interface AnalyzerState {
  imageBase64: string | null;
  books: Book[];
  currentBookIndex: number;
  status: AnalyzerStatus;
  extractedCount: number;
  error: string | null;
  setImage: (base64: string) => void;
  startAnalysis: () => void;
  setDetections: (detections: DetectionBook[]) => void;
  addExtraction: (extraction: ExtractionResult) => void;
  setComplete: () => void;
  setError: (error: string) => void;
  setCurrentBook: (index: number) => void;
  nextBook: () => void;
  prevBook: () => void;
  selectCandidate: (bookId: string, candidate: BookCandidate) => void;
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
    const books: Book[] = detections.map((det) => ({
      id: det.id,
      boundingBox: det.boundingBox,
      detectionConfidence: det.detectionConfidence,
      title: null,
      author: null,
      verified: false,
      coverImage: null,
      verifiedTitle: null,
      verifiedAuthor: null,
      candidates: [],
      failureReason: null,
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
              title: extraction.verifiedTitle ?? extraction.title,
              author: extraction.verifiedAuthor ?? extraction.author,
              verified: extraction.verified,
              coverImage: extraction.coverImage,
              verifiedTitle: extraction.verifiedTitle,
              verifiedAuthor: extraction.verifiedAuthor,
              candidates: extraction.candidates,
              failureReason: extraction.failureReason,
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

  selectCandidate: (bookId: string, candidate: BookCandidate) => {
    set((state) => ({
      books: state.books.map((book) =>
        book.id === bookId
          ? {
              ...book,
              title: candidate.title,
              author: candidate.author,
              coverImage: candidate.coverImage,
              verified: true,
              candidates: [],
              failureReason: null,
            }
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


import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { detectBooks } from "./services/detection";
import { cropImage, getImageDimensions, preprocessImage, preprocessSpineForOCR } from "./services/imageUtils";
import { extractBookInfo } from "./services/extraction";
import { verifyBook, searchGoogleBooks, type BookCandidate } from "./services/verification";

export type { BookCandidate };

export const api = new Hono();

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectionBook {
  id: string;
  boundingBox: BoundingBox;
  detectionConfidence: number;
}

export interface ExtractionResult {
  id: string;
  title: string | null;
  author: string | null;
  verified: boolean;
  coverImage: string | null;
  verifiedTitle: string | null;
  verifiedAuthor: string | null;
  candidates: BookCandidate[];
  failureReason: string | null;
}

export type SSEEvent =
  | { type: "detections"; data: { total: number; books: DetectionBook[] } }
  | { type: "extraction"; data: ExtractionResult }
  | { type: "complete" }
  | { type: "error"; message: string };

export interface Book {
  id: string;
  title: string | null;
  author: string | null;
  boundingBox: BoundingBox;
  detectionConfidence: number;
}

export interface AnalyzeResponse {
  books: Book[];
}

export interface SearchResult {
  title: string;
  author: string | null;
  coverImage: string | null;
}

api.get("/search", async (c) => {
  const query = c.req.query("q");

  if (!query) {
    return c.json({ error: "q query parameter is required" }, 400);
  }

  const results = await searchGoogleBooks(query, null);

  const searchResults: SearchResult[] = results.map((r) => ({
    title: r.title,
    author: r.author,
    coverImage: r.thumbnail,
  }));

  return c.json({ results: searchResults });
});

api.post("/analyze", async (c) => {
  const body = await c.req.json<{ imageBase64: string }>();
  const { imageBase64 } = body;

  if (!imageBase64) {
    return c.json({ error: "imageBase64 is required" }, 400);
  }

  return streamSSE(c, async (stream) => {
    try {
      console.log("Preprocessing image for detection...");
      const preprocessedImage = await preprocessImage(imageBase64);

      const dimensions = await getImageDimensions(imageBase64);

      console.log("Detecting books...");
      const detections = await detectBooks(preprocessedImage);

      const detectionBooks: DetectionBook[] = detections.map((detection, index) => ({
        id: `book-${index}`,
        boundingBox: {
          x: (detection.box.x / dimensions.width) * 100,
          y: (detection.box.y / dimensions.height) * 100,
          width: (detection.box.width / dimensions.width) * 100,
          height: (detection.box.height / dimensions.height) * 100,
        },
        detectionConfidence: detection.confidence,
      }));

      console.log(`Sending ${detectionBooks.length} detections to client...`);
      await stream.writeSSE({
        event: "detections",
        data: JSON.stringify({ total: detectionBooks.length, books: detectionBooks }),
      });

      const CONCURRENCY = 1;
      
      const processBook = async (detection: typeof detections[0], i: number) => {
        const bookId = `book-${i}`;
        console.log(`Extracting info for ${bookId}...`);

        const croppedBase64 = await cropImage(imageBase64, detection.box);
        const ocrReadySpine = await preprocessSpineForOCR(croppedBase64);
        const bookInfo = await extractBookInfo(ocrReadySpine);
        const verification = await verifyBook(bookInfo.title, bookInfo.author, ocrReadySpine);

        const extractionResult: ExtractionResult = {
          id: bookId,
          title: bookInfo.title,
          author: bookInfo.author,
          verified: verification.verified,
          coverImage: verification.coverImage,
          verifiedTitle: verification.verifiedTitle,
          verifiedAuthor: verification.verifiedAuthor,
          candidates: verification.candidates,
          failureReason: verification.failureReason,
        };

        await stream.writeSSE({
          event: "extraction",
          data: JSON.stringify(extractionResult),
        });

        if (verification.failureReason) {
          console.log(`Sent extraction for ${bookId}: ⚠️ FAILED - ${verification.failureReason}`);
        } else {
          console.log(`Sent extraction for ${bookId}: ${verification.verifiedTitle ?? bookInfo.title ?? "unknown"}`);
        }
      };

      for (let i = 0; i < detections.length; i += CONCURRENCY) {
        const batch = detections.slice(i, i + CONCURRENCY);
        await Promise.all(batch.map((detection, j) => processBook(detection, i + j)));
      }

      console.log("All extractions complete");
      await stream.writeSSE({
        event: "complete",
        data: "",
      });
    } catch (error) {
      console.error("Error analyzing image:", error);
      await stream.writeSSE({
        event: "error",
        data: JSON.stringify({
          message: error instanceof Error ? error.message : "Failed to analyze image",
        }),
      });
    }
  });
});

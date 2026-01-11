import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { detectBooks } from "./services/detection";
import { cropImage, getImageDimensions, preprocessImage, preprocessSpineForOCR } from "./services/imageUtils";
import { extractBookInfo } from "./services/extraction";
import { verifyBook } from "./services/verification";

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

      const extractionPromises = detections.map(async (detection, i) => {
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
        };

        await stream.writeSSE({
          event: "extraction",
          data: JSON.stringify(extractionResult),
        });

        console.log(`Sent extraction for ${bookId}: ${bookInfo.title ?? "unknown"}`);
        return extractionResult;
      });

      await Promise.all(extractionPromises);

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

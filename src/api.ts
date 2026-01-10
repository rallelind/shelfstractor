import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { detectBooks } from "./services/detection";
import { cropImage, getImageDimensions, preprocessImage, preprocessSpineForOCR } from "./services/imageUtils";
import { extractBookInfo } from "./services/extraction";

export const api = new Hono();

// Types for bounding boxes
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Detection phase: just the bounding box info
export interface DetectionBook {
  id: string;
  boundingBox: BoundingBox;
  detectionConfidence: number;
}

// Extraction phase: title/author matched by ID
export interface ExtractionResult {
  id: string;
  title: string | null;
  author: string | null;
}

// SSE Event types
export type SSEEvent =
  | { type: "detections"; data: { total: number; books: DetectionBook[] } }
  | { type: "extraction"; data: ExtractionResult }
  | { type: "complete" }
  | { type: "error"; message: string };

// Legacy types for backwards compatibility
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
      // Preprocess image for better detection (reduces glare, improves contrast)
      console.log("Preprocessing image for detection...");
      const preprocessedImage = await preprocessImage(imageBase64);

      // Get image dimensions for converting to percentages (use original)
      const dimensions = await getImageDimensions(imageBase64);

      // Step 1: Detect all books in the preprocessed image
      console.log("Detecting books...");
      const detections = await detectBooks(preprocessedImage);

      // Step 2: Build detection books with bounding boxes (percentage coords)
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

      // Step 3: Send ALL detections first so frontend can render bounding boxes
      console.log(`Sending ${detectionBooks.length} detections to client...`);
      await stream.writeSSE({
        event: "detections",
        data: JSON.stringify({ total: detectionBooks.length, books: detectionBooks }),
      });

      // Step 4: Extract info from each book sequentially and stream results
      for (let i = 0; i < detections.length; i++) {
        const detection = detections[i]!;
        const bookId = `book-${i}`;

        console.log(`Extracting info for ${bookId}...`);

        // Crop from original image (full quality)
        const croppedBase64 = await cropImage(imageBase64, detection.box);

        // Apply OCR-specific preprocessing to the cropped spine
        const ocrReadySpine = await preprocessSpineForOCR(croppedBase64);
        const bookInfo = await extractBookInfo(ocrReadySpine);

        // Stream this extraction result
        const extractionResult: ExtractionResult = {
          id: bookId,
          title: bookInfo.title,
          author: bookInfo.author,
        };

        await stream.writeSSE({
          event: "extraction",
          data: JSON.stringify(extractionResult),
        });

        console.log(`Sent extraction for ${bookId}: ${bookInfo.title ?? "unknown"}`);
      }

      // Step 5: Send completion event
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

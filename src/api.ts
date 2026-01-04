import { Hono } from "hono";
import { detectBooks } from "./services/detection";
import { cropImage, getImageDimensions, preprocessImage, preprocessSpineForOCR } from "./services/imageUtils";
import { extractBookInfo } from "./services/extraction";

export const api = new Hono();

// Types for the API response
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Book {
  id: string;
  title: string | null;
  author: string | null;
  confidence: number;
  boundingBox: BoundingBox;
  detectionConfidence: number;
}

export interface AnalyzeResponse {
  books: Book[];
}

api.post("/analyze", async (c) => {
  try {
    const body = await c.req.json<{ imageBase64: string }>();
    const { imageBase64 } = body;

    if (!imageBase64) {
      return c.json({ error: "imageBase64 is required" }, 400);
    }

    // Preprocess image for better detection (reduces glare, improves contrast)
    console.log("Preprocessing image for detection...");
    const preprocessedImage = await preprocessImage(imageBase64);

    // Get image dimensions for converting to percentages (use original)
    const dimensions = await getImageDimensions(imageBase64);

    // Step 1: Detect all books in the preprocessed image
    const detections = await detectBooks(preprocessedImage);

    // Step 2: Extract info from each detected book
    const books = await Promise.all(
      detections.map(async (detection, index) => {
        // Crop from original image (full quality)
        const croppedBase64 = await cropImage(imageBase64, detection.box);

        // Apply OCR-specific preprocessing to the cropped spine
        const ocrReadySpine = await preprocessSpineForOCR(croppedBase64);
        const bookInfo = await extractBookInfo(ocrReadySpine);

        // Convert pixel coordinates to percentages for frontend display
        return {
          id: `book-${index}`,
          ...bookInfo,
          boundingBox: {
            x: (detection.box.x / dimensions.width) * 100,
            y: (detection.box.y / dimensions.height) * 100,
            width: (detection.box.width / dimensions.width) * 100,
            height: (detection.box.height / dimensions.height) * 100,
          },
          detectionConfidence: detection.confidence,
        };
      })
    );

    return c.json({ books } satisfies AnalyzeResponse);
  } catch (error) {
    console.error("Error analyzing image:", error);
    return c.json(
      { error: error instanceof Error ? error.message : "Failed to analyze image" },
      500
    );
  }
});


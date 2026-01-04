import sharp from "sharp";
import type { BoundingBox } from "./detection";

export interface ImageDimensions {
  width: number;
  height: number;
}

export async function getImageDimensions(
  imageBase64: string
): Promise<ImageDimensions> {
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
  const imageBuffer = Buffer.from(base64Data, "base64");
  const metadata = await sharp(imageBuffer).metadata();
  return {
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
  };
}

/**
 * Preprocess image to improve detection quality
 * - Normalizes brightness to reduce glare/shine
 * - Enhances contrast for better text visibility
 * - Sharpens slightly for clearer edges
 */
export async function preprocessImage(imageBase64: string): Promise<string> {
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
  const imageBuffer = Buffer.from(base64Data, "base64");

  const processedBuffer = await sharp(imageBuffer)
    // Normalize - reduces shine/glare by adjusting brightness distribution
    .normalize()
    // Moderate contrast enhancement
    .modulate({
      brightness: 1.0,
      saturation: 1.1, // Slight saturation boost helps differentiate colors
    })
    // Slight sharpening to improve text clarity
    .sharpen({
      sigma: 1.0,
      m1: 0.5,
      m2: 0.5,
    })
    // Output as high-quality JPEG
    .jpeg({ quality: 92 })
    .toBuffer();

  return `data:image/jpeg;base64,${processedBuffer.toString("base64")}`;
}

/**
 * Enhanced preprocessing for individual book spine crops
 * More aggressive enhancement since we're extracting text
 */
export async function preprocessSpineForOCR(imageBase64: string): Promise<string> {
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
  const imageBuffer = Buffer.from(base64Data, "base64");

  const processedBuffer = await sharp(imageBuffer)
    // Normalize to fix exposure issues
    .normalize()
    // Increase contrast for text
    .linear(1.2, -20) // contrast multiplier and brightness offset
    // Sharpen for text clarity
    .sharpen({
      sigma: 1.5,
      m1: 1.0,
      m2: 0.5,
    })
    // Higher quality for OCR
    .jpeg({ quality: 95 })
    .toBuffer();

  return processedBuffer.toString("base64");
}

export async function cropImage(
  imageBase64: string,
  box: BoundingBox
): Promise<string> {
  // Remove data URL prefix if present
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
  const imageBuffer = Buffer.from(base64Data, "base64");

  // Get image dimensions for boundary checking
  const metadata = await sharp(imageBuffer).metadata();
  const imgWidth = metadata.width ?? 0;
  const imgHeight = metadata.height ?? 0;

  // Box is already in pixel coordinates
  const left = Math.round(box.x);
  const top = Math.round(box.y);
  const width = Math.round(box.width);
  const height = Math.round(box.height);

  // Ensure we don't exceed image boundaries
  const safeLeft = Math.max(0, Math.min(left, imgWidth - 1));
  const safeTop = Math.max(0, Math.min(top, imgHeight - 1));
  const safeWidth = Math.max(1, Math.min(width, imgWidth - safeLeft));
  const safeHeight = Math.max(1, Math.min(height, imgHeight - safeTop));

  // Crop the image
  const croppedBuffer = await sharp(imageBuffer)
    .extract({
      left: safeLeft,
      top: safeTop,
      width: safeWidth,
      height: safeHeight,
    })
    .jpeg({ quality: 85 })
    .toBuffer();

  return croppedBuffer.toString("base64");
}

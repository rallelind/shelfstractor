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

export async function preprocessImage(imageBase64: string): Promise<string> {
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
  const imageBuffer = Buffer.from(base64Data, "base64");

  const processedBuffer = await sharp(imageBuffer)
    .normalize()
    .modulate({
      brightness: 1.0,
      saturation: 1.1,
    })
    .sharpen({
      sigma: 1.0,
      m1: 0.5,
      m2: 0.5,
    })
    .jpeg({ quality: 92 })
    .toBuffer();

  return `data:image/jpeg;base64,${processedBuffer.toString("base64")}`;
}

export async function preprocessSpineForOCR(imageBase64: string): Promise<string> {
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
  const imageBuffer = Buffer.from(base64Data, "base64");

  const processedBuffer = await sharp(imageBuffer)
    .normalize()
    .linear(1.2, -20)
    .sharpen({
      sigma: 1.5,
      m1: 1.0,
      m2: 0.5,
    })
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

  const left = Math.round(box.x);
  const top = Math.round(box.y);
  const width = Math.round(box.width);
  const height = Math.round(box.height);

  const safeLeft = Math.max(0, Math.min(left, imgWidth - 1));
  const safeTop = Math.max(0, Math.min(top, imgHeight - 1));
  const safeWidth = Math.max(1, Math.min(width, imgWidth - safeLeft));
  const safeHeight = Math.max(1, Math.min(height, imgHeight - safeTop));

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

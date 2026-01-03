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

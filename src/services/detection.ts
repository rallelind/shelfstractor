import Replicate from "replicate";

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Detection {
  label: string;
  confidence: number;
  box: BoundingBox;
}

const replicate = new Replicate();

interface GroundingDinoDetection {
  label?: string;
  class?: string;
  confidence?: number;
  score?: number;
  box?: [number, number, number, number];
  bbox?: [number, number, number, number];
  xyxy?: [number, number, number, number];
}

export async function detectBooks(imageBase64: string): Promise<Detection[]> {
  const imageUrl = imageBase64.startsWith("data:")
    ? imageBase64
    : `data:image/jpeg;base64,${imageBase64}`;

  const output = await replicate.run(
    "adirik/grounding-dino:efd10a8ddc57ea28773327e881ce95e20cc1d734c589f7dd01d2036921ed78aa",
    {
      input: {
        image: imageUrl,
        query: "single book spine",
        box_threshold: 0.18,
        text_threshold: 0.18,
      },
    }
  );

  console.log("Grounding DINO raw output:", JSON.stringify(output, null, 2));

  // Handle different response formats
  let detections: GroundingDinoDetection[] = [];

  if (Array.isArray(output)) {
    detections = output;
  } else if (output && typeof output === "object") {
    const obj = output as Record<string, unknown>;
    if (Array.isArray(obj.detections)) {
      detections = obj.detections;
    } else if (Array.isArray(obj.output)) {
      detections = obj.output;
    } else if (Array.isArray(obj.predictions)) {
      detections = obj.predictions;
    }
  }

  // Convert to our format - no filtering, just raw detections
  return detections
    .map((det) => {
      const bbox = det.box ?? det.bbox ?? det.xyxy;
      if (!bbox || bbox.length < 4) {
        return null;
      }

      const [x1, y1, x2, y2] = bbox;

      return {
        label: det.label ?? det.class ?? "book",
        confidence: det.confidence ?? det.score ?? 0.5,
        box: {
          x: x1,
          y: y1,
          width: x2 - x1,
          height: y2 - y1,
        },
      };
    })
    .filter((det): det is Detection => det !== null)
    .sort((a, b) => a.box.x - b.box.x); // Sort left to right
}

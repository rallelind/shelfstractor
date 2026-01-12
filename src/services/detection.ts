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

function calculateIoU(box1: BoundingBox, box2: BoundingBox): number {
  const x1 = Math.max(box1.x, box2.x);
  const y1 = Math.max(box1.y, box2.y);
  const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
  const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);

  const intersectionWidth = Math.max(0, x2 - x1);
  const intersectionHeight = Math.max(0, y2 - y1);
  const intersectionArea = intersectionWidth * intersectionHeight;

  const box1Area = box1.width * box1.height;
  const box2Area = box2.width * box2.height;
  const unionArea = box1Area + box2Area - intersectionArea;

  return unionArea > 0 ? intersectionArea / unionArea : 0;
}

function calculateContainment(box1: BoundingBox, box2: BoundingBox): number {
  const x1 = Math.max(box1.x, box2.x);
  const y1 = Math.max(box1.y, box2.y);
  const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
  const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);

  const intersectionWidth = Math.max(0, x2 - x1);
  const intersectionHeight = Math.max(0, y2 - y1);
  const intersectionArea = intersectionWidth * intersectionHeight;

  const box1Area = box1.width * box1.height;
  return box1Area > 0 ? intersectionArea / box1Area : 0;
}

function applyNMS(detections: Detection[], iouThreshold: number = 0.5): Detection[] {
  if (detections.length === 0) return [];

  const sorted = [...detections].sort((a, b) => {
    const areaA = a.box.width * a.box.height;
    const areaB = b.box.width * b.box.height;
    return areaA - areaB;
  });
  
  const kept: Detection[] = [];
  const suppressed = new Set<number>();

  for (let i = 0; i < sorted.length; i++) {
    if (suppressed.has(i)) continue;

    const current = sorted[i]!;
    let shouldSuppress = false;
    for (const keptBox of kept) {
      const iou = calculateIoU(current.box, keptBox.box);
      const containmentOfKept = calculateContainment(keptBox.box, current.box);
      
      if (iou > iouThreshold || containmentOfKept > 0.7) {
        shouldSuppress = true;
        break;
      }
    }
    
    if (shouldSuppress) {
      suppressed.add(i);
      continue;
    }
    
    kept.push(current);
  }

  return kept;
}

interface GroundingDinoDetection {
  label?: string;
  class?: string;
  confidence?: number;
  score?: number;
  box?: [number, number, number, number];
  bbox?: [number, number, number, number];
  xyxy?: [number, number, number, number];
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower]!;
  return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * (index - lower);
}

function adaptiveFilter(detections: Detection[]): Detection[] {
  if (detections.length < 3) return detections;

  const widths = detections.map(d => d.box.width).sort((a, b) => a - b);
  const heights = detections.map(d => d.box.height).sort((a, b) => a - b);
  const aspectRatios = detections.map(d => d.box.width / d.box.height).sort((a, b) => a - b);

  const medianWidth = percentile(widths, 50);
  const p75Width = percentile(widths, 75);
  const medianHeight = percentile(heights, 50);
  const p25Height = percentile(heights, 25);
  const medianAspect = percentile(aspectRatios, 50);
  const p75Aspect = percentile(aspectRatios, 75);

  const maxWidth = Math.max(medianWidth * 2.5, p75Width * 1.5);
  const minHeight = Math.min(medianHeight * 0.5, p25Height * 0.8);
  const maxAspect = Math.max(medianAspect * 3, p75Aspect * 2, 0.35);

  console.log(`Adaptive thresholds - maxWidth: ${maxWidth.toFixed(0)}, minHeight: ${minHeight.toFixed(0)}, maxAspect: ${maxAspect.toFixed(3)}`);

  return detections.filter(det => {
    const aspectRatio = det.box.width / det.box.height;
    
    const validWidth = det.box.width <= maxWidth;
    const validHeight = det.box.height >= minHeight;
    const validAspect = aspectRatio <= maxAspect;

    return validWidth && validHeight && validAspect;
  });
}

export async function detectBooks(
  imageBase64: string,
  imageDimensions: { width: number; height: number }
): Promise<Detection[]> {
  const imageUrl = imageBase64.startsWith("data:")
    ? imageBase64
    : `data:image/jpeg;base64,${imageBase64}`;

  const output = await replicate.run(
    "adirik/grounding-dino:efd10a8ddc57ea28773327e881ce95e20cc1d734c589f7dd01d2036921ed78aa",
    {
      input: {
        image: imageUrl,
        query: "vertical book spine",
        box_threshold: 0.12,
        text_threshold: 0.12,
      },
    }
  );

  console.log("Grounding DINO raw output:", JSON.stringify(output, null, 2));

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

  const rawDetections = detections
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
    .filter((det): det is Detection => det !== null);

  console.log(`Raw detections: ${rawDetections.length}`);
  console.log(`Image dimensions: ${imageDimensions.width}x${imageDimensions.height}`);

  const preFiltered = rawDetections.filter(det => {
    const widthRatio = det.box.width / imageDimensions.width;
    const heightRatio = det.box.height / imageDimensions.height;
    return widthRatio < 0.5 && heightRatio > 0.3;
  });

  console.log(`After pre-filter: ${preFiltered.length}`);

  const adaptiveFiltered = adaptiveFilter(preFiltered);

  console.log(`After adaptive filter: ${adaptiveFiltered.length}`);

  const nmsDetections = applyNMS(adaptiveFiltered, 0.5);

  console.log(`After NMS: ${nmsDetections.length}`);

  return nmsDetections.sort((a, b) => a.box.x - b.box.x);
}


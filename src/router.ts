import { initTRPC } from "@trpc/server";
import { z } from "zod";
import { detectBooks } from "./services/detection";
import { cropImage, getImageDimensions } from "./services/imageUtils";
import { extractBookInfo } from "./services/extraction";

const t = initTRPC.create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const appRouter = router({
  analyze: publicProcedure
    .input(
      z.object({
        imageBase64: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // Get image dimensions for converting to percentages
      const dimensions = await getImageDimensions(input.imageBase64);

      // Step 1: Detect all books in the image
      const detections = await detectBooks(input.imageBase64);

      // Filter out detections that span the entire image (likely false positives)
      const filteredDetections = detections.filter((det) => {
        const widthPercent = (det.box.width / dimensions.width) * 100;
        const heightPercent = (det.box.height / dimensions.height) * 100;
        // Skip if the detection covers more than 80% of the image
        return widthPercent < 80 || heightPercent < 80;
      });

      // Step 2: Extract info from each detected book
      const books = await Promise.all(
        filteredDetections.map(async (detection, index) => {
          const croppedBase64 = await cropImage(
            input.imageBase64,
            detection.box
          );
          const bookInfo = await extractBookInfo(croppedBase64);

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

      return { books };
    }),
});

export type AppRouter = typeof appRouter;

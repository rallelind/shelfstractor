# Unbind 📚

A web app that extracts book information from photos of bookshelves using a multi-model AI pipeline.

Upload a photo of your bookshelf, and Unbind will detect individual book spines, read the titles and authors, verify them against Google Books, and display cover images.

## Example

![Example bookshelf](assets/example-bookshelf.jpg)

## AI Pipeline

The extraction process uses three specialized models in sequence:

### 1. Detection — Grounding DINO

[Grounding DINO](https://github.com/IDEA-Research/GroundingDINO) (via Replicate) performs open-vocabulary object detection to locate book spines in the image. The model is prompted with "vertical book spine" and returns bounding boxes for each detected book.

Post-processing includes:
- Adaptive filtering based on detection statistics (removes outliers)
- Non-maximum suppression (NMS) to eliminate duplicate/overlapping detections

### 2. Extraction — GPT-4o Vision

Each cropped spine image is sent to GPT-4o to extract the title and author. The model is instructed to only return text it can clearly read—returning `null` rather than guessing on blurry or illegible spines.

### 3. Verification — GPT-4o with Tool Use

The extracted title/author (which may have OCR errors) is verified using GPT-4o with access to a `search_books` tool that queries the Google Books API. The model:

1. Examines the spine image alongside the extracted text
2. Searches Google Books with different query strategies
3. Cross-references results against what's visible on the spine
4. Returns either:
   - A verified match with cover image
   - Multiple candidates for user selection (when uncertain)
   - A failure reason (when unidentifiable)

This agentic approach allows the model to correct OCR mistakes, handle abbreviated titles, and find the right edition even when the extracted text is imperfect.

## Design

UI and UX inspired by [Margins](https://margins.app/) — a beautifully designed reading companion for people who love books.

## Tech Stack

- **Runtime**: [Bun](https://bun.sh)
- **Backend**: [Hono](https://hono.dev)
- **Frontend**: React 19 + [Tailwind CSS](https://tailwindcss.com) + [Zustand](https://zustand.docs.pmnd.rs)
- **AI**: OpenAI (GPT-4o), Replicate (Grounding DINO)
- **Image Processing**: Sharp

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) installed
- OpenAI API key (`OPENAI_API_KEY`)
- Replicate API token (`REPLICATE_API_TOKEN`)

### Installation

```bash
bun install
```

### Development

```bash
bun dev
```

### Production

```bash
bun start
```

## Environment Variables

```
OPENAI_API_KEY=sk-...
REPLICATE_API_TOKEN=r8_...
```

import OpenAI from "openai";
import { zodTextFormat, zodResponsesFunction } from "openai/helpers/zod";
import { z } from "zod";

const openai = new OpenAI();

const searchBooksInputSchema = z.object({
  title: z.string().describe("Book title or partial title to search for"),
  author: z.string().nullable().describe("Author name, or null if unknown/uncertain (prefer null - author from OCR is often wrong)"),
});

const bookResultSchema = z.object({
  title: z.string(),
  author: z.string().nullable(),
  thumbnail: z.string().nullable(),
});

type BookResult = z.infer<typeof bookResultSchema>;

const candidateSchema = z.object({
  title: z.string(),
  author: z.string().nullable(),
  coverImage: z.string().nullable(),
  score: z.number().min(0).max(100).describe("Confidence score 0-100 based on how well this matches the spine image"),
});

const verificationResponseSchema = z.object({
  verified: z.boolean().describe("True if confidently matched to a single book, false if uncertain or no match"),
  verifiedTitle: z.string().nullable().describe("The matched book's title (when verified=true), or null"),
  verifiedAuthor: z.string().nullable().describe("The matched book's author (when verified=true), or null"),
  coverImage: z.string().nullable().describe("Thumbnail URL (when verified=true), or null"),
  candidates: z.array(candidateSchema).describe("When uncertain between multiple books, list 2-4 candidates for user to choose from. Empty if verified=true or no matches found."),
  failureReason: z.string().nullable().describe("When verified=false AND candidates is empty, explain why (e.g. 'Text too blurry to read', 'Not a book spine', 'No matching books found'). Null otherwise."),
});

type VerificationResponse = z.infer<typeof verificationResponseSchema>;

export interface BookCandidate {
  title: string;
  author: string | null;
  coverImage: string | null;
  score: number;
}

export interface VerificationResult {
  verified: boolean;
  coverImage: string | null;
  verifiedTitle: string | null;
  verifiedAuthor: string | null;
  candidates: BookCandidate[];
  failureReason: string | null;
}

interface GoogleBooksResponse {
  totalItems: number;
  items?: Array<{
    volumeInfo: {
      title?: string;
      authors?: string[];
      imageLinks?: {
        thumbnail?: string;
        smallThumbnail?: string;
      };
    };
  }>;
}

export async function searchGoogleBooks(
  title: string,
  author: string | null
): Promise<BookResult[]> {
  const sanitize = (value: string | null): string | null =>
    value && value !== "null" ? value : null;

  const cleanTitle = sanitize(title);
  const cleanAuthor = sanitize(author);

  const queryParts: string[] = [];
  if (cleanTitle) queryParts.push(`intitle:${cleanTitle}`);
  if (cleanAuthor) queryParts.push(`inauthor:${cleanAuthor}`);

  if (queryParts.length === 0) {
    return [];
  }

  const query = encodeURIComponent(queryParts.join(" "));
  const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=5`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as GoogleBooksResponse;

    if (!data.items || data.items.length === 0) {
      return [];
    }

    return data.items.map((item) => ({
      title: item.volumeInfo.title ?? "Unknown Title",
      author: item.volumeInfo.authors?.[0] ?? null,
      thumbnail:
        item.volumeInfo.imageLinks?.thumbnail ??
        item.volumeInfo.imageLinks?.smallThumbnail ??
        null,
    }));
  } catch {
    return [];
  }
}

const searchBooksTool = zodResponsesFunction({
  name: "search_books",
  description:
    "Search Google Books API to find books. Provide title, author, or both. Try different queries if initial search doesn't find the right book.",
  parameters: searchBooksInputSchema,
});

const MAX_TOOL_CALLS = 5;

const SYSTEM_PROMPT = `You are a book verification assistant. Your task is to identify the correct book from a spine image.

You will receive:
1. An image of a book spine
2. The extracted title and author (which may be incomplete or have OCR errors)

Your job:
1. Look at the spine image carefully to see what text is visible
2. Use the search_books tool to find the correct book
3. Compare search results against what you see in the image

THREE POSSIBLE OUTCOMES:

1. FOUND THE BOOK (preferred):
   - verified=true, fill in title/author/coverImage, candidates=[], failureReason=null
   - Use when you're confident you found the exact book

2. MULTIPLE CANDIDATES:
   - verified=false, candidates=[2-4 options with scores], failureReason=null
   - Use when multiple books could match and user should choose
   - Include books with cover images when possible
   - Give each candidate a score (0-100) based on:
     • How well the title matches the spine text (most important)
     • Whether it has a cover image
     • How well the author matches (if visible on spine)

3. COULD NOT IDENTIFY:
   - verified=false, candidates=[], failureReason="<explanation>"
   - Use when you cannot identify the book at all
   - Provide a helpful reason, e.g.:
     • "Text on spine is too blurry to read"
     • "Spine appears blank or text is not visible"
     • "This appears to be a notebook or journal, not a published book"
     • "Could not find any matching books in search results"
     • "Text is in a script/language that cannot be searched"

When selecting/ranking results:
- Prefer results with a cover image (URL not "none")
- Prefer exact or closest title matches
- The first search result is often the best match
- If a result's title matches the spine well, pick it even if author differs from OCR

Search strategy:
1. Search with title only (OCR author is often wrong)
2. Try partial/key words if needed
3. Try author only if visible on spine

Tips:
- Use the spine IMAGE as ground truth, not OCR text
- Book spines may show abbreviated titles
- One good search is usually enough`;

export async function verifyBook(
  title: string | null,
  author: string | null,
  spineImageBase64?: string
): Promise<VerificationResult> {
  if (!title && !author) {
    return { verified: false, coverImage: null, verifiedTitle: null, verifiedAuthor: null, candidates: [], failureReason: "No text could be extracted from the spine image" };
  }

  console.log(`[Verification] Starting verification for: "${title}" by "${author}"`);

  const userContent: OpenAI.Responses.ResponseInputItem.Message["content"] = [];

  if (spineImageBase64) {
    userContent.push({
      type: "input_image",
      image_url: `data:image/jpeg;base64,${spineImageBase64}`,
      detail: "high",
    });
  }

  userContent.push({
    type: "input_text",
    text: `Please verify this book and find the correct title, author, and cover image.

Extracted from spine (may have OCR errors):
- Title: ${title ?? "Not detected"}
- Author: ${author ?? "Not detected"}

Search Google Books to find the correct book. If you can see the spine image, use it to verify your findings.`,
  });

  const input: OpenAI.Responses.ResponseInput = [
    {
      role: "user",
      content: userContent,
    },
  ];

  try {
    let toolCallCount = 0;
    let currentInput = input;

    while (toolCallCount < MAX_TOOL_CALLS) {
      const response = await openai.responses.create({
        model: "gpt-4o",
        instructions: SYSTEM_PROMPT,
        input: currentInput,
        tools: [searchBooksTool],
        text: {
          format: zodTextFormat(verificationResponseSchema, "verification_result"),
        },
      });

      const toolCalls = response.output.filter(
        (item): item is OpenAI.Responses.ResponseFunctionToolCall =>
          item.type === "function_call"
      );

      if (toolCalls.length === 0) {
        const textOutput = response.output.find(
          (item): item is OpenAI.Responses.ResponseOutputMessage =>
            item.type === "message"
        );

        if (textOutput) {
          const textContent = textOutput.content.find(
            (c): c is OpenAI.Responses.ResponseOutputText => c.type === "output_text"
          );

          if (textContent?.text) {
            try {
              const parsed = JSON.parse(textContent.text) as VerificationResponse;
              const candidates = (parsed.candidates ?? []).sort((a, b) => b.score - a.score);
              const failureReason = parsed.failureReason ?? null;
              
              if (parsed.verified) {
                console.log(`[Verification] ✅ "${parsed.verifiedTitle}" by ${parsed.verifiedAuthor ?? "Unknown"}${parsed.coverImage ? " (has cover)" : ""}`);
              } else if (candidates.length > 0) {
                console.log(`[Verification] 🤔 Uncertain for "${title}" - ${candidates.length} candidates:`);
                for (const c of candidates) {
                  console.log(`  • [${c.score}%] "${c.title}" by ${c.author ?? "Unknown"}${c.coverImage ? " ✓cover" : ""}`);
                }
              } else {
                console.log(`[Verification] ❌ Failed: ${failureReason ?? "Unknown reason"}`);
              }
              return {
                verified: parsed.verified,
                coverImage: parsed.coverImage,
                verifiedTitle: parsed.verifiedTitle,
                verifiedAuthor: parsed.verifiedAuthor,
                candidates,
                failureReason,
              };
            } catch {
              console.error("[Verification] Failed to parse response JSON");
            }
          }
        }

        break;
      }

      const toolOutputs: OpenAI.Responses.ResponseInputItem[] = [];

      for (const toolCall of toolCalls) {
        toolCallCount++;

        if (toolCall.name === "search_books") {
          const args = JSON.parse(toolCall.arguments) as z.infer<typeof searchBooksInputSchema>;
          const results = await searchGoogleBooks(args.title, args.author);

          console.log(`[Verification] search_books("${args.title}"${args.author ? `, "${args.author}"` : ""}) → ${results.length} results:`);
          for (const [i, r] of results.entries()) {
            console.log(`  ${i + 1}. "${r.title}" by ${r.author ?? "Unknown"}${r.thumbnail ? " ✓cover" : ""}`);
          }

          const formattedResults = results.length === 0
            ? "No books found. Try a different search query."
            : results.map((r, i) => 
                `${i + 1}. "${r.title}" by ${r.author ?? "Unknown"} | Cover: ${r.thumbnail ?? "none"}`
              ).join("\n");

          toolOutputs.push({
            type: "function_call_output",
            call_id: toolCall.call_id,
            output: formattedResults,
          });
        }
      }

      currentInput = [...currentInput, ...response.output, ...toolOutputs];
    }

    console.log(`[Verification] Max tool calls reached or no valid response`);
    return { verified: false, coverImage: null, verifiedTitle: null, verifiedAuthor: null, candidates: [], failureReason: "Verification process did not complete" };
  } catch (error) {
    console.error("[Verification] Error during verification:", error);
    return { verified: false, coverImage: null, verifiedTitle: null, verifiedAuthor: null, candidates: [], failureReason: "An error occurred during verification" };
  }
}

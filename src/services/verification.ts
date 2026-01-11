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

const verificationResponseSchema = z.object({
  verified: z.boolean().describe("Whether a confident match was found"),
  verifiedTitle: z.string().nullable().describe("The matched book's title, or null if not found"),
  verifiedAuthor: z.string().nullable().describe("The matched book's author, or null if not found"),
  coverImage: z.string().nullable().describe("Thumbnail URL from Google Books, or null if not found"),
});

type VerificationResponse = z.infer<typeof verificationResponseSchema>;

export interface VerificationResult {
  verified: boolean;
  coverImage: string | null;
  verifiedTitle: string | null;
  verifiedAuthor: string | null;
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

async function searchGoogleBooks(
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

  console.log(`[Verification] Searching Google Books: ${queryParts.join(" ")}`);

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`[Verification] Google Books API error: ${response.status}`);
      return [];
    }

    const data = (await response.json()) as GoogleBooksResponse;

    if (!data.items || data.items.length === 0) {
      console.log(`[Verification] No results found`);
      return [];
    }

    const results: BookResult[] = data.items.map((item) => ({
      title: item.volumeInfo.title ?? "Unknown Title",
      author: item.volumeInfo.authors?.[0] ?? null,
      thumbnail:
        item.volumeInfo.imageLinks?.thumbnail ??
        item.volumeInfo.imageLinks?.smallThumbnail ??
        null,
    }));

    console.log(`[Verification] Found ${results.length} results`);
    return results;
  } catch (error) {
    console.error("[Verification] Error searching Google Books:", error);
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
4. If no results found, try different search strategies

When you're confident you've found the right book, respond with your final answer.
If you cannot find a match after trying different searches, respond with verified: false.

Search strategy (try in order until you find results):
1. Search with title only (author field from OCR is often wrong or missing)
2. Search with partial/key words from the title
3. Search with author only if visible on spine
4. Try different spellings if OCR might have errors

Tips:
- OCR extractions may have errors - use the image as the source of truth
- The extracted author is frequently incorrect - prefer title-only searches first
- Book spines may show abbreviated or stylized titles`;

export async function verifyBook(
  title: string | null,
  author: string | null,
  spineImageBase64?: string
): Promise<VerificationResult> {
  if (!title && !author) {
    return { verified: false, coverImage: null, verifiedTitle: null, verifiedAuthor: null };
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
              console.log(
                `[Verification] Complete: verified=${parsed.verified}, title="${parsed.verifiedTitle}"`
              );
              return {
                verified: parsed.verified,
                coverImage: parsed.coverImage,
                verifiedTitle: parsed.verifiedTitle,
                verifiedAuthor: parsed.verifiedAuthor,
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
        console.log(`[Verification] Tool call ${toolCallCount}: ${toolCall.name}`);

        if (toolCall.name === "search_books") {
          const args = JSON.parse(toolCall.arguments) as z.infer<typeof searchBooksInputSchema>;
          const results = await searchGoogleBooks(args.title, args.author);

          toolOutputs.push({
            type: "function_call_output",
            call_id: toolCall.call_id,
            output: JSON.stringify(results),
          });
        }
      }

      currentInput = [...currentInput, ...response.output, ...toolOutputs];
    }

    console.log(`[Verification] Max tool calls reached or no valid response`);
    return { verified: false, coverImage: null, verifiedTitle: null, verifiedAuthor: null };
  } catch (error) {
    console.error("[Verification] Error during verification:", error);
    return { verified: false, coverImage: null, verifiedTitle: null, verifiedAuthor: null };
  }
}

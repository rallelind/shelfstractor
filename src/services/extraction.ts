import OpenAI from "openai";

export interface BookInfo {
  title: string | null;
  author: string | null;
}

const openai = new OpenAI();

export async function extractBookInfo(
  croppedImageBase64: string
): Promise<BookInfo> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `Extract the title and author from this book spine image.

IMPORTANT: Only extract text you can CLEARLY read. Do NOT guess or make up titles/authors.

If the image is:
- Too blurry, dark, or low quality to read
- At an angle that makes text illegible  
- Partially obscured or cut off

Then return null for any fields you cannot confidently read.

Respond in JSON: {"title": "...", "author": "..."}
Use null for any field you cannot clearly read. It's better to return null than guess wrong.`,
      },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${croppedImageBase64}`,
            },
          },
        ],
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 100,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    return { title: null, author: null };
  }

  try {
    const parsed = JSON.parse(content) as BookInfo;
    return {
      title: parsed.title ?? null,
      author: parsed.author ?? null,
    };
  } catch {
    return { title: null, author: null };
  }
}


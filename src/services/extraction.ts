import OpenAI from "openai";

export interface BookInfo {
  title: string | null;
  author: string | null;
  confidence: number;
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
        content: `You are analyzing a cropped image of a single book spine or cover. 
Extract the title and author if visible. Be concise.
Respond in JSON format: {"title": "...", "author": "...", "confidence": 0.0-1.0}
If you cannot read the title, use null.
If you cannot read the author, use null.
The confidence should reflect how certain you are about the text extraction.`,
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
    max_tokens: 150,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    return { title: null, author: null, confidence: 0 };
  }

  try {
    const parsed = JSON.parse(content) as BookInfo;
    return {
      title: parsed.title ?? null,
      author: parsed.author ?? null,
      confidence: parsed.confidence ?? 0.5,
    };
  } catch {
    return { title: null, author: null, confidence: 0 };
  }
}


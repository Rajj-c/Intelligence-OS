import fs from 'fs';
import path from 'path';

// Server-only helpers for the Direct Gemini API.
export const EMBED_DIMS = 1536;

function getEnvVar(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  
  // Try reading from .env file directly as a fallback (Vite sometimes doesn't load it into process.env)
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)$/);
        if (match) {
          const key = match[1].trim();
          let val = match[2].trim();
          if (key === name) {
            // Remove surrounding quotes if any
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            return val;
          }
        }
      }
    }
  } catch (e) {
    console.error("Failed to read .env file directly:", e);
  }
  return undefined;
}

function getRequiredApiKey() {
  const k = getEnvVar("GEMINI_API_KEY");
  if (!k) throw new Error("GEMINI_API_KEY is not configured in your .env file.");
  return k;
}

export async function embedTexts(inputs: string[]): Promise<number[][]> {
  if (inputs.length === 0) return [];

  const geminiKey = getRequiredApiKey();
  const out: number[][] = [];
  
  for (const input of inputs) {
    const text = input.slice(0, 8000) || " ";
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${geminiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/gemini-embedding-001",
        content: { parts: [{ text }] },
        outputDimensionality: EMBED_DIMS,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Gemini Embedding failed (${res.status}): ${t.slice(0, 300)}`);
    }
    const json = (await res.json()) as { embedding: { values: number[] } };
    out.push(json.embedding.values);
  }
  return out;
}

export async function embedOne(text: string): Promise<number[]> {
  const [v] = await embedTexts([text]);
  return v;
}

/** Call chat model with response schema to extract structured JSON. */
export async function extractStructured<T>(opts: {
  systemPrompt: string;
  userPrompt: string;
  toolName: string;
  toolDescription: string;
  parameters: Record<string, unknown>;
}): Promise<T> {
  const geminiKey = getRequiredApiKey();
  
  // Direct Gemini API call using Structured Outputs (JSON Schema) with gemini-2.5-flash
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { text: `${opts.systemPrompt}\n\nInput to process:\n${opts.userPrompt}` }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: opts.parameters
      }
    })
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini Chat extract failed (${res.status}): ${t.slice(0, 300)}`);
  }
  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const textVal = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textVal) throw new Error("No structured output returned from Gemini API");
  return JSON.parse(textVal) as T;
}

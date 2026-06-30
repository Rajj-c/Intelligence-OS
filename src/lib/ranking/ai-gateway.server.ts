import fs from 'fs';
import path from 'path';

// Server-only helpers for the Lovable AI Gateway or Direct Gemini API.
const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const EMBED_MODEL = "google/gemini-embedding-001";
const CHAT_MODEL = "google/gemini-3-flash-preview";
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

function key() {
  const k = getEnvVar("LOVABLE_API_KEY") || getEnvVar("GEMINI_API_KEY");
  if (!k) throw new Error("Neither LOVABLE_API_KEY nor GEMINI_API_KEY is configured in your .env file.");
  return k;
}

export async function embedTexts(inputs: string[]): Promise<number[][]> {
  if (inputs.length === 0) return [];

  const geminiKey = getEnvVar("GEMINI_API_KEY");
  if (geminiKey) {
    // Direct Gemini API call using gemini-embedding-001 with embedContent (one at a time)
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

  // Fallback to Lovable AI Gateway
  const out: number[][] = [];
  for (let i = 0; i < inputs.length; i += 32) {
    const batch = inputs.slice(i, i + 32).map((s) => s.slice(0, 8000) || " ");
    const res = await fetch(`${GATEWAY}/embeddings`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: EMBED_MODEL, input: batch, dimensions: EMBED_DIMS }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Embedding failed (${res.status}): ${t.slice(0, 300)}`);
    }
    const json = (await res.json()) as { data: { embedding: number[]; index: number }[] };
    const sorted = json.data.sort((a, b) => a.index - b.index);
    out.push(...sorted.map((d) => d.embedding));
  }
  return out;
}

export async function embedOne(text: string): Promise<number[]> {
  const [v] = await embedTexts([text]);
  return v;
}

/** Call chat model with tool-calling or response schema to extract structured JSON. */
export async function extractStructured<T>(opts: {
  systemPrompt: string;
  userPrompt: string;
  toolName: string;
  toolDescription: string;
  parameters: Record<string, unknown>;
}): Promise<T> {
  const geminiKey = getEnvVar("GEMINI_API_KEY");
  if (geminiKey) {
    // Direct Gemini API call using Structured Outputs (JSON Schema) with gemini-1.5-flash
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

  // Fallback to Lovable AI Gateway
  const res = await fetch(`${GATEWAY}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: opts.systemPrompt },
        { role: "user", content: opts.userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: opts.toolName,
            description: opts.toolDescription,
            parameters: opts.parameters,
          },
        },
      ],
      tool_choice: { type: "function", function: { name: opts.toolName } },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Chat extract failed (${res.status}): ${t.slice(0, 300)}`);
  }
  const json = (await res.json()) as {
    choices: { message: { tool_calls?: { function: { arguments: string } }[] } }[];
  };
  const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("No tool call returned");
  return JSON.parse(args) as T;
}

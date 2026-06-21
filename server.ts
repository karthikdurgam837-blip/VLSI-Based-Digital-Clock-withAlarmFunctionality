import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "20mb" }));

// Initialize Gemini Client with designated user-agent header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Converts raw uncompressed mono PCM (from gemini-3.1-flash-tts-preview) to a standard playback WAV Buffer.
function pcmToWav(pcmBuffer: Buffer, sampleRate: number = 24000): Buffer {
  const buffer = Buffer.alloc(44 + pcmBuffer.length);
  // RIFF identifier
  buffer.write("RIFF", 0);
  // file length minus RIFF and WAVE headers
  buffer.writeUInt32LE(36 + pcmBuffer.length, 4);
  // RIFF type
  buffer.write("WAVE", 8);
  // format chunk identifier
  buffer.write("fmt ", 12);
  // format chunk length
  buffer.writeUInt32LE(16, 16);
  // sample format (1 = raw PCM)
  buffer.writeUInt16LE(1, 20);
  // channel count (1 = mono)
  buffer.writeUInt16LE(1, 22);
  // sample rate
  buffer.writeUInt32LE(sampleRate, 24);
  // byte rate = sampleRate * bitsPerSample/8 & channels
  buffer.writeUInt32LE(sampleRate * 2, 28);
  // block align = channels * bitsPerSample/8
  buffer.writeUInt16LE(2, 32);
  // bits per sample
  buffer.writeUInt16LE(16, 34);
  // data chunk identifier
  buffer.write("data", 36);
  // data chunk length
  buffer.writeUInt32LE(pcmBuffer.length, 40);
  // copy PCM data
  pcmBuffer.copy(buffer, 44);
  return buffer;
}

// Scrape helper
async function scrapeUrlContent(targetUrl: string): Promise<{ title: string; content: string }> {
  const response = await fetch(targetUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch article: ${response.statusText}`);
  }
  const html = await response.text();

  // title regex
  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : "Pasted Article";

  // clean script / stylesheet / navigation clutter
  let cleanHtml = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, "")
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, "")
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, "");

  // match paragraphs
  const pMatches = [...cleanHtml.matchAll(/<p\b[^>]*>(.*?)<\/p>/gi)];
  let paragraphs = pMatches
    .map((m) => m[1].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 30)
    .join("\n\n");

  if (paragraphs.length < 100) {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const bodyText = bodyMatch
      ? bodyMatch[1].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
      : html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    paragraphs = bodyText.slice(0, 5000);
  }

  return { title, content: paragraphs };
}

// REST API Endpoints

// Scrapes a webpage given a URL and returns content
app.post("/api/fetch-url", async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }
  try {
    const result = await scrapeUrlContent(url);
    res.json(result);
  } catch (error: any) {
    console.error("Scraping error:", error);
    res.status(500).json({ error: error.message || "Failed to retrieve article content." });
  }
});

// Creates a natural spoken-word digest script from provided articles
app.post("/api/summarize", async (req, res) => {
  const { articles, commuteLength, vibe, focusArea } = req.body;

  if (!articles || !Array.isArray(articles) || articles.length === 0) {
    return res.status(400).json({ error: "A list of articles is required" });
  }

  // Map length config
  let lengthDescription = "around 1-2 minutes of spoken text (approx 200-250 words)";
  if (commuteLength === "medium") {
    lengthDescription = "around 3-4 minutes of spoken text (approx 450-500 words)";
  } else if (commuteLength === "long") {
    lengthDescription = "around 6-8 minutes of spoken text (approx 800-1000 words)";
  }

  // Map vibe instructions
  let vibePrompt = "a cheerful, energetic morning radio DJ show vibe with quick transitions and friendly style.";
  if (vibe === "podcast") {
    vibePrompt = "a calm, thoughtful, intellectual podcast host with conversational flow and engaging narratives.";
  } else if (vibe === "bullet") {
    vibePrompt = "a highly direct, professional TL;DR news brief. Direct headlines and facts, zero fluff.";
  } else if (vibe === "narrative") {
    vibePrompt = "a dramatic, storytelling journalistic narrative format, with slow builds and focus on human details.";
  }

  const articlesContext = articles
    .map((art, idx) => `ARTICLE ${idx + 1}:\nTitle: ${art.title}\nContent: ${art.text}\n`)
    .join("\n");

  const systemInstruction = 
    `You are an expert news broadcaster, broadcast script writer, and synthesizer. 
    Your job is to read multiple news articles, extract their true core updates, and integrate them into a single, cohesive, highly engaging daily audio digest script for an individual's commute.
    
    CRITICAL FORMATTING REQUIREMENT:
    - The output 'audioScript' must be written in PURE, SPOKEN SPEECH format.
    - DO NOT include any markdown headers, bold prefixes (e.g. do not have **Topic**), lists, bullet symbols (* or -), or parenthetical references. The speech engine will read them out literally!
    - Ensure smooth verbal transition phrases between topics (e.g., "Next up in technology...", "Shifting focus to the markets...", "And finally today...").
    
    Target length of speech: ${lengthDescription}.
    Delivery Vibe: ${vibePrompt}
    ${focusArea ? `User-specified areas of focus: ${focusArea}` : ""}`;

  const prompt = `Please review these articles and compile them into the final personalized briefing package:\n\n${articlesContext}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: "An elegant, captivating title for this briefing (e.g., 'Morning tech and environmental briefing')",
            },
            audioScript: {
              type: Type.STRING,
              description: "The complete spoken script. Pure conversational reading text with perfect verbal transitions, absolute zero markdown or bullet list syntax.",
            },
            bulletPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "3 to 5 clear visual bullet points highlights of the main news updates to display on modern screens.",
            },
          },
          required: ["title", "audioScript", "bulletPoints"],
        },
      },
    });

    const dataText = response.text;
    if (!dataText) {
      throw new Error("No summary generated");
    }

    const report = JSON.parse(dataText.trim());
    res.json(report);
  } catch (err: any) {
    console.error("Summarize error:", err);
    res.status(500).json({ error: err.message || "Failed to generate summary script" });
  }
});

// Converts raw spoken text into standard playback WAV and returns Base64 URL
app.post("/api/tts", async (req, res) => {
  const { text, voice } = req.body;
  if (!text) {
    return res.status(400).json({ error: "Text to speech is required" });
  }

  // Prebuilt voice name verification
  const supportedVoices = ["Puck", "Charon", "Kore", "Fenrir", "Zephyr"];
  const selectedVoice = supportedVoices.includes(voice) ? voice : "Kore";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: selectedVoice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("Gemini TTS engine did not return speech audio. Ensure text is valid and model is operational.");
    }

    // Convert raw little-endian PCM sample rate 24kHz to custom-buffered standard playable inline WAV
    const pcmBuffer = Buffer.from(base64Audio, "base64");
    const wavBuffer = pcmToWav(pcmBuffer, 24000);
    const audioDataUrl = `data:audio/wav;base64,${wavBuffer.toString("base64")}`;

    res.json({ audioUrl: audioDataUrl });
  } catch (err: any) {
    console.error("TTS error:", err);
    res.status(500).json({ error: err.message || "Failed to synthesize news speech audio." });
  }
});

// Start integration server
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

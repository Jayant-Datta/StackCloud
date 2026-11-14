import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/appwrite/user.action";
import { google, type GoogleLanguageModelOptions } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

export const runtime = "nodejs";
export const maxDuration = 120;

function buildGoogleOptions(modelName: string): { google: GoogleLanguageModelOptions } | undefined {
  const norm = modelName.toLowerCase();
  const options: GoogleLanguageModelOptions = {};

  if (/^gemini-2\.5(?:\.|-|$)/i.test(norm)) {
    options.thinkingConfig = { thinkingBudget: 0 };
  } else if (
    /^gemini-(?:[3-9]|\d{2,})(?:\.|-|$)/i.test(norm) ||
    norm.includes("flash-lite")
  ) {
    options.thinkingConfig = { thinkingLevel: "minimal" };
  }

  return Object.keys(options).length > 0 ? { google: options } : undefined;
}

let cachedGroqModels: string[] | null = null;
let lastGroqModelFetch = 0;

async function resolveGroqModel(requestedModel: string, apiKey: string): Promise<string> {
  const norm = requestedModel.toLowerCase();
  const isDeprecated =
    norm.includes("llama-3.3-70b-versatile") ||
    norm.includes("llama3-70b") ||
    norm.includes("llama3-8b");

  const now = Date.now();
  if (!cachedGroqModels || now - lastGroqModelFetch > 300000) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const data = await res.json();
        cachedGroqModels = (data.data || []).map((m: { id: string }) => m.id);
        lastGroqModelFetch = now;
      }
    } catch (err) {
      console.warn("[Lumina AI] Groq models lookup failed:", err);
    }
  }

  const modelIds = cachedGroqModels || [];

  if (!isDeprecated && modelIds.includes(requestedModel)) {
    return requestedModel;
  }

  const candidates = [
    "openai/gpt-oss-120b",
    "llama-3.1-8b-instant",
    "openai/gpt-oss-20b",
    "llama-3.3-70b-specdec",
    "qwen/qwen3.8-27b",
  ];

  for (const c of candidates) {
    if (modelIds.includes(c)) {
      console.log(`[Lumina AI] Groq model '${requestedModel}' mapped to active '${c}'`);
      return c;
    }
  }

  if (modelIds.length > 0 && !isDeprecated) {
    return modelIds[0];
  }

  return "openai/gpt-oss-120b";
}

async function getLanguageModel(modelName: string) {
  const norm = (modelName || "").trim().toLowerCase();

  // 1. Groq Models (Llama, DeepSeek, GPT-OSS) - Fastest Free Tier
  if (
    norm.includes("llama") ||
    norm.includes("deepseek") ||
    norm.includes("mixtral") ||
    norm.includes("gpt-oss") ||
    (Boolean(process.env.GROQ_API_KEY) &&
      !norm.startsWith("gemini") &&
      !norm.startsWith("gpt-4") &&
      !norm.startsWith("gpt-3") &&
      !norm.startsWith("o3-") &&
      !norm.startsWith("o1-"))
  ) {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      throw new Error(
        "Missing GROQ_API_KEY in .env. Please get a free key from https://console.groq.com/keys and add GROQ_API_KEY=gsk_... to your .env file."
      );
    }

    const resolvedModel = await resolveGroqModel(modelName, groqKey);

    return createOpenAI({
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: groqKey,
    })(resolvedModel);
  }

  // 2. OpenAI Official Key
  if (norm.startsWith("gpt-") || norm.startsWith("o3-") || norm.startsWith("o1-")) {
    if (process.env.OPENAI_API_KEY) {
      return createOpenAI({ apiKey: process.env.OPENAI_API_KEY })(modelName);
    }
    throw new Error(
      "Missing OPENAI_API_KEY for GPT models in .env. Switch to Gemini 2.5 Flash (Google Free) or Groq models."
    );
  }

  // 3. Google Gemini Models (Default Free Tier)
  let geminiModel = modelName;
  if (!norm.startsWith("gemini-") || norm === "gemini-2.5-pro") {
    geminiModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  }

  return google(geminiModel);
}

export async function POST(req: Request) {
  const hasKey =
    Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY) ||
    Boolean(process.env.GROQ_API_KEY) ||
    Boolean(process.env.OPENAI_API_KEY) ||
    Boolean(process.env.GITHUB_TOKEN);

  if (!hasKey) {
    return Response.json(
      {
        error:
          "No AI API key found. Please configure GOOGLE_GENERATIVE_AI_API_KEY or GROQ_API_KEY in your .env file.",
      },
      { status: 500 }
    );
  }

  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("appwrite-session");
    const userIdCookie = cookieStore.get("appwrite-user-id");

    if (!sessionCookie?.value || !userIdCookie?.value) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body.code !== "string") {
      return Response.json(
        { error: "Code content is required." },
        { status: 400 }
      );
    }

    const prompt = (body.prompt || "").trim();
    if (!prompt) {
      return Response.json(
        { error: "A prompt instruction is required." },
        { status: 400 }
      );
    }

    const code = body.code;
    const selectedCode = typeof body.selectedCode === "string" ? body.selectedCode : "";
    const fileName = body.fileName || "file.txt";
    const language = body.language || "plaintext";
    const model = typeof body.model === "string" && body.model.trim() ? body.model.trim() : "gemini-2.5-flash";
    const mode = body.mode === "explain" ? "explain" : "edit";

    const hasSelection = selectedCode.trim().length > 0;

    let systemPrompt = "";
    let userPrompt = "";

    if (mode === "explain") {
      systemPrompt =
        `You are Lumina AI, an expert software engineer inside Lumina IDE.\n` +
        `The user wants an explanation, code review, or advice for "${fileName}" (${language}).\n` +
        `Explain clearly, identify any syntax bugs, explain logic flow, and suggest improvements.\n` +
        `Format your response cleanly with markdown bullet points and headings.`;

      userPrompt = [
        `User Question: ${prompt}`,
        hasSelection ? `\nHIGHLIGHTED SECTION:\n${selectedCode}` : "",
        `\nFULL CODE (${fileName}):\n${code.slice(0, 100000)}`,
      ].join("\n");
    } else {
      // mode === "edit"
      systemPrompt =
        `You are Lumina AI, an expert pair programmer inside Lumina IDE.\n` +
        `Your task is to fix bugs, resolve syntax errors, and make requested improvements to "${fileName}" (${language}) with 100% precision.\n` +
        `\n` +
        `CRITICAL RULES:\n` +
        `1. ALWAYS check and fix syntax mistakes: unclosed HTML tags, missing quotes, unclosed braces/brackets, typos, invalid attributes, and syntax errors.\n` +
        `2. You MUST structure your answer into exactly two sections with these exact headers:\n` +
        `=== EXPLANATION ===\n` +
        `[Write brief, clear bullet points describing what issues were found, what changes were made, and any notes for the developer]\n` +
        `\n` +
        `=== CODE ===\n` +
        (hasSelection
          ? `[Output ONLY the replacement code for the highlighted selection. Do NOT include unchanged surrounding code. Do NOT wrap in markdown code blocks (\`\`\`).]`
          : `[Output the COMPLETE updated file content from start to finish with all fixes applied. Do NOT omit any code, do NOT use placeholders like "...rest of code unchanged". Do NOT wrap in markdown code blocks (\`\`\`).]`);

      userPrompt = [
        `User Instruction: ${prompt}`,
        hasSelection ? `\nHIGHLIGHTED CODE TO MODIFY:\n${selectedCode}` : "",
        `\nFILE CONTENT (${fileName}):\n${code.slice(0, 100000)}`,
      ].join("\n");
    }

    const activeModel = await getLanguageModel(model);
    const providerOptions = buildGoogleOptions(model);

    console.log(`[Lumina AI] Calling ${model} for ${fileName} (${mode})...`);

    const { text } = await generateText({
      model: activeModel,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.1,
      abortSignal: req.signal,
      ...(providerOptions ? { providerOptions } : {}),
    });

    if (mode === "explain") {
      return Response.json({
        success: true,
        mode: "explain",
        explanation: text.trim(),
        hasCodeChange: false,
      });
    }

    const explMarker = "=== EXPLANATION ===";
    const codeMarker = "=== CODE ===";

    const explIdx = text.indexOf(explMarker);
    const codeIdx = text.indexOf(codeMarker);

    let explanation = "";
    let updatedCode = "";

    if (explIdx !== -1 && codeIdx !== -1 && codeIdx > explIdx) {
      explanation = text.slice(explIdx + explMarker.length, codeIdx).trim();
      updatedCode = text.slice(codeIdx + codeMarker.length).trim();
    } else if (codeIdx !== -1) {
      updatedCode = text.slice(codeIdx + codeMarker.length).trim();
      explanation = text.slice(0, codeIdx).trim();
    } else {
      if (text.includes("<html") || text.includes("function") || text.includes("import") || text.includes("<div")) {
        updatedCode = text.trim();
        explanation = "Applied requested code updates and syntax fixes.";
      } else {
        explanation = text.trim();
        updatedCode = "";
      }
    }

    // Clean any accidental markdown code fences from updatedCode
    updatedCode = updatedCode.replace(/^```[a-zA-Z0-9_-]*\r?\n/, "").replace(/\r?\n```$/, "");

    console.log(`[Lumina AI] Successfully generated response for ${fileName} (${updatedCode.length} chars).`);

    return Response.json({
      success: true,
      mode: "edit",
      explanation,
      updatedCode,
      hasCodeChange: Boolean(updatedCode && updatedCode.length > 0),
      isSnippet: hasSelection,
    });
  } catch (err: unknown) {
    if (req.signal.aborted) {
      return new Response(null, { status: 499 });
    }

    console.error("Lumina AI route error:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to execute Lumina AI";
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}

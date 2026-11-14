import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { WebSocket } from "ws";
import { google, type GoogleLanguageModelOptions } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

export interface AiGhostClientOptions {
  roomName: string;
  wsUrl?: string;
  prompt: string;
  fileName?: string;
  language?: string;
  fullCode: string;
  selectedCode?: string;
  selection?: {
    startOffset: number;
    endOffset: number;
  };
  action?: "replace" | "insert_below" | "refactor" | "complete" | "smart_edit" | "full_rewrite";
  model?: string;
  abortSignal?: AbortSignal;
}

interface DiffBlock {
  search: string;
  replace: string;
}

function parseSearchReplaceBlocks(content: string): DiffBlock[] {
  const blocks: DiffBlock[] = [];
  const regex = /<{4,7}\s*SEARCH\s*\r?\n([\s\S]*?)\r?\n={4,7}\s*\r?\n([\s\S]*?)\r?\n>{4,7}\s*REPLACE/gi;
  let match;
  while ((match = regex.exec(content)) !== null) {
    blocks.push({
      search: match[1],
      replace: match[2],
    });
  }
  return blocks;
}

function applySearchReplaceBlocks(doc: Y.Doc, ytext: Y.Text, blocks: DiffBlock[]): number {
  let appliedCount = 0;
  for (const block of blocks) {
    const currentDoc = ytext.toString();
    let idx = currentDoc.indexOf(block.search);
    let lenToDelete = block.search.length;

    // 1. Exact match with trimmed whitespace
    if (idx === -1 && currentDoc.includes(block.search.trim())) {
      idx = currentDoc.indexOf(block.search.trim());
      lenToDelete = block.search.trim().length;
    }

    // 2. Line-by-line whitespace-tolerant match
    if (idx === -1) {
      const docLines = currentDoc.split("\n");
      const searchLines = block.search.trim().split("\n").map((l) => l.trim());
      if (searchLines.length > 0 && searchLines[0].length > 0) {
        for (let i = 0; i <= docLines.length - searchLines.length; i++) {
          let match = true;
          for (let j = 0; j < searchLines.length; j++) {
            if (docLines[i + j].trim() !== searchLines[j]) {
              match = false;
              break;
            }
          }
          if (match) {
            let charOffset = 0;
            for (let k = 0; k < i; k++) {
              charOffset += docLines[k].length + 1;
            }
            let matchLength = 0;
            for (let k = 0; k < searchLines.length; k++) {
              matchLength += docLines[i + k].length + (k < searchLines.length - 1 ? 1 : 0);
            }
            idx = charOffset;
            lenToDelete = matchLength;
            break;
          }
        }
      }
    }

    if (idx !== -1) {
      doc.transact(() => {
        ytext.delete(idx, lenToDelete);
        ytext.insert(idx, block.replace);
      }, "lumina-ai-surgical");
      appliedCount++;
    } else {
      console.warn("[Lumina AI Ghost] Could not locate exact search block:", block.search.slice(0, 50));
    }
  }
  return appliedCount;
}

const COLLAB_WS_URL = process.env.NEXT_PUBLIC_COLLAB_WS_URL || "ws://localhost:1234";
const DEFAULT_MODEL =
  process.env.AI_MODEL ||
  process.env.GEMINI_MODEL ||
  (process.env.GROQ_API_KEY
    ? "openai/gpt-oss-120b"
    : "gemini-2.5-flash");

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

function getLanguageModel(modelName: string) {
  const norm = (modelName || "").trim().toLowerCase();

  // 1. Groq Models (Llama 3.3 70B, DeepSeek R1 Distill) - Fastest Free Tier
  if (
    norm.includes("llama") ||
    norm.includes("deepseek") ||
    norm.includes("mixtral") ||
    (Boolean(process.env.GROQ_API_KEY) &&
      !norm.startsWith("gemini") &&
      !norm.startsWith("gpt-") &&
      !norm.startsWith("qwen"))
  ) {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      throw new Error(
        "Missing GROQ_API_KEY in .env. Please get a free key from https://console.groq.com/keys and add GROQ_API_KEY=gsk_... to your .env file."
      );
    }
    const groq = createOpenAI({
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: groqKey,
    });
    return groq(modelName);
  }

  // 2. OpenRouter Models (Qwen 2.5 Coder Free, etc.)
  if (norm.includes("qwen") || norm.includes(":free")) {
    const openrouterKey = process.env.OPENROUTER_API_KEY || "";
    const openrouter = createOpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: openrouterKey,
    });
    return openrouter(modelName);
  }

  // 3. OpenAI Official or GitHub Models (GPT-4o, GPT-4o-mini, o3-mini)
  if (
    norm.startsWith("gpt-") ||
    norm.startsWith("o3-") ||
    norm.startsWith("o1-")
  ) {
    if (process.env.OPENAI_API_KEY) {
      const openai = createOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      return openai(modelName);
    }

    const token = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT;
    if (token) {
      // Official GitHub Models inference endpoint
      const github = createOpenAI({
        baseURL: "https://models.github.ai/inference",
        apiKey: token,
      });
      return github(modelName);
    }

    throw new Error(
      "Missing API key for GPT models. Please add OPENAI_API_KEY in your .env file, or choose Gemini 3.5 Flash Lite / Groq Llama 3.3 70B."
    );
  }

  // 4. Google Gemini Models (Default Free Tier)
  let geminiModel = modelName;
  if (!norm.startsWith("gemini-") || norm === "gemini-2.5-pro") {
    geminiModel = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  }

  return google(geminiModel);
}

export async function runAiGhostClient(options: AiGhostClientOptions) {
  const {
    roomName,
    wsUrl = COLLAB_WS_URL,
    prompt,
    fileName = "file.txt",
    language = "plaintext",
    fullCode,
    selectedCode = "",
    selection = { startOffset: 0, endOffset: 0 },
    action = "replace",
    model: requestedModel,
    abortSignal,
  } = options;

  const chosenModel = requestedModel || DEFAULT_MODEL;

  console.log(`[Lumina AI Ghost] Joining room ${roomName} via ${wsUrl}...`);

  const doc = new Y.Doc();
  const provider = new WebsocketProvider(wsUrl, roomName, doc, {
    WebSocketPolyfill: WebSocket as unknown as typeof globalThis.WebSocket,
  });

  try {
    // Wait for Yjs sync with the room (with timeout)
    await Promise.race([
      new Promise<void>((resolve) => {
        if (provider.synced) return resolve();
        const handler = (isSynced: boolean) => {
          if (isSynced) {
            provider.off("sync", handler);
            resolve();
          }
        };
        provider.on("sync", handler);
      }),
      new Promise<void>((_, reject) =>
        setTimeout(
          () => reject(new Error("Timeout waiting for collaboration server sync")),
          10000
        )
      ),
    ]);

    console.log(`[Lumina AI Ghost] Synced with room ${roomName}. Registering telepresence...`);

    const ytext = doc.getText("monaco");

    // Compute target indices
    const hasSelection =
      selectedCode.trim().length > 0 &&
      selection.endOffset > selection.startOffset &&
      selection.endOffset <= ytext.length;

    const targetStart = hasSelection ? selection.startOffset : selection.startOffset || ytext.length;
    const targetEnd = hasSelection ? selection.endOffset : targetStart;

    // Register AI Identity in Awareness
    let currentRelPos = Y.createRelativePositionFromTypeIndex(ytext, targetStart);

    const normModel = chosenModel.toLowerCase();
    let modelBadge = "AI";
    let aiColor = "#e14e7a";

    if (normModel.includes("llama")) {
      modelBadge = "Llama 3.3 70B";
      aiColor = "#f97316";
    } else if (normModel.includes("deepseek")) {
      modelBadge = "DeepSeek R1";
      aiColor = "#0284c7";
    } else if (normModel.startsWith("gpt-") || normModel.startsWith("o3-")) {
      modelBadge = normModel.includes("4o-mini") ? "GPT-4o mini" : "GPT-4o";
      aiColor = "#10a37f";
    } else if (normModel.includes("qwen")) {
      modelBadge = "Qwen Coder";
      aiColor = "#8b5cf6";
    } else if (normModel.includes("flash")) {
      modelBadge = "Gemini Flash";
      aiColor = "#e14e7a";
    }

    provider.awareness.setLocalStateField("user", {
      name: `Lumina AI (${modelBadge})`,
      color: aiColor,
      colorLight: `${aiColor}33`,
      isAI: true,
    });
    provider.awareness.setLocalStateField("selection", {
      anchor: currentRelPos,
      head: currentRelPos,
    });

    let systemPrompt = "";
    let userPrompt = "";

    const isSmartDiff = !hasSelection && action !== "insert_below" && action !== "full_rewrite";

    let hasAppliedInitialClear = false;
    const applyInitialClearIfNeeded = () => {
      if (hasAppliedInitialClear) return;
      hasAppliedInitialClear = true;

      if (!isSmartDiff && (action === "replace" || action === "refactor" || action === "full_rewrite")) {
        if (hasSelection) {
          doc.transact(() => {
            ytext.delete(targetStart, targetEnd - targetStart);
          }, "lumina-ai-delete");
          currentRelPos = Y.createRelativePositionFromTypeIndex(ytext, targetStart);
        } else if (action === "full_rewrite") {
          doc.transact(() => {
            ytext.delete(0, ytext.length);
          }, "lumina-ai-delete-all");
          currentRelPos = Y.createRelativePositionFromTypeIndex(ytext, 0);
        }
      }
    };

    if (action === "insert_below") {
      // Insert below cursor / selection
      let insertIndex = targetStart;
      if (hasSelection) {
        const textVal = ytext.toString();
        const nextNewline = textVal.indexOf("\n", targetEnd);
        insertIndex = nextNewline !== -1 ? nextNewline + 1 : ytext.length;
      }
      currentRelPos = Y.createRelativePositionFromTypeIndex(ytext, insertIndex);

      systemPrompt =
        "You are Lumina AI, an expert pair programmer working directly inside Monaco Editor.\n" +
        `The user wants you to generate code to insert into "${fileName}" (${language}) at their cursor or below their selection.\n` +
        "RULES:\n" +
        "1. Output ONLY the new code to insert.\n" +
        "2. Do NOT use markdown code fences (no ``` or ```language) unless editing a markdown file.\n" +
        "3. Do NOT include conversational filler, explanations, or greeting.\n" +
        "4. Align indentation with the surrounding code.";

      userPrompt = [
        `User Instruction: ${prompt}`,
        selectedCode ? `\nCode above insertion:\n${selectedCode}` : "",
        `\nSurrounding document context (${fileName}):\n${fullCode.slice(0, 50000)}`,
      ].filter(Boolean).join("\n");
    } else if (hasSelection) {
      // Targeted replacement of highlighted code block
      systemPrompt =
        "You are Lumina AI, an expert pair programmer working directly inside Monaco Editor.\n" +
        `The user highlighted a section of code in "${fileName}" (${language}) and wants it replaced/refactored.\n` +
        "RULES:\n" +
        "1. Output ONLY the replacement code for the highlighted block.\n" +
        "2. Do NOT repeat surrounding code that was not highlighted.\n" +
        "3. Do NOT use markdown code fences (no ``` or ```language) unless editing a markdown file.\n" +
        "4. Do NOT include conversational filler, explanations, or greeting.\n" +
        "5. Preserve indentation and match surrounding style.";

      userPrompt = [
        `User Instruction: ${prompt}`,
        "",
        `HIGHLIGHTED CODE TO REPLACE:`,
        selectedCode,
        "",
        `FULL FILE CONTEXT (${fileName}):`,
        fullCode.slice(0, 50000),
      ].join("\n");
    } else if (action === "full_rewrite") {
      // Explicit full file replacement
      systemPrompt =
        "You are Lumina AI, an expert pair programmer working directly inside Monaco Editor.\n" +
        `The user requested a full file regeneration of "${fileName}" (${language}).\n` +
        "RULES:\n" +
        "1. Output the COMPLETE updated file content from start to finish.\n" +
        "2. Do NOT use markdown code fences unless editing a markdown file.\n" +
        "3. Do NOT include conversational filler or placeholders like '...rest of code'.";

      userPrompt = [
        `User Instruction: ${prompt}`,
        "",
        `CURRENT FILE CONTENT (${fileName}):`,
        fullCode.slice(0, 80000),
      ].join("\n");
    } else {
      // SURGICAL SMART EDIT: Default when no code is highlighted!
      // Uses Search & Replace diff blocks so the remaining 99% of the file is NEVER touched or truncated!
      systemPrompt =
        "You are Lumina AI, an expert pair programmer working directly inside Monaco Editor.\n" +
        `The user wants to make a modification in "${fileName}" (${language}): "${prompt}".\n` +
        "RULES:\n" +
        "1. Do NOT rewrite the whole file. Make ONLY the minimal necessary changes.\n" +
        "2. Output one or more SEARCH/REPLACE blocks formatted EXACTLY like this:\n" +
        "<<<<<<< SEARCH\n" +
        "[exact original lines or snippet from the file to change]\n" +
        "=======\n" +
        "[new replacement lines or snippet]\n" +
        ">>>>>>> REPLACE\n" +
        "3. The SEARCH block must match text in the file EXACTLY, character for character, including whitespace.\n" +
        "4. Keep the SEARCH block as small and specific as possible (1-5 lines).\n" +
        "5. Do NOT include markdown code fences (```) or conversational explanations.";

      userPrompt = [
        `User Instruction: ${prompt}`,
        "",
        `FILE CONTENT (${fileName}):`,
        fullCode.slice(0, 100000),
      ].join("\n");
    }

    console.log(`[Lumina AI Ghost] Requesting model ${chosenModel}...`);

    let activeModel;
    try {
      activeModel = getLanguageModel(chosenModel);
    } catch (modelErr) {
      if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        console.warn(`[Lumina AI Ghost] Primary model init failed, falling back to Gemini 2.0 Flash:`, modelErr);
        activeModel = google("gemini-2.0-flash");
      } else {
        throw modelErr;
      }
    }

    let accumulatedText = "";

    const processStream = async (textStream: AsyncIterable<string>) => {
      for await (const chunk of textStream) {
        if (abortSignal?.aborted) break;
        if (!chunk) continue;

        accumulatedText += chunk;

        // In Smart Diff mode, we accumulate the diff blocks and apply them surgically
        // so raw <<<<<<< SEARCH fences don't pollute the user's document!
        if (isSmartDiff) {
          continue;
        }

        let cleanChunk = chunk;

        if (
          language !== "markdown" &&
          language !== "md" &&
          accumulatedText.startsWith("```")
        ) {
          cleanChunk = cleanChunk.replace(/^```[a-zA-Z0-9_-]*\n?/, "");
        }

        cleanChunk = cleanChunk.replace(/```$/, "");
        if (!cleanChunk) continue;

        // Safely clear old code ONLY once we have the first real chunk from the LLM!
        applyInitialClearIfNeeded();

        const absPos = Y.createAbsolutePositionFromRelativePosition(currentRelPos, doc);
        if (absPos === null || absPos.type !== ytext) {
          console.warn("[Lumina AI Ghost] Could not resolve relative position, fallback to end");
          continue;
        }

        doc.transact(() => {
          ytext.insert(absPos.index, cleanChunk);
        }, "lumina-ai-insert");

        currentRelPos = Y.createRelativePositionFromTypeIndex(
          ytext,
          absPos.index + cleanChunk.length
        );

        provider.awareness.setLocalStateField("selection", {
          anchor: currentRelPos,
          head: currentRelPos,
        });

        await new Promise((r) => setTimeout(r, 20));
      }

      // If Smart Diff mode, parse and apply the search/replace blocks now
      if (isSmartDiff && accumulatedText.trim().length > 0) {
        const blocks = parseSearchReplaceBlocks(accumulatedText);
        if (blocks.length > 0) {
          const count = applySearchReplaceBlocks(doc, ytext, blocks);
          console.log(`[Lumina AI Ghost] Applied ${count}/${blocks.length} surgical search/replace blocks.`);
        } else {
          console.warn("[Lumina AI Ghost] No search/replace blocks found in output, checking if direct replacement text...");
        }
      }
    };

    const isGoogle =
      !normModel.includes("llama") &&
      !normModel.includes("deepseek") &&
      !normModel.startsWith("gpt-") &&
      !normModel.startsWith("o3-") &&
      !normModel.includes("qwen");

    const providerOptions = isGoogle ? buildGoogleOptions(chosenModel) : undefined;
    let lastError: Error | null = null;

    try {
      const result = streamText({
        model: activeModel,
        system: systemPrompt,
        prompt: userPrompt,
        abortSignal,
        temperature: 0.2,
        ...(providerOptions ? { providerOptions } : {}),
      });

      console.log(`[Lumina AI Ghost] Streaming chunks into Yjs CRDT doc...`);
      await processStream(result.textStream);
    } catch (streamErr: unknown) {
      lastError = streamErr instanceof Error ? streamErr : new Error(String(streamErr));
      console.warn(`[Lumina AI Ghost] Stream failed with primary model (${chosenModel}):`, streamErr);
    }

    // If primary model yielded 0 characters, fall back to tested working Gemini models
    if (
      accumulatedText.length === 0 &&
      process.env.GOOGLE_GENERATIVE_AI_API_KEY
    ) {
      const candidates = [
        process.env.GEMINI_MODEL,
        "gemini-3.5-flash-lite",
        "gemini-2.5-flash",
        "gemini-1.5-flash",
      ].filter(Boolean) as string[];

      for (const candidate of candidates) {
        if (accumulatedText.length > 0) break;
        if (candidate === chosenModel) continue;

        try {
          console.log(`[Lumina AI Ghost] Attempting fallback with ${candidate}...`);
          const candidateOptions = buildGoogleOptions(candidate);
          const fallbackResult = streamText({
            model: google(candidate),
            system: systemPrompt,
            prompt: userPrompt,
            abortSignal,
            temperature: 0.2,
            ...(candidateOptions ? { providerOptions: candidateOptions } : {}),
          });
          await processStream(fallbackResult.textStream);
        } catch (fallbackErr: unknown) {
          lastError = fallbackErr instanceof Error ? fallbackErr : new Error(String(fallbackErr));
          console.warn(`[Lumina AI Ghost] Fallback to ${candidate} failed:`, fallbackErr);
        }
      }
    }

    if (accumulatedText.length === 0) {
      if (lastError) {
        throw lastError;
      }
      throw new Error(
        `Model ${chosenModel} produced 0 characters. Please verify your API key in .env.`
      );
    }

    console.log(`[Lumina AI Ghost] Stream complete. Total inserted: ${accumulatedText.length} chars.`);

    // Keep cursor briefly visible then clear
    await new Promise((r) => setTimeout(r, 600));

    return {
      success: true,
      textLength: accumulatedText.length,
    };
  } finally {
    // Clear awareness state
    try {
      provider.awareness.setLocalState(null);
    } catch {}
    provider.destroy();
  }
}

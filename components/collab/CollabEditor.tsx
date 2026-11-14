"use client";

import React, { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  Check,
  Code2,
  FileCode,
  Loader2,
  Moon,
  PanelRightClose,
  PanelRightOpen,
  RotateCcw,
  Save,
  Sparkles,
  Sun,
  Undo2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { Models } from "node-appwrite";
import type { editor as MonacoEditor } from "monaco-editor";
import { updateFileContent } from "@/lib/appwrite/file.action";
import { getFileSize } from "@/lib/utils";

// Dynamically import Monaco Editor to prevent SSR issues
const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

export type MonacoInstance = typeof import("monaco-editor");

interface CollabEditorProps {
  file: Models.DefaultRow;
  initialContent: string;
  currentUser: {
    $id: string;
    fullName: string;
    email: string;
  };
}

interface AiMessage {
  id: string;
  role: "user" | "assistant";
  prompt?: string;
  explanation?: string;
  timestamp: string;
  hasCodeChange?: boolean;
}

function getMonacoLanguage(extension: string): string {
  const ext = (extension || "").replace(".", "").toLowerCase();
  switch (ext) {
    case "js":
    case "jsx":
    case "mjs":
    case "cjs":
      return "javascript";
    case "ts":
    case "tsx":
      return "typescript";
    case "py":
      return "python";
    case "html":
    case "htm":
      return "html";
    case "css":
    case "scss":
    case "less":
      return "css";
    case "json":
      return "json";
    case "md":
    case "markdown":
      return "markdown";
    case "sql":
      return "sql";
    case "cpp":
    case "c":
    case "h":
    case "hpp":
      return "cpp";
    case "java":
      return "java";
    case "go":
      return "go";
    case "rs":
      return "rust";
    case "php":
      return "php";
    case "yaml":
    case "yml":
      return "yaml";
    case "xml":
    case "svg":
      return "xml";
    case "sh":
    case "bash":
      return "shell";
    default:
      return "plaintext";
  }
}

export default function CollabEditor({
  file,
  initialContent,
  currentUser,
}: CollabEditorProps) {
  const [language, setLanguage] = useState(() => getMonacoLanguage(file.extension));
  const [theme, setTheme] = useState<"vs-dark" | "light">("vs-dark");
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(true);

  // Side Panel state
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(true);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiModel, setAiModel] = useState<string>("openai/gpt-oss-120b");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [selectedRange, setSelectedRange] = useState<{
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  } | null>(null);

  const [aiMessages, setAiMessages] = useState<AiMessage[]>([]);

  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<MonacoInstance | null>(null);

  // Handle Monaco onMount
  const handleEditorMount = (
    editor: MonacoEditor.IStandaloneCodeEditor,
    monaco: MonacoInstance
  ) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Set initial content if model is empty
    const model = editor.getModel();
    if (model && initialContent && model.getValue().length === 0) {
      model.setValue(initialContent);
    }

    // Mark dirty on content changes
    editor.onDidChangeModelContent(() => {
      setIsSaved(false);
    });

    // Track active selection
    editor.onDidChangeCursorSelection(() => {
      const selection = editor.getSelection();
      if (selection && !selection.isEmpty()) {
        const text = editor.getModel()?.getValueInRange(selection);
        setSelectedText(text || "");
        setSelectedRange({
          startLine: selection.startLineNumber,
          startColumn: selection.startColumn,
          endLine: selection.endLineNumber,
          endColumn: selection.endColumn,
        });
      } else {
        setSelectedText("");
        setSelectedRange(null);
      }
    });

    // Keyboard Shortcut: Ctrl+J / Cmd+J toggles the AI Assistant Panel
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyJ, () => {
      setIsAiPanelOpen((prev) => !prev);
    });

    // Keyboard Shortcut: Ctrl+S / Cmd+S saves to Appwrite Storage
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave();
    });
  };

  // Save current editor text back to Appwrite Storage
  const handleSave = useCallback(async () => {
    if (isSaving || !editorRef.current) return;
    setIsSaving(true);
    const content = editorRef.current.getValue();

    try {
      const res = await updateFileContent({
        fileId: file.$id,
        bucketFileId: file.bucketFileId,
        fileName: file.name,
        content,
        path: `/editor/${file.$id}`,
      });

      if (res) {
        setIsSaved(true);
        toast.success("File saved to storage successfully");
      } else {
        toast.error("Failed to save file to storage");
      }
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Error saving file");
    } finally {
      setIsSaving(false);
    }
  }, [file.$id, file.bucketFileId, file.name, isSaving]);

  // Revert editor content back to the saved storage version
  const handleRevert = useCallback(() => {
    if (!initialContent) {
      toast.error("No saved storage version found to revert to");
      return;
    }

    if (
      window.confirm(
        "Are you sure you want to revert to the saved storage version? This will restore your original file and discard recent edits."
      )
    ) {
      const editor = editorRef.current;
      const model = editor?.getModel();
      if (model) {
        const fullRange = model.getFullModelRange();
        editor?.executeEdits("lumina-revert", [
          {
            range: fullRange,
            text: initialContent,
            forceMoveMarkers: true,
          },
        ]);
        setIsSaved(true);
        toast.success("File restored from storage!");
      }
    }
  }, [initialContent]);

  // Undo AI Change via Monaco Native Undo
  const handleUndo = () => {
    if (editorRef.current) {
      editorRef.current.trigger("source", "undo", null);
      toast.info("Undid previous edit (Ctrl+Z)");
    }
  };

  // Trigger the AI Assistant
  const handleTriggerAi = useCallback(
    async (overridePrompt?: string, mode: "edit" | "explain" = "edit") => {
      const promptToSend = (overridePrompt || aiPrompt).trim();
      if (!promptToSend || isAiGenerating || !editorRef.current) return;

      setIsAiGenerating(true);
      const editor = editorRef.current;
      const model = editor.getModel();

      if (!model) {
        setIsAiGenerating(false);
        return;
      }

      const currentCode = editor.getValue();
      const highlightedCode = selectedText || "";
      const activeSelection = editor.getSelection();

      // Append user message to panel history
      const userMessageId = Date.now().toString();
      const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      setAiMessages((prev) => [
        ...prev,
        {
          id: userMessageId,
          role: "user",
          prompt: promptToSend,
          timestamp: nowTime,
        },
      ]);

      setAiPrompt("");

      try {
        const res = await fetch("/api/collab/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            language,
            code: currentCode,
            selectedCode: highlightedCode,
            prompt: promptToSend,
            model: aiModel,
            mode,
          }),
        });

        const data = await res.json();

        if (!res.ok || data.error) {
          throw new Error(data.error || "Lumina AI could not complete request");
        }

        // If code changes were generated, apply them cleanly to Monaco with native Undo!
        if (data.hasCodeChange && data.updatedCode) {
          if (data.isSnippet && activeSelection && !activeSelection.isEmpty()) {
            // Replace only the highlighted section
            editor.executeEdits("lumina-ai-assistant", [
              {
                range: activeSelection,
                text: data.updatedCode,
                forceMoveMarkers: true,
              },
            ]);
          } else {
            // Replace full model cleanly
            const fullRange = model.getFullModelRange();
            editor.executeEdits("lumina-ai-assistant", [
              {
                range: fullRange,
                text: data.updatedCode,
                forceMoveMarkers: true,
              },
            ]);
          }
          setIsSaved(false);
          toast.success("AI changes applied to editor!");
        }

        // Add AI response & feedback to the side panel
        setAiMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            explanation: data.explanation || "No specific comments provided.",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            hasCodeChange: data.hasCodeChange,
          },
        ]);
      } catch (err: unknown) {
        console.error("AI Error:", err);
        const msg = err instanceof Error ? err.message : "Failed to run Lumina AI";
        toast.error(msg);
        setAiMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            explanation: `⚠️ **Error:** ${msg}`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            hasCodeChange: false,
          },
        ]);
      } finally {
        setIsAiGenerating(false);
      }
    },
    [aiPrompt, isAiGenerating, selectedText, file.name, language, aiModel]
  );

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* 1. Top Header Toolbar */}
      <header className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800 text-xs shrink-0 gap-3">
        {/* Left: Back + File Name & Type */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline font-medium">Dashboard</span>
          </Link>

          <div className="h-4 w-px bg-slate-800" />

          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-pink-500/15 text-[#e14e7a] flex items-center justify-center shrink-0">
              <Code2 className="w-4 h-4" />
            </div>
            <span className="font-semibold text-sm text-slate-200 truncate max-w-[200px] sm:max-w-xs">
              {file.name}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium uppercase bg-slate-800 text-slate-400">
              {file.extension || "txt"}
            </span>
          </div>
        </div>

        {/* Center: Save status */}
        <div className="hidden md:flex items-center gap-2">
          {isSaved ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800/80 text-slate-400 text-[11px] font-medium border border-slate-700/60">
              <Check className="w-3 h-3 text-emerald-400" />
              <span>Saved in Storage</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[11px] font-medium border border-amber-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>Unsaved changes</span>
            </span>
          )}
        </div>

        {/* Right: Actions (Revert, Save, Language, Theme, AI Toggle) */}
        <div className="flex items-center gap-2">
          {/* Revert Button */}
          <button
            type="button"
            onClick={handleRevert}
            disabled={isSaving || isAiGenerating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-all cursor-pointer bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 text-xs"
            title="Revert file to the original version in Appwrite storage"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Revert</span>
          </button>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-medium transition-all cursor-pointer ${
              isSaved
                ? "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
            }`}
            title="Save changes to Appwrite Storage (Ctrl+S)"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isSaved ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{isSaving ? "Saving..." : isSaved ? "Saved" : "Save"}</span>
          </button>

          {/* Language Selector */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-slate-800 text-slate-300 border border-slate-700 rounded-lg px-2 py-1 text-xs cursor-pointer focus:outline-none focus:border-[#e14e7a]"
          >
            <option value="html">HTML</option>
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
            <option value="css">CSS</option>
            <option value="json">JSON</option>
            <option value="markdown">Markdown</option>
            <option value="sql">SQL</option>
            <option value="cpp">C++</option>
            <option value="rust">Rust</option>
            <option value="plaintext">Plain Text</option>
          </select>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={() => setTheme((prev) => (prev === "vs-dark" ? "light" : "vs-dark"))}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 transition-colors"
            title={theme === "vs-dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}
          >
            {theme === "vs-dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          {/* AI Panel Toggle Pill */}
          <button
            type="button"
            onClick={() => setIsAiPanelOpen((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold transition-all cursor-pointer shadow-xs ${
              isAiPanelOpen
                ? "bg-gradient-to-r from-[#e14e7a] to-[#ff8cae] text-white shadow-pink-500/20"
                : "bg-slate-800 hover:bg-slate-700 text-pink-300 border border-pink-500/30"
            }`}
            title="Toggle Lumina AI Assistant Side Panel (Ctrl+J)"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Assistant</span>
            {isAiPanelOpen ? (
              <PanelRightClose className="w-3.5 h-3.5 opacity-80" />
            ) : (
              <PanelRightOpen className="w-3.5 h-3.5 opacity-80" />
            )}
          </button>
        </div>
      </header>

      {/* 2. Main Workspace Split Layout: Monaco Editor (Left) + AI Assistant Panel (Right) */}
      <div className="flex-1 flex w-full min-h-0 relative overflow-hidden">
        {/* LEFT / CENTER: Monaco Code Editor */}
        <div className="flex-1 h-full min-w-0 relative">
          <Editor
            height="100%"
            path={`file-${file.$id}`}
            language={language}
            theme={theme}
            onMount={handleEditorMount}
            options={{
              fontFamily: "var(--font-mono), Consolas, 'Courier New', monospace",
              fontSize: 14,
              lineHeight: 22,
              minimap: { enabled: true },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              smoothScrolling: true,
              cursorBlinking: "smooth",
              cursorSmoothCaretAnimation: "on",
              padding: { top: 16, bottom: 16 },
              wordWrap: "on",
              renderWhitespace: "selection",
            }}
          />
        </div>

        {/* RIGHT: Dedicated AI Assistant Side Panel (Antigravity / Cursor style) */}
        {isAiPanelOpen && (
          <aside className="w-80 md:w-96 lg:w-[420px] h-full bg-slate-900 border-l border-slate-800 flex flex-col shrink-0 transition-all duration-300 shadow-2xl z-20">
            {/* Panel Top Header */}
            <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#e14e7a] to-[#ff8cae] flex items-center justify-center text-white shadow-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <span className="font-semibold text-xs tracking-wide text-slate-200">
                  Lumina AI Assistant
                </span>
              </div>

              {/* Model Dropdown */}
              <div className="flex items-center gap-1.5">
                <select
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  className="bg-slate-900 text-slate-200 border border-slate-700/80 rounded-md px-2 py-0.5 text-[11px] cursor-pointer focus:outline-none focus:border-[#e14e7a]"
                  title="Select AI Model"
                >
                  <option value="openai/gpt-oss-120b">Groq GPT-OSS 120B (Groq Key - Best)</option>
                  <option value="llama-3.1-8b-instant">Groq Llama 3.1 8B (Groq Key - Ultra Fast)</option>
                  <option value="openai/gpt-oss-20b">Groq GPT-OSS 20B (Groq Key)</option>
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash (Google Free)</option>
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash (Google Free)</option>
                  <option value="gpt-4o">GPT-4o (OpenAI Key)</option>
                  <option value="gpt-4o-mini">GPT-4o Mini (OpenAI Key)</option>
                </select>

                <button
                  type="button"
                  onClick={() => setIsAiPanelOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
                  title="Close Side Panel"
                >
                  <PanelRightClose className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Selection Status Banner (if user highlighted text in Monaco) */}
            {selectedText ? (
              <div className="bg-pink-950/40 border-b border-pink-500/20 px-3 py-1.5 flex items-center justify-between text-[11px] text-pink-300 shrink-0">
                <span className="truncate">
                  Lines {selectedRange?.startLine}–{selectedRange?.endLine} ({selectedText.length} chars selected)
                </span>
                <span className="text-[10px] font-semibold bg-pink-500/20 text-pink-200 px-1.5 py-0.5 rounded">
                  Targeted
                </span>
              </div>
            ) : null}

            {/* Conversation / Feedback Feed */}
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 min-h-0 text-xs">
              {aiMessages.length === 0 ? (
                /* Empty state with suggested prompts */
                <div className="flex flex-col items-center justify-center h-full text-center p-4 text-slate-400 gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-pink-500/10 text-[#e14e7a] flex items-center justify-center">
                    <Bot className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-200 text-sm">How can Lumina AI help?</h4>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                      Ask me to fix syntax errors, modify elements, optimize performance, or explain your code.
                    </p>
                  </div>

                  {/* Suggestion Chips */}
                  <div className="flex flex-col gap-1.5 w-full mt-2">
                    {[
                      { icon: "🔍", text: "Fix all syntax & closing tag errors" },
                      { icon: "🧹", text: "Clean and format code structure" },
                      { icon: "💡", text: "Explain what this file does" },
                      { icon: "⚡", text: "Optimize performance & responsiveness" },
                    ].map((item) => (
                      <button
                        key={item.text}
                        type="button"
                        onClick={() => handleTriggerAi(item.text, item.text.startsWith("Explain") ? "explain" : "edit")}
                        className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-pink-500/40 text-left text-slate-300 text-xs transition-all cursor-pointer"
                      >
                        <span className="text-sm shrink-0">{item.icon}</span>
                        <span className="truncate">{item.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* List of conversation interactions */
                aiMessages.map((msg) => (
                  <div key={msg.id} className="flex flex-col gap-1.5">
                    {msg.role === "user" ? (
                      /* User Question / Instruction */
                      <div className="self-end max-w-[85%] bg-slate-800 text-slate-100 rounded-2xl rounded-tr-xs px-3 py-2 text-xs border border-slate-700/60 shadow-xs">
                        <p>{msg.prompt}</p>
                        <span className="text-[10px] text-slate-400 block text-right mt-1">
                          {msg.timestamp}
                        </span>
                      </div>
                    ) : (
                      /* AI Explanation & Feedback Card */
                      <div className="self-start w-full bg-slate-950 rounded-2xl rounded-tl-xs p-3 text-xs border border-slate-800 shadow-md flex flex-col gap-2">
                        {/* Header badge */}
                        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                          <span className="inline-flex items-center gap-1.5 text-pink-300 font-semibold text-[11px]">
                            <Sparkles className="w-3.5 h-3.5 text-[#e14e7a]" />
                            Lumina Feedback
                          </span>
                          {msg.hasCodeChange && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                              <Check className="w-2.5 h-2.5" /> Applied to Editor
                            </span>
                          )}
                        </div>

                        {/* Explanation Content */}
                        <div className="text-slate-300 text-[12px] leading-relaxed whitespace-pre-wrap font-sans">
                          {msg.explanation}
                        </div>

                        {/* Footer action tools */}
                        {msg.hasCodeChange && (
                          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 mt-1">
                            <span className="text-[10px] text-slate-500">{msg.timestamp}</span>
                            <button
                              type="button"
                              onClick={handleUndo}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Undo this change in Monaco (Ctrl+Z)"
                            >
                              <Undo2 className="w-3 h-3" />
                              <span>Undo</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}

              {/* Generating loading state */}
              {isAiGenerating && (
                <div className="p-3 rounded-2xl bg-slate-950 border border-pink-500/30 flex items-center gap-2.5 text-pink-300 animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin text-[#e14e7a] shrink-0" />
                  <span className="text-xs font-medium">Lumina AI is inspecting and repairing code...</span>
                </div>
              )}
            </div>

            {/* Bottom Prompt Input Area */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 flex flex-col gap-2 shrink-0">
              <div className="relative">
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleTriggerAi();
                    }
                  }}
                  disabled={isAiGenerating}
                  rows={2}
                  placeholder={
                    selectedText
                      ? "Instruct AI on highlighted code..."
                      : "Ask Lumina AI (e.g. 'Fix syntax errors', 'Rename to Alex')..."
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#e14e7a] resize-none"
                />
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleTriggerAi(undefined, "explain")}
                  disabled={isAiGenerating || !aiPrompt.trim()}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition-colors disabled:opacity-40 cursor-pointer"
                  title="Explain or review without changing code"
                >
                  Explain Only
                </button>

                <button
                  type="button"
                  onClick={() => handleTriggerAi(undefined, "edit")}
                  disabled={isAiGenerating || !aiPrompt.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#e14e7a] to-[#ff8cae] hover:opacity-90 disabled:opacity-40 text-white font-semibold text-xs shadow-md shadow-pink-500/20 transition-all cursor-pointer"
                >
                  {isAiGenerating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="w-3.5 h-3.5" />
                  )}
                  <span>{selectedText ? "Fix Selection" : "Fix & Update"}</span>
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* 3. Bottom Status Bar */}
      <footer className="flex items-center justify-between px-4 py-1.5 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 shrink-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-slate-300">
            <FileCode className="w-3.5 h-3.5 text-slate-400" />
            <span>{file.name}</span>
          </span>
          <span>Language: <strong className="text-slate-300">{language}</strong></span>
          <span>Size: <strong className="text-slate-300">{getFileSize(file.size || 0)}</strong></span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-slate-500">
            Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">Ctrl+J</kbd> for AI Assistant
          </span>
          <span className="text-slate-500">
            Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">Ctrl+S</kbd> to Save
          </span>
        </div>
      </footer>
    </div>
  );
}

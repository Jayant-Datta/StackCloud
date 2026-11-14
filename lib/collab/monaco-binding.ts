import * as Y from "yjs";
import type { editor as MonacoEditor } from "monaco-editor";
import { Awareness } from "y-protocols/awareness";
import { createMutex } from "lib0/mutex";

export type MonacoInstance = typeof import("monaco-editor");

export interface RemoteUser {
  name: string;
  color: string;
  colorLight?: string;
  isAI?: boolean;
}

export interface RemoteUserState {
  user?: RemoteUser;
  selection?: {
    anchor: Y.RelativePosition;
    head: Y.RelativePosition;
  };
}

class RelativeSelection {
  start: Y.RelativePosition;
  end: Y.RelativePosition;
  direction: number;

  constructor(start: Y.RelativePosition, end: Y.RelativePosition, direction: number) {
    this.start = start;
    this.end = end;
    this.direction = direction;
  }
}

export class MonacoBinding {
  doc: Y.Doc;
  ytext: Y.Text;
  monacoModel: MonacoEditor.ITextModel;
  editor: MonacoEditor.IStandaloneCodeEditor;
  awareness: Awareness | null;
  monaco: MonacoInstance | null;
  mux: (cb: () => void) => void;

  private _savedSelection: RelativeSelection | null = null;
  private _decorations: string[] = [];
  private _ytextObserver: (event: Y.YTextEvent) => void;
  private _monacoChangeHandler: { dispose: () => void } | null = null;
  private _disposedListener: { dispose: () => void } | null = null;
  private _cursorListener: { dispose: () => void } | null = null;
  private _awarenessListener: (() => void) | null = null;
  private _beforeTransaction: () => void;
  private _isDestroyed = false;

  constructor(
    ytext: Y.Text,
    monacoModel: MonacoEditor.ITextModel,
    editor: MonacoEditor.IStandaloneCodeEditor,
    awareness: Awareness | null = null,
    monacoInstance?: MonacoInstance | null
  ) {
    this.doc = ytext.doc as Y.Doc;
    this.ytext = ytext;
    this.monacoModel = monacoModel;
    this.editor = editor;
    this.awareness = awareness;
    const globalMonaco =
      typeof window !== "undefined"
        ? (window as unknown as { monaco?: MonacoInstance }).monaco || null
        : null;
    this.monaco = monacoInstance || globalMonaco;
    this.mux = createMutex();

    // Clean up if the Monaco model is disposed externally
    this._disposedListener = this.monacoModel.onWillDispose(() => {
      this.destroy();
    });

    // 1. Save selection relative to document before transactions
    this._beforeTransaction = () => {
      if (this._isDestroyed || this.monacoModel.isDisposed()) return;
      this.mux(() => {
        if (this.monacoModel.isDisposed()) return;
        if (this.editor.getModel() === this.monacoModel) {
          const sel = this.editor.getSelection();
          if (sel !== null) {
            const startPos = sel.getStartPosition();
            const endPos = sel.getEndPosition();
            const start = Y.createRelativePositionFromTypeIndex(
              this.ytext,
              this.monacoModel.getOffsetAt(startPos)
            );
            const end = Y.createRelativePositionFromTypeIndex(
              this.ytext,
              this.monacoModel.getOffsetAt(endPos)
            );
            this._savedSelection = new RelativeSelection(start, end, sel.getDirection());
          }
        }
      });
    };
    this.doc.on("beforeAllTransactions", this._beforeTransaction);

    // 2. Observe Yjs changes and update Monaco Model
    this._ytextObserver = (event: Y.YTextEvent) => {
      if (this._isDestroyed || this.monacoModel.isDisposed()) {
        this.destroy();
        return;
      }
      this.mux(() => {
        if (this._isDestroyed || this.monacoModel.isDisposed()) return;
        let index = 0;
        event.delta.forEach((op) => {
          if (this.monacoModel.isDisposed()) return;
          if (op.retain !== undefined) {
            index += op.retain;
          } else if (op.insert !== undefined) {
            const pos = this.monacoModel.getPositionAt(index);
            const range = {
              startLineNumber: pos.lineNumber,
              startColumn: pos.column,
              endLineNumber: pos.lineNumber,
              endColumn: pos.column,
            };
            const insertText = typeof op.insert === "string" ? op.insert : "";
            this.monacoModel.applyEdits([{ range, text: insertText }]);
            index += insertText.length;
          } else if (op.delete !== undefined) {
            const pos = this.monacoModel.getPositionAt(index);
            const endPos = this.monacoModel.getPositionAt(index + op.delete);
            const range = {
              startLineNumber: pos.lineNumber,
              startColumn: pos.column,
              endLineNumber: endPos.lineNumber,
              endColumn: endPos.column,
            };
            this.monacoModel.applyEdits([{ range, text: "" }]);
          }
        });

        // Restore human selection accurately after remote edits
        if (
          !this.monacoModel.isDisposed() &&
          this._savedSelection !== null &&
          this.editor.getModel() === this.monacoModel
        ) {
          const start = Y.createAbsolutePositionFromRelativePosition(
            this._savedSelection.start,
            this.doc
          );
          const end = Y.createAbsolutePositionFromRelativePosition(
            this._savedSelection.end,
            this.doc
          );
          if (
            start !== null &&
            end !== null &&
            start.type === this.ytext &&
            end.type === this.ytext
          ) {
            const startPos = this.monacoModel.getPositionAt(start.index);
            const endPos = this.monacoModel.getPositionAt(end.index);
            const SelectionConstructor = this.monaco?.Selection;
            if (SelectionConstructor) {
              const newSel = SelectionConstructor.createWithDirection(
                startPos.lineNumber,
                startPos.column,
                endPos.lineNumber,
                endPos.column,
                this._savedSelection.direction
              );
              this.editor.setSelection(newSel);
            }
          }
        }
      });

      this.rerenderDecorations();
    };
    this.ytext.observe(this._ytextObserver);

    // Initial content synchronization check
    const currentYText = this.ytext.toString();
    if (!this.monacoModel.isDisposed()) {
      if (this.monacoModel.getValue() !== currentYText) {
        if (currentYText.length > 0) {
          this.monacoModel.setValue(currentYText);
        } else if (this.monacoModel.getValue().length > 0) {
          this.doc.transact(() => {
            this.ytext.insert(0, this.monacoModel.getValue());
          }, this);
        }
      }
    }

    // 3. Observe Monaco changes and update Yjs
    this._monacoChangeHandler = this.monacoModel.onDidChangeContent((event) => {
      if (this._isDestroyed || this.monacoModel.isDisposed()) return;
      this.mux(() => {
        this.doc.transact(() => {
          // Sort changes in reverse order to keep offsets stable
          const changes = [...event.changes].sort(
            (c1, c2) => c2.rangeOffset - c1.rangeOffset
          );
          changes.forEach((change) => {
            this.ytext.delete(change.rangeOffset, change.rangeLength);
            this.ytext.insert(change.rangeOffset, change.text);
          });
        }, this);
      });
    });

    // 4. Set up Awareness telepresence & cursors
    if (this.awareness) {
      this._cursorListener = this.editor.onDidChangeCursorSelection(() => {
        if (this._isDestroyed || this.monacoModel.isDisposed()) return;
        if (this.editor.getModel() === this.monacoModel && this.awareness) {
          const sel = this.editor.getSelection();
          if (sel === null) return;
          const startOffset = this.monacoModel.getOffsetAt(sel.getStartPosition());
          const endOffset = this.monacoModel.getOffsetAt(sel.getEndPosition());

          this.awareness.setLocalStateField("selection", {
            anchor: Y.createRelativePositionFromTypeIndex(this.ytext, startOffset),
            head: Y.createRelativePositionFromTypeIndex(this.ytext, endOffset),
          });
        }
      });

      this._awarenessListener = () => {
        this.rerenderDecorations();
      };
      this.awareness.on("change", this._awarenessListener);
      this.rerenderDecorations();
    }
  }

  rerenderDecorations() {
    if (
      this._isDestroyed ||
      this.monacoModel.isDisposed() ||
      !this.awareness ||
      this.editor.getModel() !== this.monacoModel
    ) {
      return;
    }

    const newDecorations: MonacoEditor.IModelDeltaDecoration[] = [];
    const RangeConstructor = this.monaco?.Range;
    if (!RangeConstructor) return;

    this.awareness.getStates().forEach((state: RemoteUserState, clientID: number) => {
      if (clientID === this.doc.clientID) return;
      if (!state.selection || !state.selection.anchor || !state.selection.head) return;

      const anchorAbs = Y.createAbsolutePositionFromRelativePosition(
        state.selection.anchor,
        this.doc
      );
      const headAbs = Y.createAbsolutePositionFromRelativePosition(
        state.selection.head,
        this.doc
      );

      if (
        anchorAbs !== null &&
        headAbs !== null &&
        anchorAbs.type === this.ytext &&
        headAbs.type === this.ytext
      ) {
        const isForward = anchorAbs.index <= headAbs.index;
        const startOffset = Math.min(anchorAbs.index, headAbs.index);
        const endOffset = Math.max(anchorAbs.index, headAbs.index);

        if (this.monacoModel.isDisposed()) return;
        const startPos = this.monacoModel.getPositionAt(startOffset);
        const endPos = this.monacoModel.getPositionAt(endOffset);

        const user = state.user || { name: "Anonymous", color: "#e14e7a" };
        const isAI = user.isAI === true || user.name.includes("AI");

        // Cursor line + selection highlight
        const headPos = isForward ? endPos : startPos;
        const cursorClassName = isAI
          ? "lumina-ai-cursor"
          : `lumina-remote-cursor client-${clientID}`;

        // 1. Cursor decoration (the vertical line + badge)
        newDecorations.push({
          range: new RangeConstructor(
            headPos.lineNumber,
            headPos.column,
            headPos.lineNumber,
            headPos.column
          ),
          options: {
            className: cursorClassName,
            hoverMessage: {
              value: isAI
                ? `✨ **Lumina AI** *(Streaming real-time code optimization)*`
                : `👤 **${user.name}**`,
            },
          },
        });

        // 2. Selection highlight (if a range is highlighted)
        if (startOffset !== endOffset) {
          newDecorations.push({
            range: new RangeConstructor(
              startPos.lineNumber,
              startPos.column,
              endPos.lineNumber,
              endPos.column
            ),
            options: {
              className: isAI
                ? "lumina-ai-selection"
                : `lumina-remote-selection client-${clientID}`,
            },
          });
        }
      }
    });

    try {
      if (!this.monacoModel.isDisposed()) {
        this._decorations = this.editor.deltaDecorations(this._decorations, newDecorations);
      }
    } catch {}
  }

  destroy() {
    if (this._isDestroyed) return;
    this._isDestroyed = true;

    try {
      this._monacoChangeHandler?.dispose();
    } catch {}
    try {
      this._disposedListener?.dispose();
    } catch {}
    try {
      this._cursorListener?.dispose();
    } catch {}
    try {
      this.ytext.unobserve(this._ytextObserver);
    } catch {}
    try {
      this.doc.off("beforeAllTransactions", this._beforeTransaction);
    } catch {}
    try {
      if (this.awareness && this._awarenessListener) {
        this.awareness.off("change", this._awarenessListener);
      }
    } catch {}
    try {
      if (!this.monacoModel.isDisposed() && this._decorations.length > 0) {
        this.editor.deltaDecorations(this._decorations, []);
      }
    } catch {}
    this._decorations = [];
  }
}

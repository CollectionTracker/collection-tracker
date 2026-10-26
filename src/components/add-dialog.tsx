"use client";

import { type DragEvent, useEffect, useEffectEvent, useRef, useState } from "react";
import { AddAutocomplete } from "@/components/add-autocomplete";
import { AddReview } from "@/components/add-review";
import { useRefresh } from "@/components/data-provider";
import { InspectDialog } from "@/components/inspect-dialog";
import { type CommitItem, type CommitResult, type Condition, type DraftRow, type Suggestion, suggestionKey } from "@/lib/add-types";
import { defaultVariant, inferSealedType } from "@/lib/add-query";
import { commitInput, commitItems } from "@/lib/add-commit";
import { parseImport } from "@/lib/add-parse";

export type AddTab = "search" | "import" | "paste";

const MAX_FILE_BYTES = 1_000_000;
const IMPORT_EVENT = "add:import-file";

/** Read `file` into the add dialog's review list and open it, so nothing is saved until the user confirms it there. */
export const importIntoAddDialog = (file: File) => window.dispatchEvent(new CustomEvent<File>(IMPORT_EVENT, { detail: file }));

const TABS: { id: AddTab; label: string }[] = [
  { id: "search", label: "Search" },
  { id: "import", label: "Import file" },
  { id: "paste", label: "Paste list" },
];

type Props = {
  open: boolean;
  tab: AddTab;
  onTab: (t: AddTab) => void;
  rows: DraftRow[];
  setRows: (update: (rows: DraftRow[]) => DraftRow[]) => void;
  /** Opens the dialog when a file is handed in with `importIntoAddDialog`. */
  onOpen: () => void;
  onClose: () => void;
};

let seq = 0;
const newUid = () => `m${Date.now().toString(36)}${(seq++).toString(36)}`;

const toItems = (rows: DraftRow[]): CommitItem[] =>
  rows.flatMap((r): CommitItem[] => {
    const s = r.item;
    if (!s) return [];
    if (s.kind === "card") return [{ kind: "card", id: s.id, variant: r.variant, condition: r.condition, quantity: r.quantity, paid: r.paid }];
    return [{ kind: "sealed", name: s.name, type: s.type, group: s.group, productId: s.productId, groupId: s.groupId, quantity: r.quantity, paid: r.paid }];
  });

const plural = (n: number, word: string) => `${n} ${n === 1 ? word : word.endsWith("y") ? `${word.slice(0, -1)}ies` : `${word}s`}`;

/**
 * The add dialog: find items by search, file or pasted list, review and edit them in one list, then save them all.
 * The list lives in the parent so closing the dialog by accident does not lose it.
 */
export function AddDialog({ open, tab, onTab, rows, setRows, onOpen, onClose }: Props) {
  const refresh = useRefresh();
  const lastCondition = useRef<Condition>("NM");
  const fileRef = useRef<HTMLInputElement>(null);
  const [pasted, setPasted] = useState("");
  const [busy, setBusy] = useState<"read" | "save" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<CommitResult | null>(null);
  const [over, setOver] = useState(false);

  const patch = (uid: string, p: Partial<DraftRow>) => {
    if (p.condition) lastCondition.current = p.condition;
    setRows((rs) => rs.map((r) => (r.uid === uid ? { ...r, ...p } : r)));
  };
  const remove = (uid: string) => setRows((rs) => rs.filter((r) => r.uid !== uid));

  const addSuggestion = (s: Suggestion) => {
    setSaved(null);
    setError(null);
    setMessage(null);
    setRows((rs) => {
      const key = suggestionKey(s);
      // The same item again just raises its quantity.
      if (rs.some((r) => r.item && suggestionKey(r.item) === key)) return rs.map((r) => (r.item && suggestionKey(r.item) === key ? { ...r, quantity: r.quantity + 1 } : r));
      return [...rs, { uid: newUid(), item: s, query: s.name, candidates: [], quantity: 1, condition: lastCondition.current, variant: s.kind === "card" ? defaultVariant(s.variants) : null, paid: null }];
    });
  };

  const addCustom = (name: string) =>
    addSuggestion({ kind: "sealed", productId: null, groupId: null, name, group: null, type: inferSealedType(name), image: null, price: null, owned: 0 });

  const read = async (text: string) => {
    setBusy("read");
    setError(null);
    setSaved(null);
    setMessage("Reading and matching your list…");
    try {
      if (!text.trim()) throw new Error("Missing file");
      const json = await parseImport(text);
      const got = json.rows;
      setRows((rs) => [...rs, ...got]);
      const open = got.filter((r) => !r.item).length;
      setMessage(
        got.length
          ? `Added ${plural(got.length, "line")} to the list${open ? `; ${open} need a match` : ""}.${json.skipped ? ` ${json.skipped} lines past the 500 limit were skipped.` : ""} Check them below, then save.`
          : "No rows found. The file needs a header row with at least a name column.",
      );
      onTab("search");
    } catch (e) {
      setMessage(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const readFile = (file: File) => {
    if (file.size > MAX_FILE_BYTES) return setError("File is too large (1 MB max)");
    return file.text().then(read);
  };

  const onImport = useEffectEvent((e: Event) => {
    onOpen();
    void readFile((e as CustomEvent<File>).detail);
  });
  useEffect(() => {
    window.addEventListener(IMPORT_EVENT, onImport);
    return () => window.removeEventListener(IMPORT_EVENT, onImport);
  }, []);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void readFile(file);
  };

  const ready = rows.filter((r) => r.item && r.quantity >= 1);
  const open_ = rows.length - ready.length;
  const copies = ready.reduce((n, r) => n + r.quantity, 0);

  const save = async () => {
    setBusy("save");
    setError(null);
    setMessage(null);
    try {
      const parsed = commitInput.safeParse({ items: toItems(ready) });
      if (!parsed.success) throw new Error("Invalid items");
      setSaved(await commitItems(parsed.data));
      setRows((rs) => rs.filter((r) => !r.item));
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const actions = (
    <>
      <button type="button" onClick={onClose} className="rounded-md border border-white/10 px-4 py-2 font-label text-label-md font-bold text-slate-2 hover:text-ink">
        {saved && !rows.length ? "Done" : "Close"}
      </button>
      <button
        type="button"
        disabled={!ready.length || busy !== null}
        onClick={save}
        className="rounded-md bg-mint px-4 py-2 font-label text-label-md font-bold text-canvas hover:brightness-110 disabled:opacity-40"
      >
        {busy === "save" ? "Saving…" : ready.length ? `Add ${plural(ready.length, "item")}` : "Add to collection"}
      </button>
    </>
  );

  return (
    <InspectDialog
      open={open}
      onClose={onClose}
      eyebrow="Quick add"
      title="Add to collection"
      subtitle="Search, import a file or paste a list. Everything lands in one list you can edit before saving."
      width="sm:max-w-3xl"
      doneLabel={null}
      actions={actions}
      footer={ready.length ? `${plural(ready.length, "item")} · ${plural(copies, "copy")}${open_ ? ` · ${open_} still need a match` : ""}` : "Nothing in the list yet"}
    >
      <div className="space-y-5">
        <div role="tablist" aria-label="How to add" className="grid grid-cols-3 gap-1 rounded-xl bg-inset p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              id={`add-tab-${t.id}`}
              role="tab"
              type="button"
              aria-selected={tab === t.id}
              aria-controls="add-panel"
              onClick={() => onTab(t.id)}
              className={`rounded-lg py-2 font-label text-label-md font-bold ${tab === t.id ? "bg-surface-2 text-mint" : "text-slate-2 hover:text-ink"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div id="add-panel" role="tabpanel" aria-labelledby={`add-tab-${tab}`}>
          {tab === "search" && <AddAutocomplete onPick={addSuggestion} onCustom={addCustom} compact={rows.length > 0} />}
          {tab === "import" && (
            <div>
              <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" hidden onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void readFile(f);
                }} />
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setOver(true);
                }}
                onDragLeave={() => setOver(false)}
                onDrop={onDrop}
                className={`rounded-xl border-2 border-dashed p-8 text-center ${over ? "border-mint bg-mint/10" : "border-mint/40 bg-mint/[0.04]"}`}
              >
                <p className="text-sm font-bold">Drop a CSV file here</p>
                <p className="mt-1 text-xs text-slate-2">
                  or{" "}
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={busy !== null} className="font-bold text-mint underline">
                    browse
                  </button>
                  . Columns are detected automatically; anything missing can be filled in on the list.
                </p>
              </div>
              <p className="mt-3 text-xs text-slate-2">
                Columns: name, set, number, type, quantity, condition, variant, price paid (a <code>kind</code> column of card or sealed helps).{" "}
                <a href="/api/add/template" download className="font-bold text-mint underline">
                  Download a template
                </a>
              </p>
            </div>
          )}
          {tab === "paste" && (
            <div className="space-y-2">
              <label className="grid gap-1 text-xs text-slate-2">
                <span>Paste CSV text, including its header row</span>
                <textarea
                  value={pasted}
                  onChange={(e) => setPasted(e.target.value)}
                  rows={6}
                  spellCheck={false}
                  placeholder={"name,set,number,quantity,condition\nMega Gengar ex,Ascended Heroes,284,1,NM"}
                  className="field w-full rounded-xl px-3 py-2 font-label text-sm"
                />
              </label>
              <button
                type="button"
                disabled={!pasted.trim() || busy !== null}
                onClick={() => {
                  void read(pasted).then(() => setPasted(""));
                }}
                className="rounded-md bg-mint px-4 py-2 font-label text-label-md font-bold text-canvas hover:brightness-110 disabled:opacity-40"
              >
                {busy === "read" ? "Reading…" : "Read list"}
              </button>
            </div>
          )}
        </div>

        <div aria-live="polite">
          {message && <p className="rounded-lg bg-surface px-3 py-2 text-xs text-slate-2">{message}</p>}
          {error && <p role="alert" className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</p>}
          {saved && (
            <p className="rounded-lg bg-mint/10 px-3 py-2 text-xs text-mint">
              Saved{saved.cards.copies ? ` ${plural(saved.cards.copies, "card")} (${plural(saved.cards.entries, "entry")})` : ""}
              {saved.cards.copies && saved.sealed.units ? " and" : ""}
              {saved.sealed.units ? ` ${plural(saved.sealed.units, "sealed unit")} (${plural(saved.sealed.products, "product")})` : ""}.
              {saved.failed.length ? ` Not saved: ${saved.failed.join("; ")}.` : ""}
            </p>
          )}
        </div>

        {rows.length > 0 && (
          <section aria-label="Review">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-label text-label-eyebrow uppercase text-mint">
                Review {plural(rows.length, "line")}
                {open_ > 0 && <span className="ml-2 text-amber">{open_} need a match</span>}
              </h3>
              <button type="button" onClick={() => setRows(() => [])} className="text-xs text-slate-2 underline hover:text-ink">
                Clear list
              </button>
            </div>
            <AddReview rows={rows} onChange={patch} onRemove={remove} />
          </section>
        )}
      </div>
    </InspectDialog>
  );
}

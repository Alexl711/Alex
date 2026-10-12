import Dexie, { type Table } from "dexie";
import { StateSchema, type State } from "./models";
import { initialState } from "./data";
export class DegreeDB extends Dexie {
  states!: Table<{ id: string; value: State }, string>;
  files!: Table<{ id: string; blob: Blob }, string>;
  constructor() {
    super("procurement-degree-hq");
    this.version(1).stores({ states: "id", files: "id" });
    this.version(2).stores({ states: "id", files: "id" });
  }
}
export const db = new DegreeDB();
export function migrate(raw: unknown): State {
  if (!raw || typeof raw !== "object")
    throw Error("Backup must contain an object");
  const value = structuredClone(raw) as Record<string, unknown>;
  if (value.schemaVersion === 1) {
    value.schemaVersion = 2;
    value.programs ??= initialState.programs;
    value.rotations ??= [];
    value.portfolio ??= [];
    value.lastBackup ??= "";
  }
  value.universities ??= initialState.universities;
  const parsed = StateSchema.parse(value);
  if (
    !parsed.universities.some(
      (u) => u.id === parsed.profile.primaryUniversity,
    ) ||
    !parsed.programs.some(
      (p) => p.universityId === parsed.profile.primaryUniversity,
    )
  )
    throw Error("Primary university / program reference is missing");
  for (const key of [
    "universities",
    "programs",
    "courses",
    "requirements",
    "groups",
    "awards",
    "equivalencies",
    "documents",
    "sources",
  ] as const) {
    const ids = parsed[key].map((v) => v.id);
    if (new Set(ids).size !== ids.length)
      throw Error(`Duplicate IDs in ${key}`);
  }
  for (const eq of parsed.equivalencies) {
    if (
      !parsed.courses.some((c) => c.id === eq.courseId) ||
      !parsed.sources.some((s) => s.id === eq.sourceId)
    )
      throw Error("Dangling equivalency references");
  }
  for (const a of parsed.awards) {
    if (!parsed.courses.some((c) => c.id === a.courseId))
      throw Error("Award has no course");
    if (
      !parsed.universities.some((u) => u.id === a.universityId) ||
      a.requirementIds.some(
        (r) =>
          !parsed.requirements.some(
            (q) => q.id === r && q.universityId === a.universityId,
          ),
      )
    )
      throw Error("Award has invalid university / requirement references");
  }
  for (const eq of parsed.equivalencies) {
    if (
      !parsed.universities.some((u) => u.id === eq.universityId) ||
      eq.requirementIds.some(
        (r) =>
          !parsed.requirements.some(
            (q) => q.id === r && q.universityId === eq.universityId,
          ),
      )
    )
      throw Error(
        "Equivalency has invalid university / requirement references",
      );
  }
  return parsed;
}
export async function loadState() {
  const saved = await db.states.get("current");
  return saved ? migrate(saved.value) : structuredClone(initialState);
}
export async function saveState(value: State) {
  StateSchema.parse(value);
  await db.states.put({ id: "current", value });
}
async function digest(text: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return [...new Uint8Array(bytes)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
const blobToBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
export async function createBackup(state: State) {
  const files = (await db.files.toArray()).filter((f) =>
    state.documents.some((d) => d.id === f.id),
  );
  if (files.length !== state.documents.length)
    throw Error(
      "An attachment is missing. Export raw records and recover the document before creating a full backup.",
    );
  const payload = {
    state,
    files: await Promise.all(
      files.map(async (f) => ({ id: f.id, data: await blobToBase64(f.blob) })),
    ),
  };
  const data = JSON.stringify(payload);
  return JSON.stringify(
    {
      format: "degree-hq-backup",
      version: 2,
      sha256: await digest(data),
      data,
    },
    null,
    2,
  );
}
export async function readBackup(text: string) {
  const envelope = JSON.parse(text);
  if (envelope.format !== "degree-hq-backup") {
    return {
      state: migrate(envelope),
      files: [] as { id: string; blob: Blob }[],
    };
  }
  if (
    typeof envelope.data !== "string" ||
    (await digest(envelope.data)) !== envelope.sha256
  )
    throw Error(
      "Backup integrity check failed. Existing records were preserved.",
    );
  const payload = JSON.parse(envelope.data);
  const state = migrate(payload.state);
  const files = await Promise.all(
    (payload.files as { id: string; data: string }[]).map(async (f) => {
      if (
        !state.documents.some((d) => d.id === f.id) ||
        !f.data.startsWith("data:")
      )
        throw Error("Invalid document attachment");
      return { id: f.id, blob: await (await fetch(f.data)).blob() };
    }),
  );
  if (files.length !== state.documents.length)
    throw Error("Backup missing document files");
  return { state, files };
}
export async function restoreBackup(text: string) {
  const backup = await readBackup(text);
  await db.transaction("rw", db.states, db.files, async () => {
    await db.files.clear();
    if (backup.files.length) await db.files.bulkPut(backup.files);
    await db.states.put({ id: "current", value: backup.state });
  });
  return backup.state;
}
export function download(
  name: string,
  content: string | Blob,
  type = "application/json",
) {
  const url = URL.createObjectURL(
    content instanceof Blob ? content : new Blob([content], { type }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

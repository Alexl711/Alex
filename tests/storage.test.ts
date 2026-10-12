import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import {
  db,
  migrate,
  loadState,
  saveState,
  readBackup,
  restoreBackup,
} from "../src/storage";
import { initialState } from "../src/data";
beforeEach(async () => {
  await db.states.clear();
  await db.files.clear();
});
describe("schema, migration and safe persistence", () => {
  it("persists profile and course records through reload", async () => {
    const s = structuredClone(initialState);
    s.profile.name = "Taylor";
    await saveState(s);
    expect((await loadState()).profile.name).toBe("Taylor");
  });
  it("migrates v1 backups without inventing academic progress", () => {
    const old: any = structuredClone(initialState);
    old.schemaVersion = 1;
    delete old.programs;
    delete old.rotations;
    delete old.portfolio;
    delete old.lastBackup;
    expect(migrate(old).schemaVersion).toBe(2);
    expect(migrate(old).awards).toEqual([]);
  });
  it("rejects corrupted backup and preserves current data", async () => {
    await saveState(initialState);
    await expect(restoreBackup("{bad JSON")).rejects.toThrow();
    expect((await loadState()).courses.length).toBe(
      initialState.courses.length,
    );
  });
  it("rejects changed checksum", async () => {
    await expect(
      readBackup(
        JSON.stringify({
          format: "degree-hq-backup",
          data: "{}",
          sha256: "bad",
        }),
      ),
    ).rejects.toThrow("integrity");
  });
  it("round trips structured JSON", async () => {
    const text = JSON.stringify(initialState);
    const parsed = await readBackup(text);
    expect(parsed.state).toEqual(initialState);
  });
  it("detects duplicate course IDs", () => {
    const s = structuredClone(initialState);
    s.courses.push(s.courses[0]);
    expect(() => migrate(s)).toThrow("Duplicate");
  });
  it("rejects future schemas without resetting data", () =>
    expect(() => migrate({ ...initialState, schemaVersion: 999 })).toThrow());
  it("rejects orphaned evaluation references", () => {
    const s = structuredClone(initialState);
    s.courses = [];
    expect(() => migrate(s)).toThrow("Dangling");
  });
  it("rejects impossible dates before replacing saved data", async () => {
    const s = structuredClone(initialState);
    s.deadlines[0].date = "2026-02-31";
    await expect(readBackup(JSON.stringify(s))).rejects.toThrow("valid YYYY");
  });
  it("rejects a missing primary university reference", () => {
    const s = structuredClone(initialState);
    s.profile.primaryUniversity = "unknown";
    expect(() => migrate(s)).toThrow("Primary university");
  });
});

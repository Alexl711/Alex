import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  ClipboardCheck,
  Search,
  GitCompareArrows,
  Route,
  CalendarDays,
  Wallet,
  Landmark,
  ShieldCheck,
  Send,
  BriefcaseBusiness,
  Files,
  TrendingUp,
  BarChart3,
  Library,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  Plus,
  ArrowUpRight,
  ArrowRight,
  Command,
  Check,
  Download,
  Upload,
  Clock,
  TriangleAlert,
  Target,
  Sparkles,
  ChevronRight,
  Sun,
  Moon,
  Undo2,
  Redo2,
  Trash2,
  Pencil,
  ExternalLink,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { format, addDays, parseISO } from "date-fns";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "./components/ui/button";
import {
  Modal,
  Section,
  Empty,
  Badge,
  Notice,
  Field,
  SourceLink,
} from "./components/shared";
import { Editor, type EditSpec } from "./components/Editors";
import { DataTable } from "./components/DataTable";
import { Planner } from "./components/Planner";
import { initialState, navigation, gaps, competencies } from "./data";
import {
  audit,
  financials,
  recommendations,
  optimize,
  money,
  id,
  today,
  subscriptionCost,
  forecast,
  capacity,
  csvExport,
  parseCSV,
  validMapping,
  overdueCourses,
} from "./engine";
import {
  StateSchema,
  CourseSchema,
  RequirementSchema,
  CourseEquivalencySchema,
  SourceEvidenceSchema,
  statusLabels,
  type State,
  type Course,
  type Verification,
} from "./models";
import {
  loadState,
  saveState,
  download,
  createBackup,
  restoreBackup,
  db,
  migrate,
} from "./storage";
const icons = [
  LayoutDashboard,
  GraduationCap,
  ClipboardCheck,
  BookOpen,
  GitCompareArrows,
  Route,
  CalendarDays,
  Wallet,
  Landmark,
  ShieldCheck,
  Send,
  BriefcaseBusiness,
  Files,
  TrendingUp,
  BarChart3,
  Library,
  Settings,
];
const titles: Record<string, string> = {
  Dashboard: "Your degree journey, clearly mapped.",
  "My Degree": "One goal. A plan you can trust.",
  "Degree Audit": "Every credit. Every requirement.",
  "Course Explorer": "Find your next opportunity.",
  "Transfer Matrix": "Acceptance ≠ applicability.",
  "Pathway Optimizer": "Calculate your strongest path.",
  "Study Planner": "Make progress around your life.",
  "Financial Command Center": "Every educational dollar, accounted for.",
  "University Comparison": "Compare the full picture.",
  "Academic Verification Center": "Evidence before assumptions.",
  "Applications & Enrollment": "Your next chapter starts here.",
  "Prior Learning Assessment": "Make your experience visible.",
  "Transcript & Document Vault": "Your academic paper trail.",
  "Professional Development": "Build your procurement toolkit.",
  "Reports & Analytics": "See your progress clearly.",
  "Research Sources": "Trace every academic claim.",
  "Settings & Backups": "Your data. Your control.",
};
const collection: Record<EditSpec["type"], keyof State> = {
  course: "courses",
  requirement: "requirements",
  source: "sources",
  mapping: "equivalencies",
  award: "awards",
  transaction: "transactions",
  enrollment: "enrollments",
  portfolio: "portfolio",
  subscription: "subscriptions",
  group: "groups",
  program: "programs",
  university: "universities",
};
export default function App() {
  const [loadedState, setState] = useState<State | null>(null),
    [page, setPage] = useState("Dashboard"),
    [collapsed, setCollapsed] = useState(false),
    [mobile, setMobile] = useState(false),
    [editor, setEditor] = useState<EditSpec | null>(null),
    [toastMessage, setToastMessage] = useState(""),
    [saveStatus, setSaveStatus] = useState("Loading local data"),
    [fatal, setFatal] = useState(""),
    [command, setCommand] = useState(false),
    [query, setQuery] = useState(""),
    [confirm, setConfirm] = useState<{
      title: string;
      action: () => void;
    } | null>(null),
    [onboardingStep, setOnboardingStep] = useState(0),
    [scenario, setScenario] = useState({
      extraWeeklyHours: 0,
      delayWeeks: 0,
      tuitionMultiplier: 1,
      deniedCourseId: "",
      confirmedAid: 0,
    }),
    [matrixProvider, setMatrixProvider] = useState("All"),
    [matrixStatus, setMatrixStatus] = useState("All"),
    [question, setQuestion] = useState(""),
    [sourceSearch, setSourceSearch] = useState(""),
    [docBusy, setDocBusy] = useState(false),
    [importPreview, setImportPreview] = useState<{
      kind: string;
      rows: unknown[];
    } | null>(null);
  const current = useRef<State | null>(null),
    history = useRef<State[]>([]),
    future = useRef<State[]>([]),
    queue = useRef(Promise.resolve()),
    backupInput = useRef<HTMLInputElement>(null),
    csvInput = useRef<HTMLInputElement>(null),
    researchInput = useRef<HTMLInputElement>(null),
    toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    saveRevision = useRef(0),
    pendingWrites = useRef(0);
  const computedOptimization = useMemo(
    () =>
      loadedState
        ? optimize(loadedState, scenario)
        : { strategies: [], blockers: [], exhaustive: true },
    [loadedState, scenario],
  );
  const toast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMessage(""), 6500);
  }, []);
  useEffect(() => {
    loadState()
      .then((value) => {
        current.current = value;
        setState(value);
        setSaveStatus("Saved on this device");
      })
      .catch((e) => {
        setFatal((e as Error).message);
        setSaveStatus("Local data needs recovery");
      });
  }, []);
  const commit = useCallback(
    (next: State) => {
      const revision = ++saveRevision.current;
      pendingWrites.current++;
      current.current = next;
      setState(next);
      setSaveStatus("Saving…");
      queue.current = queue.current
        .then(() => saveState(next))
        .then(() => {
          if (revision === saveRevision.current)
            setSaveStatus("Saved on this device");
        })
        .catch((e) => {
          if (revision === saveRevision.current)
            setSaveStatus("Save failed — export a backup");
          toast((e as Error).message);
        })
        .finally(() => {
          pendingWrites.current--;
        });
    },
    [toast],
  );
  const mutate = useCallback(
    (fn: (s: State) => void, action: string) => {
      if (!current.current) return;
      const before = structuredClone(current.current),
        next = structuredClone(before);
      try {
        fn(next);
        next.events.unshift({
          id: id(),
          at: new Date().toISOString(),
          action,
          entityId: "",
        });
        next.events = next.events.slice(0, 1000);
        StateSchema.parse(next);
        history.current.push(before);
        history.current = history.current.slice(-20);
        future.current = [];
        commit(next);
      } catch (e) {
        toast((e as Error).message);
      }
    },
    [commit, toast],
  );
  const navigate = (p: string) => {
    setPage(p);
    setMobile(false);
    setCommand(false);
    setQuery("");
    window.scrollTo(0, 0);
  };
  const undo = () => {
    const prior = history.current.pop();
    if (prior && current.current) {
      future.current.push(structuredClone(current.current));
      commit(prior);
      toast("Change undone");
    }
  };
  const redo = () => {
    const next = future.current.pop();
    if (next && current.current) {
      history.current.push(structuredClone(current.current));
      commit(next);
      toast("Change restored");
    }
  };
  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingWrites.current) {
        e.preventDefault();
        e.returnValue = "Local changes are still saving.";
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommand((v) => !v);
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key === "z" &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  });
  useEffect(() => {
    if (!loadedState) return;
    const state = loadedState;
    const query = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        state.profile.theme === "system"
          ? query.matches
            ? "dark"
            : "light"
          : state.profile.theme;
      document.documentElement.dataset.density = state.profile.density;
    };
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [loadedState?.profile.theme, loadedState?.profile.density]);
  if (fatal)
    return (
      <main className="recovery">
        <h1>Local data needs recovery</h1>
        <p>Your existing database has not been overwritten.</p>
        <pre>{fatal}</pre>
        <Button
          onClick={async () => {
            const raw = await db.states.get("current");
            download("recovery-raw.json", JSON.stringify(raw, null, 2));
          }}
        >
          Export raw records
        </Button>
        <label className="upload-button">
          Restore valid backup
          <input
            type="file"
            accept=".json"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f)
                try {
                  const restored = await restoreBackup(await f.text());
                  commit(restored);
                  setFatal("");
                } catch (err) {
                  toast((err as Error).message);
                }
            }}
          />
        </label>
        {toastMessage && <p role="alert">{toastMessage}</p>}
      </main>
    );
  if (!loadedState)
    return (
      <div className="loading">
        <GraduationCap size={40} />
        <h2>Opening your degree headquarters</h2>
        <div className="skeleton" />
        <p>Reading private data from this device…</p>
      </div>
    );
  const state = loadedState;
  const universities = state.universities;
  const a = audit(state),
    f = financials(state),
    u = universities.find((u) => u.id === state.profile.primaryUniversity)!,
    recs = recommendations(state),
    result = computedOptimization;
  const add = (type: EditSpec["type"], record?: any) =>
    setEditor({ type, record });
  const saveRecord = (type: EditSpec["type"], record: any) => {
    mutate((s) => {
      const key = collection[type];
      const rows = s[key] as any[];
      const old = rows.find((r) => r.id === record.id);
      if (type === "source" && old) {
        record.history = [
          ...old.history,
          {
            at: new Date().toISOString(),
            previousQuote: old.quote,
            previousDate: old.verifiedAt,
          },
        ];
      }
      if (
        type === "mapping" &&
        ["advisor-confirmed", "officially-applied"].includes(record.status)
      ) {
        s.approvals.push({
          id: id(),
          equivalencyId: record.id,
          reviewer: state.profile.name || "User",
          date: today(),
          documentId: "",
          notes: record.quote,
          status: record.status,
        });
      }
      if (
        type === "university" &&
        !s.programs.some((p) => p.universityId === record.id)
      ) {
        s.programs.push({
          id: record.id + "-program",
          universityId: record.id,
          name: record.degree,
          catalogId: "Unconfirmed",
          complete: false,
          minimumCredits: null,
          residency: null,
          majorResidency: null,
          upperMajorResidency: null,
          upperMinimum: null,
          minimumGpa: null,
          status: "unverified",
        });
      }
      if (type === "award" && record.posted) {
        const c = s.courses.find((c) => c.id === record.courseId);
        if (c)
          c.status = record.applied
            ? "Officially Applied"
            : "Transfer Under Review";
      }
      if (type === "requirement")
        record.programId = record.universityId + "-program";
      (s as any)[key] = [...rows.filter((r) => r.id !== record.id), record];
    }, `${type} record saved`);
    toast("Record saved locally");
  };
  const remove = (key: keyof State, ids: string[]) =>
    setConfirm({
      title: `Delete ${ids.length} record${ids.length === 1 ? "" : "s"}?`,
      action: () => {
        mutate((s) => {
          (s as any)[key] = (s[key] as any[]).filter(
            (r) => !ids.includes(r.id),
          );
          if (key === "courses") {
            s.awards = s.awards.filter((a) => !ids.includes(a.courseId));
            s.equivalencies = s.equivalencies.filter(
              (e) => !ids.includes(e.courseId),
            );
            s.courses.forEach((c) => {
              c.prerequisites = c.prerequisites.filter((p) => !ids.includes(p));
            });
            s.sessions.forEach((x) => {
              if (ids.includes(x.courseId)) x.courseId = "";
            });
          }
          if (key === "requirements") {
            s.awards.forEach(
              (a) =>
                (a.requirementIds = a.requirementIds.filter(
                  (r) => !ids.includes(r),
                )),
            );
            s.equivalencies.forEach(
              (e) =>
                (e.requirementIds = e.requirementIds.filter(
                  (r) => !ids.includes(r),
                )),
            );
            s.groups.forEach(
              (g) => (g.children = g.children.filter((r) => !ids.includes(r))),
            );
          }
        }, "Records deleted");
      },
    });
  const exportBackup = async () => {
    try {
      await queue.current;
      const snapshot = { ...state, lastBackup: new Date().toISOString() };
      download("degree-hq-" + today() + ".json", await createBackup(snapshot));
      mutate((s) => {
        s.lastBackup = snapshot.lastBackup;
      }, "Backup exported");
      toast(
        "Full backup exported, including documents. Keep a copy outside this device.",
      );
    } catch (e) {
      toast((e as Error).message);
    }
  };
  async function attach(files: FileList | null) {
    if (!files) return;
    setDocBusy(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 30 * 1024 * 1024)
          throw Error("Maximum attachment size is 30 MB.");
        const fileId = id();
        let extractedText = "";
        if (file.type === "text/plain") extractedText = await file.text();
        else if (file.name.toLowerCase().endsWith(".docx")) {
          const { extractDocx } = await import("./documents");
          extractedText = extractDocx(await file.arrayBuffer());
        } else if (
          file.type === "application/pdf" ||
          file.name.toLowerCase().endsWith(".pdf")
        ) {
          const pdfjs = await import("pdfjs-dist");
          pdfjs.GlobalWorkerOptions.workerSrc = new URL(
            "pdfjs-dist/build/pdf.worker.min.mjs",
            import.meta.url,
          ).toString();
          const pdfTask = pdfjs.getDocument({
            data: await file.arrayBuffer(),
          });
          const pdf = await pdfTask.promise;
          for (let p = 1; p <= Math.min(pdf.numPages, 100); p++) {
            const page = await pdf.getPage(p);
            const content = await page.getTextContent();
            extractedText +=
              `\nPage ${p}\n` +
              content.items.map((i) => ("str" in i ? i.str : "")).join(" ");
          }
          await pdfTask.destroy();
        }
        await db.files.put({ id: fileId, blob: file });
        mutate(
          (s) =>
            s.documents.push({
              id: fileId,
              name: file.name,
              type: file.type,
              size: file.size,
              date: today(),
              category: "Uncategorized",
              notes: "",
              reviewed: false,
              extractedText,
            }),
          "Document stored privately",
        );
      }
      toast(
        "Documents saved. Extracted text requires your review before using it as evidence.",
      );
    } catch (e) {
      toast("Attachment failed: " + (e as Error).message);
    } finally {
      setDocBusy(false);
    }
  }
  const courseColumns: ColumnDef<Course, any>[] = [
    {
      accessorKey: "title",
      header: "Course",
      size: 270,
      cell: ({ row }) => (
        <div>
          <button
            className="text-button"
            onClick={() => add("course", row.original)}
          >
            {row.original.title}
          </button>
          <small>
            {row.original.providerCourseId || "Exact ID not entered"}
          </small>
        </div>
      ),
    },
    { accessorKey: "provider", header: "Provider" },
    { accessorKey: "credits", header: "Credits", size: 80 },
    {
      accessorKey: "hours",
      header: "Hours",
      size: 80,
      cell: ({ getValue }) => (
        <span>
          {getValue()} <small>estimate</small>
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Progress",
      size: 190,
      cell: ({ row }) => (
        <select
          aria-label={`Progress for ${row.original.title}`}
          value={row.original.status}
          onChange={(e) =>
            mutate((s) => {
              s.courses.find((c) => c.id === row.original.id)!.status = e.target
                .value as Course["status"];
            }, "Course progress updated")
          }
        >
          {[
            "Not Started",
            "Scheduled",
            "In Progress",
            "Completed",
            "Transcript Requested",
            "Transfer Under Review",
            "Officially Applied",
            "Rejected",
            "Surplus",
          ].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      ),
    },
    {
      id: "applicability",
      header: "Applicability",
      cell: ({ row }) => (
        <Badge
          status={
            validMapping(state, row.original.id, u.id)?.status ?? "unverified"
          }
        />
      ),
    },
    {
      id: "actions",
      header: "Actions",
      size: 100,
      cell: ({ row }) => (
        <div className="button-row">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Edit ${row.original.title}`}
            onClick={() => add("course", row.original)}
          >
            <Pencil size={15} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Delete ${row.original.title}`}
            onClick={() => remove("courses", [row.original.id])}
          >
            <Trash2 size={15} />
          </Button>
        </div>
      ),
    },
  ];
  function recommendationsPanel() {
    return (
      <Section
        title="What Should I Take Next?"
        subtitle="Ranked by confirmed applicability, estimated cost and effort."
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("Course Explorer")}
          >
            Explore courses
            <ArrowRight size={15} />
          </Button>
        }
      >
        {!recs.length ? (
          <div className="next-empty">
            <div className="next-icon">
              <BookOpen size={26} />
            </div>
            <div>
              <h3>Your first step is verification.</h3>
              <p>
                No course is currently confirmed applicable to your selected
                degree. Get the 2026–27 requirements and written transfer
                guidance before purchasing.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate("Academic Verification Center")}
              >
                Open verification checklist
                <ArrowRight size={14} />
              </Button>
            </div>
          </div>
        ) : (
          recs.map((r, i) => (
            <details
              className="recommendation-details"
              key={r.course.id}
              open={i === 0}
            >
              <summary>
                <span className="rank">{i + 1}</span>
                <div>
                  <h3>{r.course.title}</h3>
                  <small>
                    {r.course.provider} ·{" "}
                    {r.safe
                      ? "Confirmed applicability"
                      : "Review applicability before purchase"}
                  </small>
                </div>
                <ChevronRight size={15} />
              </summary>
              <div className="recommendation-body">
                <p>
                  {r.course.provider} · {r.course.credits} credits ·{" "}
                  {r.course.hours} estimated hours ·{" "}
                  {r.course.provider === "Sophia"
                    ? "$99/month subscription (published)"
                    : money(r.course.cost) + " individual cost"}
                </p>
                <Badge status={r.safe ? "advisor-confirmed" : "unverified"} />
                <small>
                  Published equivalent:{" "}
                  {state.equivalencies.find(
                    (e) =>
                      e.courseId === r.course.id && e.universityId === u.id,
                  )?.equivalent ?? "Unavailable"}{" "}
                  · Degree applicability remains separate
                </small>
                <p>{r.reason}</p>
                <small>
                  Requirements:{" "}
                  {r.requirementIds
                    .map(
                      (id) =>
                        state.requirements.find((q) => q.id === id)?.title,
                    )
                    .join(", ") || "Not confirmed"}{" "}
                  · Prerequisites:{" "}
                  {r.course.prerequisites.length
                    ? r.course.prerequisites
                        .map(
                          (p) => state.courses.find((c) => c.id === p)?.title,
                        )
                        .join(", ")
                    : "None entered"}{" "}
                  · Difficulty not assessed · Window:{" "}
                  {r.course.startDate || "Not scheduled"}
                </small>
                <div className="button-row">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      mutate((s) => {
                        s.courses.find((c) => c.id === r.course.id)!.status =
                          "Scheduled";
                      }, "Course added to plan");
                      navigate("Study Planner");
                    }}
                  >
                    Schedule
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      mutate((s) => {
                        s.courses.find((c) => c.id === r.course.id)!.status =
                          "In Progress";
                      }, "Course started")
                    }
                  >
                    Mark started
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      add("transaction", {
                        courseId: r.course.id,
                        description: r.course.title,
                      })
                    }
                  >
                    Record cost
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setQuestion(makeQuestion(r.course.title));
                      navigate("Academic Verification Center");
                    }}
                  >
                    Request approval
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setMatrixProvider("All");
                      navigate("Transfer Matrix");
                    }}
                  >
                    Compare alternatives
                  </Button>
                  {state.equivalencies
                    .filter((e) => e.courseId === r.course.id)
                    .slice(0, 1)
                    .map((e) => {
                      const source = state.sources.find(
                        (s) => s.id === e.sourceId,
                      );
                      return source ? (
                        <SourceLink key={e.id} url={source.url} />
                      ) : null;
                    })}
                </div>
              </div>
            </details>
          ))
        )}
      </Section>
    );
  }
  function makeQuestion(course = "the attached proposed outside course") {
    return `Subject: ${u.degree} — 2026–27 degree and transfer confirmation\n\nHello Registrar / Transfer Evaluation Team,\n\nI am a prospective first-time college student with zero earned credits considering ${u.degree}. Please confirm:\n\n1. Which catalog year and general education curriculum will apply to me?\n2. Please provide the complete degree requirements, upper-level rules, capstone and institutional / major residency conditions.\n3. Does ${course} fulfill a specific requirement, or only free electives? Please identify the exact equivalent, minimum grade / score and catalog applicability.\n4. How do ACE / NCCRS and prior-learning assessment limits apply to Sophia, Study.com and CLEP? At UMPI, does the reported 30-credit CPL limit include third-party ACE credit?\n5. Can this credit meet an upper-level or major requirement, and what institutional coursework must remain?\n6. What are the transcript submission deadlines, and may I submit additional outside credit after enrollment?\n7. Please confirm current tuition, mandatory fees, course availability and admission documentation.\n\nI will not consider proposed credit approved until your written evaluation is received. Thank you.\n\n${state!.profile.name || "[Your name]"}`;
  }
  function stats() {
    return (
      <div className="stats-grid">
        <div className="stat">
          <span>
            Confirmed applicable {u.id === "wgu" ? "CUs" : "credits"}
            <ShieldCheck size={16} />
          </span>
          <strong>
            {a.total}
            <em> / {a.program.minimumCredits ?? "?"}</em>
          </strong>
          <small>Officially posted & applied</small>
        </div>
        <div className="stat">
          <span>
            Remaining graduation {u.id === "wgu" ? "CUs" : "credits"}
            <BookOpen size={16} />
          </span>
          <strong>{a.remaining ?? "Unknown"}</strong>
          <small>
            {a.program.complete
              ? "From documented requirements"
              : "Minimum target; course audit incomplete"}
          </small>
        </div>
        <div className="stat">
          <span>
            Estimated graduation
            <CalendarDays size={16} />
          </span>
          <strong className="stat-small">
            {result.strategies[0]?.finish ?? "Verification needed"}
          </strong>
          <small>No guaranteed date before a complete audit</small>
        </div>
        <div className="stat">
          <span>
            Actual spending
            <Wallet size={16} />
          </span>
          <strong>{money(f.net)}</strong>
          <small>
            {f.committed
              ? money(f.committed) + " committed"
              : "No recorded payments"}
          </small>
        </div>
      </div>
    );
  }
  function dashboard() {
    const percent = a.program.minimumCredits
      ? Math.min(100, (a.total / a.program.minimumCredits) * 100)
      : 0;
    return (
      <>
        {stats()}
        <div className="dashboard-grid">
          <section className="journey-card">
            <div className="eyebrow">
              <span className="live-dot" />
              YOUR DEGREE, YOUR PACE
            </div>
            <h2>
              A smarter route to
              <br />
              your next chapter.
            </h2>
            <p>
              {u.degree}
              <br />
              {u.fullName}
            </p>
            <div className="journey-bottom">
              <div>
                <strong>{a.total} credits earned & applied</strong>
                <small>Your journey starts at zero. Every step counts.</small>
                <Button onClick={() => navigate("My Degree")}>
                  View my degree plan
                  <ArrowRight size={16} />
                </Button>
              </div>
              <div
                className="progress-ring"
                style={{
                  background: `conic-gradient(#b6e1ce ${percent}%,rgba(255,255,255,.12) 0)`,
                }}
              >
                <div>
                  <strong>{percent.toFixed(0)}%</strong>
                  <span>complete</span>
                </div>
              </div>
            </div>
            <div className="journey-decoration">✦</div>
          </section>
          <Section
            title="Verification comes first"
            subtitle="A strong plan starts with sound evidence."
            action={<span className="count-chip">{gaps.length} open</span>}
          >
            <div className="verification-items">
              {gaps.slice(0, 3).map((gap, i) => (
                <button
                  className="verification-row"
                  key={gap.title}
                  onClick={() => navigate("Academic Verification Center")}
                >
                  <div className={`verification-icon v${i}`}>
                    <TriangleAlert size={17} />
                  </div>
                  <div>
                    <strong>{gap.title}</strong>
                    <small>
                      {gap.university} · Needs official confirmation
                    </small>
                  </div>
                  <ChevronRight size={16} />
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("Academic Verification Center")}
            >
              Review all academic risks
              <ArrowRight size={14} />
            </Button>
          </Section>
        </div>
        <div className="dashboard-grid main-secondary">
          {recommendationsPanel()}
          <Section
            title="Upcoming milestones"
            subtitle="Public session dates checked October 12, 2026; recheck before applying."
          >
            {state.deadlines
              .filter((d) => d.universityId === u.id)
              .map((d) => (
                <div key={d.id} className="deadline-row">
                  <div className="date-tile">
                    <span>{format(parseISO(d.date), "MMM")}</span>
                    <strong>{format(parseISO(d.date), "d")}</strong>
                  </div>
                  <div>
                    <strong>{d.title}</strong>
                    <small>Application deadline · {d.status}</small>
                    <SourceLink
                      url={
                        state.sources.find((s) => s.id === d.sourceIds[0])
                          ?.url ?? "https://www.umpi.edu/yourpace/"
                      }
                    />
                  </div>
                </div>
              ))}
            {!state.deadlines.some((d) => d.universityId === u.id) && (
              <p className="empty">No verified upcoming dates.</p>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate("Applications & Enrollment")}
            >
              Manage enrollment
              <ArrowRight size={14} />
            </Button>
          </Section>
        </div>
        <div className="three-grid">
          <Section
            title="Your credit landscape"
            subtitle="Distinct states. No double counting."
          >
            {[
              ["Applicable", a.total],
              ["Planned", a.planned],
              ["In progress", a.inProgress],
              ["Unverified", a.unverified],
            ].map(([label, value]) => (
              <div className="metric-row" key={label}>
                <span>{label}</span>
                <div className="meter">
                  <i
                    style={{
                      width: `${Math.min(100, (Number(value) / 120) * 100)}%`,
                    }}
                  />
                </div>
                <strong>{value}</strong>
              </div>
            ))}
          </Section>
          <Section
            title="This week’s focus"
            subtitle="Build a sustainable study rhythm."
          >
            <div className="focus-summary">
              <Clock size={24} />
              <strong>{state.profile.weeklyHours}h</strong>
              <span>weekly default capacity</span>
            </div>
            <p className="muted">
              No shift pattern assumed. Configure your rotating schedule,
              recovery and family time.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate("Study Planner")}
            >
              Set up study time
              <ArrowRight size={14} />
            </Button>
          </Section>
          <Section
            title="Graduation budget"
            subtitle="Published claims are separate from estimates."
          >
            <div className="budget-total">
              <small>Feasible path estimate</small>
              <strong>
                {result.strategies[0]
                  ? money(result.strategies[0].cost)
                  : "Not yet calculable"}
              </strong>
            </div>
            <p className="muted">
              Complete requirements and confirmed transfer options are needed
              for a legitimate total.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate("Financial Command Center")}
            >
              Open finances
              <ArrowRight size={14} />
            </Button>
          </Section>
        </div>
        <Section
          title="Activity history"
          subtitle="Your progress is saved privately on this device."
        >
          {state.events.length ? (
            state.events.slice(0, 5).map((e) => (
              <div className="list-row" key={e.id}>
                <span>
                  <Check size={14} /> {e.action}
                </span>
                <small>{format(parseISO(e.at), "MMM d, h:mm a")}</small>
              </div>
            ))
          ) : (
            <p className="muted">
              Your first actions will appear here. No sample achievements or
              earned credits.
            </p>
          )}
        </Section>
      </>
    );
  }
  function degreeAudit() {
    return (
      <>
        {stats()}
        <Notice>
          The {a.program.catalogId} course map is{" "}
          {a.program.complete ? "user-confirmed complete" : "incomplete"}.
          General electives never replace major requirements without a confirmed
          mapping. Overlapping requirement coverage never adds credits twice.
        </Notice>
        <div className="button-row">
          <Button onClick={() => add("requirement")}>
            <Plus size={16} />
            Add requirement
          </Button>
          <Button variant="secondary" onClick={() => add("group")}>
            Add AND / OR rule
          </Button>
          <Button variant="secondary" onClick={() => add("award")}>
            Record official credit
          </Button>
          <Button variant="secondary" onClick={() => add("program", a.program)}>
            Review program rules
          </Button>
        </div>
        <div className="two-grid">
          <Section
            title="Requirements"
            subtitle="Only documented applicability can satisfy these rows."
          >
            {state.requirements.filter((r) => r.universityId === u.id)
              .length ? (
              state.requirements
                .filter((r) => r.universityId === u.id)
                .map((r) => (
                  <div className="requirement-row" key={r.id}>
                    <div
                      className={`check-box ${a.requirementDone(r.id) ? "checked" : ""}`}
                    >
                      {a.requirementDone(r.id) ? <Check size={16} /> : null}
                    </div>
                    <div className="grow">
                      <button
                        className="text-button"
                        onClick={() => add("requirement", r)}
                      >
                        {r.courseCode ? `${r.courseCode} · ` : ""}
                        {r.title}
                      </button>
                      <small>
                        {r.category} · {r.catalogYear} ·{" "}
                        {r.upper ? "Upper division" : "Level as documented"}
                      </small>
                      <Badge status={r.status} />
                      <details>
                        <summary>Evidence & rule details</summary>
                        <p>
                          {r.quote || "No supporting excerpt"} · {r.location}
                        </p>
                        <p>
                          Minimum grade: {r.minimumGrade || "Unknown"} ·
                          Residency: {r.residencyImplications}
                        </p>
                        <p>{r.notes}</p>
                        {r.sourceIds.map((id) => {
                          const source = state.sources.find((s) => s.id === id);
                          return source ? (
                            <SourceLink key={id} url={source.url} />
                          ) : null;
                        })}
                      </details>
                    </div>
                    <strong>
                      {a.requirementCredits(r.id)} / {r.credits}
                      <small>{r.creditUnit ?? "semester credits"}</small>
                    </strong>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${r.title}`}
                      onClick={() => remove("requirements", [r.id])}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))
            ) : (
              <Empty title="No authoritative course map imported">
                Import or enter the complete official 2026–27 requirements. A
                missing course map is never filled with invented courses.
              </Empty>
            )}
          </Section>
          <div className="stack">
            <Section
              title="Institutional conditions"
              subtitle="30/12/9 UMPI residency minima are documented in the public FAQ; individual applicability needs registrar review."
            >
              {[
                ["Residency", a.residency, a.program.residency],
                ["Major residency", a.majorResidency, a.program.majorResidency],
                [
                  "Upper major residency",
                  a.upperMajorResidency,
                  a.program.upperMajorResidency,
                ],
                ["Upper-division total", a.upper, a.program.upperMinimum],
              ].map(([title, value, min]) => (
                <div className="metric-row" key={String(title)}>
                  <span>{title}</span>
                  <strong>
                    {value} / {min ?? "unknown"}
                  </strong>
                </div>
              ))}
              <p className="muted">
                GPA: {a.gpa?.toFixed(2) ?? "No graded credits"} · Minimum{" "}
                {a.program.minimumGpa ?? "unverified"}
              </p>
              <Badge status={a.program.status} />
            </Section>
            <Section title="Requirement groups">
              {state.groups
                .filter((g) => g.universityId === u.id)
                .map((g) => (
                  <button
                    key={g.id}
                    className="list-row text-left"
                    onClick={() => add("group", g)}
                  >
                    <span>
                      {a.groupDone(g) ? "✓" : "○"} {g.title}
                      <small>
                        {g.kind} · minimum {g.minimum} · {g.children.length}{" "}
                        child rules
                      </small>
                    </span>
                    <Badge status={g.status} />
                  </button>
                ))}
              {!state.groups.some((g) => g.universityId === u.id) && (
                <p className="muted">
                  No rules imported. Add documented AND, OR, credit,
                  upper-level, residency or GPA groups.
                </p>
              )}
            </Section>
          </div>
        </div>
        <Section
          title="Official credit awards"
          subtitle="Provider completion, transcript posting and degree applicability are separate."
        >
          <DataTable
            name="Awards"
            data={state.awards.filter((a) => a.universityId === u.id)}
            columns={[
              {
                accessorKey: "courseId",
                header: "Course",
                cell: ({ row }: any) =>
                  state.courses.find((c) => c.id === row.original.courseId)
                    ?.title,
              },
              { accessorKey: "credits", header: "Credits" },
              {
                accessorKey: "posted",
                header: "Posted",
                cell: ({ getValue }: any) => (getValue() ? "Yes" : "No"),
              },
              {
                accessorKey: "applied",
                header: "Applied",
                cell: ({ getValue }: any) => (getValue() ? "Yes" : "No"),
              },
              {
                id: "actions",
                header: "Review",
                cell: ({ row }: any) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => add("award", row.original)}
                  >
                    Edit evidence
                  </Button>
                ),
              },
            ]}
            onBulkDelete={(ids) => remove("awards", ids)}
          />
        </Section>
      </>
    );
  }
  function explorer() {
    return (
      <>
        <Notice>
          All course progress starts empty. A provider’s ACE recommendation and
          a published equivalency are not university-confirmed degree
          applicability. Verify before buying.
        </Notice>
        <div className="button-row">
          <Button onClick={() => add("course")}>
            <Plus size={16} />
            Add course
          </Button>
          <Button variant="secondary" onClick={() => csvInput.current?.click()}>
            <Upload size={16} />
            Import course CSV
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              download(
                "course-template.csv",
                csvExport([
                  {
                    title: "",
                    provider: "Sophia",
                    providerCourseId: "",
                    credits: 3,
                    hours: 30,
                    cost: 0,
                  },
                ]),
                "text/csv",
              )
            }
          >
            CSV template
          </Button>
        </div>
        <DataTable
          data={state.courses}
          columns={courseColumns}
          name="Courses"
          onBulkDelete={(ids) => remove("courses", ids)}
        />
        {recommendationsPanel()}
      </>
    );
  }
  function transfer() {
    const courses = state.courses
      .filter((c) => matrixProvider === "All" || c.provider === matrixProvider)
      .filter(
        (c) =>
          matrixStatus === "All" ||
          state.equivalencies.some(
            (e) => e.courseId === c.id && e.status === matrixStatus,
          ),
      );
    return (
      <>
        <Notice>
          Three separate facts: published equivalency, university-confirmed
          degree applicability, and your personal posted credit. 72
          provider-published UMPI equivalencies are seeded; none is an
          individual applicability approval.
        </Notice>
        <div className="button-row">
          <Button onClick={() => add("mapping")}>
            <Plus size={16} />
            Add transfer evaluation
          </Button>
          <select
            aria-label="Provider filter"
            value={matrixProvider}
            onChange={(e) => setMatrixProvider(e.target.value)}
          >
            {["All", ...new Set(state.courses.map((c) => c.provider))].map(
              (p) => (
                <option key={p}>{p}</option>
              ),
            )}
          </select>
          <select
            aria-label="Verification filter"
            value={matrixStatus}
            onChange={(e) => setMatrixStatus(e.target.value)}
          >
            <option>All</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <DataTable
          data={courses}
          name="Transfer matrix"
          columns={[
            {
              accessorKey: "title",
              header: "Outside course",
              size: 240,
              cell: ({ row }: any) => (
                <div>
                  <strong>{row.original.title}</strong>
                  <small>
                    {row.original.provider} · {row.original.credits} credits
                  </small>
                  <small>
                    ACE: {row.original.aceId || "unavailable"} ·{" "}
                    {row.original.upper ? "upper" : "lower / unconfirmed"}
                  </small>
                  <small>
                    Validity: {row.original.validFrom || "?"} –{" "}
                    {row.original.validTo || "?"}
                  </small>
                </div>
              ),
            },
            ...universities.map((university) => ({
              id: university.name,
              header: university.name,
              size: 270,
              cell: ({ row }: any) => {
                const eq = state.equivalencies.find(
                    (e) =>
                      e.courseId === row.original.id &&
                      e.universityId === university.id,
                  ),
                  award = state.awards.find(
                    (a) =>
                      a.courseId === row.original.id &&
                      a.universityId === university.id,
                  );
                return (
                  <div className="matrix-cell">
                    <Badge status={eq?.status ?? "unverified"} />
                    <strong>
                      Equivalent: {eq?.equivalent || "Not documented"}
                    </strong>
                    <small>
                      Degree audit:{" "}
                      {eq?.requirementIds
                        .map(
                          (id) =>
                            state.requirements.find((r) => r.id === id)?.title,
                        )
                        .join(", ") || "Not confirmed"}
                    </small>
                    <small>
                      My credit:{" "}
                      {award?.posted
                        ? award.applied
                          ? "Posted & applied"
                          : "Posted, not applied"
                        : "Not posted"}
                    </small>
                    <small>Progress: {row.original.status}</small>
                    <p className="risk-text">
                      Risk:{" "}
                      {eq?.risk ||
                        "Acceptance, requirement, catalog and residency unknown."}
                    </p>
                    {eq && state.sources.find((s) => s.id === eq.sourceId) && (
                      <SourceLink
                        url={
                          state.sources.find((s) => s.id === eq.sourceId)!.url
                        }
                      />
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        add(
                          "mapping",
                          eq ?? {
                            courseId: row.original.id,
                            universityId: university.id,
                          },
                        )
                      }
                    >
                      {eq ? "Review" : "Add evidence"}
                    </Button>
                  </div>
                );
              },
            })),
          ]}
        />
      </>
    );
  }
  function optimizer() {
    return (
      <>
        <div className="optimizer-controls card">
          <Field label="Objective">
            <select
              value={state.profile.objective}
              onChange={(e) =>
                mutate((s) => {
                  s.profile.objective = e.target.value as any;
                }, "Optimization objective changed")
              }
            >
              <option value="cheapest">Cheapest</option>
              <option value="fastest">Fastest</option>
              <option value="balanced">Balanced</option>
            </select>
          </Field>
          <Field label="Duration assumptions">
            <select
              value={state.profile.durationMode}
              onChange={(e) =>
                mutate((s) => {
                  s.profile.durationMode = e.target.value as any;
                }, "Duration assumptions changed")
              }
            >
              {["optimistic", "realistic", "conservative"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field
            label={`Balanced cost weight: ${Math.round(state.profile.costWeight * 100)}%`}
          >
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={state.profile.costWeight}
              onChange={(e) =>
                mutate((s) => {
                  s.profile.costWeight = Number(e.target.value);
                }, "Cost weight changed")
              }
            />
          </Field>
        </div>
        {result.blockers.map((b) => (
          <Notice key={b}>{b}</Notice>
        ))}
        <div className="two-grid">
          <Section
            title="Calculated pathways"
            subtitle="Exact subset search; no infeasible path is presented as a winner."
          >
            {result.strategies.length ? (
              result.strategies.map((s, i) => (
                <div className="strategy" key={i}>
                  <div className="list-row">
                    <strong>
                      {i === 0 ? "★ Best under your objective · " : ""}
                      {s.name}
                    </strong>
                    <strong>{money(s.cost)}</strong>
                  </div>
                  <p>
                    {s.hours.toFixed(1)} study hours · {s.finish} estimated
                    finish · {s.risk} estimated workloads
                  </p>
                  <p>{s.explanation}</p>
                  <details>
                    <summary>Course sequence and billing explanation</summary>
                    {s.sequence.map((q) => (
                      <p key={q.courseId}>
                        {state.courses.find((c) => c.id === q.courseId)?.title}:{" "}
                        {q.start} → {q.finish}
                      </p>
                    ))}
                  </details>
                </div>
              ))
            ) : (
              <Empty title="No verified graduation pathway yet">
                The engine cannot prove a cheapest or fastest degree without a
                complete confirmed requirements map. Add the official audit,
                applicable courses and enrollment dates, then recalculate.
              </Empty>
            )}
          </Section>
          <div className="stack">
            <Section
              title="What changes if…"
              subtitle="Changes recalculate the same audit and scheduler."
            >
              <Field label="Extra study hours / week">
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={scenario.extraWeeklyHours}
                  onChange={(e) =>
                    setScenario({
                      ...scenario,
                      extraWeeklyHours: Math.max(0, Number(e.target.value)),
                    })
                  }
                />
              </Field>
              <Field label="Delay / pause / prerequisite overrun (weeks)">
                <input
                  type="number"
                  min="0"
                  value={scenario.delayWeeks}
                  onChange={(e) =>
                    setScenario({
                      ...scenario,
                      delayWeeks: Math.max(0, Number(e.target.value)),
                    })
                  }
                />
              </Field>
              <Field label="Tuition multiplier">
                <input
                  type="number"
                  min="0.01"
                  step="0.05"
                  value={scenario.tuitionMultiplier}
                  onChange={(e) =>
                    setScenario({
                      ...scenario,
                      tuitionMultiplier: Math.max(0.01, Number(e.target.value)),
                    })
                  }
                />
              </Field>
              <Field label="Denied transfer / failed exam course">
                <select
                  value={scenario.deniedCourseId}
                  onChange={(e) =>
                    setScenario({ ...scenario, deniedCourseId: e.target.value })
                  }
                >
                  <option value="">None</option>
                  {state.courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Confirmed aid / reimbursement ($)">
                <input
                  type="number"
                  min="0"
                  value={scenario.confirmedAid}
                  onChange={(e) =>
                    setScenario({
                      ...scenario,
                      confirmedAid: Math.max(0, Number(e.target.value)),
                    })
                  }
                />
              </Field>
              <Button
                variant="secondary"
                onClick={() =>
                  setScenario({
                    extraWeeklyHours: 0,
                    delayWeeks: 0,
                    tuitionMultiplier: 1,
                    deniedCourseId: "",
                    confirmedAid: 0,
                  })
                }
              >
                Reset simulation
              </Button>
            </Section>
            <Section title="How this engine decides">
              <p>
                Enumerates every subset of up to 18 confirmed candidate courses.
                Each subset must pass the same graduation audit used throughout
                the app. Prerequisites are sorted into a serial schedule using
                daily capacity and workload assumptions.
              </p>
              <p>
                Monthly billing follows calendar renewal dates; Sophia compares
                monthly and four-month bundles. Outside coursework precedes an
                estimated 21-day transcript period and your configured
                university start date. Institutional duration determines tuition
                sessions.
              </p>
              <Notice>
                Not an unrestricted global optimum: concurrent schedules, every
                institutional session offering and GPA outcomes are not modeled.
                Source prices, workloads and enrollment dates require your
                review. See the documented backlog.
              </Notice>
            </Section>
          </div>
        </div>
      </>
    );
  }
  function finances() {
    return (
      <>
        <div className="stats-grid">
          {[
            ["Actual net spending", money(f.net)],
            ["Remaining committed", money(f.committed)],
            ["Ledger projection", money(f.projected)],
            ["Potential aid (excluded)", money(f.potentialAid)],
          ].map(([title, value]) => (
            <div className="stat" key={title}>
              <span>{title}</span>
              <strong>{value}</strong>
              <small>Based on your recorded transactions</small>
            </div>
          ))}
        </div>
        <div className="button-row">
          <Button onClick={() => add("transaction")}>
            <Plus size={16} />
            Record transaction
          </Button>
          <Button variant="secondary" onClick={() => add("subscription")}>
            Plan subscription
          </Button>
        </div>
        <DataTable
          data={state.transactions}
          name="Transactions"
          columns={[
            {
              accessorKey: "description",
              header: "Description",
              size: 240,
              cell: ({ row }: any) => (
                <button
                  className="text-button"
                  onClick={() => add("transaction", row.original)}
                >
                  {row.original.description}
                </button>
              ),
            },
            { accessorKey: "category", header: "Category" },
            { accessorKey: "kind", header: "State" },
            { accessorKey: "date", header: "Date" },
            {
              accessorKey: "amount",
              header: "Amount",
              cell: ({ getValue }: any) => money(getValue()),
            },
          ]}
          onBulkDelete={(ids) => remove("transactions", ids)}
        />
        <div className="three-grid">
          <Section title="Cash needed">
            {[
              [30, f.cash30],
              [60, f.cash60],
              [90, f.cash90],
            ].map(([days, cost]) => (
              <div className="metric-row" key={days}>
                <span>Next {days} days</span>
                <strong>{money(cost)}</strong>
              </div>
            ))}
            <p className="muted">
              Confirmed commitments only. Estimated costs are separate.
            </p>
          </Section>
          <Section title="Subscription calculator">
            {state.subscriptions.map((s) => (
              <button
                key={s.id}
                className="list-row text-left"
                onClick={() => add("subscription", s)}
              >
                <span>
                  {s.provider}
                  <small>
                    {s.startDate} → {s.endDate}
                  </small>
                </span>
                <strong>
                  {subscriptionCost(s).months} cycles ·{" "}
                  {money(subscriptionCost(s).cost)}
                </strong>
              </button>
            ))}
            {!state.subscriptions.length && (
              <p className="muted">
                Add a dated subscription to calculate billing cycles.
              </p>
            )}
            <p className="muted">
              Plan totals are separate from the ledger until you record
              expenses; never added twice.
            </p>
          </Section>
          <Section title="Useful credit economics">
            <div className="budget-total">
              <small>Actual cost per applied credit</small>
              <strong>
                {f.costPerCredit === null
                  ? "No applied credits"
                  : money(f.costPerCredit)}
              </strong>
            </div>
            <p>
              Sophia starting claim: $99 / month or $299 / four months. CLEP
              starting claim: $97 + test fees. One $97 exam is $2 less than one
              monthly subscription; two exams are $95 more, before fees.
              Applicability must match.
            </p>
            <Badge status="unverified" />
          </Section>
        </div>
        <Notice>
          Published tuition is not total graduation cost. Pell eligibility is
          not assumed. Potential aid is excluded; confirmed aid is shown
          separately from sticker price.
        </Notice>
        {comparison()}
      </>
    );
  }
  function comparison() {
    return (
      <Section
        title="University comparison"
        subtitle="Public prices are separate from verified total degree costs."
        action={
          <Button
            size="sm"
            variant="secondary"
            onClick={() => add("university")}
          >
            <Plus size={14} />
            Add university
          </Button>
        }
      >
        <div className="table-scroll">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Decision factor</th>
                {universities.map((v) => (
                  <th key={v.id}>
                    {v.name}
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${v.name} university`}
                      onClick={() => add("university", v)}
                    >
                      <Pencil size={12} />
                    </Button>
                    {v.id === u.id && (
                      <span className="primary-chip">Primary</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Awarded degree", ...universities.map((v) => v.degree)],
                [
                  "Institutional accreditation",
                  ...universities.map((v) => v.accreditor),
                ],
                [
                  "Program accreditation",
                  ...universities.map(() => "Not independently verified"),
                ],
                [
                  "Tuition claim",
                  ...universities.map(
                    (v) => money(v.tuition) + " / " + v.billing,
                  ),
                ],
                [
                  "Applicable / unverified credits",
                  ...universities.map((v) => {
                    const x = audit(state, v.id);
                    return `${x.total} / ${x.unverified}`;
                  }),
                ],
                [
                  "Residency minimum",
                  ...universities.map(
                    (v) =>
                      state.programs.find((p) => p.universityId === v.id)
                        ?.residency ?? "Unverified",
                  ),
                ],
                [
                  "Upper-division minimum",
                  ...universities.map(
                    (v) =>
                      state.programs.find((p) => p.universityId === v.id)
                        ?.upperMinimum ?? "Unverified",
                  ),
                ],
                [
                  "Feasible estimated cost",
                  ...universities.map((v) => {
                    const sim = {
                      ...state,
                      profile: { ...state.profile, primaryUniversity: v.id },
                    };
                    const r = optimize(sim);
                    return r.strategies[0]
                      ? money(r.strategies[0].cost)
                      : "Requirements incomplete";
                  }),
                ],
                [
                  "Graduation projection",
                  ...universities.map((v) => {
                    const r = optimize({
                      ...state,
                      profile: { ...state.profile, primaryUniversity: v.id },
                    });
                    return r.strategies[0]?.finish ?? "Not calculable";
                  }),
                ],
                [
                  "Admissions / transfer restrictions",
                  ...universities.map((v) => v.notes),
                ],
              ].map(([label, ...values]) => (
                <tr key={String(label)}>
                  <th>{label}</th>
                  {values.map((value, i) => (
                    <td key={i}>{String(value)}</td>
                  ))}
                </tr>
              ))}
              <tr>
                <th>Switch primary degree</th>
                {universities.map((v) => (
                  <td key={v.id}>
                    <Button
                      variant={v.id === u.id ? "default" : "secondary"}
                      size="sm"
                      onClick={() =>
                        mutate((s) => {
                          s.profile.primaryUniversity = v.id;
                        }, "Primary university changed")
                      }
                    >
                      {v.id === u.id ? "Selected" : "Choose " + v.name}
                    </Button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="muted">
          Switching retains all educational history and recalculates using that
          university’s separate evaluations. Career relevance is indicated by
          the degree title, not an accreditation or employability guarantee.
        </p>
      </Section>
    );
  }
  function verification() {
    return (
      <>
        <div className="stats-grid">
          {[
            [
              "Documented requirements",
              state.requirements.filter((r) => r.status === "documented")
                .length,
            ],
            [
              "Confirmed applicability",
              state.equivalencies.filter(
                (e) => e.status === "advisor-confirmed",
              ).length,
            ],
            [
              "Conflicts",
              state.equivalencies.filter((e) => e.status === "conflicting")
                .length,
            ],
            [
              "Blocked official sources",
              state.sources.filter((s) => s.retrievalStatus === "inaccessible")
                .length,
            ],
          ].map(([label, n]) => (
            <div className="stat" key={label}>
              <span>{label}</span>
              <strong>{n}</strong>
            </div>
          ))}
        </div>
        {overdueCourses(state).map((c) => (
          <Notice key={c.id}>
            Missed course deadline: {c.title} · {c.dueDate}. Review your
            remaining workload and reschedule in the planner.{" "}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => add("course", c)}
            >
              Update course
            </Button>
          </Notice>
        ))}
        <div className="two-grid">
          <Section title="Research & approval checklist">
            {gaps.map((g) => (
              <details className="gap" key={g.title}>
                <summary>
                  <TriangleAlert size={16} />
                  {g.title}
                  <span>{g.university}</span>
                </summary>
                <p>{g.detail}</p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => add("source")}
                >
                  Attach reviewed evidence
                </Button>
              </details>
            ))}
            <div className="checklist">
              <p>Before a course is safe to purchase:</p>
              {[
                "Identify the applicable catalog and exact requirement.",
                "Confirm exact provider course and recommendation validity.",
                "Record written university applicability, not just acceptance.",
                "Check passing grade, duplicates, upper level and residency.",
                "After completion, obtain official posted and applied evaluation.",
              ].map((t) => (
                <p key={t}>
                  <ShieldCheck size={15} />
                  {t}
                </p>
              ))}
            </div>
          </Section>
          <Section
            title="University question generator"
            action={
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setQuestion(makeQuestion())}
              >
                Generate questions
              </Button>
            }
          >
            <textarea
              className="email-draft"
              aria-label="University question draft"
              value={question || makeQuestion()}
              onChange={(e) => setQuestion(e.target.value)}
              rows={17}
            />
            <div className="button-row">
              <Button
                variant="secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      question || makeQuestion(),
                    );
                    toast("Questions copied. Review before sending.");
                  } catch {
                    download(
                      "university-questions.txt",
                      question || makeQuestion(),
                      "text/plain",
                    );
                  }
                }}
              >
                Copy questions
              </Button>
              <Button variant="ghost" onClick={() => add("source")}>
                Record response as evidence
              </Button>
            </div>
          </Section>
        </div>
        <Section title="Evaluations needing review">
          {state.equivalencies.length ? (
            state.equivalencies.map((e) => (
              <div className="list-row" key={e.id}>
                <div>
                  <strong>
                    {state.courses.find((c) => c.id === e.courseId)?.title} →{" "}
                    {e.universityId.toUpperCase()}
                  </strong>
                  <small>
                    {e.risk} · Catalog {e.catalogYear} · Reviewed{" "}
                    {e.reviewedAt || "never"}
                  </small>
                  <Badge status={e.status} />
                  <small>
                    {e.expiresAt && e.expiresAt < today()
                      ? "Expired recommendation"
                      : "Check recommendation validity"}
                  </small>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => add("mapping", e)}
                >
                  Review
                </Button>
              </div>
            ))
          ) : (
            <Empty title="No transfer approvals recorded" />
          )}
        </Section>
        <Section title="Approval history">
          {state.approvals.map((p) => (
            <div className="list-row" key={p.id}>
              <span>
                {p.reviewer} · {p.date}
                <small>{p.notes}</small>
              </span>
              <Badge status={p.status} />
            </div>
          ))}
          {!state.approvals.length && (
            <p className="muted">
              Written applicability approvals will appear here when recorded.
            </p>
          )}
        </Section>
      </>
    );
  }
  function enrollment() {
    return (
      <>
        <Notice>
          January 11, 2027 and March 8, 2027 UMPI starts were confirmed on the
          public program page. Confirm availability and deadlines with
          admissions; the October 26 application deadline was reported passed.
          No admission is assumed.
        </Notice>
        <div className="button-row">
          <Button onClick={() => add("enrollment")}>
            <Plus size={16} />
            Add application / enrollment
          </Button>
        </div>
        <div className="two-grid">
          <Section title="Application tracker">
            {state.enrollments.map((e) => (
              <button
                key={e.id}
                className="list-row text-left"
                onClick={() => add("enrollment", e)}
              >
                <span>
                  <strong>
                    {e.universityId.toUpperCase()} · {e.status}
                  </strong>
                  <small>
                    Application {e.applicationDate || "not entered"} · Start{" "}
                    {e.startDate || "not confirmed"}
                  </small>
                  <small>{e.notes}</small>
                </span>
                <Pencil size={16} />
              </button>
            ))}
            {!state.enrollments.length && (
              <Empty title="Your application starts here" />
            )}
          </Section>
          <Section title="First-time student checklist">
            <p>
              Request the official admissions checklist, confirm minimum age,
              obtain high school graduation documentation, clarify catalog year,
              financial aid process and all transcript deadlines.
            </p>
            <p>
              Capture actual application and session dates. The optimizer
              requires a planned university start after outside coursework and
              transcript processing.
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                setQuestion(makeQuestion());
                navigate("Academic Verification Center");
              }}
            >
              Prepare admissions questions
            </Button>
          </Section>
        </div>
      </>
    );
  }
  function portfolio(career = false) {
    return (
      <>
        <Notice>
          Professional experience, CPSM, CSCP, CLTD, Lean Six Sigma and ERP
          training remain separate from academic credit. Only a documented
          university award may enter the degree audit.
        </Notice>
        <div className="button-row">
          <Button onClick={() => add("portfolio")}>
            <Plus size={16} />
            Add {career ? "credential / competency" : "learning experience"}
          </Button>
        </div>
        <div className="two-grid">
          <Section
            title={career ? "Competency portfolio" : "Prior learning portfolio"}
          >
            {state.portfolio.map((p) => (
              <div className="list-row" key={p.id}>
                <div>
                  <button
                    className="text-button"
                    onClick={() => add("portfolio", p)}
                  >
                    {p.title}
                  </button>
                  <small>
                    {p.competency} · {p.hours} learning hours
                  </small>
                  <p>{p.description}</p>
                  <small>{p.evidence}</small>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${p.title}`}
                  onClick={() => remove("portfolio", [p.id])}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
            {!state.portfolio.length && (
              <Empty title="Document what you already know">
                Capture work projects, learning outcomes and supporting
                evidence. No degree credit is presumed.
              </Empty>
            )}
          </Section>
          <Section
            title={
              career
                ? "Procurement competency map"
                : "Portfolio assessment checklist"
            }
          >
            {career ? (
              competencies.map((c) => {
                const courses = state.courses.filter(
                  (x) =>
                    ["Completed", "Officially Applied"].includes(x.status) &&
                    x.competencies.includes(c),
                );
                return (
                  <div className="metric-row" key={c}>
                    <span>{c}</span>
                    <strong>{courses.length} completed course links</strong>
                  </div>
                );
              })
            ) : (
              <>
                <p>
                  1. Identify a university course with approved portfolio
                  assessment availability.
                </p>
                <p>
                  2. Map your work learning to that course’s learning outcomes.
                </p>
                <p>
                  3. Collect nonconfidential examples, reflective narrative and
                  employer attestations.
                </p>
                <p>
                  4. Obtain evaluator approval, fee confirmation and residency
                  treatment in writing.
                </p>
                <p>
                  UMPI documented public fee: $50 per credit, subject to
                  restrictions. A successful portfolio is not guaranteed.
                </p>
                <Button variant="secondary" onClick={() => add("source")}>
                  Record university guidance
                </Button>
              </>
            )}
          </Section>
        </div>
        {career && (
          <Section title="Optional credentials">
            <p>
              ISM CPSM · ASCM CSCP · ASCM CLTD · Lean Six Sigma · ERP / SAP
              procurement training
            </p>
            <p className="muted">
              Eligibility, cost and certification requirements are not
              researched in this dataset. Add real credentials and evidence to
              your portfolio; do not infer academic credit.
            </p>
          </Section>
        )}
      </>
    );
  }
  function documents() {
    return (
      <>
        <Notice>
          Files and extraction stay on this device. PDF and DOCX text is never
          automatically treated as authoritative; review it, then create an
          evidence record using the exact excerpt. Scanned PDFs may need manual
          transcription.
        </Notice>
        <label
          className={`drop-zone ${docBusy ? "busy" : ""}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void attach(e.dataTransfer.files);
          }}
        >
          <Upload size={30} />
          <strong>
            {docBusy
              ? "Processing locally…"
              : "Drop degree audits, confirmations and receipts"}
          </strong>
          <span>PDF, DOCX, text or any attachment · 30 MB per file</span>
          <input
            type="file"
            multiple
            disabled={docBusy}
            onChange={(e) => {
              void attach(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
        <Section
          title="Private document vault"
          subtitle="Full backups include file contents."
        >
          {state.documents.map((d) => (
            <details key={d.id} className="document-row">
              <summary>
                <Files size={20} />
                <span>
                  <strong>{d.name}</strong>
                  <small>
                    {d.date} · {(d.size / 1024).toFixed(0)} KB ·{" "}
                    {d.reviewed ? "User reviewed" : "Awaiting user review"}
                  </small>
                </span>
              </summary>
              <div className="button-row">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    const file = await db.files.get(d.id);
                    if (file) download(d.name, file.blob);
                    else toast("File not found. Restore a full backup.");
                  }}
                >
                  Download
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    mutate((s) => {
                      s.documents.find((x) => x.id === d.id)!.reviewed = true;
                    }, "Extracted document reviewed");
                  }}
                >
                  Mark reviewed
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!d.reviewed}
                  onClick={() =>
                    add("source", {
                      authority: "User-reviewed document: " + d.name,
                      url: "urn:degree-hq:document:" + d.id,
                      quote: d.extractedText.slice(0, 2000),
                      location: d.name,
                    })
                  }
                >
                  Create evidence draft
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() =>
                    setConfirm({
                      title: "Permanently delete this attachment?",
                      action: () => {
                        void db.files.delete(d.id);
                        mutate((s) => {
                          s.documents = s.documents.filter(
                            (x) => x.id !== d.id,
                          );
                        }, "Document deleted");
                      },
                    })
                  }
                >
                  Delete
                </Button>
              </div>
              <Field label="Extracted text (review only)">
                <textarea
                  readOnly
                  value={
                    d.extractedText ||
                    "No text extraction available for this file type."
                  }
                  rows={10}
                />
              </Field>
              <Field label="Document notes">
                <textarea
                  value={d.notes}
                  onChange={(e) =>
                    mutate((s) => {
                      s.documents.find((x) => x.id === d.id)!.notes =
                        e.target.value;
                    }, "Document notes changed")
                  }
                />
              </Field>
            </details>
          ))}
          {!state.documents.length && <Empty title="Your vault is empty" />}
        </Section>
      </>
    );
  }
  function reports() {
    const weekly = Array.from({ length: 8 }, (_, i) => {
      const start = format(addDays(new Date(), (i - 7) * 7), "yyyy-MM-dd"),
        end = format(addDays(parseISO(start), 7), "yyyy-MM-dd");
      return {
        week: format(parseISO(start), "MMM d"),
        hours: state.sessions
          .filter(
            (s) =>
              s.completed &&
              s.date >= start &&
              s.date < end &&
              ["Study", "Exam"].includes(s.kind),
          )
          .reduce((a, s) => a + s.minutes / 60, 0),
      };
    });
    const burn = capacity(state, today(), 12);
    let available = 0;
    const workload = state.courses
      .filter((c) => ["Scheduled", "In Progress"].includes(c.status))
      .reduce((sum, c) => sum + c.hours, 0);
    const burndown = burn
      .filter((_, i) => i % 7 === 0)
      .map((d, i) => {
        available += burn
          .slice(i * 7, i * 7 + 7)
          .reduce((a, b) => a + b.hours, 0);
        return {
          week: "Week " + (i + 1),
          remaining: Math.max(0, workload - available),
          capacity: available,
        };
      });
    return (
      <>
        <div className="button-row">
          <Button onClick={() => window.print()}>
            <Download size={16} />
            Print / save PDF report
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              download(
                "academic-report.json",
                JSON.stringify(
                  {
                    generatedAt: new Date().toISOString(),
                    program: a.program,
                    totals: {
                      earned: a.earned,
                      posted: a.posted,
                      applicable: a.total,
                      remaining: a.remaining,
                    },
                    financials: f,
                    requirements: state.requirements,
                    sourceGaps: gaps,
                  },
                  null,
                  2,
                ),
              )
            }
          >
            Export report JSON
          </Button>
        </div>
        {stats()}
        <div className="two-grid">
          <Section
            title="Weekly study productivity"
            subtitle="Actual completed study sessions only."
          >
            <div className="chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekly}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="hours" fill="#23765c" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>
          <Section
            title="Workload burn-down"
            subtitle="Estimated hours minus your configured capacity; not a degree guarantee."
          >
            <div className="chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={burndown}>
                  <defs>
                    <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="#23765c"
                        stopOpacity={0.25}
                      />
                      <stop offset="100%" stopColor="#23765c" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="remaining"
                    stroke="#23765c"
                    fill="url(#fill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Section>
        </div>
        <Section title="Credit states">
          <div className="metric-row">
            <span>Earned at provider</span>
            <strong>{a.earned}</strong>
          </div>
          <div className="metric-row">
            <span>Officially transferred</span>
            <strong>{a.posted}</strong>
          </div>
          <div className="metric-row">
            <span>Confirmed degree applicable</span>
            <strong>{a.total}</strong>
          </div>
          <div className="metric-row">
            <span>Surplus / rejected</span>
            <strong>{a.surplus}</strong>
          </div>
        </Section>
      </>
    );
  }
  function sources() {
    const rows = state.sources.filter((s) =>
      (s.url + " " + s.authority + " " + s.quote)
        .toLowerCase()
        .includes(sourceSearch.toLowerCase()),
    );
    return (
      <>
        <Notice>
          External refresh is an explicit build-time operation:{" "}
          <code>npm run research</code>. It records retrieval history and
          snapshots but never upgrades requirements automatically. Review
          changes and import normalized evidence intentionally.
        </Notice>
        <div className="button-row">
          <Button onClick={() => add("source")}>
            <Plus size={16} />
            Add reviewed evidence
          </Button>
          <Button
            variant="secondary"
            onClick={() => researchInput.current?.click()}
          >
            <Upload size={16} />
            Import reviewed research
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              download(
                "research-export.json",
                JSON.stringify(
                  {
                    sources: state.sources,
                    requirements: state.requirements,
                    equivalencies: state.equivalencies,
                    groups: state.groups,
                    programs: state.programs,
                  },
                  null,
                  2,
                ),
              )
            }
          >
            Export research records
          </Button>
          <input
            placeholder="Search sources or quotes"
            aria-label="Search research sources"
            value={sourceSearch}
            onChange={(e) => setSourceSearch(e.target.value)}
          />
        </div>
        <Section
          title="Source registry"
          subtitle="Retrieval, human review and catalog applicability remain distinct."
        >
          {rows.map((s) => (
            <details key={s.id} className="source-row">
              <summary>
                <span className="source-number">{s.id}</span>
                <div>
                  <strong>
                    {new URL(s.url).hostname || "Local evidence document"}
                  </strong>
                  <small>{s.url}</small>
                  <small>
                    {s.verifiedAt &&
                    new Date(s.verifiedAt).getTime() <
                      Date.now() - 180 * 86400000
                      ? "Aging evidence — recheck"
                      : s.verifiedAt
                        ? "Reviewed " + s.verifiedAt
                        : "Not reviewed"}
                  </small>
                </div>
                <Badge
                  status={
                    s.retrievalStatus === "inaccessible"
                      ? "unverified"
                      : s.quote && s.verifiedAt
                        ? "documented"
                        : "provisional"
                  }
                />
              </summary>
              <p>
                {s.authority} · {s.evidenceType} · {s.catalogYear}
              </p>
              <p>
                Attempted: {s.attemptedAt ?? "Not recorded"} · Human checked:{" "}
                {s.verifiedAt ?? "Never"}
              </p>
              <p className="error">{s.blockage}</p>
              <blockquote>
                {s.quote ??
                  "No source content retrieved or reviewed. Nothing inferred."}
              </blockquote>
              <p>Location: {s.location ?? "Unavailable"}</p>
              <div className="button-row">
                <SourceLink url={s.url} />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => add("source", s)}
                >
                  Review source
                </Button>
              </div>
              <details>
                <summary>Change history ({s.history.length})</summary>
                <pre>{JSON.stringify(s.history, null, 2)}</pre>
              </details>
            </details>
          ))}
        </Section>
      </>
    );
  }
  function settings() {
    return (
      <>
        <div className="two-grid">
          <Section title="Personal preferences">
            <Field label="Your name">
              <input
                value={state.profile.name}
                onChange={(e) =>
                  mutate((s) => {
                    s.profile.name = e.target.value;
                  }, "Profile updated")
                }
              />
            </Field>
            <Field label="Theme">
              <select
                value={state.profile.theme}
                onChange={(e) =>
                  mutate((s) => {
                    s.profile.theme = e.target.value as any;
                  }, "Theme updated")
                }
              >
                {["light", "dark", "system"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Density">
              <select
                value={state.profile.density}
                onChange={(e) =>
                  mutate((s) => {
                    s.profile.density = e.target.value as any;
                  }, "Density updated")
                }
              >
                <option>comfortable</option>
                <option>compact</option>
              </select>
            </Field>
            <Field label="Primary university">
              <select
                value={u.id}
                onChange={(e) =>
                  mutate((s) => {
                    s.profile.primaryUniversity = e.target.value;
                  }, "Primary university changed")
                }
              >
                {universities.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </Field>
            <Button
              variant="secondary"
              onClick={() => add("program", a.program)}
            >
              Edit academic program rules
            </Button>
            <p className="muted">
              Add universities in University Comparison, then enter their
              separate program rules, official sources and transfer evaluations.
              Accreditation and tuition remain unverified until documented.
            </p>
          </Section>
          <Section title="Backups & data ownership">
            <p>
              Data and attachments are stored in IndexedDB in this browser
              profile. Device loss, browser clearing and private mode can erase
              them. Export a full backup regularly.
            </p>
            <p>
              Last backup:{" "}
              {state.lastBackup
                ? format(parseISO(state.lastBackup), "MMM d, yyyy h:mm a")
                : "Never — export your first backup"}
            </p>
            <div className="button-row">
              <Button onClick={exportBackup}>
                <Download size={16} />
                Export full backup
              </Button>
              <Button
                variant="secondary"
                onClick={() => backupInput.current?.click()}
              >
                <Upload size={16} />
                Restore backup
              </Button>
            </div>
            <Notice>
              Restore replaces current records only after schema, checksum and
              attachment validation. Export first. v1 structured backups are
              migrated; full v2 backups include documents.
            </Notice>
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  const persisted = await navigator.storage.persist();
                  toast(
                    persisted
                      ? "Browser granted persistent storage."
                      : "Browser did not grant persistence. Keep external backups.",
                  );
                } catch (e) {
                  toast((e as Error).message);
                }
              }}
            >
              Request persistent browser storage
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                setConfirm({
                  title: "Reset all academic records and documents?",
                  action: () => {
                    void db.files.clear();
                    commit(structuredClone(initialState));
                    history.current = [];
                    future.current = [];
                    navigate("Dashboard");
                  },
                })
              }
            >
              Reset this device
            </Button>
          </Section>
        </div>
        <Section title="Offline & privacy">
          <p>
            Core planning requires no account or paid service. The production
            PWA caches the shell and local extraction modules after initial
            loading. Network research never runs automatically. Use{" "}
            <code>npm run build</code> then <code>npm run preview</code>; do not
            open the compiled HTML with a file:// URL.
          </p>
          <p>
            External source links leave the application when you choose to open
            them. Personal documents are never uploaded to a server by this app.
            Printing supports the browser’s Save as PDF.
          </p>
          <div className="button-row">
            <Button
              variant="secondary"
              onClick={() =>
                download("courses.csv", csvExport(state.courses), "text/csv")
              }
            >
              Export courses CSV
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                download(
                  "transactions.csv",
                  csvExport(state.transactions),
                  "text/csv",
                )
              }
            >
              Export transactions CSV
            </Button>
            <Button
              variant="ghost"
              disabled={!history.current.length}
              onClick={undo}
            >
              <Undo2 size={15} />
              Undo
            </Button>
            <Button
              variant="ghost"
              disabled={!future.current.length}
              onClick={redo}
            >
              <Redo2 size={15} />
              Redo
            </Button>
          </div>
        </Section>
      </>
    );
  }
  function myDegree() {
    return (
      <>
        <div className="degree-summary">
          <div className="degree-logo">
            <GraduationCap size={42} />
          </div>
          <div>
            <div className="eyebrow">
              YOUR PRIMARY DEGREE · {a.program.catalogId}
            </div>
            <h2>{u.degree}</h2>
            <p>{u.fullName} · Local-first planning</p>
            <Badge status={a.program.status} />
          </div>
          <Button
            variant="secondary"
            onClick={() => navigate("University Comparison")}
          >
            Compare universities
          </Button>
        </div>
        <Notice>
          All earned and applied credits begin at zero. The 120-credit minimum
          is publicly documented for UMPI; it is not a complete verified course
          map. Import an official catalog or degree audit before selecting a
          graduation pathway.
        </Notice>
        <div className="two-grid">
          <Section title="Degree progress">
            <div className="metric-row">
              <span>Provider-earned credits</span>
              <strong>{a.earned}</strong>
            </div>
            <div className="metric-row">
              <span>Transferred and posted</span>
              <strong>{a.posted}</strong>
            </div>
            <div className="metric-row">
              <span>Official degree applicability</span>
              <strong>{a.total}</strong>
            </div>
            <p>{u.notes}</p>
            <Button onClick={() => navigate("Degree Audit")}>
              Open full audit
              <ArrowRight size={16} />
            </Button>
          </Section>
          <Section title="Your next milestones">
            {[
              [
                "1",
                "Get the complete official requirements",
                "Academic Verification Center",
              ],
              ["2", "Evaluate outside-course applicability", "Transfer Matrix"],
              ["3", "Configure a sustainable schedule", "Study Planner"],
              [
                "4",
                "Calculate and compare a feasible plan",
                "Pathway Optimizer",
              ],
            ].map(([n, t, p]) => (
              <button className="milestone" key={n} onClick={() => navigate(p)}>
                <span>{n}</span>
                <strong>{t}</strong>
                <ArrowRight size={15} />
              </button>
            ))}
          </Section>
        </div>
        {recommendationsPanel()}
      </>
    );
  }
  const views: Record<string, () => React.ReactNode> = {
    Dashboard: dashboard,
    "My Degree": myDegree,
    "Degree Audit": degreeAudit,
    "Course Explorer": explorer,
    "Transfer Matrix": transfer,
    "Pathway Optimizer": optimizer,
    "Study Planner": () => (
      <Planner state={state} mutate={mutate} toast={toast} />
    ),
    "Financial Command Center": finances,
    "University Comparison": comparison,
    "Academic Verification Center": verification,
    "Applications & Enrollment": enrollment,
    "Prior Learning Assessment": () => portfolio(false),
    "Transcript & Document Vault": documents,
    "Professional Development": () => portfolio(true),
    "Reports & Analytics": reports,
    "Research Sources": sources,
    "Settings & Backups": settings,
  };
  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      {mobile && (
        <button
          className="mobile-overlay"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? "mobile-open" : ""}`}>
        <button className="brand" onClick={() => navigate("Dashboard")}>
          <span className="brand-symbol">
            <GraduationCap size={24} />
          </span>
          <span className="brand-text">
            DEGREE HACKER<span>PROCUREMENT PRO</span>
          </span>
        </button>
        <button
          className="workspace-switch"
          onClick={() => navigate("My Degree")}
        >
          <span className="university-mark">{u.name.slice(0, 1)}</span>
          <span>
            <strong>My degree headquarters</strong>
            <small>
              {u.name} · {a.program.catalogId}
            </small>
          </span>
          <ChevronRight size={15} />
        </button>
        <div className="nav-group-label">YOUR WORKSPACE</div>
        <nav aria-label="Main navigation">
          {navigation.map((item, i) => {
            const Icon = icons[i];
            return (
              <button
                key={item}
                title={collapsed ? item : undefined}
                aria-label={item}
                aria-current={page === item ? "page" : undefined}
                className={page === item ? "nav-active" : ""}
                onClick={() => navigate(item)}
              >
                <Icon size={18} />
                <span>{item}</span>
                {item === "Academic Verification Center" && (
                  <b className="nav-count">{gaps.length}</b>
                )}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <div className="private-note">
            <ShieldCheck size={16} />
            <span>Private. Local. Yours.</span>
          </div>
          <button
            className="user-profile"
            onClick={() => navigate("Settings & Backups")}
          >
            <span className="avatar">
              {state.profile.name.slice(0, 1) || "Y"}
            </span>
            <span>
              <strong>{state.profile.name || "Your workspace"}</strong>
              <small>Zero to bachelor’s degree</small>
            </span>
            <Settings size={15} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <Button
              variant="ghost"
              size="icon"
              className="desktop-only"
              aria-label="Toggle sidebar"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? (
                <PanelLeftOpen size={19} />
              ) : (
                <PanelLeftClose size={19} />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="mobile-only"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={21} />
            </Button>
            <span className="breadcrumb">
              Workspace
              <ChevronRight size={13} />
              <strong>{page}</strong>
            </span>
          </div>
          <div className="topbar-right">
            <span
              className={`save-indicator ${saveStatus.startsWith("Save failed") ? "error" : ""}`}
            >
              <span className="save-dot" />
              {saveStatus}
            </span>
            <button
              className="command-trigger"
              onClick={() => setCommand(true)}
            >
              <Search size={15} />
              <span>Search anything</span>
              <kbd>⌘ K</kbd>
            </button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle light or dark theme"
              onClick={() =>
                mutate((s) => {
                  s.profile.theme =
                    s.profile.theme === "dark" ? "light" : "dark";
                }, "Theme changed")
              }
            >
              {state.profile.theme === "dark" ? (
                <Sun size={18} />
              ) : (
                <Moon size={18} />
              )}
            </Button>
          </div>
        </header>
        <main className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {page === "Dashboard"
                  ? "YOUR PATH TO A PROCUREMENT DEGREE"
                  : u.name + " · DEGREE HEADQUARTERS"}
              </div>
              <h1>
                {page === "Dashboard"
                  ? `Let’s build your next chapter${state.profile.name ? ", " + state.profile.name.split(" ")[0] : ""}.`
                  : page}
              </h1>
              <p>{titles[page]}</p>
            </div>
            <div className="page-actions">
              <Button
                variant="secondary"
                onClick={() => navigate("Reports & Analytics")}
              >
                <BarChart3 size={16} />
                <span>View report</span>
              </Button>
              <Button onClick={() => add("course")}>
                <Plus size={16} />
                <span>Add course</span>
              </Button>
            </div>
          </div>
          {page === "Dashboard" && (
            <div className="evidence-banner">
              <div>
                <ShieldCheck size={20} />
                <span>
                  <strong>Built on evidence, not assumptions.</strong> Your
                  progress starts at zero. Verify your catalog and transfer
                  rules before committing to a course.
                </span>
              </div>
              <button onClick={() => navigate("Academic Verification Center")}>
                Review evidence
                <ArrowUpRight size={16} />
              </button>
            </div>
          )}
          <div className="page-content">{views[page]?.()}</div>
          <footer className="content-footer">
            <span>PROCUREMENT DEGREE HACKER PRO</span>
            <span>
              Academic planning support · University decisions govern degree
              credit
            </span>
          </footer>
        </main>
      </div>
      {editor && (
        <Editor
          key={editor.type + (editor.record?.id ?? "new")}
          spec={editor}
          state={state}
          onSave={saveRecord}
          onClose={() => setEditor(null)}
        />
      )}
      {confirm && (
        <Modal
          open
          onClose={() => setConfirm(null)}
          title={confirm.title}
          description="This action changes local records. Export a backup before destructive actions."
        >
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                confirm.action();
                setConfirm(null);
              }}
            >
              Confirm
            </Button>
          </div>
        </Modal>
      )}
      {command && (
        <Modal
          open
          onClose={() => setCommand(false)}
          title="Search your headquarters"
          description="Find pages, courses and evidence. Shortcut: Ctrl / Cmd + K."
        >
          <input
            autoFocus
            aria-label="Command search"
            className="command-search"
            placeholder="Where would you like to go?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="command-results">
            {navigation
              .filter((p) => p.toLowerCase().includes(query.toLowerCase()))
              .map((p) => (
                <button key={p} onClick={() => navigate(p)}>
                  {p}
                  <ArrowRight size={16} />
                </button>
              ))}
            {state.courses
              .filter(
                (c) =>
                  query && c.title.toLowerCase().includes(query.toLowerCase()),
              )
              .map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setCommand(false);
                    add("course", c);
                  }}
                >
                  {c.title}
                  <span>Course</span>
                </button>
              ))}
            {state.sources
              .filter(
                (s) =>
                  query &&
                  (s.url + " " + s.quote)
                    .toLowerCase()
                    .includes(query.toLowerCase()),
              )
              .slice(0, 8)
              .map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setCommand(false);
                    add("source", s);
                  }}
                >
                  {s.id} ·{" "}
                  {new URL(s.url).hostname || "Local evidence document"}
                  <span>Evidence</span>
                </button>
              ))}
          </div>
        </Modal>
      )}
      {!state.profile.onboarded && (
        <Modal
          open
          onClose={() =>
            mutate((s) => {
              s.profile.onboarded = true;
            }, "Onboarding completed")
          }
          title={
            onboardingStep === 0
              ? "Your next chapter starts here."
              : "Make this plan yours."
          }
          description="The smartest path from zero college credits to an accredited bachelor’s degree."
        >
          <div className="onboarding-art">
            <GraduationCap size={50} />
            <span>ZERO CREDITS. REAL POSSIBILITIES.</span>
          </div>
          {onboardingStep === 0 ? (
            <>
              <p>
                Welcome to Procurement Degree Hacker Pro. Plan your degree,
                compare costs and build a study rhythm around your shifts —
                while keeping academic evidence clear.
              </p>
              <div className="onboarding-points">
                <p>
                  <ShieldCheck size={18} />
                  No invented credits or approvals
                </p>
                <p>
                  <Wallet size={18} />
                  Costs modeled separately from financial aid
                </p>
                <p>
                  <Files size={18} />
                  Private documents and offline backups
                </p>
              </div>
              <Notice>
                Public sources and WGU’s October 2026 catalog were retrieved.
                The UMPI catalog and Study.com prices remain inaccessible.
                Published equivalencies are available; a complete course audit
                and safe purchase recommendation remain unverified.
              </Notice>
              <Button onClick={() => setOnboardingStep(1)}>
                Personalize my workspace
                <ArrowRight size={16} />
              </Button>
            </>
          ) : (
            <>
              <Field label="What should we call you?">
                <input
                  autoFocus
                  value={state.profile.name}
                  placeholder="Your name (optional)"
                  onChange={(e) =>
                    mutate((s) => {
                      s.profile.name = e.target.value;
                    }, "Profile personalized")
                  }
                />
              </Field>
              <Field label="Primary university">
                <select
                  value={state.profile.primaryUniversity}
                  onChange={(e) =>
                    mutate((s) => {
                      s.profile.primaryUniversity = e.target.value;
                    }, "University selected")
                  }
                >
                  {universities.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} — {v.degree}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Available weekly study hours"
                hint="Zero until you enter your capacity. Configure exact shifts in the planner."
              >
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={state.profile.weeklyHours}
                  onChange={(e) =>
                    mutate((s) => {
                      s.profile.weeklyHours = Math.min(
                        100,
                        Math.max(0, Number(e.target.value)),
                      );
                    }, "Study capacity configured")
                  }
                />
              </Field>
              <div className="modal-actions">
                <Button
                  variant="secondary"
                  onClick={() => setOnboardingStep(0)}
                >
                  Back
                </Button>
                <Button
                  onClick={() =>
                    mutate((s) => {
                      s.profile.onboarded = true;
                    }, "Onboarding completed")
                  }
                >
                  Open my zero-credit dashboard
                  <ArrowRight size={16} />
                </Button>
              </div>
            </>
          )}
        </Modal>
      )}
      {importPreview && (
        <Modal
          open
          onClose={() => setImportPreview(null)}
          title="Review imported records"
          description="No changes have been made yet. Review all normalized records before importing."
        >
          <pre className="import-preview">
            {JSON.stringify(importPreview.rows, null, 2)}
          </pre>
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setImportPreview(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                try {
                  if (importPreview.kind === "courses") {
                    const rows = importPreview.rows.map((row) =>
                      CourseSchema.parse(row),
                    );
                    mutate((s) => {
                      const ids = new Set(s.courses.map((c) => c.id));
                      for (const c of rows) {
                        if (
                          ids.has(c.id) ||
                          s.courses.some(
                            (x) =>
                              x.provider === c.provider &&
                              x.providerCourseId &&
                              x.providerCourseId === c.providerCourseId,
                          )
                        )
                          throw Error("Duplicate course; import canceled");
                        ids.add(c.id);
                        s.courses.push(c);
                      }
                    }, "Reviewed CSV imported");
                  } else {
                    const raw = importPreview.rows[0] as any;
                    const schemas: any = {
                      sources: SourceEvidenceSchema,
                      requirements: RequirementSchema,
                      equivalencies: CourseEquivalencySchema,
                    };
                    mutate((s) => {
                      for (const key of Object.keys(schemas)) {
                        if (raw[key]) {
                          const records = raw[key].map((r: any) =>
                            schemas[key].parse(r),
                          );
                          const existing = (s as any)[key];
                          for (const r of records) {
                            const found = existing.find(
                              (x: any) => x.id === r.id,
                            );
                            if (found) {
                              if (
                                ([
                                  "advisor-confirmed",
                                  "officially-applied",
                                  "documented",
                                ].includes(found.status) ||
                                  (key === "sources" &&
                                    found.verifiedAt &&
                                    found.quote)) &&
                                JSON.stringify(found) !== JSON.stringify(r)
                              )
                                throw Error(
                                  "Verified history cannot be overwritten by a research refresh. Edit it deliberately.",
                                );
                              existing.splice(existing.indexOf(found), 1, r);
                            } else existing.push(r);
                          }
                        }
                      }
                      migrate(s);
                    }, "Reviewed research imported");
                  }
                  setImportPreview(null);
                  toast("Import processed. Check the save status and records.");
                } catch (e) {
                  toast((e as Error).message);
                }
              }}
            >
              Import reviewed records
            </Button>
          </div>
        </Modal>
      )}
      <input
        hidden
        ref={backupInput}
        type="file"
        accept=".json"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) {
            const text = await file.text();
            setConfirm({
              title: "Replace current records with this backup?",
              action: () => {
                void (async () => {
                  try {
                    await queue.current;
                    const restored = await restoreBackup(text);
                    history.current = [];
                    future.current = [];
                    commit(restored);
                    toast("Backup restored successfully");
                  } catch (err) {
                    toast((err as Error).message);
                  }
                })();
              },
            });
          }
          e.target.value = "";
        }}
      />
      <input
        hidden
        ref={csvInput}
        type="file"
        accept=".csv"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file)
            try {
              const rows = parseCSV(await file.text()).map((row) =>
                CourseSchema.parse({
                  id: id(),
                  provider: "Other",
                  providerCourseId: "",
                  title: "",
                  aceId: "",
                  validFrom: "",
                  validTo: "",
                  hoursBasis: "estimate",
                  status: "Not Started",
                  startDate: "",
                  dueDate: "",
                  notes: "Imported CSV; applicability unverified",
                  ...row,
                  credits: Number(row.credits ?? 0),
                  hours: Number(row.hours ?? 0),
                  cost: Number(row.cost ?? 0),
                  upper: row.upper === "true",
                  prerequisites: row.prerequisites
                    ? JSON.parse(row.prerequisites)
                    : [],
                  competencies: row.competencies
                    ? JSON.parse(row.competencies)
                    : [],
                }),
              );
              setImportPreview({ kind: "courses", rows });
            } catch (err) {
              toast((err as Error).message);
            }
          e.target.value = "";
        }}
      />
      <input
        hidden
        ref={researchInput}
        type="file"
        accept=".json"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file)
            try {
              const records = JSON.parse(await file.text());
              if (Array.isArray(records))
                setImportPreview({
                  kind: "research",
                  rows: [{ sources: records }],
                });
              else setImportPreview({ kind: "research", rows: [records] });
            } catch (err) {
              toast((err as Error).message);
            }
          e.target.value = "";
        }}
      />
      {toastMessage && (
        <div className="toast" role="status">
          <Check size={18} />
          <span>{toastMessage}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setToastMessage("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

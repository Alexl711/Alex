import { describe, it, expect } from "vitest";
import {
  audit,
  subscriptionCost,
  financials,
  forecast,
  optimize,
  recommendations,
  validMapping,
  parseCSV,
  csvExport,
  capacity,
  overdueCourses,
} from "../src/engine";
import { initialState } from "../src/data";
import {
  CourseSchema,
  RequirementSchema,
  type State,
  type CreditAward,
} from "../src/models";
import { importICS } from "../src/components/Planner";
const clean = (): State => ({
  ...structuredClone(initialState),
  courses: [],
  requirements: [],
  groups: [],
  sources: [],
  equivalencies: [],
  profile: { ...initialState.profile, onboarded: true, weeklyHours: 10 },
});
const course = (id = "c", changes = {}) =>
  CourseSchema.parse({
    id,
    provider: "CLEP",
    providerCourseId: id,
    title: "Test course " + id,
    credits: 3,
    upper: false,
    aceId: "",
    validFrom: "",
    validTo: "",
    hours: 10,
    hoursBasis: "estimate",
    cost: 97,
    prerequisites: [],
    status: "Scheduled",
    startDate: "",
    dueDate: "",
    notes: "",
    competencies: [],
    ...changes,
  });
const requirement = (id = "r", changes = {}) =>
  RequirementSchema.parse({
    id,
    universityId: "umpi",
    programId: "umpi-program",
    catalogYear: "2026–27",
    category: "Major",
    subcategory: "",
    courseCode: "BUS 300",
    title: "Required " + id,
    description: "",
    credits: 3,
    upper: false,
    prerequisites: [],
    corequisites: [],
    minimumGrade: "C",
    alternatives: [],
    residencyImplications: "Documented",
    sourceIds: ["s"],
    quote: "Exact test fixture excerpt",
    location: "Audit page 1",
    verifiedAt: "2026-10-12",
    status: "documented",
    confidence: "Fixture only",
    notes: "",
    ...changes,
  });
const fixture = () => {
  const s = clean();
  s.courses = [course()];
  s.requirements = [requirement()];
  s.sources = [
    {
      id: "s",
      url: "https://university.example/audit",
      authority: "Registrar",
      evidenceType: "degree-audit",
      catalogYear: "2026–27",
      retrievalStatus: "user-reviewed",
      verifiedAt: "2026-10-12",
      quote: "Test fixture applicability confirmation",
      location: "1",
      blockage: null,
      history: [],
    },
  ];
  s.equivalencies = [
    {
      id: "e",
      courseId: "c",
      universityId: "umpi",
      equivalent: "BUS 300",
      requirementIds: ["r"],
      status: "advisor-confirmed",
      sourceId: "s",
      quote: "Exact fixture confirmation",
      catalogYear: "2026–27",
      minimumGrade: "C",
      risk: "",
      reviewedAt: "2026-10-12",
      expiresAt: "",
    },
  ];
  return s;
};
const award = (changes = {}): CreditAward => ({
  id: "a",
  courseId: "c",
  universityId: "umpi",
  credits: 3,
  upper: false,
  institutional: false,
  major: true,
  requirementIds: ["r"],
  posted: true,
  applied: true,
  evidenceId: "s",
  gradePoints: 3,
  ...changes,
});
describe("academic separation and deterministic audit", () => {
  it("starts at zero with a provider library and no fictional academic history", () => {
    const a = audit(initialState);
    expect(a.total).toBe(0);
    expect(a.earned).toBe(0);
    expect(a.planned).toBe(0);
    expect(a.posted).toBe(0);
    expect(initialState.awards).toEqual([]);
    expect(initialState.courses.every((c) => c.status === "Not Started")).toBe(
      true,
    );
  });
  it("adding a three-credit course creates no applied credits", () => {
    const s = fixture();
    expect(audit(s).planned).toBe(3);
    expect(audit(s).total).toBe(0);
  });
  it("provider completion does not post or apply credit", () => {
    const s = fixture();
    s.courses[0].status = "Completed";
    expect(audit(s).earned).toBe(3);
    expect(audit(s).posted).toBe(0);
    expect(audit(s).total).toBe(0);
  });
  it("official posted and applied evidence counts 3 credits", () => {
    const s = fixture();
    s.awards = [award()];
    expect(audit(s).total).toBe(3);
    expect(audit(s).posted).toBe(3);
    expect(audit(s).requirementDone("r")).toBe(true);
  });
  it("changing university keeps progress but changes applicability", () => {
    const s = fixture();
    s.awards = [award()];
    expect(audit(s, "wgu").total).toBe(0);
    expect(s.awards).toHaveLength(1);
  });
  it("one award can cover two conditions without adding credits twice", () => {
    const s = fixture();
    s.requirements.push(requirement("r2"));
    s.awards = [award({ requirementIds: ["r", "r2"] })];
    expect(audit(s).total).toBe(3);
    expect(audit(s).requirementDone("r2")).toBe(true);
  });
  it("duplicate award rows never inflate credits", () => {
    const s = fixture();
    s.awards = [award(), award({ id: "duplicate" })];
    expect(audit(s).total).toBe(3);
  });
  it("a free elective does not satisfy a major course", () => {
    const s = fixture();
    s.requirements.push(
      requirement("elective", { category: "Free electives" }),
    );
    s.awards = [award({ requirementIds: ["elective"] })];
    expect(audit(s).requirementDone("r")).toBe(false);
  });
  it("upper-level and institutional residency remain separate", () => {
    const s = fixture();
    s.awards = [award({ upper: true })];
    expect(audit(s).upper).toBe(3);
    expect(audit(s).residency).toBe(0);
    s.awards[0].institutional = true;
    expect(audit(s).majorResidency).toBe(3);
    expect(audit(s).upperMajorResidency).toBe(3);
  });
  it("published equivalency is not confirmed applicability", () => {
    const s = fixture();
    s.equivalencies[0].status = "published-equivalency";
    expect(validMapping(s, "c", "umpi")).toBeUndefined();
    expect(recommendations(s)[0].safe).toBe(false);
  });
  it("conflicting evidence invalidates a recommendation", () => {
    const s = fixture();
    s.equivalencies[0].status = "conflicting";
    expect(validMapping(s, "c", "umpi")).toBeUndefined();
  });
  it("provider evidence never establishes posted degree credit", () => {
    const s = fixture();
    s.sources[0].evidenceType = "provider-recommendation";
    s.awards = [award()];
    expect(audit(s).total).toBe(0);
    expect(validMapping(s, "c", "umpi")).toBeUndefined();
  });
  it("inaccessible source cannot support applied credit", () => {
    const s = fixture();
    s.sources[0].retrievalStatus = "inaccessible";
    s.awards = [award()];
    expect(audit(s).total).toBe(0);
  });
  it("credits in excess of the actual course are not applied", () => {
    const s = fixture();
    s.awards = [award({ credits: 6 })];
    expect(audit(s).total).toBe(0);
  });
  it("OR substitutions and nested AND rules work without requiring both alternatives", () => {
    const s = fixture();
    s.requirements.push(requirement("r2"));
    s.groups = [
      {
        id: "or",
        universityId: "umpi",
        title: "Choose one",
        kind: "OR",
        children: ["r", "r2"],
        minimum: 0,
        status: "documented",
      },
      {
        id: "and",
        universityId: "umpi",
        title: "Required group",
        kind: "AND",
        children: ["or"],
        minimum: 0,
        status: "documented",
      },
    ];
    s.awards = [award()];
    const a = audit(s);
    expect(a.groupDone(s.groups[0])).toBe(true);
    expect(a.groupDone(s.groups[1])).toBe(true);
    expect(a.outstanding).toHaveLength(0);
  });
  it("cyclic group roots cannot disappear from graduation constraints", () => {
    const s = fixture();
    s.awards = [award()];
    Object.assign(s.programs[0], {
      minimumCredits: 3,
      residency: 0,
      majorResidency: 0,
      upperMajorResidency: 0,
      complete: true,
      status: "documented",
    });
    s.groups = [
      {
        id: "loop",
        universityId: "umpi",
        title: "loop",
        kind: "AND",
        children: ["loop"],
        minimum: 0,
        status: "documented",
      },
    ];
    expect(audit(s).feasible).toBe(false);
  });
  it("cyclic groups fail safely", () => {
    const s = fixture();
    s.groups = [
      {
        id: "loop",
        universityId: "umpi",
        title: "loop",
        kind: "AND",
        children: ["loop"],
        minimum: 0,
        status: "documented",
      },
    ];
    expect(audit(s).groupDone(s.groups[0])).toBe(false);
  });
  it("group credits deduplicate overlapping conditions", () => {
    const s = fixture();
    s.requirements.push(requirement("r2"));
    s.awards = [award({ requirementIds: ["r", "r2"] })];
    s.groups = [
      {
        id: "g",
        universityId: "umpi",
        title: "6 credits",
        kind: "CREDITS",
        children: ["r", "r2"],
        minimum: 6,
        status: "documented",
      },
    ];
    expect(audit(s).groupDone(s.groups[0])).toBe(false);
  });
});
describe("calendar billing and finances", () => {
  it("same-day enrollment still charges one subscription cycle", () =>
    expect(
      subscriptionCost({
        startDate: "2026-01-01",
        endDate: "2026-01-01",
        monthly: 99,
        fourMonth: null,
      }),
    ).toEqual({ months: 1, cost: 99 }));
  it("cancellation on renewal date avoids next bill", () =>
    expect(
      subscriptionCost({
        startDate: "2026-01-15",
        endDate: "2026-02-15",
        monthly: 99,
        fourMonth: null,
      }).months,
    ).toBe(1));
  it("one day past renewal requires a second cycle", () =>
    expect(
      subscriptionCost({
        startDate: "2026-01-15",
        endDate: "2026-02-16",
        monthly: 99,
        fourMonth: null,
      }).cost,
    ).toBe(198));
  it("end-of-month renewal honors calendar months", () =>
    expect(
      subscriptionCost({
        startDate: "2026-01-31",
        endDate: "2026-03-01",
        monthly: 99,
        fourMonth: null,
      }).months,
    ).toBe(2));
  it("chooses four-month bundle over four monthly charges", () =>
    expect(
      subscriptionCost({
        startDate: "2026-01-01",
        endDate: "2026-05-01",
        monthly: 99,
        fourMonth: 299,
      }).cost,
    ).toBe(299));
  it("price updates recalculate without changing historical payments", () => {
    const s = clean();
    s.transactions = [
      {
        id: "t",
        description: "Paid",
        category: "Sophia",
        amount: 99,
        date: "2026-01-01",
        kind: "Payment",
        courseId: "",
      },
    ];
    s.subscriptions = [
      {
        id: "sub",
        provider: "Sophia",
        startDate: "2026-01-01",
        endDate: "2026-02-01",
        monthly: 120,
        fourMonth: null,
        status: "unverified",
      },
    ];
    expect(financials(s).net).toBe(99);
    expect(financials(s).subscriptions).toBe(120);
  });
  it("potential aid never reduces projection, confirmed aid does", () => {
    const s = clean();
    s.transactions = [
      {
        id: "t",
        description: "Tuition",
        category: "tuition",
        amount: 1800,
        date: "2026-11-01",
        kind: "Committed",
        courseId: "",
      },
      {
        id: "aid",
        description: "Pell potential",
        category: "aid",
        amount: 5000,
        date: "2026-11-01",
        kind: "Potential aid",
        courseId: "",
      },
    ];
    expect(financials(s, "2026-10-12").projected).toBe(1800);
    expect(financials(s, "2026-10-12").cash30).toBe(1800);
    s.transactions[1].kind = "Confirmed aid";
    expect(financials(s).projected).toBe(0);
  });
});
describe("scheduling and constrained optimization", () => {
  it("more study capacity advances workload finish", () => {
    const s = clean();
    const slow = forecast(s, 100, "2026-10-12");
    s.profile.weeklyHours = 20;
    expect(forecast(s, 100, "2026-10-12")! < slow!).toBe(true);
  });
  it("zero capacity produces no fabricated date", () => {
    const s = clean();
    s.profile.weeklyHours = 0;
    expect(forecast(s, 100, "2026-10-12")).toBeNull();
  });
  it("blackout and recovery days remove capacity", () => {
    const s = clean();
    s.rotations = [
      {
        id: "w",
        name: "actual pattern",
        pattern: ["day", "night", "recovery", "off"],
        startDate: "2026-10-12",
        workdayMinutes: 30,
        offdayMinutes: 120,
      },
    ];
    expect(
      capacity(s, "2026-10-12", 1)
        .slice(0, 4)
        .map((d) => d.hours),
    ).toEqual([0.5, 0.5, 0, 2]);
  });
  it("missed sessions are not logged as study", () => {
    const s = clean();
    s.sessions = [
      {
        id: "session",
        courseId: "c",
        date: "2026-01-01",
        start: "09:00",
        minutes: 60,
        kind: "Study",
        completed: false,
        notes: "",
      },
    ];
    expect(s.sessions.filter((x) => x.completed)).toHaveLength(0);
    expect(s.sessions[0].date < "2026-10-12").toBe(true);
  });
  it("incomplete degree map never produces a winning graduation path", () =>
    expect(optimize(initialState).strategies).toEqual([]));
  it("finds a feasible lowest-cost selection with confirmed coverage", () => {
    const s = fixture();
    Object.assign(s.programs[0], {
      minimumCredits: 3,
      residency: 0,
      majorResidency: 0,
      upperMajorResidency: 0,
      complete: true,
      status: "documented",
    });
    s.profile.objective = "cheapest";
    const r = optimize(s, undefined, "2026-10-12");
    expect(r.strategies).toHaveLength(1);
    expect(r.strategies[0].cost).toBe(97);
    expect(r.strategies[0].courseIds).toEqual(["c"]);
  });
  it("denied transfer makes a previously feasible path infeasible", () => {
    const s = fixture();
    Object.assign(s.programs[0], {
      minimumCredits: 3,
      residency: 0,
      majorResidency: 0,
      upperMajorResidency: 0,
      complete: true,
      status: "documented",
    });
    expect(
      optimize(
        s,
        {
          extraWeeklyHours: 0,
          delayWeeks: 0,
          tuitionMultiplier: 1,
          deniedCourseId: "c",
          confirmedAid: 0,
        },
        "2026-10-12",
      ).strategies,
    ).toEqual([]);
  });
  it("prerequisite cycles cannot become a feasible strategy", () => {
    const s = fixture();
    s.courses[0].prerequisites = ["c"];
    Object.assign(s.programs[0], {
      minimumCredits: 3,
      residency: 0,
      majorResidency: 0,
      upperMajorResidency: 0,
      complete: true,
      status: "documented",
    });
    expect(optimize(s, undefined, "2026-10-12").strategies).toEqual([]);
  });
  it("does not invent GPA outcomes in an optimized path", () => {
    const s = fixture();
    Object.assign(s.programs[0], {
      minimumCredits: 3,
      residency: 0,
      majorResidency: 0,
      upperMajorResidency: 0,
      complete: true,
      status: "documented",
      minimumGpa: 2,
    });
    expect(optimize(s, undefined, "2026-10-12").strategies).toEqual([]);
  });
  it("ICS imports actual shifts and flags recurrence for review", () => {
    const imported = importICS(
      "BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART:20261012T070000\nDTEND:20261012T190000\nSUMMARY:Day shift\nRRULE:FREQ=DAILY\nEND:VEVENT\nEND:VCALENDAR",
    );
    expect(imported[0].minutes).toBe(720);
    expect(imported[0].date).toBe("2026-10-12");
    expect(imported[0].notes).toContain("Recurrence not expanded");
  });
});
describe("additional planning safeguards", () => {
  it("completed outside coursework is not purchased or studied again", () => {
    const s = fixture();
    s.courses[0].status = "Completed";
    Object.assign(s.programs[0], {
      minimumCredits: 3,
      residency: 0,
      majorResidency: 0,
      upperMajorResidency: 0,
      complete: true,
      status: "documented",
    });
    const r = optimize(s, undefined, "2026-10-12");
    expect(r.strategies[0].cost).toBe(0);
    expect(r.strategies[0].hours).toBe(0);
    expect(audit(s).total).toBe(0);
  });
  it("documented university prerequisites block unsafe next courses", () => {
    const s = fixture();
    s.requirements[0].prerequisites = ["r2"];
    s.requirements.push(requirement("r2"));
    expect(recommendations(s)[0].safe).toBe(false);
    expect(recommendations(s)[0].reason).toContain("prerequisite");
  });
  it("missed course deadlines are distinct from completed courses", () => {
    const s = fixture();
    s.courses[0].dueDate = "2026-10-01";
    expect(overdueCourses(s, "2026-10-12")).toHaveLength(1);
    s.courses[0].status = "Completed";
    expect(overdueCourses(s, "2026-10-12")).toHaveLength(0);
  });
  it("manual shifts use explicitly configured workday capacity", () => {
    const s = clean();
    s.profile.workdayHours = 0.5;
    s.sessions.push({
      id: "shift",
      courseId: "",
      date: "2026-10-12",
      start: "07:00",
      minutes: 720,
      kind: "Work day",
      completed: false,
      notes: "",
    });
    expect(capacity(s, "2026-10-12", 1)[0].hours).toBe(0.5);
  });
  it("subscription price edits change the optimized remaining cost", () => {
    const s = fixture();
    s.courses[0].provider = "Sophia";
    Object.assign(s.programs[0], {
      minimumCredits: 3,
      residency: 0,
      majorResidency: 0,
      upperMajorResidency: 0,
      complete: true,
      status: "documented",
    });
    s.subscriptions = [
      {
        id: "price",
        provider: "Sophia",
        startDate: "2026-10-12",
        endDate: "2026-11-12",
        monthly: 120,
        fourMonth: null,
        status: "unverified",
      },
    ];
    expect(optimize(s, undefined, "2026-10-12").strategies[0].cost).toBe(120);
  });
});
describe("CSV import and spreadsheet integrity", () => {
  it("round trips quotes, commas and multiline text", () => {
    const rows = [{ title: 'A, "B"', notes: "line 1\nline 2" }];
    expect(parseCSV(csvExport(rows))).toEqual(rows);
  });
  it("rejects unclosed quoted fields", () =>
    expect(() => parseCSV('title\n"broken')).toThrow());
  it("escapes spreadsheet formula cells", () =>
    expect(csvExport([{ title: "=1+1" }])).toContain("'=1+1"));
});

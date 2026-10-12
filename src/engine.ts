import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  format,
  parseISO,
} from "date-fns";
import type {
  State,
  Course,
  CreditAward,
  RequirementGroup,
  University,
  Subscription,
} from "./models";

export const id = () => crypto.randomUUID();
export const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
export const today = () => format(new Date(), "yyyy-MM-dd");
export const confirmed = (s: string) =>
  ["documented", "advisor-confirmed", "officially-applied"].includes(s);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
export function uniqueAwards(awards: CreditAward[]) {
  return [...new Map(awards.map((a) => [a.courseId, a])).values()];
}
export function validMapping(
  state: State,
  courseId: string,
  universityId: string,
) {
  return state.equivalencies.find(
    (e) =>
      e.courseId === courseId &&
      e.universityId === universityId &&
      ["advisor-confirmed", "officially-applied"].includes(e.status) &&
      e.quote.trim() &&
      state.sources.some(
        (s) =>
          s.id === e.sourceId &&
          s.quote?.trim() &&
          s.verifiedAt &&
          [
            "degree-audit",
            "registrar-confirmation",
            "transcript-evaluation",
          ].includes(s.evidenceType) &&
          s.retrievalStatus !== "inaccessible",
      ) &&
      (!e.expiresAt || e.expiresAt >= today()),
  );
}
export function audit(
  state: State,
  universityId = state.profile.primaryUniversity,
) {
  const program = state.programs.find((p) => p.universityId === universityId)!;
  const posted = uniqueAwards(
    state.awards.filter((a) => a.universityId === universityId && a.posted),
  );
  const applied = posted.filter(
    (a) =>
      a.applied &&
      a.evidenceId &&
      state.sources.some(
        (s) =>
          s.id === a.evidenceId &&
          s.quote &&
          s.verifiedAt &&
          ["degree-audit", "transcript-evaluation"].includes(s.evidenceType) &&
          s.retrievalStatus !== "inaccessible",
      ) &&
      a.requirementIds.length > 0 &&
      a.requirementIds.every((r) =>
        state.requirements.some(
          (q) =>
            q.id === r &&
            q.universityId === universityId &&
            confirmed(q.status),
        ),
      ) &&
      state.courses.some((c) => c.id === a.courseId && a.credits <= c.credits),
  );
  const total = sum(applied.map((a) => a.credits));
  const earned = sum(
    state.courses
      .filter((c) =>
        [
          "Completed",
          "Transcript Requested",
          "Transfer Under Review",
          "Officially Applied",
          "Surplus",
        ].includes(c.status),
      )
      .map((c) => c.credits),
  );
  const remaining =
    program.minimumCredits === null
      ? null
      : Math.max(0, program.minimumCredits - total);
  const requirementCredits = (requirementId: string) =>
    sum(
      applied
        .filter((a) => a.requirementIds.includes(requirementId))
        .map((a) => a.credits),
    );
  const requirementDone = (requirementId: string) => {
    const r = state.requirements.find((r) => r.id === requirementId);
    return (
      !!r &&
      confirmed(r.status) &&
      requirementCredits(requirementId) >= r.credits
    );
  };
  function groupDone(
    group: RequirementGroup,
    seen = new Set<string>(),
  ): boolean {
    if (seen.has(group.id) || !confirmed(group.status)) return false;
    const next = new Set(seen).add(group.id);
    const children = group.children.map((child) => {
      const g = state.groups.find((g) => g.id === child);
      return g ? groupDone(g, next) : requirementDone(child);
    });
    const groupAwards = applied.filter((a) =>
      a.requirementIds.some((r) => group.children.includes(r)),
    );
    switch (group.kind) {
      case "AND":
        return children.length > 0 && children.every(Boolean);
      case "OR":
        return children.some(Boolean);
      case "CREDITS":
        return (
          sum(uniqueAwards(groupAwards).map((a) => a.credits)) >= group.minimum
        );
      case "UPPER":
        return (
          sum(applied.filter((a) => a.upper).map((a) => a.credits)) >=
          group.minimum
        );
      case "RESIDENCY":
        return (
          sum(applied.filter((a) => a.institutional).map((a) => a.credits)) >=
          group.minimum
        );
      case "MAJOR_RESIDENCY":
        return (
          sum(
            applied
              .filter((a) => a.institutional && a.major)
              .map((a) => a.credits),
          ) >= group.minimum
        );
      case "UPPER_MAJOR_RESIDENCY":
        return (
          sum(
            applied
              .filter((a) => a.institutional && a.major && a.upper)
              .map((a) => a.credits),
          ) >= group.minimum
        );
      case "GPA": {
        const graded = applied.filter((a) => a.gradePoints !== null);
        return (
          graded.length > 0 &&
          sum(graded.map((a) => a.credits * a.gradePoints!)) /
            sum(graded.map((a) => a.credits)) >=
            group.minimum
        );
      }
    }
  }
  const residency = sum(
      applied.filter((a) => a.institutional).map((a) => a.credits),
    ),
    majorResidency = sum(
      applied.filter((a) => a.institutional && a.major).map((a) => a.credits),
    ),
    upperMajorResidency = sum(
      applied
        .filter((a) => a.institutional && a.major && a.upper)
        .map((a) => a.credits),
    ),
    upper = sum(applied.filter((a) => a.upper).map((a) => a.credits));
  const groupChildIds = new Set(
    state.groups
      .filter((g) => g.universityId === universityId)
      .flatMap((g) => g.children),
  );
  const outstanding = state.requirements.filter(
    (r) =>
      r.universityId === universityId &&
      !groupChildIds.has(r.id) &&
      !requirementDone(r.id),
  );
  const gpaAwards = applied.filter((a) => a.gradePoints !== null);
  const gpa = gpaAwards.length
    ? sum(gpaAwards.map((a) => a.credits * a.gradePoints!)) /
      sum(gpaAwards.map((a) => a.credits))
    : null;
  const sufficient = (minimum: number | null, value: number) =>
    minimum === null || value >= minimum;
  const relevantGroups = state.groups.filter(
    (g) => g.universityId === universityId,
  );
  const roots = relevantGroups.filter((g) => !groupChildIds.has(g.id));
  const visited = new Set<string>();
  const visit = (g: RequirementGroup, stack = new Set<string>()): boolean => {
    if (stack.has(g.id)) return false;
    visited.add(g.id);
    const next = new Set(stack).add(g.id);
    return g.children.every((child) => {
      const nested = relevantGroups.find((x) => x.id === child);
      return nested
        ? visit(nested, next)
        : state.requirements.some(
            (r) => r.id === child && r.universityId === universityId,
          );
    });
  };
  const graphValid =
    roots.every((g) => visit(g)) && visited.size === relevantGroups.length;
  const feasible =
    graphValid &&
    program.complete &&
    confirmed(program.status) &&
    remaining === 0 &&
    outstanding.length === 0 &&
    state.groups
      .filter(
        (g) => g.universityId === universityId && !groupChildIds.has(g.id),
      )
      .every((g) => groupDone(g)) &&
    sufficient(program.residency, residency) &&
    sufficient(program.majorResidency, majorResidency) &&
    sufficient(program.upperMajorResidency, upperMajorResidency) &&
    sufficient(program.upperMinimum, upper) &&
    sufficient(program.minimumGpa, gpa ?? -1);
  return {
    program,
    total,
    earned,
    posted: sum(posted.filter((a) => !a.institutional).map((a) => a.credits)),
    planned: sum(
      state.courses
        .filter((c) => c.status === "Scheduled")
        .map((c) => c.credits),
    ),
    inProgress: sum(
      state.courses
        .filter((c) => c.status === "In Progress")
        .map((c) => c.credits),
    ),
    unverified: sum(
      state.courses
        .filter(
          (c) =>
            c.status !== "Not Started" &&
            !validMapping(state, c.id, universityId),
        )
        .map((c) => c.credits),
    ),
    surplus: sum(
      state.courses
        .filter((c) => ["Surplus", "Rejected"].includes(c.status))
        .map((c) => c.credits),
    ),
    remaining,
    residency,
    majorResidency,
    upperMajorResidency,
    upper,
    gpa,
    outstanding,
    requirementDone,
    requirementCredits,
    groupDone,
    feasible,
  };
}
export function subscriptionCost(
  subscription: Pick<
    Subscription,
    "startDate" | "endDate" | "monthly" | "fourMonth"
  >,
) {
  if (
    !subscription.startDate ||
    !subscription.endDate ||
    subscription.endDate < subscription.startDate
  )
    return { months: 0, cost: 0 };
  const start = parseISO(subscription.startDate),
    end = parseISO(subscription.endDate);
  let months = 0;
  while (addMonths(start, months) < end && months < 1200) months++;
  months = Math.max(1, months);
  let cost = months * subscription.monthly;
  if (subscription.fourMonth !== null) {
    for (let bundles = 0; bundles <= Math.ceil(months / 4); bundles++)
      cost = Math.min(
        cost,
        bundles * subscription.fourMonth +
          Math.max(0, months - 4 * bundles) * subscription.monthly,
      );
  }
  return { months, cost }; // End is exclusive: stopping on renewal day avoids next charge.
}
export function financials(state: State, asOf = today()) {
  const transactions = state.transactions;
  const total = (kind: string) =>
    sum(transactions.filter((t) => t.kind === kind).map((t) => t.amount));
  const net = total("Payment") - total("Refund") - total("Reimbursement");
  const committed = total("Committed");
  const estimated = total("Estimate");
  const aid = total("Confirmed aid");
  const cash = (days: number) =>
    sum(
      transactions
        .filter(
          (t) =>
            t.kind === "Committed" &&
            t.date >= asOf &&
            t.date <= format(addDays(parseISO(asOf), days), "yyyy-MM-dd"),
        )
        .map((t) => t.amount),
    );
  return {
    net,
    committed,
    estimated,
    aid,
    potentialAid: total("Potential aid"),
    subscriptions: sum(
      state.subscriptions.map((s) => subscriptionCost(s).cost),
    ),
    cash30: cash(30),
    cash60: cash(60),
    cash90: cash(90),
    projected: Math.max(0, net + committed + estimated - aid),
    costPerCredit: audit(state).total ? net / audit(state).total : null,
  };
}
export function capacity(state: State, start = today(), weeks = 52) {
  const dates = Array.from({ length: weeks * 7 }, (_, i) =>
    format(addDays(parseISO(start), i), "yyyy-MM-dd"),
  );
  const rotation = state.rotations[0];
  const blocked = new Set(
    state.sessions
      .filter((s) => ["Blackout", "Family", "Recovery"].includes(s.kind))
      .map((s) => s.date),
  );
  return dates.map((date) => {
    if (blocked.has(date)) return { date, hours: 0 };
    const override = state.sessions.filter(
      (s) => s.date === date && ["Study", "Exam"].includes(s.kind),
    );
    if (override.length)
      return { date, hours: sum(override.map((s) => s.minutes)) / 60 };
    if (
      state.sessions.some((s) => s.date === date && s.kind.startsWith("Work"))
    )
      return { date, hours: state.profile.workdayHours };
    if (rotation && rotation.pattern.length) {
      const i = differenceInCalendarDays(
        parseISO(date),
        parseISO(rotation.startDate),
      );
      if (i >= 0) {
        const kind = rotation.pattern[i % rotation.pattern.length];
        return {
          date,
          hours:
            kind === "recovery"
              ? 0
              : (kind === "off"
                  ? rotation.offdayMinutes
                  : rotation.workdayMinutes) / 60,
        };
      }
    }
    return { date, hours: state.profile.weeklyHours / 7 };
  });
}
export function forecast(
  state: State,
  hours: number,
  start = today(),
  extraWeeklyHours = 0,
  delayWeeks = 0,
) {
  if (hours === 0) return start;
  let remaining = hours;
  const capacityDays = capacity(
    state,
    format(addDays(parseISO(start), delayWeeks * 7), "yyyy-MM-dd"),
    260,
  );
  for (const day of capacityDays) {
    remaining -= day.hours + extraWeeklyHours / 7;
    if (remaining <= 0) return day.date;
  }
  return null;
}
export const completedCourse = (course: Course) =>
  [
    "Completed",
    "Transcript Requested",
    "Transfer Under Review",
    "Officially Applied",
    "Surplus",
  ].includes(course.status);
export function requiredPrerequisites(
  state: State,
  courseId: string,
  universityId = state.profile.primaryUniversity,
) {
  const mapping = validMapping(state, courseId, universityId);
  return [
    ...new Set(
      (mapping?.requirementIds ?? []).flatMap(
        (id) =>
          state.requirements.find((r) => r.id === id)?.prerequisites ?? [],
      ),
    ),
  ];
}
export function overdueCourses(state: State, asOf = today()) {
  return state.courses.filter(
    (c) =>
      ["Scheduled", "In Progress"].includes(c.status) &&
      c.dueDate &&
      c.dueDate < asOf,
  );
}
export function recommendations(state: State) {
  const uni = state.profile.primaryUniversity;
  const a = audit(state);
  return state.courses
    .filter(
      (c) =>
        ["Not Started", "Scheduled"].includes(c.status) &&
        c.prerequisites.every((p) =>
          state.courses.some((x) => x.id === p && completedCourse(x)),
        ),
    )
    .map((c) => {
      const mapping = validMapping(state, c.id, uni);
      const needed =
        mapping?.requirementIds.filter((r) => !a.requirementDone(r)) ?? [];
      return {
        course: c,
        safe:
          !!mapping &&
          needed.length > 0 &&
          requiredPrerequisites(state, c.id, uni).every((id) =>
            a.requirementDone(id),
          ),
        requirementIds: needed,
        reason:
          mapping &&
          needed.length &&
          requiredPrerequisites(state, c.id, uni).every((id) =>
            a.requirementDone(id),
          )
            ? `Confirmed option for ${needed.join(", ")}. Cost and workload are estimates until documented.`
            : mapping && needed.length
              ? "A documented university prerequisite is outstanding. Complete and confirm it before starting this course."
              : "Applicability unverified. Request a written evaluation before purchasing.",
      };
    })
    .sort(
      (a, b) =>
        Number(b.safe) - Number(a.safe) ||
        a.course.cost - b.course.cost ||
        a.course.hours - b.course.hours,
    )
    .slice(0, 5);
}
export type Strategy = {
  name: string;
  courseIds: string[];
  cost: number;
  hours: number;
  finish: string;
  universityStart: string;
  risk: number;
  score: number;
  sequence: { courseId: string; start: string; finish: string }[];
  explanation: string;
};
export function optimize(
  state: State,
  scenario = {
    extraWeeklyHours: 0,
    delayWeeks: 0,
    tuitionMultiplier: 1,
    deniedCourseId: "",
    confirmedAid: 0,
  },
  asOf = today(),
): { strategies: Strategy[]; blockers: string[]; exhaustive: boolean } {
  const a = audit(state),
    u = state.universities.find(
      (u) => u.id === state.profile.primaryUniversity,
    )!;
  const blockers: string[] = [];
  if (!a.program.complete || !confirmed(a.program.status))
    blockers.push(
      "Complete, confirmed catalog or individual degree audit is required.",
    );
  if (a.program.minimumCredits === null)
    blockers.push("Minimum graduation credits unknown.");
  if (
    !a.feasible &&
    !state.profile.weeklyHours &&
    !state.rotations.length &&
    !state.sessions.some((s) => s.kind === "Study")
  )
    blockers.push("Configure study capacity or a shift rotation.");
  if (blockers.length) return { strategies: [], blockers, exhaustive: true };
  const candidates = state.courses.filter(
    (c) =>
      !["Not Started", "Rejected", "Surplus", "Officially Applied"].includes(
        c.status,
      ) &&
      c.id !== scenario.deniedCourseId &&
      validMapping(state, c.id, u.id),
  );
  if (candidates.length > 18)
    return {
      strategies: [],
      blockers: [
        "Exact optimization supports up to 18 confirmed candidate courses. Reduce candidates; no approximate optimum is claimed.",
      ],
      exhaustive: false,
    };
  const strategies: Strategy[] = [];
  for (let mask = 0; mask < 1 << candidates.length; mask++) {
    const chosen = candidates.filter((_, i) => mask & (1 << i));
    let sim = { ...state, awards: [...state.awards] };
    sim.awards = sim.awards.concat(
      chosen.map((c) => {
        const eq = validMapping(state, c.id, u.id)!;
        return {
          id: "simulation-" + c.id,
          courseId: c.id,
          universityId: u.id,
          credits: c.credits,
          upper: c.upper,
          institutional: c.provider === u.name,
          major: eq.requirementIds.some(
            (r) =>
              state.requirements.find((x) => x.id === r)?.category === "Major",
          ),
          requirementIds: eq.requirementIds,
          posted: true,
          applied: true,
          evidenceId: eq.sourceId,
          gradePoints: null,
        };
      }),
    );
    if (!audit(sim).feasible) continue;
    const ordered: Course[] = [];
    let todo = [...chosen];
    let invalid = false;
    while (todo.length) {
      const next = todo.find(
        (c) =>
          requiredPrerequisites(state, c.id, u.id).every(
            (r) =>
              a.requirementDone(r) ||
              ordered.some((x) =>
                validMapping(state, x.id, u.id)?.requirementIds.includes(r),
              ),
          ) &&
          c.prerequisites.every(
            (p) =>
              ordered.some((x) => x.id === p) ||
              state.courses.some((x) => x.id === p && completedCourse(x)),
          ),
      );
      if (!next) {
        invalid = true;
        break;
      }
      ordered.push(next);
      todo = todo.filter((c) => c.id !== next.id);
    }
    if (invalid) continue;
    // Serial schedule respects capacity, prerequisites, transfer processing and enrollment cutoff.
    const outside = ordered.filter((c) => c.provider !== u.name),
      inside = ordered.filter((c) => c.provider === u.name);
    if (
      outside.some(
        (c) =>
          c.prerequisites.some((p) => inside.some((x) => x.id === p)) ||
          requiredPrerequisites(state, c.id, u.id).some(
            (r) =>
              !a.requirementDone(r) &&
              inside.some((x) =>
                validMapping(state, x.id, u.id)?.requirementIds.includes(r),
              ),
          ),
      )
    )
      continue;
    let cursor = format(
      addDays(parseISO(asOf), scenario.delayWeeks * 7),
      "yyyy-MM-dd",
    );
    const sequence: Strategy["sequence"] = [];
    let hours = 0;
    const factor = { optimistic: 0.75, realistic: 1, conservative: 1.4 }[
      state.profile.durationMode
    ];
    for (const c of outside) {
      const effort = completedCourse(c) ? 0 : c.hours * factor;
      const finish = forecast(state, effort, cursor, scenario.extraWeeklyHours);
      if (!finish) {
        invalid = true;
        break;
      }
      sequence.push({ courseId: c.id, start: cursor, finish });
      cursor = format(addDays(parseISO(finish), 1), "yyyy-MM-dd");
      hours += effort;
    }
    if (invalid) continue;
    if (outside.length)
      cursor = format(addDays(parseISO(cursor), 21), "yyyy-MM-dd");
    const enrollment = state.enrollments.find((e) => e.universityId === u.id);
    if (
      inside.length &&
      (!enrollment?.startDate ||
        enrollment.startDate < cursor ||
        !enrollment.applicationDate ||
        enrollment.applicationDate > enrollment.startDate)
    )
      continue;
    if (inside.length) cursor = enrollment!.startDate;
    const universityStart = cursor;
    for (const c of inside) {
      const effort = completedCourse(c) ? 0 : c.hours * factor;
      const finish = forecast(state, effort, cursor, scenario.extraWeeklyHours);
      if (!finish) {
        invalid = true;
        break;
      }
      sequence.push({ courseId: c.id, start: cursor, finish });
      cursor = format(addDays(parseISO(finish), 1), "yyyy-MM-dd");
      hours += effort;
    }
    if (invalid) continue;
    const providerCosts = new Map<string, number>();
    let cost = 0;
    for (const c of outside.filter((c) => !completedCourse(c))) {
      if (
        [
          "Sophia",
          "Study.com College Saver",
          "Study.com College Saver Pro",
        ].includes(c.provider)
      ) {
        if (providerCosts.has(c.provider)) continue;
        const entries = sequence.filter(
          (s) =>
            chosen.find((c) => c.id === s.courseId && !completedCourse(c))
              ?.provider === c.provider,
        );
        const priceOverride = state.subscriptions.find(
          (s) => s.provider === c.provider,
        );
        const monthly =
          priceOverride?.monthly ??
          (c.provider === "Sophia"
            ? 99
            : c.provider.endsWith(" Pro")
              ? 235
              : 95);
        const subscription = subscriptionCost({
          startDate: entries[0].start,
          endDate: format(
            addDays(parseISO(entries.at(-1)!.finish), 1),
            "yyyy-MM-dd",
          ),
          monthly,
          fourMonth: priceOverride
            ? priceOverride.fourMonth
            : c.provider === "Sophia"
              ? 299
              : null,
        });
        providerCosts.set(c.provider, subscription.cost);
        cost += subscription.cost;
      } else cost += c.cost;
    }
    const institutionalCredits = sum(
      inside.filter((c) => !completedCourse(c)).map((c) => c.credits),
    );
    const durationDays = inside.some((c) => !completedCourse(c))
      ? Math.max(
          1,
          differenceInCalendarDays(parseISO(cursor), parseISO(universityStart)),
        )
      : 0;
    cost +=
      (u.billing === "credit"
        ? institutionalCredits * u.tuition
        : Math.ceil(durationDays / (u.periodWeeks * 7)) * u.tuition) *
      scenario.tuitionMultiplier;
    cost = Math.max(0, cost - scenario.confirmedAid);
    const days = differenceInCalendarDays(parseISO(cursor), parseISO(asOf));
    const risk = chosen.filter((c) => c.hoursBasis === "estimate").length;
    const score =
      state.profile.objective === "cheapest"
        ? cost
        : state.profile.objective === "fastest"
          ? days
          : (state.profile.costWeight * cost) / 100 +
            (1 - state.profile.costWeight) * days +
            5 * risk;
    strategies.push({
      name:
        outside.length === 0
          ? "University only"
          : new Set(outside.map((c) => c.provider)).size > 1
            ? "Mixed providers"
            : outside[0].provider + " first",
      courseIds: chosen.map((c) => c.id),
      cost,
      hours,
      finish: cursor,
      universityStart,
      risk,
      score,
      sequence,
      explanation: `Confirmed requirement coverage passes the shared audit. ${outside.length} outside courses; ${inside.length} institutional courses. Subscription calendar cycles, 21 estimated transcript-processing days and configured enrollment date included. Workloads and tuition still require verification. GPA-dependent paths need actual graded evidence.`,
    });
  }
  strategies.sort(
    (a, b) =>
      a.score - b.score || a.cost - b.cost || a.finish.localeCompare(b.finish),
  );
  return {
    strategies: strategies.slice(0, 20),
    blockers: strategies.length
      ? []
      : [
          "No feasible confirmed selection. Check course coverage, residency, GPA, prerequisites and enrollment dates. No guaranteed graduation path can be shown.",
        ],
    exhaustive: true,
  };
}
export function csvExport(rows: Record<string, unknown>[]) {
  const keys = [...new Set(rows.flatMap(Object.keys))];
  const cell = (v: unknown) =>
    '"' +
    String(v ?? "")
      .replace(/^([=+@-])/, "'$1")
      .replaceAll('"', '""') +
    '"';
  return [
    keys.map(cell).join(","),
    ...rows.map((r) =>
      keys
        .map((k) =>
          cell(typeof r[k] === "object" ? JSON.stringify(r[k]) : r[k]),
        )
        .join(","),
    ),
  ].join("\r\n");
}
export function parseCSV(text: string) {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (quoted) throw Error("Unclosed CSV quote");
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const headers = rows.shift() ?? [];
  return rows.map((r) =>
    Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""])),
  );
}

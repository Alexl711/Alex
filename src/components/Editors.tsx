import { useState } from "react";
import { z } from "zod";
import { Modal, Field, Notice } from "./shared";
import { Button } from "./ui/button";
import {
  UniversitySchema,
  CourseSchema,
  RequirementSchema,
  SourceEvidenceSchema,
  CourseEquivalencySchema,
  CreditAwardSchema,
  statusLabels,
  type State,
  type Course,
} from "../models";
import { id, today } from "../engine";
import { competencies } from "../data";
export type EditSpec = {
  type:
    | "course"
    | "source"
    | "requirement"
    | "mapping"
    | "award"
    | "transaction"
    | "enrollment"
    | "portfolio"
    | "subscription"
    | "group"
    | "program"
    | "university";
  record?: any;
};
export function Editor({
  spec,
  state,
  onSave,
  onClose,
}: {
  spec: EditSpec;
  state: State;
  onSave: (type: EditSpec["type"], record: any) => void;
  onClose: () => void;
}) {
  const u = state.profile.primaryUniversity;
  const universities = state.universities;
  const defaults: Record<EditSpec["type"], any> = {
    course: {
      id: id(),
      provider: "Sophia",
      providerCourseId: "",
      title: "",
      credits: 3,
      upper: false,
      aceId: "",
      validFrom: "",
      validTo: "",
      hours: 30,
      hoursBasis: "estimate",
      cost: 0,
      prerequisites: [],
      status: "Not Started",
      startDate: "",
      dueDate: "",
      notes: "",
      competencies: [],
    },
    source: {
      id: id(),
      url: "",
      authority: "Advisor / registrar written confirmation",
      evidenceType: "registrar-confirmation",
      catalogYear: "2026–27",
      retrievalStatus: "user-reviewed",
      verifiedAt: today(),
      quote: "",
      location: "",
      blockage: null,
      history: [],
    },
    requirement: {
      id: id(),
      universityId: u,
      programId: u + "-program",
      catalogYear: "2026–27",
      category: "General education",
      creditUnit: "semester credits",
      subcategory: "",
      courseCode: null,
      title: "",
      description: "",
      credits: 3,
      upper: false,
      prerequisites: [],
      corequisites: [],
      minimumGrade: null,
      alternatives: [],
      residencyImplications: "Needs confirmation",
      sourceIds: [],
      quote: "",
      location: "",
      verifiedAt: today(),
      status: "unverified",
      confidence: "User entry; requires source review",
      notes: "",
    },
    mapping: {
      id: id(),
      courseId: state.courses[0]?.id ?? "",
      universityId: u,
      equivalent: "",
      requirementIds: [],
      status: "unverified",
      sourceId: state.sources[0]?.id ?? "",
      quote: "",
      catalogYear: "2026–27",
      minimumGrade: "",
      risk: "Degree applicability, catalog year, grade and residency require confirmation.",
      reviewedAt: today(),
      expiresAt: "",
    },
    award: {
      id: id(),
      courseId: state.courses[0]?.id ?? "",
      universityId: u,
      credits: 3,
      upper: false,
      institutional: false,
      major: false,
      requirementIds: [],
      posted: false,
      applied: false,
      evidenceId: state.sources[0]?.id ?? "",
      gradePoints: null,
    },
    transaction: {
      id: id(),
      description: "",
      category: "University tuition",
      amount: 0,
      date: today(),
      kind: "Estimate",
      courseId: "",
    },
    enrollment: {
      id: id(),
      universityId: u,
      status: "Researching",
      startDate: "",
      applicationDate: "",
      notes: "",
    },
    portfolio: {
      id: id(),
      title: "",
      competency: "Purchasing",
      description: "",
      evidence: "",
      hours: 0,
    },
    subscription: {
      id: id(),
      provider: "Sophia",
      startDate: today(),
      endDate: today(),
      monthly: 99,
      fourMonth: 299,
      status: "unverified",
    },
    group: {
      id: id(),
      universityId: u,
      title: "",
      kind: "AND",
      children: [],
      minimum: 0,
      status: "unverified",
    },
    program: state.programs.find((p) => p.universityId === u),
    university: {
      id: id(),
      name: "",
      fullName: "",
      accreditor: "",
      accreditationStatus: "unverified",
      degree: "",
      tuition: 0,
      billing: "credit",
      periodWeeks: 8,
      sourceIds: [],
      notes: "",
    },
  };
  const [record, setRecord] = useState<any>({
      ...defaults[spec.type],
      ...spec.record,
    }),
    [error, setError] = useState(""),
    [advanced, setAdvanced] = useState(false);
  const update = (k: string, v: any) =>
    setRecord((r: any) => ({ ...r, [k]: v }));
  const input = (k: string, label: string, type = "text", hint?: string) => (
    <Field key={k} label={label} hint={hint}>
      <input
        required={["title", "description"].includes(k)}
        type={type}
        value={record[k] ?? ""}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? "any" : undefined}
        onChange={(e) =>
          update(
            k,
            type === "number"
              ? e.target.value === ""
                ? null
                : Number(e.target.value)
              : e.target.value,
          )
        }
      />
    </Field>
  );
  const select = (
    k: string,
    label: string,
    options: ({ value: string; label: string } | string)[],
  ) => (
    <Field key={k} label={label}>
      <select
        value={record[k] ?? ""}
        onChange={(e) => update(k, e.target.value)}
      >
        {options.map((o) => {
          const v = typeof o === "string" ? o : o.value;
          return (
            <option key={v} value={v}>
              {typeof o === "string" ? o : o.label}
            </option>
          );
        })}
      </select>
    </Field>
  );
  const check = (k: string, label: string) => (
    <label key={k} className="checkbox-field">
      <input
        type="checkbox"
        checked={record[k]}
        onChange={(e) => update(k, e.target.checked)}
      />
      {label}
    </label>
  );
  const multi = (
    k: string,
    label: string,
    items: { id: string; title: string }[],
  ) => (
    <Field key={k} label={label} hint="Use Ctrl / Cmd to select multiple.">
      <select
        multiple
        value={record[k]}
        onChange={(e) =>
          update(
            k,
            Array.from(e.target.selectedOptions, (o) => o.value),
          )
        }
      >
        {items.map((x) => (
          <option key={x.id} value={x.id}>
            {x.title}
          </option>
        ))}
      </select>
    </Field>
  );
  const status = () =>
    select(
      "status",
      "Verification state",
      Object.entries(statusLabels).map(([value, label]) => ({ value, label })),
    );
  const university = () =>
    select(
      "universityId",
      "University",
      universities.map((u) => ({ value: u.id, label: u.name })),
    );
  const evidence = (k = "sourceId") =>
    select(k, "Evidence record", [
      { value: "", label: "Select evidence" },
      ...state.sources.map((s) => ({
        value: s.id,
        label:
          s.id +
          " · " +
          s.authority +
          " · " +
          (s.quote ? "excerpt recorded" : "no excerpt"),
      })),
    ]);
  const text = (k: string, label: string) => (
    <Field label={label}>
      <textarea
        value={record[k] ?? ""}
        onChange={(e) => update(k, e.target.value)}
        rows={3}
      />
    </Field>
  );
  const schemas: any = {
    university: UniversitySchema,
    course: CourseSchema,
    source: SourceEvidenceSchema,
    requirement: RequirementSchema,
    mapping: CourseEquivalencySchema,
    award: CreditAwardSchema,
  };
  function save() {
    try {
      if (
        spec.type === "university" &&
        (!record.name.trim() ||
          !record.fullName.trim() ||
          !record.degree.trim())
      )
        throw Error("Enter institution names and degree title.");
      let validated = schemas[spec.type]
        ? schemas[spec.type].parse(record)
        : record;
      if (
        ["mapping", "requirement"].includes(spec.type) &&
        [
          "documented",
          "advisor-confirmed",
          "published-equivalency",
          "officially-applied",
        ].includes(record.status)
      ) {
        const ids =
          spec.type === "mapping" ? [record.sourceId] : record.sourceIds;
        if (
          !record.quote.trim() ||
          !ids.length ||
          !ids.every((i: string) =>
            state.sources.some(
              (s) =>
                s.id === i &&
                s.quote?.trim() &&
                s.verifiedAt &&
                s.retrievalStatus !== "inaccessible",
            ),
          )
        )
          throw Error(
            "Confirmed records require a reviewed source, exact excerpt and date.",
          );
      }
      if (
        spec.type === "mapping" &&
        ["advisor-confirmed", "officially-applied"].includes(record.status) &&
        !state.sources.some(
          (s) =>
            s.id === record.sourceId &&
            [
              "degree-audit",
              "registrar-confirmation",
              "transcript-evaluation",
            ].includes(s.evidenceType),
        )
      )
        throw Error(
          "Individual applicability requires degree-audit, registrar-confirmation or transcript-evaluation evidence. Published tables are a separate state.",
        );
      if (spec.type === "award") {
        if (!state.courses.some((c) => c.id === record.courseId))
          throw Error("Select a course.");
        if (
          record.credits >
          (state.courses.find((c) => c.id === record.courseId)?.credits ?? 0)
        )
          throw Error(
            "Award credits exceed the recorded course recommendation. Correct the course record using official evidence first.",
          );
        if (
          record.applied &&
          !record.requirementIds.every((id: string) =>
            state.requirements.some(
              (r) =>
                r.id === id &&
                r.universityId === record.universityId &&
                [
                  "documented",
                  "advisor-confirmed",
                  "officially-applied",
                ].includes(r.status),
            ),
          )
        )
          throw Error(
            "Applied requirements must be documented / confirmed for this university.",
          );
        if (
          record.applied &&
          (!record.posted ||
            !record.requirementIds.length ||
            !state.sources.some(
              (s) =>
                s.id === record.evidenceId &&
                s.quote &&
                s.verifiedAt &&
                ["degree-audit", "transcript-evaluation"].includes(
                  s.evidenceType,
                ) &&
                s.retrievalStatus !== "inaccessible",
            ))
        )
          throw Error(
            "Applied credit needs a posted transcript, degree requirements and a reviewed degree-audit or transcript-evaluation source; a public provider table is insufficient.",
          );
        if (
          state.awards.some(
            (a) =>
              a.courseId === record.courseId &&
              a.universityId === record.universityId &&
              a.id !== record.id,
          )
        )
          throw Error(
            "This course already has a credit award at this university. Edit that award.",
          );
      }
      if (
        spec.type === "course" &&
        record.providerCourseId &&
        state.courses.some(
          (c) =>
            c.id !== record.id &&
            c.provider === record.provider &&
            c.providerCourseId === record.providerCourseId,
        )
      )
        throw Error("Duplicate provider course ID.");
      if (
        spec.type === "program" &&
        record.complete &&
        (!["documented", "advisor-confirmed"].includes(record.status) ||
          !state.requirements.some(
            (r) => r.universityId === record.universityId && r.quote,
          ))
      )
        throw Error(
          "A complete program must have documented requirements and a confirmed status.",
        );
      onSave(spec.type, validated);
      onClose();
    } catch (e) {
      setError(
        e instanceof z.ZodError
          ? e.issues.map((i) => i.path.join(".") + ": " + i.message).join("; ")
          : (e as Error).message,
      );
    }
  }
  return (
    <Modal
      open
      onClose={onClose}
      title={
        (spec.record ? "Edit " : "Add ") +
        ((
          {
            mapping: "transfer evaluation",
            award: "official credit award",
            source: "source evidence",
            program: "program rules",
          } as Partial<Record<EditSpec["type"], string>>
        )[spec.type] ?? spec.type)
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="form-grid">
          {spec.type === "course" && (
            <>
              {input("title", "Course title")}
              {select("provider", "Provider", [
                "Sophia",
                "Study.com College Saver",
                "Study.com College Saver Pro",
                "CLEP",
                ...universities.map((u) => u.name),
                "Other",
              ])}
              {input("providerCourseId", "Exact provider course ID")}
              {input("credits", "Credits", "number")}
              {input("hours", "Estimated study hours", "number")}
              {input(
                "cost",
                "Exam / individual cost ($)",
                "number",
                "Subscriptions are calculated separately.",
              )}
              {select("status", "Progress", [
                "Not Started",
                "Scheduled",
                "In Progress",
                "Completed",
                "Transcript Requested",
                "Transfer Under Review",
                "Officially Applied",
                "Rejected",
                "Surplus",
              ])}
              {check("upper", "Upper division (verify separately)")}
              {input("startDate", "Start date", "date")}
              {input("dueDate", "Deadline", "date")}
              {input("aceId", "ACE / NCCRS ID")}
              {input("validFrom", "Recommendation valid from", "date")}
              {input("validTo", "Recommendation valid until", "date")}
              {multi(
                "prerequisites",
                "Prerequisites",
                state.courses.filter((c) => c.id !== record.id),
              )}
              {multi(
                "competencies",
                "Career competencies",
                competencies.map((c) => ({ id: c, title: c })),
              )}
              {text("notes", "Notes")}
              <Notice>
                Progress status alone never creates official credit. Enter a
                separate credit award from the university evaluation.
              </Notice>
            </>
          )}
          {spec.type === "source" && (
            <>
              {input("url", "Source URL", "url")}
              {input("authority", "Authority / document author")}
              {select("evidenceType", "Evidence type", [
                "degree-audit",
                "registrar-confirmation",
                "transcript-evaluation",
                "catalog",
                "transfer-agreement",
                "public-page",
                "provider-recommendation",
                "supporting-context",
              ])}
              {input("catalogYear", "Applicable catalog year")}
              {input("verifiedAt", "Date personally checked", "date")}
              {input("location", "Exact section / page")}
              {text("quote", "Exact supporting excerpt")}
              {select("retrievalStatus", "Review status", [
                "user-reviewed",
                "inaccessible",
                "retrieved-awaiting-human-review",
              ])}
              <Notice>
                Record only evidence you actually reviewed. An inaccessible
                website is not confirmation.
              </Notice>
            </>
          )}
          {spec.type === "requirement" && (
            <>
              {input("title", "Requirement title")}
              {university()}
              {input("catalogYear", "Catalog year")}
              {input("courseCode", "University course code")}
              {select("category", "Category", [
                "General education",
                "Business core",
                "Major",
                "Capstone",
                "Free electives",
                "Prerequisites",
                "Institutional conditions",
              ])}
              {input("subcategory", "Subcategory")}
              {input("credits", "Required units", "number")}
              {select("creditUnit", "Credit unit", [
                "semester credits",
                "competency units",
              ])}
              {check("upper", "Upper division required")}
              {status()}
              {multi(
                "sourceIds",
                "Supporting sources",
                state.sources.map((s) => ({
                  id: s.id,
                  title: s.id + " " + s.url,
                })),
              )}
              {text("quote", "Exact supporting excerpt")}
              {input("location", "Page / section")}
              {input("verifiedAt", "Checked date", "date")}
              {input("minimumGrade", "Minimum grade / score")}
              {input("residencyImplications", "Residency implications")}
              {multi("prerequisites", "Prerequisites", state.requirements)}
              {multi("corequisites", "Corequisites", state.requirements)}
              {multi("alternatives", "Allowed course IDs", state.courses)}
              {text("description", "Description")}
              {text("notes", "Notes and unresolved questions")}
            </>
          )}
          {spec.type === "mapping" && (
            <>
              {select("courseId", "Outside course", [
                { value: "", label: "Select course" },
                ...state.courses.map((c) => ({ value: c.id, label: c.title })),
              ])}
              {university()}
              {input("equivalent", "University equivalent code")}
              {input("catalogYear", "Catalog year")}
              {status()}
              {multi(
                "requirementIds",
                "Degree applicability",
                state.requirements.filter(
                  (r) => r.universityId === record.universityId,
                ),
              )}
              {evidence()}
              {text("quote", "Exact confirmation excerpt")}
              {input("minimumGrade", "Minimum passing grade / score")}
              {input("reviewedAt", "Review date", "date")}
              {input("expiresAt", "Validity end (if applicable)", "date")}
              {text("risk", "Transfer risk / unresolved restrictions")}
              <Notice>
                Published equivalency does not establish major applicability.
                Use advisor-confirmed only for an actual written applicability
                decision.
              </Notice>
            </>
          )}
          {spec.type === "award" && (
            <>
              {select("courseId", "Course", [
                { value: "", label: "Select course" },
                ...state.courses.map((c) => ({ value: c.id, label: c.title })),
              ])}
              {university()}
              {input("credits", "Posted credits", "number")}
              {input("gradePoints", "Grade points (optional)", "number")}
              {check("posted", "University transcript officially posted")}
              {check("applied", "University audit officially applied")}
              {check("institutional", "Earned at this university")}
              {check("major", "Applied within the major")}
              {check("upper", "Official upper division")}
              {multi(
                "requirementIds",
                "Applied requirements",
                state.requirements.filter(
                  (r) => r.universityId === record.universityId,
                ),
              )}
              {evidence("evidenceId")}
              <Notice>
                Use the official university transcript and degree audit.
                Provider completion is insufficient.
              </Notice>
            </>
          )}
          {spec.type === "transaction" && (
            <>
              {input("description", "Description")}
              {input("amount", "Amount ($)", "number")}
              {input("date", "Payment / due date", "date")}
              {select("category", "Category", [
                "University tuition",
                "Sophia subscriptions",
                "Study.com subscriptions",
                "CLEP exams",
                "Test center fees",
                "Transcripts",
                "Books and materials",
                "Prior learning assessment",
                "University fees",
                "Repeat exam",
                "Employer reimbursement",
                "Pell Grant",
                "Scholarship",
                "Other aid",
                "Other",
              ])}
              {select("kind", "Financial state", [
                "Estimate",
                "Committed",
                "Payment",
                "Refund",
                "Reimbursement",
                "Confirmed aid",
                "Potential aid",
              ])}
              <Notice>
                Convert a commitment into a payment when paid. Potential aid is
                never subtracted from estimates.
              </Notice>
            </>
          )}
          {spec.type === "subscription" && (
            <>
              {input("provider", "Provider")}
              {input("monthly", "Monthly price ($)", "number")}
              {input("fourMonth", "Optional four-month price ($)", "number")}
              {input("startDate", "Subscription start", "date")}
              {input(
                "endDate",
                "Cancel before renewal (exclusive end)",
                "date",
              )}
              {status()}
            </>
          )}
          {spec.type === "enrollment" && (
            <>
              {university()}
              {select("status", "Status", [
                "Researching",
                "Application prepared",
                "Applied",
                "Admitted",
                "Enrolled",
                "Graduated",
              ])}
              {input("applicationDate", "Application / deadline date", "date")}
              {input("startDate", "Confirmed planned session start", "date")}
              {text("notes", "Admissions checklist / notes")}
            </>
          )}
          {spec.type === "portfolio" && (
            <>
              {input("title", "Experience / credential")}
              {input("competency", "Competency")}
              {input("hours", "Learning hours (estimated)", "number")}
              {text("description", "What you learned / demonstrated")}
              {text("evidence", "Supporting evidence references")}
              <Notice>
                Experience and credentials do not create academic credit.
                Separate university approval is required.
              </Notice>
            </>
          )}
          {spec.type === "group" && (
            <>
              {input("title", "Group title")}
              {university()}
              {select("kind", "Rule", [
                "AND",
                "OR",
                "CREDITS",
                "UPPER",
                "RESIDENCY",
                "MAJOR_RESIDENCY",
                "UPPER_MAJOR_RESIDENCY",
                "GPA",
              ])}
              {input("minimum", "Credit / GPA minimum", "number")}
              {multi("children", "Child requirements / groups", [
                ...state.requirements,
                ...state.groups.filter((g) => g.id !== record.id),
              ])}
              {status()}
            </>
          )}
          {spec.type === "university" && (
            <>
              {input("name", "Short name")}
              {input("fullName", "Institution full name")}
              {input("degree", "Exact awarded degree")}
              {input("accreditor", "Institutional accreditor")}
              {select(
                "accreditationStatus",
                "Accreditation verification",
                Object.entries(statusLabels).map(([value, label]) => ({
                  value,
                  label,
                })),
              )}
              {input("tuition", "Published tuition amount ($)", "number")}
              {select("billing", "Billing unit", ["credit", "session", "term"])}
              {input("periodWeeks", "Session / term weeks", "number")}
              {multi(
                "sourceIds",
                "Supporting sources",
                state.sources.map((s) => ({
                  id: s.id,
                  title: s.id + " " + s.url,
                })),
              )}
              {text("notes", "Admissions, transfer and tuition restrictions")}
              <Notice>
                Adding a school does not verify accreditation or degree
                requirements. Import separate official rules before optimizing.
              </Notice>
            </>
          )}
          {spec.type === "program" && (
            <>
              {input("catalogId", "Catalog year")}
              {input("minimumCredits", "Total graduation credits", "number")}
              {input("residency", "Institutional credits minimum", "number")}
              {input("majorResidency", "Major institutional minimum", "number")}
              {input(
                "upperMajorResidency",
                "Upper major institutional minimum",
                "number",
              )}
              {input("upperMinimum", "Upper-level degree minimum", "number")}
              {input("minimumGpa", "Minimum GPA", "number")}
              {status()}
              {check(
                "complete",
                "All catalog / degree-audit requirements have been imported",
              )}
              <Notice>
                Mark complete only after reconciling every requirement against
                the official catalog or your degree audit. Null fields mean
                unknown, not a confirmed absence of a rule.
              </Notice>
            </>
          )}
        </div>
        <details
          open={advanced}
          onToggle={(e) => setAdvanced(e.currentTarget.open)}
        >
          <summary>Advanced normalized record</summary>
          <textarea
            className="json-editor"
            aria-label="Normalized record JSON"
            value={JSON.stringify(record, null, 2)}
            onChange={(e) => {
              try {
                setRecord(JSON.parse(e.target.value));
              } catch {
                setError(
                  "JSON is incomplete. Use the form fields or paste valid JSON.",
                );
              }
            }}
          />
        </details>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save record</Button>
        </div>
      </form>
    </Modal>
  );
}

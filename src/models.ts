import { z } from "zod";
const dateValue = (value: string) =>
  value === "" ||
  (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value + "T00:00:00Z")) &&
    new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value);
export const DateSchema = z
  .string()
  .refine(
    dateValue,
    "Use a valid YYYY-MM-DD date or leave optional dates empty",
  );
export const RequiredDateSchema = DateSchema.refine(
  (v) => v !== "",
  "A date is required",
);
export const VerificationSchema = z.enum([
  "documented",
  "published-equivalency",
  "advisor-confirmed",
  "officially-applied",
  "provisional",
  "unverified",
  "conflicting",
  "rejected",
  "expired",
]);
export type Verification = z.infer<typeof VerificationSchema>;
export const statusLabels: Record<Verification, string> = {
  documented: "Officially documented requirement",
  "published-equivalency": "Published transfer equivalency",
  "advisor-confirmed": "Advisor-confirmed applicability",
  "officially-applied": "Posted & applied credit",
  provisional: "Provisional",
  unverified: "Unverified",
  conflicting: "Conflicting sources",
  rejected: "Rejected",
  expired: "Outdated / expired",
};
export const ProgressSchema = z.enum([
  "Not Started",
  "Scheduled",
  "In Progress",
  "Completed",
  "Transcript Requested",
  "Transfer Under Review",
  "Officially Applied",
  "Rejected",
  "Surplus",
]);
export const UserProfileSchema = z.object({
  name: z.string(),
  primaryUniversity: z.string(),
  weeklyHours: z.number().min(0).max(100),
  workdayHours: z.number().min(0).max(12).default(0),
  onboarded: z.boolean(),
  theme: z.enum(["light", "dark", "system"]),
  density: z.enum(["comfortable", "compact"]),
  objective: z.enum(["cheapest", "fastest", "balanced"]),
  costWeight: z.number().min(0).max(1),
  durationMode: z.enum(["optimistic", "realistic", "conservative"]),
});
export const SourceEvidenceSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  authority: z.string(),
  evidenceType: z
    .enum([
      "degree-audit",
      "registrar-confirmation",
      "transcript-evaluation",
      "catalog",
      "transfer-agreement",
      "public-page",
      "provider-recommendation",
      "supporting-context",
    ])
    .default("public-page"),
  catalogYear: z.string(),
  retrievalStatus: z.string(),
  verifiedAt: DateSchema.nullable(),
  quote: z.string().nullable(),
  location: z.string().nullable(),
  blockage: z.string().nullable(),
  snapshot: z.string().nullable().optional(),
  attemptedAt: z.string().optional(),
  httpStatus: z.number().optional(),
  history: z.array(z.unknown()),
});
export const UniversitySchema = z.object({
  id: z.string(),
  name: z.string(),
  fullName: z.string(),
  accreditor: z.string(),
  accreditationStatus: VerificationSchema,
  degree: z.string(),
  tuition: z.number().nonnegative(),
  billing: z.enum(["session", "term", "credit"]),
  periodWeeks: z.number().positive(),
  sourceIds: z.array(z.string()),
  notes: z.string(),
});
export const DegreeProgramSchema = z.object({
  id: z.string(),
  universityId: z.string(),
  name: z.string(),
  catalogId: z.string(),
  complete: z.boolean(),
  minimumCredits: z.number().nullable(),
  residency: z.number().nullable(),
  majorResidency: z.number().nullable(),
  upperMajorResidency: z.number().nullable(),
  upperMinimum: z.number().nullable(),
  minimumGpa: z.number().nullable(),
  status: VerificationSchema,
});
export const CatalogVersionSchema = z.object({
  id: z.string(),
  universityId: z.string(),
  year: z.string(),
  effectiveDate: DateSchema.nullable(),
  status: VerificationSchema,
  sourceIds: z.array(z.string()),
});
export const RequirementSchema = z.object({
  id: z.string(),
  universityId: z.string(),
  programId: z.string(),
  catalogYear: z.string(),
  category: z.string(),
  subcategory: z.string(),
  courseCode: z.string().nullable(),
  title: z.string(),
  description: z.string(),
  credits: z.number().nonnegative(),
  creditUnit: z
    .enum(["semester credits", "competency units"])
    .default("semester credits"),
  upper: z.boolean(),
  prerequisites: z.array(z.string()),
  corequisites: z.array(z.string()),
  minimumGrade: z.string().nullable(),
  alternatives: z.array(z.string()),
  residencyImplications: z.string(),
  sourceIds: z.array(z.string()),
  quote: z.string(),
  location: z.string(),
  verifiedAt: DateSchema.nullable(),
  status: VerificationSchema,
  confidence: z.string(),
  notes: z.string(),
});
export const RequirementGroupSchema = z.object({
  id: z.string(),
  universityId: z.string(),
  title: z.string(),
  kind: z.enum([
    "AND",
    "OR",
    "CREDITS",
    "UPPER",
    "RESIDENCY",
    "MAJOR_RESIDENCY",
    "UPPER_MAJOR_RESIDENCY",
    "GPA",
  ]),
  children: z.array(z.string()),
  minimum: z.number().nonnegative(),
  status: VerificationSchema,
});
export const CourseSchema = z.object({
  id: z.string(),
  provider: z.string(),
  providerCourseId: z.string(),
  title: z.string().min(1),
  credits: z.number().min(0).max(30),
  upper: z.boolean(),
  aceId: z.string(),
  validFrom: DateSchema,
  validTo: DateSchema,
  hours: z.number().nonnegative(),
  hoursBasis: z.string(),
  cost: z.number().nonnegative(),
  prerequisites: z.array(z.string()),
  status: ProgressSchema,
  startDate: DateSchema,
  dueDate: DateSchema,
  notes: z.string(),
  competencies: z.array(z.string()),
});
export const ProviderSchema = z.object({
  id: z.string(),
  name: z.string(),
  monthly: z.number().nullable(),
  fourMonth: z.number().nullable(),
  sourceIds: z.array(z.string()),
  status: VerificationSchema,
});
export const CourseEquivalencySchema = z.object({
  id: z.string(),
  courseId: z.string(),
  universityId: z.string(),
  equivalent: z.string(),
  requirementIds: z.array(z.string()),
  status: VerificationSchema,
  sourceId: z.string(),
  quote: z.string(),
  catalogYear: z.string(),
  minimumGrade: z.string(),
  risk: z.string(),
  reviewedAt: DateSchema,
  expiresAt: DateSchema,
});
export const ApprovalRecordSchema = z.object({
  id: z.string(),
  equivalencyId: z.string(),
  reviewer: z.string(),
  date: RequiredDateSchema,
  documentId: z.string(),
  notes: z.string(),
  status: VerificationSchema,
});
export const CreditAwardSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  universityId: z.string(),
  credits: z.number().positive(),
  upper: z.boolean(),
  institutional: z.boolean(),
  major: z.boolean(),
  requirementIds: z.array(z.string()),
  posted: z.boolean(),
  applied: z.boolean(),
  evidenceId: z.string(),
  gradePoints: z.number().min(0).max(4).nullable(),
});
export const StudySessionSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  date: RequiredDateSchema,
  start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm"),
  minutes: z.number().min(1).max(1440),
  kind: z.enum([
    "Study",
    "Work day",
    "Work night",
    "Recovery",
    "Family",
    "Blackout",
    "Exam",
  ]),
  completed: z.boolean(),
  notes: z.string(),
});
export const WorkScheduleSchema = z.object({
  id: z.string(),
  name: z.string(),
  pattern: z.array(z.enum(["off", "day", "night", "recovery"])),
  startDate: DateSchema,
  workdayMinutes: z.number().nonnegative(),
  offdayMinutes: z.number().nonnegative(),
});
export const FinancialTransactionSchema = z.object({
  id: z.string(),
  description: z.string(),
  category: z.string(),
  amount: z.number().nonnegative(),
  date: RequiredDateSchema,
  kind: z.enum([
    "Estimate",
    "Committed",
    "Payment",
    "Refund",
    "Reimbursement",
    "Confirmed aid",
    "Potential aid",
  ]),
  courseId: z.string(),
});
export const SubscriptionSchema = z.object({
  id: z.string(),
  provider: z.string(),
  startDate: DateSchema,
  endDate: z.string(),
  monthly: z.number().nonnegative(),
  fourMonth: z.number().nonnegative().nullable(),
  status: VerificationSchema,
});
export const FinancialAidSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number().nonnegative(),
  status: z.enum(["potential", "confirmed"]),
  evidenceId: z.string(),
});
export const EnrollmentSchema = z.object({
  id: z.string(),
  universityId: z.string(),
  status: z.string(),
  startDate: DateSchema,
  applicationDate: DateSchema,
  notes: z.string(),
});
export const TranscriptSchema = z.object({
  id: z.string(),
  provider: z.string(),
  requestedAt: DateSchema,
  receivedAt: DateSchema,
  documentId: z.string(),
  status: z.string(),
});
export const VerificationEventSchema = z.object({
  id: z.string(),
  entityId: z.string(),
  date: RequiredDateSchema,
  from: VerificationSchema,
  to: VerificationSchema,
  notes: z.string(),
});
export const DegreePlanSchema = z.object({
  id: z.string(),
  universityId: z.string(),
  courseIds: z.array(z.string()),
  objective: z.string(),
});
export const OptimizationScenarioSchema = z.object({
  id: z.string(),
  name: z.string(),
  extraWeeklyHours: z.number(),
  delayWeeks: z.number().nonnegative(),
  tuitionMultiplier: z.number().positive(),
  deniedCourseId: z.string(),
  confirmedAid: z.number().nonnegative(),
});
export const CourseRecommendationSchema = z.object({
  courseId: z.string(),
  requirementIds: z.array(z.string()),
  reason: z.string(),
  safe: z.boolean(),
  rank: z.number(),
});
export const AcademicDeadlineSchema = z.object({
  id: z.string(),
  universityId: z.string(),
  title: z.string(),
  date: RequiredDateSchema,
  status: VerificationSchema,
  sourceIds: z.array(z.string()),
});
export const DocumentAttachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  size: z.number(),
  date: RequiredDateSchema,
  category: z.string(),
  notes: z.string(),
  reviewed: z.boolean(),
  extractedText: z.string(),
});
export const AuditEventSchema = z.object({
  id: z.string(),
  at: z.string(),
  action: z.string(),
  entityId: z.string(),
});
export const PortfolioSchema = z.object({
  id: z.string(),
  title: z.string(),
  competency: z.string(),
  description: z.string(),
  evidence: z.string(),
  hours: z.number().nonnegative(),
});
export const StateSchema = z.object({
  schemaVersion: z.literal(2),
  profile: UserProfileSchema,
  universities: z.array(UniversitySchema),
  programs: z.array(DegreeProgramSchema),
  courses: z.array(CourseSchema),
  equivalencies: z.array(CourseEquivalencySchema),
  requirements: z.array(RequirementSchema),
  groups: z.array(RequirementGroupSchema),
  awards: z.array(CreditAwardSchema),
  sources: z.array(SourceEvidenceSchema),
  approvals: z.array(ApprovalRecordSchema),
  sessions: z.array(StudySessionSchema),
  rotations: z.array(WorkScheduleSchema),
  transactions: z.array(FinancialTransactionSchema),
  subscriptions: z.array(SubscriptionSchema),
  enrollments: z.array(EnrollmentSchema),
  documents: z.array(DocumentAttachmentSchema),
  portfolio: z.array(PortfolioSchema),
  events: z.array(AuditEventSchema),
  deadlines: z.array(AcademicDeadlineSchema),
  lastBackup: z.string(),
});
export type State = z.infer<typeof StateSchema>;
export type Course = z.infer<typeof CourseSchema>;
export type Requirement = z.infer<typeof RequirementSchema>;
export type RequirementGroup = z.infer<typeof RequirementGroupSchema>;
export type CreditAward = z.infer<typeof CreditAwardSchema>;
export type Equivalency = z.infer<typeof CourseEquivalencySchema>;
export type University = z.infer<typeof UniversitySchema>;
export type DegreeProgram = z.infer<typeof DegreeProgramSchema>;
export type SourceEvidence = z.infer<typeof SourceEvidenceSchema>;
export type StudySession = z.infer<typeof StudySessionSchema>;
export type FinancialTransaction = z.infer<typeof FinancialTransactionSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type CatalogVersion = z.infer<typeof CatalogVersionSchema>;
export type Provider = z.infer<typeof ProviderSchema>;
export type ApprovalRecord = z.infer<typeof ApprovalRecordSchema>;
export type VerificationEvent = z.infer<typeof VerificationEventSchema>;
export type Transcript = z.infer<typeof TranscriptSchema>;
export type Enrollment = z.infer<typeof EnrollmentSchema>;
export type WorkSchedule = z.infer<typeof WorkScheduleSchema>;
export type Subscription = z.infer<typeof SubscriptionSchema>;
export type FinancialAid = z.infer<typeof FinancialAidSchema>;
export type DegreePlan = z.infer<typeof DegreePlanSchema>;
export type OptimizationScenario = z.infer<typeof OptimizationScenarioSchema>;
export type CourseRecommendation = z.infer<typeof CourseRecommendationSchema>;
export type AcademicDeadline = z.infer<typeof AcademicDeadlineSchema>;
export type DocumentAttachment = z.infer<typeof DocumentAttachmentSchema>;
export type AuditEvent = z.infer<typeof AuditEventSchema>;

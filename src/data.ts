import registry from "../research/source_registry.json";
import wguRequirements from "../research/wgu_supply_chain_requirements.json";
import providerCourses from "../research/provider_courses.json";
import umpiRequirements from "../research/umpi_2026_2027_requirements.json";
import publishedMappings from "../research/umpi_sophia_equivalencies.json";
import { StateSchema } from "./models";
import type {
  State,
  University,
  DegreeProgram,
  SourceEvidence,
} from "./models";
export const universities: University[] = [
  {
    id: "umpi",
    name: "UMPI",
    fullName: "University of Maine at Presque Isle",
    degree: "B.A. Business Administration · Supply Chain Management",
    accreditor: "NECHE · accredited as part of University of Maine System",
    accreditationStatus: "documented",
    tuition: 1800,
    billing: "session",
    periodWeeks: 8,
    sourceIds: ["source-06"],
    notes:
      "YourPace · Eight-week sessions. Age 20+ is documented on admissions pages. First-time eligibility needs full admissions review. 2026 general education and ACE/CPL interpretation require confirmation.",
  },
  {
    id: "wgu",
    name: "WGU",
    fullName: "Western Governors University",
    degree: "B.S. Supply Chain and Operations Management",
    accreditor: "NWCCU · Accredited 2003–present (member listing)",
    accreditationStatus: "documented",
    tuition: 4050,
    billing: "term",
    periodWeeks: 26,
    sourceIds: ["source-13", "source-26"],
    notes:
      "Six-month competency-based terms. $3,850 tuition + $200 resources; 36 courses and transfer cutoff before first term are unverified starting claims.",
  },
  {
    id: "tesu",
    name: "TESU",
    fullName: "Thomas Edison State University",
    degree: "B.S.B.A. Operations Management",
    accreditor: "MSCHE (verification pending)",
    accreditationStatus: "unverified",
    tuition: 4652,
    billing: "term",
    periodWeeks: 16,
    sourceIds: ["source-16"],
    notes:
      "Out-of-state full-time term (9+ credits). Edison Accelerate $3,468 is a conditional alternative pathway, not automatically combined with term tuition. Confirm residency and credit limits.",
  },
  {
    id: "snhu",
    name: "SNHU",
    fullName: "Southern New Hampshire University",
    degree: "B.S. Operations Management",
    accreditor: "NECHE (verification pending)",
    accreditationStatus: "unverified",
    tuition: 354,
    billing: "credit",
    periodWeeks: 8,
    sourceIds: ["source-20"],
    notes:
      "Online tuition per credit. Transfer maximum, institutional minimum and exact 2026–27 degree rules remain unverified.",
  },
];
export const initialPrograms: DegreeProgram[] = universities.map((u) => ({
  id: u.id + "-program",
  universityId: u.id,
  name: u.degree,
  catalogId:
    u.id === "wgu" ? "October 2026 · program version 202605" : "2026–27",
  complete: false,
  minimumCredits:
    u.id === "wgu" ? 110 : ["umpi", "snhu"].includes(u.id) ? 120 : null,
  residency: ["umpi", "snhu"].includes(u.id) ? 30 : null,
  majorResidency: u.id === "umpi" ? 12 : null,
  upperMajorResidency: u.id === "umpi" ? 9 : null,
  upperMinimum: null,
  minimumGpa: null,
  status: u.id === "umpi" ? "documented" : "unverified",
}));
export const initialState: State = StateSchema.parse({
  schemaVersion: 2,
  profile: {
    name: "",
    primaryUniversity: "umpi",
    weeklyHours: 0,
    workdayHours: 0,
    onboarded: false,
    theme: "light",
    density: "comfortable",
    objective: "balanced",
    costWeight: 0.5,
    durationMode: "realistic",
  },
  universities,
  programs: initialPrograms,
  courses: providerCourses,
  equivalencies: publishedMappings.equivalencies,
  requirements: [
    ...umpiRequirements.requirements,
    ...wguRequirements.requirements,
  ],
  groups: [
    {
      id: "umpi-residency",
      universityId: "umpi",
      title: "UMPI residency",
      kind: "RESIDENCY",
      children: [],
      minimum: 30,
      status: "documented",
    },
    {
      id: "umpi-major-residency",
      universityId: "umpi",
      title: "Major residency",
      kind: "MAJOR_RESIDENCY",
      children: [],
      minimum: 12,
      status: "documented",
    },
    {
      id: "umpi-upper-major-residency",
      universityId: "umpi",
      title: "Upper-level major residency",
      kind: "UPPER_MAJOR_RESIDENCY",
      children: [],
      minimum: 9,
      status: "documented",
    },
  ],
  awards: [],
  sources: registry,
  approvals: [],
  sessions: [],
  rotations: [],
  transactions: [],
  subscriptions: [],
  enrollments: [],
  documents: [],
  portfolio: [],
  events: [],
  lastBackup: "",
  deadlines: [
    {
      id: "jan-2027",
      universityId: "umpi",
      title: "January 11, 2027 session application",
      date: "2026-12-14",
      status: "documented",
      sourceIds: ["source-01"],
    },
    {
      id: "mar-2027",
      universityId: "umpi",
      title: "March 8, 2027 session application",
      date: "2027-02-08",
      status: "documented",
      sourceIds: ["source-01"],
    },
  ],
});
export const navigation = [
  "Dashboard",
  "My Degree",
  "Degree Audit",
  "Course Explorer",
  "Transfer Matrix",
  "Pathway Optimizer",
  "Study Planner",
  "Financial Command Center",
  "University Comparison",
  "Academic Verification Center",
  "Applications & Enrollment",
  "Prior Learning Assessment",
  "Transcript & Document Vault",
  "Professional Development",
  "Reports & Analytics",
  "Research Sources",
  "Settings & Backups",
];
export const competencies = [
  "Purchasing",
  "Strategic sourcing",
  "Supplier evaluation",
  "Supplier relationships",
  "Contract negotiation",
  "Inventory optimization",
  "Logistics",
  "Materials management",
  "Supply chain analytics",
  "Forecasting",
  "Operations management",
  "ERP / procurement systems",
  "Project management",
  "Business analytics",
];
export const gaps = [
  {
    title: "UMPI catalog unavailable; policies incomplete",
    detail:
      "The October 2026 WGU catalog lists 36 courses / 110 competency units. UMPI catalog requests returned 403; new general education and a complete course audit remain unresolved. No fabricated 120-credit plan is asserted.",
    university: "UMPI / alternatives",
  },
  {
    title: "ACE credit versus CPL policy",
    detail:
      "UMPI FAQ language and the reported 30-credit prior-learning assessment limit may differ. Registrar confirmation must establish how Sophia / Study.com ACE credits are treated.",
    university: "UMPI",
  },
  {
    title: "Academic map is a scheduling guide",
    detail:
      "The retrieved map DOES include second-year spring, correcting the supplied omission claim. Its 25 named rows remain provisional: a scheduling guide cannot substitute for the catalog or individual degree audit.",
    university: "UMPI",
  },
  {
    title: "Transfer applicability is not equivalency",
    detail:
      "72 Sophia-published UMPI equivalencies were retrieved. None establishes individual degree applicability. WGU partnership URLs returned JavaScript shells. Confirm catalog, grade, level and residency before purchasing.",
    university: "All",
  },
  {
    title: "Tuition, deadlines and accreditation",
    detail:
      "UMPI, WGU, TESU and SNHU public prices were checked. UMPI accreditation is documented by NECHE as part of the UMaine System. Study.com pricing and UMPI catalog returned 403; CLEP numeric price remains unverified. Program accreditation is separate.",
    university: "All",
  },
];

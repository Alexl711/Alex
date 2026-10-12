# Calculation model and limits

The degree audit and optimizer share `audit()` in `src/engine.ts`. They do not maintain separate invented credit totals.

## Credit accounting

Personal courses, provider recommendations, equivalencies, requirements and credit awards are different records. Progress status can report completion but cannot post or apply credit. Applied awards require posted/applied flags, reviewed individual degree-audit/transcript-evaluation evidence, valid same-university requirements and credits no greater than the recorded course credit value.

Awards are deduplicated by course ID. A course can fulfill more than one permitted condition but its credit value contributes once to total credits. Requirement coverage references explicit award requirement IDs. A generic elective cannot satisfy a major row simply because its credit count matches.

Nested AND/OR groups, credit minima, upper-level credits, institutional/major/upper-major residency and GPA are evaluated deterministically. Child requirements in alternative groups do not all become mandatory standalone courses. Cycles, invalid children or unreachable groups prevent graduation feasibility. The solver preserves semester credits versus WGU competency-unit labels; conversion requires the university's actual evaluated award.

## Discrete selection

The optimizer considers all subsets of up to 18 **planned/in-progress/completed-but-not-applied confirmed candidates** for the selected program. The candidate library itself is not a plan. Individual applicability must be advisor-confirmed or officially applied with reviewed individual evidence. Published equivalency alone is excluded.

Each selected subset is simulated through the shared audit. It must meet the complete program, total, standalone requirements, root groups, residency, upper-level and any documented GPA rule. No assumed future A grades are inserted. A future GPA-dependent pathway may therefore remain infeasible until the model can prove that constraint from actual posted grades.

Prerequisites are topologically scheduled serially. Missing prerequisites and cycles fail. Outside coursework is scheduled before institutional coursework; an outside prerequisite that depends on an institutional course is rejected in this model. This enforces a conservative transfer-before-enrollment ordering, including WGU's stated transfer cutoff, but is not a complete university course-offering model.

## Time and price

- User default weekly capacity, exact study blocks, manual shift capacity, explicit rotations and recovery/blackout days provide daily study hours.
- Estimated workloads use 0.75 / 1 / 1.4 duration factors for optimistic / realistic / conservative scenarios. The factors are modeling assumptions, not published completion guarantees.
- Outside work is followed by **21 estimated calendar days** for transcript processing.
- Institutional courses require a configured enrollment start after that processing period and an application date no later than that start. The engine does not automatically validate every offered session or application deadline; users must confirm those dates.
- Completed courses are not charged or assigned study hours again; their actual prior payments remain in the ledger. University requirement prerequisites are checked separately from provider course dependencies.
- Monthly subscriptions use calendar-month anniversaries (including month-end clamping); cancellation end is exclusive. Sophia compares monthly and four-month bundles. A recorded subscription price overrides the initial provider price claim. The annual $799 plan, sales taxes, extra Study.com exams and changing provider restrictions are not yet modeled.
- One institutional course at a time is assumed. Session/term charges round up from scheduled institutional duration, while per-credit programs charge institutional credits. TESU's special Edison Accelerate pathway is displayed as a conditional published fee, not optimized as if automatically approved.
- Confirmed scenario aid is subtracted after tuition. Potential aid is never assumed. Actual payments remain immutable in the separate ledger.

## Objectives

Cheapest sorts by modeled remaining cost; fastest by modeled days; balanced scores:

`costWeight × cost/100 + (1 − costWeight) × days + 5 × estimated-workload-count`

The scaling and risk penalty are explicit heuristic preferences, not an actuarial score. Ties sort by cost and finish date. The UI shows up to 20 feasible strategies after exhaustive subset evaluation. More than 18 candidates produces a visible limit rather than an unsupported global optimum.

The algorithm is exact for **course subsets within this bounded serial scheduling model**, not for all possible concurrent schedules/provider ordering/enrollment policies. The initial incomplete academic data produces no asserted cheapest/fastest graduation winner. See the backlog for parallel scheduling, institution-specific catalogs and tuition policies.

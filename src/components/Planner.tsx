import { useState, useEffect } from "react";
import {
  addDays,
  addMonths,
  startOfMonth,
  startOfWeek,
  endOfMonth,
  format,
  parseISO,
  isValid,
} from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Upload,
} from "lucide-react";
import type { State, StudySession } from "../models";
import { id, today, capacity, forecast } from "../engine";
import { Button } from "./ui/button";
import { Modal, Field, Section, Notice } from "./shared";
export function importICS(text: string): StudySession[] {
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  return unfolded
    .split("BEGIN:VEVENT")
    .slice(1)
    .map((block) => {
      const get = (name: string) =>
        block
          .match(new RegExp("^" + name + "(?:;[^:]*)?:(.*)$", "m"))?.[1]
          .trim() ?? "";
      const raw = get("DTSTART"),
        end = get("DTEND");
      const date =
        raw.slice(0, 4) + "-" + raw.slice(4, 6) + "-" + raw.slice(6, 8);
      if (!isValid(parseISO(date)))
        throw Error("ICS event has invalid DTSTART");
      const start = raw.includes("T")
        ? raw.slice(9, 11) + ":" + raw.slice(11, 13)
        : "08:00";
      const minutes =
        end.includes("T") && end.slice(0, 8) === raw.slice(0, 8)
          ? Math.max(
              1,
              Number(end.slice(9, 11)) * 60 +
                Number(end.slice(11, 13)) -
                (Number(raw.slice(9, 11)) * 60 + Number(raw.slice(11, 13))),
            )
          : 720;
      return {
        id: id(),
        courseId: "",
        date,
        start,
        minutes: Math.min(1440, minutes),
        kind: "Work day",
        completed: false,
        notes:
          get("SUMMARY") +
          (block.includes("RRULE")
            ? " · Recurrence not expanded; review and configure a rotation."
            : ""),
      };
    });
}
export function Planner({
  state,
  mutate,
  toast,
}: {
  state: State;
  mutate: (fn: (s: State) => void, action: string) => void;
  toast: (s: string) => void;
}) {
  const [date, setDate] = useState(today()),
    [view, setView] = useState("Month"),
    [draft, setDraft] = useState<StudySession | null>(null),
    [rotation, setRotation] = useState(false),
    [pattern, setPattern] = useState(""),
    [workMinutes, setWorkMinutes] = useState(30),
    [offMinutes, setOffMinutes] = useState(120),
    [timerMode, setTimerMode] = useState("Pomodoro"),
    [seconds, setSeconds] = useState(0),
    [running, setRunning] = useState(false),
    [timerCourse, setTimerCourse] = useState(""),
    [drag, setDrag] = useState("");
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running]);
  useEffect(() => {
    if (timerMode === "Pomodoro" && seconds >= 25 * 60 && running) {
      setRunning(false);
      toast(
        "25-minute focus block complete. Log the session or start a break.",
      );
    }
  }, [seconds, timerMode, running, toast]);
  const newSession = (d = date) =>
    setDraft({
      id: id(),
      courseId: state.courses[0]?.id ?? "",
      date: d,
      start: "09:00",
      minutes: 60,
      kind: "Study",
      completed: false,
      notes: "",
    });
  const start =
    view === "Month"
      ? startOfWeek(startOfMonth(parseISO(date)))
      : view === "Week"
        ? startOfWeek(parseISO(date))
        : parseISO(date);
  const count =
    view === "Month"
      ? Math.ceil(
          (endOfMonth(parseISO(date)).getDate() +
            startOfMonth(parseISO(date)).getDay()) /
            7,
        ) * 7
      : view === "Day"
        ? 1
        : 7;
  const days = Array.from({ length: count }, (_, i) =>
    format(addDays(start, i), "yyyy-MM-dd"),
  );
  const dailyCapacity = capacity(state, days[0], Math.ceil(count / 7));
  const plannedHours = state.courses
    .filter((c) => ["Scheduled", "In Progress"].includes(c.status))
    .reduce((a, c) => a + c.hours, 0);
  const checked = state.sessions
    .filter((s) => s.completed && ["Study", "Exam"].includes(s.kind))
    .reduce((a, s) => a + s.minutes / 60, 0);
  function saveSession() {
    if (
      !draft ||
      !draft.date ||
      !draft.start ||
      draft.minutes <= 0 ||
      draft.minutes > 1440
    ) {
      toast("Enter a valid date, time and duration.");
      return;
    }
    mutate((s) => {
      s.sessions = [...s.sessions.filter((x) => x.id !== draft.id), draft];
    }, "Study session saved");
    setDraft(null);
  }
  return (
    <>
      <div className="stats-grid">
        <div className="stat">
          <span>Weekly study capacity</span>
          <strong>
            {state.rotations.length
              ? "Custom rotation"
              : state.profile.weeklyHours + " hours"}
          </strong>
          <small>Set your actual availability</small>
        </div>
        <div className="stat">
          <span>Logged study time</span>
          <strong>{checked.toFixed(1)} hours</strong>
          <small>Completed sessions only</small>
        </div>
        <div className="stat">
          <span>Planned workload</span>
          <strong>{plannedHours} hours</strong>
          <small>Estimated course workloads</small>
        </div>
        <div className="stat">
          <span>Study finish forecast</span>
          <strong className="stat-small">
            {plannedHours
              ? (forecast(state, plannedHours) ?? "Capacity needed")
              : "No planned courses"}
          </strong>
          <small>Not a graduation guarantee</small>
        </div>
      </div>
      <div className="split-grid">
        <Section
          title="Your study calendar"
          subtitle="Plan around work, recovery and life."
          action={
            <Button size="sm" onClick={() => newSession()}>
              <Plus size={15} />
              Add block
            </Button>
          }
        >
          <div className="calendar-toolbar">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Previous period"
              onClick={() =>
                setDate(
                  format(
                    view === "Month"
                      ? addMonths(parseISO(date), -1)
                      : addDays(parseISO(date), view === "Day" ? -1 : -7),
                    "yyyy-MM-dd",
                  ),
                )
              }
            >
              <ChevronLeft size={18} />
            </Button>
            <strong>{format(parseISO(date), "MMMM yyyy")}</strong>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Next period"
              onClick={() =>
                setDate(
                  format(
                    view === "Month"
                      ? addMonths(parseISO(date), 1)
                      : addDays(parseISO(date), view === "Day" ? 1 : 7),
                    "yyyy-MM-dd",
                  ),
                )
              }
            >
              <ChevronRight size={18} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDate(today())}>
              Today
            </Button>
            <select
              aria-label="Calendar view"
              value={view}
              onChange={(e) => setView(e.target.value)}
            >
              {["Day", "Week", "Month", "Agenda", "Timeline"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </div>
          {["Agenda", "Timeline"].includes(view) ? (
            <div
              className={view === "Timeline" ? "timeline-list" : "agenda-list"}
            >
              {state.sessions
                .filter((s) => s.date >= date)
                .sort(
                  (a, b) =>
                    a.date.localeCompare(b.date) ||
                    a.start.localeCompare(b.start),
                )
                .map((s) => (
                  <button
                    key={s.id}
                    className="agenda-row"
                    onClick={() => setDraft(s)}
                  >
                    <span>
                      {s.date} · {s.start}
                    </span>
                    <strong>
                      {s.kind} ·{" "}
                      {state.courses.find((c) => c.id === s.courseId)?.title ??
                        s.notes}
                    </strong>
                    <span>
                      {s.minutes} min · {s.completed ? "Done" : "Planned"}
                    </span>
                  </button>
                ))}
              {!state.sessions.length && (
                <p className="empty">Add your first study or shift block.</p>
              )}
            </div>
          ) : (
            <div className={`calendar ${view.toLowerCase()}`}>
              {view !== "Day" &&
                ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div className="calendar-day-label" key={d}>
                    {d}
                  </div>
                ))}
              {days.map((d) => (
                <div
                  key={d}
                  className={`calendar-day ${d === today() ? "today" : ""}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    mutate((s) => {
                      const session = s.sessions.find((x) => x.id === drag);
                      if (session) session.date = d;
                    }, "Session rescheduled");
                  }}
                >
                  <button
                    aria-label={`Add block ${d}`}
                    className="calendar-date"
                    onClick={() => newSession(d)}
                  >
                    {Number(d.slice(-2))}
                    <span>
                      {dailyCapacity
                        .find((c) => c.date === d)
                        ?.hours.toFixed(1)}
                      h
                    </span>
                  </button>
                  {state.sessions
                    .filter((s) => s.date === d)
                    .map((s) => (
                      <button
                        key={s.id}
                        draggable
                        onDragStart={() => setDrag(s.id)}
                        onClick={() => setDraft(s)}
                        className={`calendar-event ${s.kind.startsWith("Work") ? "work-event" : ""} ${s.completed ? "done" : ""}`}
                      >
                        {s.start}{" "}
                        {s.kind === "Study"
                          ? (state.courses.find((c) => c.id === s.courseId)
                              ?.title ?? "Study")
                          : s.kind}
                        <small>
                          {s.minutes}m{s.completed ? " ✓" : ""}
                        </small>
                      </button>
                    ))}
                </div>
              ))}
            </div>
          )}
        </Section>
        <div className="stack">
          <Section
            title="Focus room"
            subtitle="Your timer only runs while this page is open."
          >
            <div className="segmented">
              {["Pomodoro", "Stopwatch"].map((m) => (
                <button
                  key={m}
                  className={m === timerMode ? "active" : ""}
                  onClick={() => {
                    setTimerMode(m);
                    setSeconds(0);
                    setRunning(false);
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="timer">
              {Math.floor(
                (timerMode === "Pomodoro"
                  ? Math.max(0, 1500 - seconds)
                  : seconds) / 60,
              )
                .toString()
                .padStart(2, "0")}
              :
              {(
                (timerMode === "Pomodoro"
                  ? Math.max(0, 1500 - seconds)
                  : seconds) % 60
              )
                .toString()
                .padStart(2, "0")}
            </div>
            <select
              aria-label="Timer course"
              value={timerCourse}
              onChange={(e) => setTimerCourse(e.target.value)}
            >
              <option value="">General study</option>
              {state.courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <div className="button-row">
              <Button onClick={() => setRunning(!running)}>
                {running ? <Pause size={16} /> : <Play size={16} />}{" "}
                {running ? "Pause" : "Focus"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setSeconds(0);
                  setRunning(false);
                }}
                aria-label="Reset timer"
              >
                <RotateCcw size={16} />
              </Button>
              <Button
                variant="secondary"
                disabled={seconds < 60}
                onClick={() => {
                  mutate(
                    (s) =>
                      s.sessions.push({
                        id: id(),
                        courseId: timerCourse,
                        date: today(),
                        start: format(new Date(), "HH:mm"),
                        minutes: Math.floor(seconds / 60),
                        kind: "Study",
                        completed: true,
                        notes: timerMode + " session",
                      }),
                    "Focus session logged",
                  );
                  setSeconds(0);
                  setRunning(false);
                }}
              >
                Log session
              </Button>
            </div>
          </Section>
          <Section title="Shift & capacity settings">
            <Field label="Default weekly study hours">
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
                  }, "Study capacity updated")
                }
              />
            </Field>
            <Field
              label="Manual workday study hours"
              hint="Applies to entered day / night shifts unless you schedule exact study blocks."
            >
              <input
                type="number"
                min="0"
                max="12"
                value={state.profile.workdayHours}
                onChange={(e) =>
                  mutate((s) => {
                    s.profile.workdayHours = Math.min(
                      12,
                      Math.max(0, Number(e.target.value)),
                    );
                  }, "Manual shift capacity updated")
                }
              />
            </Field>
            <Button variant="secondary" onClick={() => setRotation(true)}>
              Create / replace rotation
            </Button>
            {state.rotations[0] && (
              <p>
                {state.rotations[0].pattern.join(" → ")} · from{" "}
                {state.rotations[0].startDate}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    mutate((s) => {
                      s.rotations = [];
                    }, "Rotation removed")
                  }
                >
                  Remove
                </Button>
              </p>
            )}
            <label className="upload-button">
              <Upload size={16} />
              Import ICS
              <input
                type="file"
                accept=".ics"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f)
                    try {
                      const sessions = importICS(await f.text());
                      mutate(
                        (s) => s.sessions.push(...sessions),
                        "ICS imported for review",
                      );
                      toast(
                        `${sessions.length} shifts imported. Timezones and recurrence must be reviewed.`,
                      );
                    } catch (err) {
                      toast((err as Error).message);
                    }
                  e.target.value = "";
                }}
              />
            </label>
            <small>
              ICS imports individual events as shifts. Recurrences and timezone
              conversions require manual review.
            </small>
          </Section>
          <Section
            title="Catch-up queue"
            subtitle="Missed blocks retain their history."
          >
            {state.sessions
              .filter(
                (s) =>
                  s.date < today() &&
                  !s.completed &&
                  ["Study", "Exam"].includes(s.kind),
              )
              .map((s) => (
                <div className="list-row" key={s.id}>
                  <div>
                    <strong>{s.notes || "Missed study block"}</strong>
                    <small>
                      {s.date} · {s.minutes} minutes
                    </small>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setDraft({ ...s, date: today() })}
                  >
                    Reschedule
                  </Button>
                </div>
              ))}
            {!state.sessions.some(
              (s) => s.date < today() && !s.completed && s.kind === "Study",
            ) && <p className="muted">No missed study blocks.</p>}
          </Section>
        </div>
      </div>
      {draft && (
        <Modal open onClose={() => setDraft(null)} title="Schedule block">
          <div className="form-grid">
            <Field label="Date">
              <input
                type="date"
                value={draft.date}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              />
            </Field>
            <Field label="Time">
              <input
                type="time"
                value={draft.start}
                onChange={(e) => setDraft({ ...draft, start: e.target.value })}
              />
            </Field>
            <Field label="Duration (minutes)">
              <input
                type="number"
                min="1"
                max="1440"
                value={draft.minutes}
                onChange={(e) =>
                  setDraft({ ...draft, minutes: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Block type">
              <select
                value={draft.kind}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    kind: e.target.value as StudySession["kind"],
                  })
                }
              >
                {[
                  "Study",
                  "Work day",
                  "Work night",
                  "Recovery",
                  "Family",
                  "Blackout",
                  "Exam",
                ].map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </Field>
            <Field label="Course">
              <select
                value={draft.courseId}
                onChange={(e) =>
                  setDraft({ ...draft, courseId: e.target.value })
                }
              >
                <option value="">General / no course</option>
                {state.courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Notes">
              <textarea
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              />
            </Field>
            <label>
              <input
                type="checkbox"
                checked={draft.completed}
                onChange={(e) =>
                  setDraft({ ...draft, completed: e.target.checked })
                }
              />{" "}
              Completed / logged
            </label>
          </div>
          <div className="modal-actions">
            <Button
              variant="destructive"
              onClick={() => {
                mutate((s) => {
                  s.sessions = s.sessions.filter((x) => x.id !== draft.id);
                }, "Block deleted");
                setDraft(null);
              }}
            >
              Delete
            </Button>
            <Button onClick={saveSession}>Save block</Button>
          </div>
        </Modal>
      )}
      {rotation && (
        <Modal
          open
          onClose={() => setRotation(false)}
          title="Create your exact shift rotation"
        >
          <Notice>
            No work pattern is assumed. Enter your actual cycle, starting at the
            first day of the sequence.
          </Notice>
          <Field label="Cycle, comma separated: day, night, off, recovery">
            <input
              placeholder="day, day, off, night, night, recovery, off"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
            />
          </Field>
          <Field label="Rotation start">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <div className="form-grid">
            <Field label="Workday study minutes">
              <input
                type="number"
                min="0"
                value={workMinutes}
                onChange={(e) => setWorkMinutes(Number(e.target.value))}
              />
            </Field>
            <Field label="Day-off study minutes">
              <input
                type="number"
                min="0"
                value={offMinutes}
                onChange={(e) => setOffMinutes(Number(e.target.value))}
              />
            </Field>
          </div>
          <Button
            onClick={() => {
              const parts = pattern.split(",").map((s) => s.trim());
              if (
                !parts.length ||
                parts.some(
                  (p) => !["day", "night", "off", "recovery"].includes(p),
                ) ||
                workMinutes < 0 ||
                offMinutes < 0 ||
                !date
              ) {
                toast("Enter valid shift names, date and nonnegative minutes.");
                return;
              }
              mutate((s) => {
                s.rotations = [
                  {
                    id: id(),
                    name: "My shift cycle",
                    pattern: parts as any,
                    startDate: date,
                    workdayMinutes: workMinutes,
                    offdayMinutes: offMinutes,
                  },
                ];
              }, "Shift rotation saved");
              setRotation(false);
            }}
          >
            Save rotation
          </Button>
        </Modal>
      )}
    </>
  );
}

import * as Dialog from "@radix-ui/react-dialog";
import { X, ShieldCheck, TriangleAlert, ExternalLink } from "lucide-react";
import { Button } from "./ui/button";
import { statusLabels, type Verification } from "../models";
import type { ReactNode } from "react";
export function Modal({
  open,
  onClose,
  title,
  children,
  description = "Enter accurate information. Academic records require traceable evidence.",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  description?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className="modal">
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Description>{description}</Dialog.Description>
          <Dialog.Close asChild>
            <Button
              variant="ghost"
              size="icon"
              className="close-modal"
              aria-label="Close dialog"
            >
              <X size={20} />
            </Button>
          </Dialog.Close>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Badge({ status }: { status: Verification | string }) {
  const good = [
    "documented",
    "advisor-confirmed",
    "officially-applied",
  ].includes(status);
  return (
    <span
      className={`badge ${good ? "green" : status === "rejected" || status === "conflicting" ? "red" : "amber"}`}
    >
      {good ? <ShieldCheck size={12} /> : <TriangleAlert size={12} />}{" "}
      {statusLabels[status as Verification] ?? status}
    </span>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <ShieldCheck size={26} />
      </div>
      <h3>{title}</h3>
      <p>
        {children ??
          "Start with your real records. Nothing here is assumed earned, approved or paid."}
      </p>
    </div>
  );
}
export function Section({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="card">
      <div className="card-heading">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export function SourceLink({
  url,
  label = "Official source",
}: {
  url: string;
  label?: string;
}) {
  if (url.startsWith("urn:degree-hq:document:"))
    return (
      <span className="source-link">
        Local document reference · {url.split(":").at(-1)?.slice(0, 8)}
      </span>
    );
  return (
    <a href={url} target="_blank" rel="noreferrer" className="source-link">
      {label}
      <ExternalLink size={13} />
    </a>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="notice">
      <TriangleAlert size={18} />
      <div>{children}</div>
    </div>
  );
}

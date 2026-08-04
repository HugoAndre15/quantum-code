"use client";

import React from "react";
import styles from "./SharedUI.module.css";

// ──────────────────────────────────────────────
// Shared UI components for admin pages (TypeScript)
// ──────────────────────────────────────────────

const INTERACTIVE_SELECTOR =
  "button, a, input, select, textarea, [role='button'], [role='menuitem']";

export const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  fontSize: 13,
  background: "var(--black-3)",
  border: "1px solid var(--border-2)",
  borderRadius: "var(--r)",
  color: "var(--white)",
  outline: "none",
};

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--grey-3)",
          textTransform: "uppercase",
          letterSpacing: ".05em",
          marginBottom: 4,
          display: "block",
        }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

export function Card({
  children,
  onClick,
  hoverable,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  hoverable?: boolean;
}) {
  return (
    <div
      onClick={
        onClick
          ? (event) => {
              const target = event.target;
              const interactive =
                target instanceof Element
                  ? target.closest(INTERACTIVE_SELECTOR)
                  : null;
              if (interactive && interactive !== event.currentTarget) return;
              onClick();
            }
          : undefined
      }
      onKeyDown={
        onClick
          ? (event) => {
              if (event.target !== event.currentTarget) return;
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      role={onClick ? "group" : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={{
        background: "var(--black-2)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-m)",
        padding: "20px 24px",
        cursor: onClick ? "pointer" : "default",
        transition: hoverable ? "border-color .15s" : undefined,
      }}
      onMouseEnter={
        hoverable
          ? (e) =>
              ((e.currentTarget as HTMLDivElement).style.borderColor =
                "var(--blue)")
          : undefined
      }
      onMouseLeave={
        hoverable
          ? (e) =>
              ((e.currentTarget as HTMLDivElement).style.borderColor =
                "var(--border)")
          : undefined
      }
    >
      {children}
    </div>
  );
}

export function SmallBtn({
  color,
  onClick,
  children,
  title,
  danger,
}: {
  color?: string;
  onClick?: () => void;
  children: React.ReactNode;
  title?: string;
  danger?: boolean;
}) {
  return (
    <ActionButton
      onClick={onClick}
      title={title}
      variant={danger ? "danger" : "secondary"}
      style={color ? { color } : undefined}
    >
      {children}
    </ActionButton>
  );
}

type ListGridStyle = React.CSSProperties & {
  "--admin-list-columns": string;
  "--admin-list-min-width": string;
};

export function ListTable({
  columns,
  minWidth = 760,
  header,
  children,
}: {
  columns: string;
  minWidth?: number;
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  const gridStyle: ListGridStyle = {
    "--admin-list-columns": columns,
    "--admin-list-min-width": `${minWidth}px`,
  };

  return (
    <div className={styles.listViewport}>
      <div className={styles.listStack} style={gridStyle}>
        <div className={styles.listHeader}>{header}</div>
        {children}
      </div>
    </div>
  );
}

export function ListRow({
  children,
  onOpen,
  openLabel,
  style,
}: {
  children: React.ReactNode;
  onOpen?: () => void;
  openLabel?: string;
  style?: React.CSSProperties;
}) {
  function activate(event: React.MouseEvent<HTMLDivElement>) {
    if (!onOpen) return;
    const target = event.target;
    if (target instanceof Element && target.closest(INTERACTIVE_SELECTOR))
      return;
    onOpen();
  }

  return (
    <div
      className={`${styles.listRow} ${onOpen ? styles.listRowInteractive : ""}`}
      onClick={activate}
      onKeyDown={
        onOpen
          ? (event) => {
              if (event.target !== event.currentTarget) return;
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onOpen();
              }
            }
          : undefined
      }
      role={onOpen ? "group" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      aria-label={onOpen ? openLabel : undefined}
      style={style}
    >
      {children}
    </div>
  );
}

export function ListActions({ children }: { children: React.ReactNode }) {
  return <div className={styles.listActions}>{children}</div>;
}

type ActionVariant =
  | "secondary"
  | "primary"
  | "danger"
  | "positive"
  | "warning";

const ACTION_VARIANT_CLASSES: Record<ActionVariant, string> = {
  secondary: "",
  primary: styles.actionPrimary,
  danger: styles.actionDanger,
  positive: styles.actionPositive,
  warning: styles.actionWarning,
};

export function ActionButton({
  variant = "secondary",
  className = "",
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ActionVariant;
}) {
  return (
    <button
      {...props}
      type={type}
      className={`${styles.actionButton} ${ACTION_VARIANT_CLASSES[variant]} ${className}`.trim()}
    />
  );
}

export function ActionLink({
  variant = "secondary",
  className = "",
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: ActionVariant;
}) {
  return (
    <a
      {...props}
      className={`${styles.actionLink} ${ACTION_VARIANT_CLASSES[variant]} ${className}`.trim()}
    />
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: 48,
        textAlign: "center",
        color: "var(--grey-3)",
        fontSize: 13,
      }}
    >
      {children}
    </div>
  );
}

export function Modal({
  onClose,
  children,
  maxWidth = 520,
}: {
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: number;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "var(--black-2)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-m)",
          padding: 32,
          width: "100%",
          maxWidth,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function ErrorMsg({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 12,
        color: "#ff6b6b",
        marginBottom: 16,
        padding: "8px 12px",
        background: "rgba(255,80,80,.1)",
        borderRadius: "var(--r)",
      }}
    >
      {children}
    </div>
  );
}

export function FormButtons({
  saving,
  onCancel,
  submitLabel,
}: {
  saving?: boolean;
  onCancel: () => void;
  submitLabel: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        justifyContent: "flex-end",
        marginTop: 20,
      }}
    >
      <button
        type="button"
        onClick={onCancel}
        style={{
          fontSize: 12,
          fontWeight: 600,
          padding: "8px 18px",
          background: "var(--black-3)",
          border: "1px solid var(--border-2)",
          borderRadius: "var(--r)",
          color: "var(--grey-3)",
          cursor: "pointer",
          fontFamily: "var(--font-sans)",
        }}
      >
        Annuler
      </button>
      <button
        type="submit"
        disabled={saving}
        style={{
          fontSize: 12,
          fontWeight: 600,
          padding: "8px 22px",
          background: "var(--blue)",
          border: "none",
          borderRadius: "var(--r)",
          color: "#fff",
          cursor: "pointer",
          opacity: saving ? 0.6 : 1,
          fontFamily: "var(--font-sans)",
        }}
      >
        {saving ? "..." : submitLabel}
      </button>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  count,
  onAdd,
  addLabel,
}: {
  title: string;
  subtitle?: string;
  count?: number;
  onAdd?: () => void;
  addLabel?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24,
      }}
    >
      <div>
        <h2
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "var(--white)",
            margin: 0,
          }}
        >
          {title}
          {count !== undefined && (
            <span
              style={{
                fontSize: 13,
                fontWeight: 400,
                color: "var(--grey-3)",
                marginLeft: 8,
              }}
            >
              ({count})
            </span>
          )}
        </h2>
        {subtitle && (
          <p
            style={{ fontSize: 12, color: "var(--grey-3)", margin: "4px 0 0" }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {onAdd && (
        <button
          onClick={onAdd}
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#fff",
            background: "var(--blue)",
            border: "none",
            borderRadius: "var(--r)",
            padding: "8px 18px",
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
          }}
        >
          + {addLabel || "Ajouter"}
        </button>
      )}
    </div>
  );
}

export function Badge({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) {
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 10px",
        borderRadius: 20,
        background: `${color}18`,
        color,
      }}
    >
      {children}
    </span>
  );
}

export function KpiCard({
  label,
  value,
  color = "var(--white)",
  sub,
}: {
  label: string;
  value: React.ReactNode;
  color?: string;
  sub?: string;
}) {
  return (
    <div
      style={{
        background: "var(--black-2)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: 18,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "var(--grey-3)",
          marginBottom: 6,
          textTransform: "uppercase",
          letterSpacing: ".04em",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
      {sub && (
        <div style={{ fontSize: 11, color: "var(--grey-3)", marginTop: 4 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export function TabBar({
  tabs,
  activeTab,
  onTabChange,
}: {
  tabs: { key: string; label: string; count?: number }[];
  activeTab: string;
  onTabChange: (key: string) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onTabChange(t.key)}
          style={{
            fontSize: 12,
            fontWeight: 600,
            padding: "6px 16px",
            borderRadius: "var(--r)",
            border: `1px solid ${activeTab === t.key ? "var(--blue)" : "var(--border-2)"}`,
            background:
              activeTab === t.key ? "rgba(45,111,255,.12)" : "transparent",
            color: activeTab === t.key ? "var(--blue)" : "var(--grey-3)",
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
          }}
        >
          {t.label}
          {t.count !== undefined && (
            <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.7 }}>
              ({t.count})
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────
// Composants partagés pour toutes les pages admin
// ──────────────────────────────────────────────

export const inputStyle = {
  width: "100%",
  padding: "8px 12px",
  fontSize: 13,
  background: "var(--black-3)",
  border: "1px solid var(--border-2)",
  borderRadius: "var(--r)",
  color: "var(--white)",
  outline: "none",
};

export function Field({ label, children }) {
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

export function Card({ children, onClick, hoverable }) {
  return (
    <div
      onClick={onClick}
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
          ? (e) => (e.currentTarget.style.borderColor = "var(--blue)")
          : undefined
      }
      onMouseLeave={
        hoverable
          ? (e) => (e.currentTarget.style.borderColor = "var(--border)")
          : undefined
      }
    >
      {children}
    </div>
  );
}

export function SmallBtn({ color, onClick, children, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        fontSize: 11,
        padding: "4px 10px",
        background: "var(--black-3)",
        border: "1px solid var(--border-2)",
        borderRadius: "var(--r)",
        color,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

export function Empty({ children }) {
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

export function Modal({ onClose, children, maxWidth = 520 }) {
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

export function ErrorMsg({ children }) {
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

export function FormButtons({ saving, onCancel, submitLabel }) {
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
        }}
      >
        {saving ? "..." : submitLabel}
      </button>
    </div>
  );
}

export function PageHeader({ title, subtitle, count, onAdd, addLabel }) {
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
            style={{
              fontSize: 12,
              color: "var(--grey-3)",
              margin: "4px 0 0",
            }}
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
          }}
        >
          + {addLabel || "Ajouter"}
        </button>
      )}
    </div>
  );
}

export function Badge({ color, children }) {
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

export function TabBar({ tabs, activeTab, onTabChange }) {
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
            border: `1px solid ${
              activeTab === t.key ? "var(--blue)" : "var(--border-2)"
            }`,
            background:
              activeTab === t.key ? "rgba(45,111,255,.12)" : "transparent",
            color: activeTab === t.key ? "var(--blue)" : "var(--grey-3)",
            cursor: "pointer",
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function StatBadge({ label, value, color }) {
  return (
    <div
      style={{
        background: "var(--black-2)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r)",
        padding: "8px 16px",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span style={{ fontSize: 11, color: "var(--grey-3)" }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

export function FilterBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "5px 12px",
        borderRadius: "var(--r)",
        border: `1px solid ${active ? "var(--blue)" : "var(--border-2)"}`,
        background: active ? "rgba(45,111,255,.12)" : "transparent",
        color: active ? "var(--blue)" : "var(--grey-3)",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

export function InfoItem({ label, value }) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: "var(--grey-3)",
          textTransform: "uppercase",
          letterSpacing: ".05em",
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 13,
          color: value ? "var(--white)" : "var(--grey-3)",
        }}
      >
        {value || "—"}
      </div>
    </div>
  );
}

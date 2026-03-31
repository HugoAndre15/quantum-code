"use client";

export default function AdminModal({ open, onClose, onToast }) {
  if (!open) return null;

  return (
    <div
      className={`admin-overlay${open ? " open" : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="admin-modal">
        <button className="admin-close" onClick={onClose}>
          ✕
        </button>
        <div className="admin-modal-logo">
          Quantum <b>Code</b>
        </div>
        <div className="admin-modal-title">Espace Admin</div>
        <div className="admin-modal-sub">
          Accès réservé. Connectez-vous pour gérer votre contenu.
        </div>
        <div className="admin-form">
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              placeholder="admin@quantumcode.dev"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Mot de passe</label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
            />
          </div>
          <button
            className="btn btn-blue"
            style={{ width: "100%", padding: 14, marginTop: 4 }}
            onClick={() => {
              onToast?.("Connexion réussie !");
              onClose();
            }}
          >
            Se connecter
          </button>
        </div>
      </div>
    </div>
  );
}

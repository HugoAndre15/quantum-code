"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import {
  ActionButton,
  Badge,
  Empty,
  ListActions,
  ListRow,
  ListTable,
  PageHeader,
  TabBar,
} from "@/app/admin/components/SharedUI";

const API = "/api";

type ClientStatus =
  | "A_CONTACTER"
  | "CONTACTE"
  | "DEVIS"
  | "FACTURE"
  | "EN_COURS"
  | "TERMINE"
  | "REFUSE";

interface Client {
  id: string;
  company: string;
  contactName: string;
  email?: string;
  phone?: string;
  status: ClientStatus;
  trade: string;
  budget?: number;
  contactDate: string;
}

const STATUS_COLORS: Record<ClientStatus, string> = {
  A_CONTACTER: "#aaa",
  CONTACTE: "var(--blue)",
  DEVIS: "var(--gold)",
  FACTURE: "#f07d2d",
  EN_COURS: "var(--green)",
  TERMINE: "#5D8AFF",
  REFUSE: "#ff6b6b",
};

const STATUS_LABELS: Record<ClientStatus, string> = {
  A_CONTACTER: "À contacter",
  CONTACTE: "Contacté",
  DEVIS: "Devis",
  FACTURE: "Facturé",
  EN_COURS: "En cours",
  TERMINE: "Terminé",
  REFUSE: "Refusé",
};

const TABS = [
  { key: "all", label: "Tous" },
  { key: "A_CONTACTER", label: "À contacter" },
  { key: "CONTACTE", label: "Contactés" },
  { key: "DEVIS", label: "Devis" },
  { key: "EN_COURS", label: "En cours" },
  { key: "TERMINE", label: "Terminés" },
];

export default function ClientsPage() {
  const { apiFetch } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");

  const load = useCallback(async () => {
    const res = await apiFetch(`${API}/clients`);
    if (res.ok) setClients(await res.json());
    setLoading(false);
  }, [apiFetch]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered =
    tab === "all" ? clients : clients.filter((c) => c.status === tab);

  const tabsWithCounts = TABS.map((t) => ({
    ...t,
    count:
      t.key === "all"
        ? clients.length
        : clients.filter((c) => c.status === t.key).length,
  }));

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle="Gestion de la base clients"
        count={filtered.length}
        onAdd={() => router.push("/admin/crm/clients/new")}
        addLabel="Nouveau client"
      />

      <TabBar tabs={tabsWithCounts} activeTab={tab} onTabChange={setTab} />

      {loading ? (
        <div
          style={{ padding: 40, textAlign: "center", color: "var(--grey-3)" }}
        >
          Chargement...
        </div>
      ) : filtered.length === 0 ? (
        <Empty>Aucun client</Empty>
      ) : (
        <ListTable
          columns="minmax(260px, 1fr) 120px 140px 90px 100px"
          minWidth={790}
          header={
            <>
              <span>Entreprise / Contact</span>
              <span>Secteur</span>
              <span>Statut</span>
              <span>Budget</span>
              <span style={{ textAlign: "right" }}>Actions</span>
            </>
          }
        >
          {filtered.map((client) => (
            <ListRow
              key={client.id}
              onOpen={() => router.push(`/admin/crm/clients/${client.id}`)}
              openLabel={`Ouvrir le client ${client.company}`}
            >
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--white)",
                  }}
                >
                  {client.company}
                </div>
                <div
                  style={{ fontSize: 11, color: "var(--grey-3)", marginTop: 2 }}
                >
                  {client.contactName}
                  {client.email && ` · ${client.email}`}
                </div>
              </div>
              <span style={{ fontSize: 12, color: "var(--grey-2)" }}>
                {client.trade || "—"}
              </span>
              <Badge color={STATUS_COLORS[client.status]}>
                {STATUS_LABELS[client.status]}
              </Badge>
              <span
                style={{
                  fontSize: 13,
                  color: client.budget ? "var(--gold)" : "var(--grey-3)",
                }}
              >
                {client.budget ? `${client.budget}€` : "—"}
              </span>
              <ListActions>
                <ActionButton
                  variant="primary"
                  onClick={() => router.push(`/admin/crm/clients/${client.id}`)}
                >
                  Ouvrir →
                </ActionButton>
              </ListActions>
            </ListRow>
          ))}
        </ListTable>
      )}
    </div>
  );
}

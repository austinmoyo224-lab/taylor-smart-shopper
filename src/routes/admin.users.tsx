import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listUsers, setUserRole, listOrganisations } from "@/lib/admin.functions";
import { useState } from "react";

type Role =
  | "super_admin"
  | "retailer_admin"
  | "store_manager"
  | "staff"
  | "subscriber";

const ROLES: Role[] = [
  "super_admin",
  "retailer_admin",
  "store_manager",
  "staff",
  "subscriber",
];

export const Route = createFileRoute("/admin/users")({
  ssr: false,
  component: UsersPage,
});

function UsersPage() {
  const qc = useQueryClient();
  const users = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => listUsers(),
  });
  const orgs = useQuery({
    queryKey: ["admin", "orgs"],
    queryFn: () => listOrganisations(),
  });
  const [error, setError] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: (v: {
      userId: string;
      role: Role;
      grant: boolean;
      organisationId?: string | null;
    }) => setUserRole({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="flex-1 overflow-y-auto px-8 py-10">
      <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">
        Access
      </p>
      <h1
        className="mb-8 text-4xl italic tracking-tight"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Users & roles
      </h1>

      {error && (
        <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}

      <div className="space-y-3">
        {users.isLoading && <p className="text-sm text-muted">Loading…</p>}
        {(users.data ?? []).map((u) => (
          <UserRow
            key={u.id}
            user={u}
            orgs={orgs.data ?? []}
            onToggle={(role, grant, orgId) => {
              setError(null);
              mut.mutate({
                userId: u.id,
                role,
                grant,
                organisationId: orgId,
              });
            }}
          />
        ))}
      </div>
    </div>
  );
}

function UserRow({
  user,
  orgs,
  onToggle,
}: {
  user: {
    id: string;
    email: string | null;
    display_name: string | null;
    first_name: string | null;
    roles: { role: Role; organisation_id: string | null }[];
  };
  orgs: { id: string; name: string }[];
  onToggle: (role: Role, grant: boolean, orgId: string | null) => void;
}) {
  const has = (r: Role) => user.roles.some((x) => x.role === r);

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">
            {user.display_name || user.first_name || user.email || "Subscriber"}
          </p>
          <p className="font-mono text-[10px] text-muted">
            {user.email ?? user.id.slice(0, 8)}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {user.roles.map((r, i) => (
            <span
              key={i}
              className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary"
            >
              {r.role.replace("_", " ")}
            </span>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {ROLES.map((r) => {
          const active = has(r);
          return (
            <button
              key={r}
              onClick={() => onToggle(r, !active, null)}
              className={
                "rounded-full border px-3 py-1 text-[11px] transition " +
                (active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted hover:text-foreground")
              }
            >
              {active ? "✓ " : "+ "}
              {r.replace("_", " ")}
            </button>
          );
        })}
      </div>
      {orgs.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-[11px] text-muted hover:text-foreground">
            Scope a retailer or staff role to an organisation
          </summary>
          <ScopedRoleAssigner
            orgs={orgs}
            onGrant={(role, orgId) => onToggle(role, true, orgId)}
          />
        </details>
      )}
    </div>
  );
}

function ScopedRoleAssigner({
  orgs,
  onGrant,
}: {
  orgs: { id: string; name: string }[];
  onGrant: (role: Role, orgId: string) => void;
}) {
  const [role, setRole] = useState<Role>("retailer_admin");
  const [orgId, setOrgId] = useState<string>(orgs[0]?.id ?? "");
  return (
    <div className="mt-2 flex flex-wrap items-end gap-2">
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as Role)}
        className="rounded-lg border border-border bg-background px-3 py-2 text-xs"
      >
        <option value="retailer_admin">Retailer admin</option>
        <option value="store_manager">Store manager</option>
        <option value="staff">Staff</option>
      </select>
      <select
        value={orgId}
        onChange={(e) => setOrgId(e.target.value)}
        className="rounded-lg border border-border bg-background px-3 py-2 text-xs"
      >
        {orgs.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => orgId && onGrant(role, orgId)}
        className="rounded-full bg-primary px-3 py-1.5 text-[11px] text-primary-foreground"
      >
        Grant
      </button>
    </div>
  );
}
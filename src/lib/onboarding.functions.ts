import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const startSchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and hyphens only"),
  type: z.enum(["retail_group", "brand", "partner", "independent"]).default("independent"),
  country_code: z.string().length(2).default("ZA"),
  default_currency: z.string().length(3).default("ZAR"),
  contact_email: z.string().email().optional().or(z.literal("")),
});

/**
 * Self-service retailer onboarding: creates a fresh organisation and grants
 * the caller `retailer_admin` on it. Guarded so a user cannot bootstrap a
 * second org this way once they already have retailer access somewhere.
 */
export const startRetailerOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => startSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin
      .from("user_roles")
      .select("role, organisation_id")
      .eq("user_id", context.userId);
    const hasRetailer = (existing ?? []).some(
      (r) => r.role === "retailer_admin" && r.organisation_id,
    );
    if (hasRetailer) {
      throw new Error(
        "You already have a retailer account. Ask a super admin to add another organisation.",
      );
    }

    const { data: slugTaken } = await supabaseAdmin
      .from("organisations")
      .select("id")
      .eq("slug", data.slug)
      .maybeSingle();
    if (slugTaken) throw new Error("That URL slug is already taken.");

    const { data: org, error: orgErr } = await supabaseAdmin
      .from("organisations")
      .insert({
        name: data.name,
        slug: data.slug,
        type: data.type,
        country_code: data.country_code,
        default_currency: data.default_currency,
        contact_email: data.contact_email || null,
      })
      .select("id")
      .single();
    if (orgErr) throw new Error(orgErr.message);

    const { error: roleErr } = await supabaseAdmin.from("user_roles").insert({
      user_id: context.userId,
      role: "retailer_admin",
      organisation_id: org.id,
    });
    if (roleErr) throw new Error(roleErr.message);

    return { organisationId: org.id };
  });

const bulkSchema = z.object({
  organisation_id: z.string().uuid(),
  products: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(200),
        slug: z
          .string()
          .trim()
          .min(2)
          .max(120)
          .regex(/^[a-z0-9-]+$/),
        sku: z.string().trim().max(80).optional(),
        unit: z.string().trim().max(20).optional(),
        unit_amount: z.number().nonnegative().optional().nullable(),
        base_price: z.number().nonnegative().optional().nullable(),
        currency_code: z.string().length(3).default("ZAR"),
      }),
    )
    .min(1)
    .max(200),
});

export const bulkImportProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => bulkSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role, organisation_id")
      .eq("user_id", context.userId);
    const allowed = (roles ?? []).some(
      (r) =>
        r.role === "super_admin" ||
        ((r.role === "retailer_admin" || r.role === "store_manager") &&
          r.organisation_id === data.organisation_id),
    );
    if (!allowed) throw new Error("Forbidden: no access to this organisation");

    const rows = data.products.map((p) => ({
      organisation_id: data.organisation_id,
      name: p.name,
      slug: p.slug,
      sku: p.sku || null,
      unit: p.unit || null,
      unit_amount: p.unit_amount ?? null,
      base_price: p.base_price ?? null,
      currency_code: p.currency_code,
    }));

    const { data: inserted, error } = await supabaseAdmin
      .from("products")
      .insert(rows)
      .select("id");
    if (error) throw new Error(error.message);
    return { count: inserted?.length ?? 0 };
  });
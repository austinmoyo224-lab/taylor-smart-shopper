import { useRef, useState } from "react";
import { Upload, X, ImagePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { signStoreAssetUrl } from "@/lib/portal.functions";

/** Reusable image uploader that stores files in the private `store-assets`
 *  bucket and returns a long-lived signed URL. Use for store logos, hero
 *  images, promotion artwork and campaign banners. */
export function StoreImageUploader({
  organisationId,
  storeId,
  folder,
  value,
  onChange,
  label,
  aspect = "square",
  accept = "image/*",
  className,
}: {
  organisationId: string;
  storeId?: string | null;
  folder: string; // e.g. "logos", "hero", "promotions", "campaigns"
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  label: string;
  aspect?: "square" | "wide" | "tall";
  accept?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    setUploading(true);
    setError(null);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const scope = storeId ?? "shared";
      const path = `${organisationId}/${scope}/${folder}/${Date.now()}-${safe}`;
      const { error: upErr } = await supabase.storage
        .from("store-assets")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      const { url } = await signStoreAssetUrl({
        data: { organisation_id: organisationId, path },
      });
      onChange(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const aspectCls =
    aspect === "wide" ? "aspect-[3/1]" : aspect === "tall" ? "aspect-[3/4]" : "aspect-square";

  return (
    <div className={className}>
      <span className="mb-1 block text-[11px] font-medium text-muted">{label}</span>
      <div
        className={`relative flex ${aspectCls} w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-background`}
      >
        {value ? (
          <>
            <img src={value} alt={label} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute right-2 top-2 rounded-full bg-background/90 p-1 text-muted shadow hover:text-destructive"
              aria-label="Remove image"
            >
              <X className="size-3.5" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center gap-2 px-4 py-6 text-xs text-muted hover:text-foreground"
          >
            <ImagePlus className="size-6 text-primary/70" />
            <span>Click to upload</span>
            <span className="text-[10px]">PNG, JPG, WEBP up to 20MB</span>
          </button>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-[11px] hover:bg-accent disabled:opacity-60"
        >
          <Upload className="size-3" />
          {uploading ? "Uploading…" : value ? "Replace" : "Upload file"}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded-full border border-border px-3 py-1 text-[11px] hover:bg-accent"
          >
            Remove
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => pick(e.target.files)}
      />
      {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
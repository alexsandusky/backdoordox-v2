
# BackdoorDox — Watermarking MVP (React + Next.js)

A minimal, Vercel-ready prototype that:

- Adds **OCR-friendly** watermark overlays to PDFs (client-side via `pdf-lib`)
- Generates **read-only, tracked links** (gated by **business email**)
- Logs every access (IP, UA, fingerprint, country when available)
- Computes a basic **risk score** (IP/country churn & bursts)
- Streams PDFs through an iframe with toolbar hidden to discourage casual downloads

> ⚠️ MVP only. Security controls are simplified. For production, add signed URLs, email verification, org-allowlists, true device fingerprinting, and stronger anti-download measures (e.g., PDF.js with disabled toolbar + obfuscation + watermarking per session).

---

## 1) Local dev

```bash
pnpm i   # or npm i / yarn
pnpm dev # http://localhost:3000
```

## 2) Deploy on Vercel

1. Create a new Vercel project, import this repo.
2. Provision **Vercel Blob** and **Vercel KV** (Redis).
3. Add environment variables:
   - `BLOB_READ_WRITE_TOKEN` — from Vercel Blob
   - `KV_REST_API_URL`, `KV_REST_API_TOKEN` — from Vercel KV
   - `NEXT_PUBLIC_APP_URL` — e.g. `https://your-app.vercel.app`
4. Deploy.

## 3) How it works

- `/watermark` performs watermarking **in the browser** and offers both:
  - **Download** of the watermarked PDF
  - **Upload** to server (`/api/upload`) → stored in **Vercel Blob** → a viewer link is created
- `/view/[id]` enforces **business email** gate, logs access to **Vercel KV**, then renders an `<iframe>` streaming the PDF from `/api/stream?id=...` with toolbar hidden.
- `/activity` lists your links with **basic risk** flags.

## 4) Notes on OCR

- Watermark is drawn as **vector text** at low opacity (no rasterization), keeping the underlying PDF text layer readable to common OCR engines.
- Avoid placing giant opaque images; keep overlays subtle and diagonal.

## 5) Security & tracking to do (production)

- Sign-in + organizations and roles
- Email verification & magic links (Resend)
- Per-open, per-user **personalized watermark**
- Replace `<iframe>` with **PDF.js**-based viewer (toolbar disabled, custom UI)
- **Country/IP reputation** feeds for better risk scoring
- Automated alerts on suspicious access

---

Made for rapid iteration and pitching. Clean, modern UI using Tailwind.

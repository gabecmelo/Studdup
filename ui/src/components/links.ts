// Pure link-validity check (spec edge case + security). A card link is "openable" when it is an
// http/https URL or an absolute local file path; anything else (free text, a bare word, a relative
// fragment) is shown greyed as "não-abrível" in `LinkRow`. The backend re-verifies that a file
// actually exists and guards `open` to http/https/existing-file before ever launching it — this is
// the client-side approximation that drives the visual state only.

/** Whether `raw` looks like something the OS default handler could open. */
export function isOpenableLink(raw: string): boolean {
  const s = raw.trim();
  if (!s) return false;

  // http/https URL — the common case.
  if (/^https?:\/\//i.test(s)) {
    try {
      const url = new URL(s);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }

  // Absolute local file references (existence verified server-side at open time).
  if (/^file:\/\//i.test(s)) return true;
  if (/^[a-zA-Z]:[\\/]/.test(s)) return true; // Windows drive path, e.g. C:\notes\x.pdf
  if (s.startsWith("/")) return true; // POSIX absolute path

  return false;
}

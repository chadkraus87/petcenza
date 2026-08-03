import { supabase } from './supabase'

/**
 * Ask the scan-upload edge function to verify a just-uploaded file's magic bytes. If the content
 * doesn't match a genuine allowed type, the function has already removed the object and its DB
 * row server-side; we return ok:false so the UI can surface it. A scan/network failure is treated
 * as not-ok (fail closed) but the file/row are left for a later sweep rather than assumed bad.
 */
export async function scanUpload(bucket: string, path: string): Promise<{ ok: boolean; reason?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('scan-upload', { body: { bucket, path } })
    if (error) return { ok: false, reason: 'scan_unavailable' }
    return data as { ok: boolean; reason?: string }
  } catch {
    return { ok: false, reason: 'scan_unavailable' }
  }
}

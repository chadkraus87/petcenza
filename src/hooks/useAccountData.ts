import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/**
 * Data portability and account closure.
 *
 * Both are legal requirements (GDPR Art. 17/20, several US state acts, App Store 5.1.1(v)), but
 * export is also the thing that makes charging for this product defensible: nobody should have to
 * keep paying to get their pet's medical history back out.
 */

interface ExportBundle {
  exported_at: string
  format_version: number
  photos?: { storage_path: string }[]
  documents?: { storage_path: string; file_name?: string }[]
  [key: string]: unknown
}

/**
 * Download everything as a single JSON file.
 *
 * The JSON carries every record. Uploaded files live in Storage, so the bundle also lists them
 * with freshly signed, time-limited URLs — enough for the owner to pull each file down without
 * us streaming a multi-hundred-megabyte zip through the browser.
 */
export function useExportAccount() {
  return useMutation({
    mutationFn: async (): Promise<{ filename: string; records: number; files: number }> => {
      const { data, error } = await supabase.rpc('export_my_account')
      if (error) throw error
      const bundle = data as ExportBundle

      const photoPaths = (bundle.photos ?? []).map(p => p.storage_path)
      const docPaths = (bundle.documents ?? []).map(d => d.storage_path)

      // Sign in one batch per bucket. These expire in 24h, which is long enough to finish a
      // download on a slow connection and short enough not to be a lasting capability.
      const [photoUrls, docUrls] = await Promise.all([
        photoPaths.length
          ? supabase.storage.from('pet-photos').createSignedUrls(photoPaths, 86_400)
          : Promise.resolve({ data: [] }),
        docPaths.length
          ? supabase.storage.from('pet-documents').createSignedUrls(docPaths, 86_400)
          : Promise.resolve({ data: [] })
      ])

      const withUrls = {
        ...bundle,
        _readme:
          'This is your complete PetCenza export. Every record you can see in the app is in this ' +
          'file. The download_url on each photo and document expires 24 hours after export — ' +
          're-export any time to get fresh links.',
        photos: (bundle.photos ?? []).map((p, i) => ({
          ...p, download_url: photoUrls.data?.[i]?.signedUrl ?? null
        })),
        documents: (bundle.documents ?? []).map((d, i) => ({
          ...d, download_url: docUrls.data?.[i]?.signedUrl ?? null
        }))
      }

      const stamp = new Date().toISOString().slice(0, 10)
      const filename = `petcenza-export-${stamp}.json`
      const blob = new Blob([JSON.stringify(withUrls, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)

      // Rough count of actual records, for the confirmation message.
      const records = Object.entries(bundle)
        .filter(([, v]) => Array.isArray(v))
        .reduce((n, [, v]) => n + (v as unknown[]).length, 0)

      return { filename, records, files: photoPaths.length + docPaths.length }
    }
  })
}

export interface DeleteAccountResult {
  ok: true
  petsDeleted: number
  filesRemoved: number
}

/**
 * Close the account permanently.
 *
 * `confirmEmail` must match the signed-in address; the backend re-checks it, so a mis-wired
 * button can't close an account on its own. Co-owned pets are handed to the co-owner rather than
 * destroyed — see the delete_my_account() migration for the full rules.
 */
export function useDeleteAccount() {
  return useMutation({
    mutationFn: async (confirmEmail: string): Promise<DeleteAccountResult> => {
      const { data, error } = await supabase.functions.invoke('delete-account', {
        body: { confirmEmail }
      })
      if (error) {
        const ctx = (error as { context?: Response }).context
        const parsed = ctx ? await ctx.json().catch(() => null) : null
        if (parsed?.error === 'confirmation_mismatch') {
          throw new Error("That doesn't match the email on this account.")
        }
        throw new Error('Could not delete the account. Please try again, or contact support.')
      }
      return data as DeleteAccountResult
    }
  })
}

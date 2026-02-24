/**
 * Upload a file to Supabase Storage. Returns the public URL for the stored file.
 * Bucket must exist and be public, or use a policy that allows read for authenticated users.
 *
 * Large files: Standard uploads support up to 5GB per file. For very large files or
 * unreliable networks, Supabase supports resumable (TUS) uploads—see Supabase docs.
 * Increase the bucket file size limit in Dashboard → Storage → Configuration if needed.
 */

const BUCKET = 'uploads'

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseClient
 * @param {string} folder - e.g. 'kyc' or 'policy'
 * @param {File} file
 * @returns {Promise<string>} public URL of the uploaded file
 */
export async function uploadFile(supabaseClient, folder, file) {
  if (!file || !file.name) throw new Error('No file selected')
  const ext = file.name.split('.').pop() || ''
  const path = `${folder}/${crypto.randomUUID()}${ext ? `.${ext}` : ''}`

  const { error } = await supabaseClient.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  })
  if (error) throw error

  const { data: { publicUrl } } = supabaseClient.storage.from(BUCKET).getPublicUrl(path)
  return publicUrl
}

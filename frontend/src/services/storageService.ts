import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export const storageService = {
  bucket: 'product-images',

  validate(file: File) {
    const okTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
    if (!okTypes.includes(file.type)) return 'Only JPG, PNG, WebP or AVIF images are allowed.'
    if (file.size > 5 * 1024 * 1024) return 'Image must be under 5MB.'
    return null
  },

  async upload(file: File, folder = 'products') {
    if (!isSupabaseConfigured) throw new Error('Storage not configured')
    const err = this.validate(file)
    if (err) throw new Error(err)
    const ext = file.name.split('.').pop()
    const path = `${folder}/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from(this.bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })
    if (error) throw error
    const { data } = supabase.storage.from(this.bucket).getPublicUrl(path)
    return { url: data.publicUrl, path }
  },

  async remove(path: string) {
    await supabase.storage.from(this.bucket).remove([path])
  },
}

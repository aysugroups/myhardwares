import { useQuery } from '@tanstack/react-query'
import { Star, Eye, EyeOff, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { reviewService } from '@/services/reviewService'
import { Rating } from '@/components/ui/Rating'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate } from '@/lib/utils'

export default function AdminReviews() {
  const { data: reviews = [], refetch } = useQuery({ queryKey: ['admin-reviews'], queryFn: () => reviewService.all() })
  const toggle = async (r: any) => { await reviewService.setVisibility(r.id, !r.is_visible); toast.success(r.is_visible ? 'Review hidden' : 'Review shown'); refetch() }
  const del = async (r: any) => { if (!confirm('Delete this review?')) return; await reviewService.remove(r.id); toast.success('Deleted'); refetch() }

  return (
    <div>
      <h1 className="font-heading font-bold text-2xl md:text-3xl tracking-tight mb-6">Reviews</h1>
      {reviews.length === 0 ? <EmptyState icon={Star} title="No reviews yet" description="Verified customer reviews will appear here." /> : (
        <div className="space-y-4">
          {reviews.map((r: any) => (
            <div key={r.id} className="card p-5" data-testid={`review-${r.id}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap"><Rating value={r.rating} showCount={false} /><span className="font-semibold text-sm">{r.profile?.full_name || 'Customer'}</span>{r.is_verified && <span className="chip bg-green-100 text-green-700 text-[10px]">Verified</span>}{!r.is_visible && <span className="chip bg-gray-200 text-gray-600 text-[10px]">Hidden</span>}</div>
                  <p className="text-sm text-ink-muted mt-1">on <strong className="text-ink">{r.product?.name}</strong> • {formatDate(r.created_at)}</p>
                  {r.title && <p className="font-semibold mt-2">{r.title}</p>}
                  <p className="text-ink-muted mt-1">{r.comment}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => toggle(r)} className="p-2 rounded-lg hover:bg-warm text-ink-muted" data-testid={`toggle-review-${r.id}`}>{r.is_visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                  <button onClick={() => del(r)} className="p-2 rounded-lg hover:bg-warm text-red-500" data-testid={`delete-review-${r.id}`}><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

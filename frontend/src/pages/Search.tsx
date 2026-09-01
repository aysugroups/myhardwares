import { useSearchParams } from 'react-router-dom'
import { Seo } from '@/components/common/Seo'
import { ProductListing } from '@/components/product/ProductListing'
import { EmptyState } from '@/components/ui/EmptyState'
import { Search as SearchIcon } from 'lucide-react'

export default function Search() {
  const [params] = useSearchParams()
  const q = params.get('q') || ''
  if (!q) {
    return (
      <div className="container-x">
        <EmptyState icon={SearchIcon} title="Search MY HARDWARES" description="Type a product name, SKU or brand in the search bar above." />
      </div>
    )
  }
  return (
    <>
      <Seo title={`Search: ${q}`} />
      <ProductListing key={q} base={{ search: q }} title={`Results for "${q}"`} />
    </>
  )
}

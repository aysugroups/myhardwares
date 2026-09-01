import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Seo } from '@/components/common/Seo'
import { ProductListing } from '@/components/product/ProductListing'
import { categoryService } from '@/services/categoryService'

export default function CategoryProducts() {
  const { slug = '' } = useParams()
  const { data: category } = useQuery({ queryKey: ['category', slug], queryFn: () => categoryService.getBySlug(slug) })
  const title = category?.name || 'Category'
  return (
    <>
      <Seo title={title} description={category?.description} />
      <ProductListing key={slug} base={{ categorySlug: slug }} title={title} showCategoryFilter={false} />
    </>
  )
}

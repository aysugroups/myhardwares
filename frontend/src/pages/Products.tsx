import { Seo } from '@/components/common/Seo'
import { ProductListing } from '@/components/product/ProductListing'

export default function Products() {
  return (
    <>
      <Seo title="All Products" />
      <ProductListing title="All Products" />
    </>
  )
}

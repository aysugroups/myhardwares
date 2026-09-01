import { Seo } from '@/components/common/Seo'
import { ProductListing } from '@/components/product/ProductListing'

export default function Deals() {
  return (
    <>
      <Seo title="Premium Deals" />
      <ProductListing base={{ onSale: true }} title="Premium Deals" />
    </>
  )
}

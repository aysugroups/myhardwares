import { Link } from 'react-router-dom'
import { Seo } from '@/components/common/Seo'

export default function NotFound() {
  return (
    <div className="container-x py-24 text-center">
      <Seo title="Page Not Found" />
      <p className="font-heading font-bold text-8xl text-brand">404</p>
      <h1 className="font-heading font-bold text-2xl md:text-3xl mt-4">Page not found</h1>
      <p className="text-ink-muted mt-2">The page you're looking for doesn't exist or has moved.</p>
      <Link to="/" className="btn-primary mt-8 inline-flex">Back to Home</Link>
    </div>
  )
}

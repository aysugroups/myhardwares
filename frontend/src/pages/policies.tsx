import { Seo } from '@/components/common/Seo'

const CONTENT: Record<string, { title: string; body: string[] }> = {
  privacy: {
    title: 'Privacy Policy',
    body: [
      'We respect your privacy and are committed to protecting your personal data. This policy explains how MY HARDWARES collects, uses and safeguards your information.',
      'We collect information you provide during account creation, checkout and support requests, including name, email, phone and delivery address.',
      'Payment information is processed securely via UPI and verified order channels. We never store your card or bank credentials on our servers.',
      'Your data is used solely to process orders, provide support and improve your experience. We do not sell your personal information.',
      'You may request access to or deletion of your data at any time by contacting support@myhardwares.com.',
    ],
  },
  terms: {
    title: 'Terms & Conditions',
    body: [
      'By using the MY HARDWARES website you agree to these terms. Please read them carefully.',
      'All products are subject to availability. Prices and offers may change without prior notice.',
      'Orders are confirmed only after successful payment verification. We reserve the right to cancel orders in case of pricing errors or suspected fraud.',
      'Product images are for reference; actual products may vary slightly in appearance.',
      'All disputes are subject to the jurisdiction of Indian courts.',
    ],
  },
  shipping: {
    title: 'Shipping Policy',
    body: [
      'We ship across India. Orders are typically dispatched within 24–48 hours of confirmation.',
      'Standard delivery takes 3–5 business days depending on your location.',
      'Free shipping is available on eligible orders above the configured threshold. Otherwise a nominal shipping fee applies, shown at checkout.',
      'You will receive a tracking number once your order ships. Track anytime from the Track Order page.',
    ],
  },
  refund: {
    title: 'Refund Policy',
    body: [
      'Eligible products can be returned within 7 days of delivery in original, unused condition with packaging intact.',
      'To initiate a return, contact support@myhardwares.com with your order number.',
      'Once the returned item is received and inspected, refunds are processed to the original payment method within 5–7 business days.',
      'Certain items may be non-returnable for hygiene or safety reasons; this is indicated on the product page.',
    ],
  },
}

export function PolicyPage({ type }: { type: keyof typeof CONTENT }) {
  const c = CONTENT[type]
  return (
    <>
      <Seo title={c.title} />
      <div className="container-x py-10 md:py-16 max-w-3xl">
        <h1 className="font-heading font-bold text-3xl md:text-4xl tracking-tight mb-6">{c.title}</h1>
        <div className="space-y-4 text-ink-muted leading-relaxed">
          {c.body.map((p, i) => <p key={i}>{p}</p>)}
        </div>
        <p className="text-sm text-ink-muted mt-8">Last updated: {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
      </div>
    </>
  )
}

export const Privacy = () => <PolicyPage type="privacy" />
export const Terms = () => <PolicyPage type="terms" />
export const Shipping = () => <PolicyPage type="shipping" />
export const Refund = () => <PolicyPage type="refund" />

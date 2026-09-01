import { Helmet } from 'react-helmet-async'

interface Props {
  title?: string
  description?: string
  image?: string
  jsonLd?: object
}

export function Seo({ title, description, image, jsonLd }: Props) {
  const fullTitle = title ? `${title} | MY HARDWARES` : 'MY HARDWARES — Premium Hardware Store'
  const desc = description || 'Shop premium locks, fittings, kitchen & architectural hardware and tools.'
  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      {image && <meta property="og:image" content={image} />}
      {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
    </Helmet>
  )
}

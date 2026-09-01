import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

// Lightweight IntersectionObserver reveal wrapper (GPU-friendly, respects reduced motion via CSS).
export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = 'div',
}: {
  children: React.ReactNode
  className?: string
  delay?: number
  as?: any
}) {
  const ref = useRef<HTMLElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          obs.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <Tag ref={ref} className={cn('reveal', visible && 'is-visible', className)} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </Tag>
  )
}

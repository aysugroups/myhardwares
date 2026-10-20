let loaded = false
let loadingPromise: Promise<boolean> | null = null

export function loadRazorpay(): Promise<boolean> {
  if (typeof window !== 'undefined' && typeof (window as any).Razorpay === 'function') {
    loaded = true
    return Promise.resolve(true)
  }

  if (loadingPromise) {
    return loadingPromise
  }

  loadingPromise = new Promise<boolean>((resolve) => {
    if (typeof document === 'undefined') {
      loadingPromise = null
      return resolve(false)
    }

    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]') as HTMLScriptElement | null
    if (existing && loaded && typeof (window as any).Razorpay === 'function') {
      return resolve(true)
    }
    if (existing && !loaded) {
      existing.remove()
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true

    const timer = setTimeout(() => {
      loadingPromise = null
      resolve(false)
    }, 15000)

    script.onload = () => {
      clearTimeout(timer)
      loaded = typeof (window as any).Razorpay === 'function'
      if (!loaded) loadingPromise = null
      resolve(loaded)
    }

    script.onerror = () => {
      clearTimeout(timer)
      loaded = false
      loadingPromise = null
      script.remove()
      resolve(false)
    }

    document.body.appendChild(script)
  })

  return loadingPromise
}

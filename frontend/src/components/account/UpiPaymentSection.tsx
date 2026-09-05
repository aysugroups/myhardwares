import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { QrCode, CheckCircle2, MessageCircle, Copy, Check, Clock, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { settingsService } from '@/services/settingsService'
import { orderService } from '@/services/orderService'
import { formatINR } from '@/lib/utils'

interface Props {
  order: any
  onConfirmed?: () => void
}

export function UpiPaymentSection({ order, onConfirmed }: Props) {
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: () => settingsService.get() })
  const [copied, setCopied] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [confirmedLocally, setConfirmedLocally] = useState(order.payment_confirmation_requested || false)

  const upiId = settings?.upi_id || ''
  const qrUrl = settings?.upi_qr_url || ''
  const isPaid = order.payment_status === 'paid'

  const copyUpi = () => {
    if (!upiId) return
    navigator.clipboard.writeText(upiId)
    setCopied(true)
    toast.success('UPI ID copied to clipboard')
    setTimeout(() => setCopied(false), 2500)
  }

  const handleHavePaid = async () => {
    setSubmitting(true)
    try {
      await orderService.requestPaymentConfirmation(order.id)
      setConfirmedLocally(true)
      toast.success('Payment confirmation request submitted! Our team will verify your payment shortly.')
      onConfirmed?.()
    } catch (e: any) {
      toast.error(e.message || 'Could not submit confirmation')
    } finally {
      setSubmitting(false)
    }
  }

  const openWhatsApp = () => {
    const url = orderService.generateWhatsAppOrderUrl(order)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  if (isPaid) {
    return (
      <div className="card p-6 bg-green-50/50 border-green-200">
        <div className="flex items-center gap-3 text-green-700">
          <CheckCircle2 className="w-6 h-6 shrink-0" />
          <div>
            <p className="font-heading font-semibold text-lg">Payment Verified</p>
            <p className="text-sm text-green-600">Your UPI payment of {formatINR(order.total)} has been verified. Your order is in processing.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6 space-y-6 border-brand/20 shadow-sm" data-testid="upi-payment-section">
      <div className="flex items-center justify-between border-b border-line pb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-light flex items-center justify-center text-brand">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-lg text-ink">Pay via UPI</h3>
            <p className="text-xs text-ink-muted">Scan QR or use UPI ID to complete your order</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs text-ink-muted block">Amount Payable</span>
          <span className="font-heading font-bold text-xl text-ink" data-testid="upi-amount">{formatINR(order.total)}</span>
        </div>
      </div>

      {/* QR Code / Placeholder */}
      <div className="flex flex-col items-center justify-center text-center p-6 bg-warm rounded-2xl border border-line">
        {qrUrl ? (
          <div className="bg-white p-3 rounded-2xl shadow-sm border border-line inline-block mb-3">
            <img src={qrUrl} alt="MY HARDWARES UPI QR Code" className="w-52 h-52 object-contain rounded-xl" data-testid="upi-qr-image" />
          </div>
        ) : (
          <div className="p-6 bg-white rounded-2xl border-2 border-dashed border-amber-300 text-center max-w-sm mb-3 space-y-2" data-testid="upi-qr-placeholder">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 mx-auto flex items-center justify-center">
              <QrCode className="w-6 h-6" />
            </div>
            <p className="font-semibold text-amber-900 text-sm">REAL UPI QR IMAGE REQUIRED</p>
            <p className="text-xs text-amber-700">
              Admin can configure the UPI QR image and UPI ID in <strong>Admin Panel → Settings</strong>.
            </p>
          </div>
        )}

        {upiId && (
          <div className="flex items-center gap-2 mt-2 bg-white px-3.5 py-1.5 rounded-full border border-line text-sm">
            <span className="text-ink-muted text-xs">UPI ID:</span>
            <span className="font-mono font-medium text-ink">{upiId}</span>
            <button onClick={copyUpi} className="text-brand hover:text-brand-dark p-1 rounded transition" title="Copy UPI ID">
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>

      {/* Verification Status Notice */}
      {confirmedLocally ? (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3 text-blue-900 text-sm" data-testid="payment-confirmation-pending">
          <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Payment Confirmation Submitted</p>
            <p className="text-xs text-blue-700 mt-0.5">
              Our team is verifying your payment against our bank records. Your order status will automatically update to <strong>Processing</strong> once verified.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-3.5 bg-warm rounded-xl flex items-start gap-2.5 text-xs text-ink-muted">
          <AlertCircle className="w-4 h-4 text-brand shrink-0 mt-0.5" />
          <span>
            After scanning the QR code and completing payment in your UPI app (Google Pay, PhonePe, Paytm, etc.), click <strong>"I Have Paid"</strong> below.
          </span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2.5">
        <Button
          onClick={handleHavePaid}
          loading={submitting}
          disabled={confirmedLocally}
          variant={confirmedLocally ? 'secondary' : 'primary'}
          fullWidth
          size="lg"
          data-testid="i-have-paid-btn"
        >
          {confirmedLocally ? '✓ Payment Confirmation Submitted' : 'I Have Paid'}
        </Button>

        <button
          onClick={openWhatsApp}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors shadow-sm"
          data-testid="send-to-whatsapp-btn"
        >
          <MessageCircle className="w-5 h-5" />
          Send Order to WhatsApp (7010586606)
        </button>
      </div>
    </div>
  )
}

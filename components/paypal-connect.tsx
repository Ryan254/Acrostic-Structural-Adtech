'use client'

import { useState } from 'react'
import useSWR from 'swr'

export function PayPalConnect() {
  const { data: judgeAccount } = useSWR<{ available: boolean; email?: string }>('/api/paypal/judge-account', (url) => fetch(url).then((response) => response.json()), { revalidateOnFocus: false })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function checkout() {
    setLoading(true)
    setError('')
    const response = await fetch('/api/paypal/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ brand: 'PayPal', keyword: 'PAYPAL' }) })
    const data = await response.json()
    setLoading(false)
    if (response.status === 401) {
      window.location.href = '/sign-in?next=/'
      return
    }
    if (!response.ok || !data.approvalUrl) {
      setError(data.error ?? 'PayPal Sandbox could not start checkout.')
      return
    }
    if (window.self !== window.top) window.open(data.approvalUrl, '_blank', 'noopener,noreferrer')
    else window.location.href = data.approvalUrl
  }

  return <div className="paypal-connect"><span className="paypal-connect-status"><i /> PayPal Sandbox connected</span>{judgeAccount?.available && <span className="paypal-judge-account">Judge buyer: <strong>{judgeAccount.email}</strong></span>}<button className="paypal-connect-button" type="button" onClick={checkout} disabled={loading}>{loading ? 'Preparing…' : 'Start PayPal checkout'}</button>{error && <p className="paypal-connect-error" role="alert">{error}</p>}</div>
}

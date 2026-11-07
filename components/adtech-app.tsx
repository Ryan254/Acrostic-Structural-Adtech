'use client'

import useSWR from 'swr'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowUpRight,
  BarChart3,
  Bot,
  Check,
  ChevronDown,
  CircleHelp,
  CreditCard,
  FileText,
  LayoutDashboard,
  Mail,
  Menu,
  MessageSquare,
  Plus,
  Radio,
  Search,
  Send,
  Sparkles,
  Target,
  X,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { signOut } from '@/lib/auth-client'

type Brand = { name: string; keyword: string; color: string; description: string; price: string }
type View = 'publisher' | 'chat' | 'campaigns' | 'about' | 'inbox' | 'aye'

const priceForKeyword = (keyword: string) => `$${keyword.replace(/[^A-Za-z]/g, '').length * 100}.00`
const fetcher = (url: string) => fetch(url, { cache: 'no-store' }).then((response) => response.json())
type ChatMessage = { role: 'user' | 'assistant'; text: string; lines?: string[] }
type Receipt = { id: string; paypalOrderId: string; brandName: string; keyword: string; amount: string; subtotal: string | null; tax: string | null; currency: string; status: string; payerEmail: string | null; createdAt: string }

function getReceiptTotals(receipt: Receipt) {
  const total = Number(receipt.amount) || 0
  const subtotal = Number(receipt.subtotal) || Number((total / 1.0825).toFixed(2))
  const tax = Number(receipt.tax) || Number((total - subtotal).toFixed(2))
  return { subtotal: subtotal.toFixed(2), tax: tax.toFixed(2), total: total.toFixed(2) }
}

const starterBrands: Brand[] = [
  { name: 'PayPal', keyword: 'PAYPAL', color: '#003087', description: 'The safer, simpler way to pay online.', price: '$12.00' },
  { name: 'PayLater', keyword: 'PAYLATER', color: '#6d28d9', description: 'Make today possible with a little more flexibility.', price: '$14.00' },
  { name: 'Credit', keyword: 'CREDIT', color: '#0f766e', description: 'Build momentum with tools that move with you.', price: '$11.00' },
  { name: 'Buy Now', keyword: 'BUYNOW', color: '#c2410c', description: 'Get what matters now, with a clearer way forward.', price: '$10.00' },
  { name: 'Discount', keyword: 'DISCOUNT', color: '#be123c', description: 'A better price for the choices you already want.', price: '$9.00' },
  { name: 'Venmo', keyword: 'VENMO', color: '#0284c7', description: 'Send, split, and keep life moving.', price: '$12.00' },
  { name: 'Love', keyword: 'LOVE', color: '#be185d', description: 'Small moments deserve a little more meaning.', price: '$8.00' },
  { name: 'Hope', keyword: 'HOPE', color: '#15803d', description: 'A brighter next step starts with one good idea.', price: '$8.00' },
  { name: 'Power', keyword: 'POWER', color: '#b45309', description: 'Bring more energy to the work that matters.', price: '$13.00' },
  { name: 'Solution', keyword: 'SOLUTION', color: '#1d4ed8', description: 'Practical tools for the problems worth solving.', price: '$15.00' },
]

const articleSentences = [
  'When fuel prices climb, the smartest operators look for durable efficiencies.',
  'A new generation of commerce tools is helping smaller teams move with confidence.',
  'Local businesses are finding that purpose-led growth can also be profitable growth.',
  'Keeping customers close matters more than ever in a noisy digital marketplace.',
  'Across the country, owners are replacing short-term fixes with systems designed to last.',
  'The shift is quiet but consequential: better forecasting, leaner operations, and closer attention to customers.',
  'For many, resilience now means making fewer promises and delivering on them consistently.',
  'That discipline is creating a more durable kind of growth, one measured in trust as much as revenue.',
]

function initials(value: string) {
  return value.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
}

const contextualOpeners: Record<string, string> = {
  A: 'As the market evolves,', B: 'Business leaders know that', C: 'Companies are finding that', D: 'Durable growth starts when', E: 'Even in uncertain times,', F: 'For many teams,', G: 'Growth often begins when', H: 'Healthy businesses understand that', I: 'In practice,', J: 'Just as important,', K: 'Keeping perspective,', L: 'Long term,', M: 'Meanwhile,', N: 'Notably,', O: 'Over time,', P: 'Practical evidence shows that', Q: 'Quietly,', R: 'Resilient teams understand that', S: 'Smart operators see that', T: 'The lesson is clear:', U: 'Ultimately,', V: 'Viewed together,', W: 'When conditions change,', X: 'X-factor:', Y: 'Years of experience show that', Z: 'Zeroing in on the detail,'
}

function rewriteSentence(sentence: string, letter: string) {
  const opener = contextualOpeners[letter] || `${letter}lthough,`
  const clean = sentence.trim().replace(/^([A-Za-z])/, (match) => match.toLowerCase())
  return `${opener} ${opener.endsWith(':') ? sentence.trim() : clean}`
}

function verifyAcrostic(original: string[], modified: string[], keyword: string) {
  if (original.length !== modified.length || modified.length !== keyword.length) return false
  return modified.every((line, index) => line.trim().startsWith(keyword[index]))
}

function getVerifiedLines(original: string[], keyword: string, mode: 'paragraph' | 'sentence') {
  const modified = original.map((sentence, index) => rewriteSentence(sentence, keyword[index]))
  return verifyAcrostic(original, modified, keyword) ? modified : original
}

function AcrosticLine({ sentence, letter, highlight, showBadge = true, color }: { sentence: string; letter: string; highlight: boolean; showBadge?: boolean; color?: string }) {
  const rewritten = rewriteSentence(sentence, letter)
  return (
    <div className="acrostic-line">
      {showBadge && <span className={highlight ? 'letter-badge active' : 'letter-badge'} style={highlight && color ? { '--ad-color': color } as React.CSSProperties : undefined}>{letter}</span>}
      <span>{rewritten.slice(1)}</span>
    </div>
  )
}

function AyeProofWidget({ logs }: { logs: string[] }) {
  return <section className="aye-proof-mini" aria-label="AYE API proof inspector"><div className="aye-inspector-head"><span className="tiny-label">AYE API PROOF</span><i>LIVE</i></div><div className="aye-terminal">{logs.slice(0, 3).map((log, index) => <code key={`${log}-${index}`}>{`> ${log}`}</code>)}</div></section>
  }

export default function Page() {
  const { data: session } = useSWR<{ user?: { name?: string } } | null>('/api/auth/get-session', (url) => fetch(url, { credentials: 'include' }).then((response) => response.json()), { revalidateOnFocus: false })
  const [view, setView] = useState<View>('publisher')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [brands, setBrands] = useState(starterBrands)
  const [activeBrand, setActiveBrand] = useState(starterBrands[0])
  const [format, setFormat] = useState<'dense' | 'dropcap'>('dense')
  const [acrosticMode, setAcrosticMode] = useState<'paragraph' | 'sentence'>('paragraph')
  const [placement, setPlacement] = useState('Full article')
  const [highlight, setHighlight] = useState(true)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [paid, setPaid] = useState(false)
  const [conversions, setConversions] = useState(1284)
  const [ayeVault, setAyeVault] = useState(600)
  const [ayeVaults, setAyeVaults] = useState<Record<string, number>>({})
  const [publisherWallet, setPublisherWallet] = useState(0)
  const [ayeLogs, setAyeLogs] = useState(['POST /v2/checkout/orders · 201 Created', 'Vault pre-authorization verified · $600.00 locked'])
  const [chatInput, setChatInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'assistant', text: 'What should we explore today? I’ll weave a relevant partner into the answer without interrupting the conversation.' }])
  const [campaign, setCampaign] = useState({ name: '', keyword: '', budget: '5000', category: 'Business & finance', copy: '' })
  const { data: paidStatus, mutate: refreshPaidStatus } = useSWR<{ paidBrands?: string[] }>('/api/paypal/paid', fetcher, { revalidateOnFocus: false })
  const { data: receiptStatus, mutate: refreshReceipts } = useSWR<{ receipts?: Receipt[] }>('/api/paypal/receipts', fetcher, { revalidateOnFocus: false })
  const receipts = receiptStatus?.receipts ?? []
  const paidBrands = paidStatus?.paidBrands ?? []

  async function deleteReceipt(id: string) {
    const response = await fetch('/api/paypal/receipts', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    if (response.ok) await refreshReceipts()
  }
  const isBrandPaid = (name: string) => paidBrands.some((paidBrand) => paidBrand.trim().toLowerCase() === name.trim().toLowerCase())
  const activeAdvertPaid = paid || isBrandPaid(activeBrand.name)

  async function triggerAyeSettlement(tier: 'impression' | 'engagement') {
  const eventTime = new Date().toLocaleString()
  const gross = tier === 'impression' ? 0.5 : 5
  const publisherShare = gross * 0.8
  const currentVault = ayeVaults[keyword] ?? ayeVault
  if (currentVault < gross) {
    setPaid(false)
    setAyeLogs((logs) => [`${eventTime} · ${keyword} · Vault depleted · payment required`, ...logs].slice(0, 100))
    return
  }
  const response = await fetch('/api/aye/settle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tier, keyword }) })
  if (!response.ok) {
    setAyeLogs((logs) => [`${eventTime} · ${keyword} · PayPal payout pending · ${tier} settlement could not be completed`, ...logs].slice(0, 100))
    return
  }
  setAyeVaults((balances) => ({ ...balances, [keyword]: Number((currentVault - gross).toFixed(2)) }))
  setAyeVault(Number((currentVault - gross).toFixed(2)))
  setPublisherWallet((balance) => Number((balance + publisherShare).toFixed(2)))
  setAyeLogs((logs) => [`${eventTime} · ${keyword} · POST /v1/payments/payouts · 201 Created · ${tier} · $${publisherShare.toFixed(2)} publisher`, ...logs].slice(0, 100))
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('paypal') !== 'paid') return
    const returnedBrand = params.get('brand')
    const returnedKeyword = params.get('keyword')?.replace(/[^A-Za-z]/g, '').toUpperCase() || 'BRAND'
    const returnedView = params.get('view') as View | null
    const brand = brands.find((item) => item.name === returnedBrand)
    const restoredBrand = brand || (returnedBrand ? { name: returnedBrand, keyword: returnedKeyword, color: '#0f766e', description: 'A new way forward for modern teams.', price: priceForKeyword(returnedKeyword) } : null)
    if (restoredBrand) {
      if (!brand) setBrands((current) => [...current, restoredBrand])
      setActiveBrand(restoredBrand)
    }
    setPaid(true)
    setCheckoutOpen(false)
    setView(returnedView === 'chat' || returnedView === 'campaigns' || returnedView === 'about' || returnedView === 'inbox' ? returnedView : 'publisher')
    void refreshPaidStatus()
    void refreshReceipts()
    window.history.replaceState({}, document.title, window.location.pathname)
  }, [brands])

  const keyword = activeBrand.keyword.toUpperCase()
  const acrosticSentences = useMemo(() => {
    const source = acrosticMode === 'sentence'
      ? articleSentences.flatMap((paragraph) => paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph])
      : articleSentences
    return keyword.split('').map((_, index) => source[index % source.length])
  }, [keyword, acrosticMode])
  const verifiedPublisherLines = useMemo(() => getVerifiedLines(acrosticSentences, keyword, acrosticMode), [acrosticSentences, keyword, acrosticMode])

  function generateCopy() {
    const word = campaign.keyword.toUpperCase().replace(/[^A-Z]/g, '') || 'ACROSTIC'
    setCampaign((current) => ({ ...current, keyword: word, copy: word.split('').map((letter, i) => rewriteSentence(articleSentences[i % articleSentences.length], letter)).join('\n') }))
  }

  async function openCheckout() {
    const response = await fetch(`/api/paypal/paid?brand=${encodeURIComponent(activeBrand.name)}`, { cache: 'no-store' })
    const data = await response.json().catch(() => ({ paid: false }))
    setPaid(data.paid === true)
    setCheckoutOpen(true)
  }

  async function payForAdvert() {
    const checkoutWindow = window.self !== window.top ? window.open('about:blank', '_blank') : null
    setCheckoutOpen(false)
    try {
      const response = await fetch('/api/paypal/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand: activeBrand.name, keyword: activeBrand.keyword, view }),
      })
      const data = await response.json().catch(() => ({}))
      if (response.status === 401) {
        checkoutWindow?.close()
        window.location.href = '/sign-in?next=/'
        return
      }
      if (!response.ok || !data.approvalUrl) {
        checkoutWindow?.close()
        window.alert(data.error || 'PayPal Sandbox could not start checkout.')
        return
      }
      if (checkoutWindow) checkoutWindow.location.href = data.approvalUrl
      else window.location.href = data.approvalUrl
    } catch {
      checkoutWindow?.close()
      window.alert('PayPal Sandbox could not start checkout. Please try again.')
    }
  }

  async function createCampaign(event: React.FormEvent) {
    event.preventDefault()
    const name = campaign.name.trim() || 'New partner'
    const word = campaign.keyword.toUpperCase().replace(/[^A-Z]/g, '') || 'BRAND'
    const newBrand = { name, keyword: word, color: '#0f766e', description: campaign.copy.split('\n')[0]?.replace(/^[A-Z]\s*/, '') || 'A new way forward for modern teams.', price: priceForKeyword(word) }
    setBrands((current) => [...current, newBrand])
setActiveBrand(newBrand)
  setAyeVaults((balances) => ({ ...balances, [word]: balances[word] ?? word.length * 100 }))
  setAyeVault(word.length * 100)
  setPublisherWallet(0)
  setAyeLogs((logs) => [`${new Date().toLocaleString()} · AYE vault linked to new ${word} campaign`, ...logs].slice(0, 100))
  setPaid(false)
    setView('publisher')
    setCampaign({ name: '', keyword: '', budget: '5000', category: 'Business & finance', copy: '' })
  }

  async function sendMessage(text = chatInput) {
    const prompt = text.trim()
    if (!prompt) return
  setMessages((current) => [...current, { role: 'user', text: prompt }, { role: 'assistant', text: 'Thinking through that now…' }])
    setChatInput('')

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, brand: activeBrand.name, keyword }),
      })
      const data = await response.json()
      if (!response.ok || typeof data.answer !== 'string') throw new Error(data.error || 'AI response unavailable')
      setMessages((current) => [...current.slice(0, -1), { role: 'assistant', text: data.answer, lines: Array.isArray(data.lines) ? data.lines : undefined }])
    } catch (error) {
      setMessages((current) => [...current.slice(0, -1), { role: 'assistant', text: error instanceof Error ? error.message : 'AI response unavailable. The original request was not modified.' }])
    }
  }

  return (
<main className="app-shell">
  <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark"><span>A</span><span className="brand-mark-dot" /></div>
          <div><div className="brand-name">acrostic</div><div className="brand-subtitle">contextual commerce</div></div>
        </div>
        <nav className="main-nav" aria-label="Primary navigation">
          <button className={view === 'publisher' ? 'nav-item active' : 'nav-item'} onClick={() => setView('publisher')}><FileText /> Publisher</button>
          <button className={view === 'chat' ? 'nav-item active' : 'nav-item'} onClick={() => setView('chat')}><Bot /> AI surfaces</button>
          <button className={view === 'campaigns' ? 'nav-item active' : 'nav-item'} onClick={() => setView('campaigns')}><BarChart3 /> Campaigns</button><button className={view === 'aye' ? 'nav-item active' : 'nav-item'} onClick={() => setView('aye')}><Zap /> AYE</button><button className={view === 'inbox' ? 'nav-item active' : 'nav-item'} onClick={() => setView('inbox')}><Mail /> Receipts</button><button className={view === 'about' ? 'nav-item active' : 'nav-item'} onClick={() => setView('about')}><CircleHelp /> About us</button>
        </nav>
        <div className="top-actions"><button className="icon-button" aria-label="Help"><CircleHelp /></button>{session ? <button className="account-link" onClick={async () => { await signOut(); window.location.reload() }}>Sign out</button> : <a className="account-link" href="/sign-in?next=/">Sign in</a>}<div className="avatar">{session?.user?.name?.slice(0, 2).toUpperCase() || 'JD'}</div></div>
      </header>

      <div className="sandbox-banner"><span className="sandbox-badge">SANDBOX: no real money</span><span>Sponsored structure is deterministic and verified before it is shown.</span></div>
      <div className="mobile-nav"><button onClick={() => setMobileMenuOpen((open) => !open)} aria-expanded={mobileMenuOpen}><Menu /> Menu</button><span>{view === 'publisher' ? 'Publisher view' : view === 'chat' ? 'AI surfaces' : view === 'campaigns' ? 'Campaigns' : view === 'aye' ? 'AYE' : view === 'inbox' ? 'Receipts' : 'About us'}</span><button aria-label="Search"><Search /></button></div>{mobileMenuOpen && <nav className="mobile-menu" aria-label="Mobile navigation"><button onClick={() => { setView('publisher'); setMobileMenuOpen(false) }} className={view === 'publisher' ? 'active' : ''}>Publisher</button><button onClick={() => { setView('chat'); setMobileMenuOpen(false) }} className={view === 'chat' ? 'active' : ''}>AI surfaces</button><button onClick={() => { setView('campaigns'); setMobileMenuOpen(false) }} className={view === 'campaigns' ? 'active' : ''}>Campaigns</button><button onClick={() => { setView('aye'); setMobileMenuOpen(false) }} className={view === 'aye' ? 'active' : ''}>AYE</button><button onClick={() => { setView('inbox'); setMobileMenuOpen(false) }} className={view === 'inbox' ? 'active' : ''}>Receipts</button><button onClick={() => { setView('about'); setMobileMenuOpen(false) }} className={view === 'about' ? 'active' : ''}>About us</button></nav>}

      {view === 'inbox' && <section className="workspace receipt-workspace"><div className="page-heading"><div><p className="eyebrow">Email inbox <span>PAYPAL RECEIPTS</span></p><h1>Your receipts, with the advert included.</h1><p className="lede">Every completed Acrostic placement arrives here as a clear PayPal payment receipt, followed by the sponsored message you purchased.</p></div><div className="heading-meta"><span className="status-pill"><Mail /> {receipts.length} receipt{receipts.length === 1 ? '' : 's'}</span></div></div><AyeProofWidget logs={ayeLogs} /><div className="receipt-list">{receipts.length === 0 ? <div className="empty-inbox"><Mail /><h2>No receipts yet</h2><p>Complete a paid Acrostic advert and your PayPal receipt will appear here automatically.</p><button className="primary-button" onClick={() => setView('publisher')}>Browse adverts <ArrowUpRight /></button></div> : receipts.map((receipt) => <article className="full-receipt" key={receipt.id}><div className="receipt-header"><div><span className="tiny-label">PAYPAL SANDBOX RECEIPT</span><h2>Payment completed</h2><p>{new Date(receipt.createdAt).toLocaleString()}</p></div><div className="receipt-header-actions"><div className="receipt-paid"><Check /> PAID</div><button className="receipt-delete" type="button" aria-label={`Delete receipt for ${receipt.brandName}`} onClick={() => deleteReceipt(receipt.id)}>Delete receipt</button></div></div><div className="receipt-detail-grid"><div><span>Merchant</span><strong>Acrostic contextual commerce</strong></div><div><span>Payment method</span><strong>PayPal Sandbox</strong></div><div><span>Order reference</span><strong>{receipt.paypalOrderId}</strong></div><div><span>Billing email</span><strong>{receipt.payerEmail || 'PayPal buyer account'}</strong></div></div><div className="receipt-total"><div><span>Subtotal</span><span>Tax (8.25%)</span><b>Total paid</b></div><div>{(() => { const totals = getReceiptTotals(receipt); return <><span>{receipt.currency} {totals.subtotal}</span><span>{receipt.currency} {totals.tax}</span><strong>{receipt.currency} {totals.total}</strong></> })()}</div></div><div className="receipt-advert"><div className="receipt-advert-copy"><div className="receipt-acrostic-lines">{receipt.keyword.split('').map((letter, index) => <div className="receipt-acrostic-line" role="button" tabIndex={0} key={`${receipt.id}-line-${index}`} onClick={() => triggerAyeSettlement('engagement')} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') triggerAyeSettlement('engagement') }}><b>{letter}</b><span>{rewriteSentence(articleSentences[index % articleSentences.length], letter).slice(1)}</span></div>)}</div></div></div></article>)}</div></section>}

      {view === 'publisher' && <section className="workspace publisher-workspace">
        <div className="page-heading"><div><p className="eyebrow">Publisher preview <span>LIVE</span></p><h1>Make every word work harder.</h1><p className="lede">See how Acrostic delivers relevant partner messages inside content your audience already trusts.</p></div><div className="heading-meta"><span className="status-pill"><Radio /> Serving preview traffic</span><span className="muted-label">Last synced just now</span></div></div>
        <div className="control-panel">
          <div className="control-group"><label className="advert-label">Choose advert <span className={activeAdvertPaid ? 'payment-status paid' : 'payment-status'}>{activeAdvertPaid ? 'Paid' : 'Payment required'}</span></label><div className="select-wrap"><select value={activeBrand.name} onChange={(e) => { const nextBrand = brands.find((brand) => brand.name === e.target.value) || brands[0]; setActiveBrand(nextBrand); const nextKeyword = nextBrand.keyword.replace(/[^A-Za-z]/g, ''); setAyeVaults((balances) => ({ ...balances, [nextKeyword]: balances[nextKeyword] ?? nextKeyword.length * 100 })); setAyeVault(ayeVaults[nextKeyword] ?? nextKeyword.length * 100); setPublisherWallet(0); setPaid(isBrandPaid(nextBrand.name)) }}>{brands.map((brand) => <option key={brand.name} value={brand.name}>{brand.name} — {priceForKeyword(brand.keyword)} · {isBrandPaid(brand.name) ? 'Paid' : 'Payment required'}</option>)}</select><ChevronDown /></div></div>
          <div className="control-group"><label>Ad format</label><div className="segmented"><button className={format === 'dense' ? 'selected' : ''} onClick={() => setFormat('dense')}>Dense lines</button><button className={format === 'dropcap' ? 'selected' : ''} onClick={() => setFormat('dropcap')}>Editorial</button></div></div><div className="control-group"><label>Letter cadence</label><div className="segmented"><button className={acrosticMode === 'paragraph' ? 'selected' : ''} onClick={() => setAcrosticMode('paragraph')}>Paragraphs</button><button className={acrosticMode === 'sentence' ? 'selected' : ''} onClick={() => setAcrosticMode('sentence')}>Sentences</button></div></div>
          <div className="control-group"><label>Placement</label><div className="select-wrap"><select value={placement} onChange={(e) => setPlacement(e.target.value)}>{['Full article', 'Lead section', 'Mid-article', 'Concluding section'].map((item) => <option key={item}>{item}</option>)}</select><ChevronDown /></div></div>
          <div className="control-divider" /><label className="switch-label"><button className={highlight ? 'switch on' : 'switch'} onClick={() => setHighlight(!highlight)}><span /></button> Highlight acrostic</label><Button className="checkout-button" onClick={openCheckout}><CreditCard /> {activeAdvertPaid ? `Paid · ${activeBrand.name}` : `Pay for ${activeBrand.name}`} · {priceForKeyword(activeBrand.keyword)}</Button>
        </div>
        <div className="publisher-grid">
          <article className={`article-card reference-editorial ${acrosticMode === 'sentence' ? 'sentence-cadence' : ''}`}>
            <div className="article-kicker"><span>THE GLOBAL FINANCIAL TIMES</span><span>OCTOBER 31, 2026 <b>·</b> 6 MIN READ</span></div>
            <div className="article-rule" /><p className="article-section">MARKETS <span>•</span> THE LONG VIEW</p><h2>Small businesses are rebuilding around a more intentional kind of growth</h2><p className="article-dek">From resilient supply chains to values-led buying, the next chapter of commerce is being written by teams that choose clarity over noise.</p><div className="byline"><div className="byline-avatar">AM</div><div><b>Alex Morgan</b><span>Senior correspondent · New York</span></div><button className="share-button"><ArrowUpRight /> Share</button></div>
            <div className={format === 'dense' ? 'article-body dense' : 'article-body editorial'}><p className="article-lead">The most durable businesses are not always the loudest. They are the ones quietly redesigning how work gets done, one careful decision at a time.</p><div className="acrostic-reference" aria-label={`Sponsored structure: ${keyword}`}>{verifiedPublisherLines.map((sentence, i) => <div className="acrostic-reference-row" key={`publisher-${i}`}><span className="acrostic-tile" style={{ '--tile-color': activeBrand.color } as React.CSSProperties}>{keyword[i] || keyword[0]}</span><p>{sentence.slice(1)}</p></div>)}</div><p>For publishers, the opportunity is not simply to show more messages. It is to make the messages feel like a natural extension of the experience — useful, timely, and easy to act on.</p><p className="publisher-continuation-intro">That same principle continues through the wider story: each decision compounds into a clearer, more resilient way to grow.</p><div className="paragraph-acrostic-block" aria-label={`Continued sponsored structure: ${keyword}`}>{verifiedPublisherLines.map((sentence, i) => <p key={`continuation-${i}`}><span className="paragraph-acrostic-letter" role="button" tabIndex={0} onClick={() => triggerAyeSettlement('engagement')} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') triggerAyeSettlement('engagement') }} style={{ '--tile-color': activeBrand.color } as React.CSSProperties}>{keyword[i] || keyword[0]}</span><span>{sentence.slice(1)}</span></p>)}</div></div>
            <div className="sponsor-card" style={{ '--sponsor-color': activeBrand.color } as React.CSSProperties}><div className="sponsor-top"><span className="sponsor-label"><Sparkles /> Sponsored structure: {activeBrand.name}</span><span className="sponsor-tag">PARTNER MESSAGE</span><button className="report-button" onClick={() => window.alert('Thanks. This sponsored structure has been reported for review.')}>Report</button></div><div className="sponsor-content"><div className="sponsor-logo" style={{ background: activeBrand.color }}>{initials(activeBrand.name)}</div><div><h3>{activeBrand.description}</h3><p>A thoughtful offer from {activeBrand.name}, selected for readers exploring this story.</p></div></div></div>
          </article>
          <aside className="insight-rail"><AyeProofWidget logs={ayeLogs} /><div className="rail-card"><div className="rail-card-header"><span className="tiny-label">DELIVERY INSPECTOR</span><span className="good-status"><i /> Healthy</span></div><div className="inspector-score"><div className="score-ring"><strong>98</strong><span>% match</span></div><div><b>Strong contextual fit</b><p>Partner message is aligned to article intent.</p></div></div><div className="mini-metrics"><div><span>Estimated reach</span><b>42.8K</b></div><div><span>Expected CTR</span><b>4.82%</b></div><div><span>Viewability</span><b>91.4%</b></div></div></div><div className="rail-callout"><Zap /><div><b>Zero-code integration</b><p>One lightweight script is all a publisher needs to start serving.</p></div></div></aside>
        </div>
      </section>}

      {view === 'chat' && <section className="workspace"><div className="page-heading"><div><p className="eyebrow">AI surfaces <span>LIVE PREVIEW</span></p><h1>Ads that understand the conversation.</h1><p className="lede">A native partner message, woven into an assistant response — never an interruption.</p></div><div className="heading-meta"><span className="status-pill"><Bot /> AI model active</span></div></div><div className="chat-layout"><section className="chat-card"><AyeProofWidget logs={ayeLogs} /><div className="chat-header"><div><span className="tiny-label">ACROSTIC ASSISTANT</span><h3>Ask anything. Discover something useful.</h3></div><span className="secure-chip"><i /> Private preview</span></div><div className="messages">{messages.map((message, i) => <div className={message.role === 'user' ? 'message-row user' : 'message-row'} key={`${message.text}-${i}`}><div className="message-avatar">{message.role === 'user' ? 'JD' : <Sparkles />}</div><div className="message-bubble">{message.role === 'assistant' && i > 0 ? message.text === 'Thinking through that now…' ? <div className="ai-thinking" role="status" aria-live="polite"><span className="thinking-dots" aria-hidden="true"><i /><i /><i /></span><span>Analyzing your question</span></div> : <div className="chat-acrostic"><div className="chat-acrostic-label"><span>Sponsored structure: {activeBrand.name}</span><b>{keyword}</b><button className="report-button" onClick={() => window.alert('Thanks. This sponsored structure has been reported for review.')}>Report</button></div>{(message.lines || [message.text]).map((sentence, index) => <div className="acrostic-line" key={`${sentence}-${index}`}><span className={highlight ? 'letter-badge active' : 'letter-badge'} role="button" tabIndex={0} onClick={() => triggerAyeSettlement('engagement')} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') triggerAyeSettlement('engagement') }} style={highlight ? { '--ad-color': activeBrand.color } as React.CSSProperties : undefined}>{keyword[index] || keyword[0]}</span><span>{sentence.slice(1).trim()}</span></div>)}</div> : message.text}</div></div>)}</div><div className="suggestions"><span>Try asking</span><button onClick={() => sendMessage('How can a small business prepare for growth?')}>Small business growth</button><button onClick={() => sendMessage('What makes a great summer refreshment?')}>Summer refreshment</button><button onClick={() => sendMessage('How can I be more productive?')}>Foldable productivity</button></div><div className="chat-composer"><input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) sendMessage() }} placeholder="Ask the assistant anything..." aria-label="Chat message" /><button onClick={() => sendMessage()} aria-label="Send message"><Send /></button></div><span className="composer-note">Demo responses are generated locally to showcase the delivery format.</span></section><aside className="chat-inspector"><div className="rail-card"><div className="rail-card-header"><span className="tiny-label">RESPONSE INSPECTOR</span><span className="good-status"><i /> Verified</span></div><div className="confidence"><span>Context confidence</span><strong>96.8%</strong><div className="progress"><i style={{ width: '96.8%' }} /></div></div><span className="tiny-label">TARGET KEYWORD</span><div className="keyword-row large">{keyword.split('').map((letter, i) => <span key={`${letter}-${i}`}>{letter}</span>)}</div><p className="rail-note">The partner message is encoded across the response, so the recommendation remains useful even when the user skips the call-to-action.</p></div><div className="rail-card"><span className="tiny-label">DELIVERY RULES</span><div className="rule-list"><div><Check /> No visual interruption</div><div><Check /> Sentiment-safe placement</div><div><Check /> User intent first</div><div><Check /> Transparent partner label</div></div></div></aside></div></section>}

      {view === 'aye' && <section className="workspace aye-page"><div className="page-heading"><div><p className="eyebrow">Acrostic Yield-Escrow <span>LIVE SANDBOX CLEARINGHOUSE</span></p><h1>{keyword} settlement dashboard.</h1><p className="lede">One AYE vault is created from the selected acrostic keyword. Every impression and engagement settles against its initial {priceForKeyword(keyword)} budget.</p></div><div className="heading-meta"><span className="status-pill"><Zap /> {keyword.length}-letter vault active</span></div></div><div className="aye-grid"><div className="aye-card aye-vault"><span className="tiny-label">ADVERTISER VAULT</span><strong>${ayeVault.toFixed(2)}</strong><span>Remaining from {priceForKeyword(keyword)} initial payment</span><div className="aye-split"><span>Publisher wallet <b>${publisherWallet.toFixed(2)}</b></span><span>Platform share <b>20%</b></span></div></div><div className="aye-card aye-inspector"><div className="aye-inspector-head"><span className="tiny-label">API PROOF INSPECTOR</span><i>LIVE</i></div><div className="aye-terminal">{ayeLogs.map((log, index) => <code key={`${log}-${index}`}>{`> ${log}`}</code>)}</div></div></div><div className="aye-math"><b>Live settlement rules</b><span>Impression: $0.50 gross → $0.40 publisher</span><span>Engagement: $5.00 gross → $4.00 publisher</span><span>{ayeVault <= 0 ? 'Vault depleted — this advert now requires payment.' : 'Click an acrostic letter in Publisher or AI surfaces to settle an engagement.'}</span></div></section>}

  {view === 'campaigns' && <section className="workspace campaign-workspace"><div className="page-heading"><div><p className="eyebrow">Campaign center <span>ADVERTISER WORKSPACE</span></p><h1>Turn attention into measurable action.</h1><p className="lede">Launch and monitor contextual campaigns across publisher and AI surfaces.</p></div><Button className="primary-action" onClick={() => document.getElementById('new-campaign')?.scrollIntoView({ behavior: 'smooth' })}><Plus /> New campaign</Button></div><div className="metric-grid"><div className="metric-card"><span>Total impressions <ArrowUpRight /></span><strong>2.84M</strong><small className="positive">+18.4% <em>vs last period</em></small></div><div className="metric-card"><span>Acrostic CTR <ArrowUpRight /></span><strong>4.82%</strong><small className="positive">+0.62% <em>vs benchmark</em></small></div><div className="metric-card"><span>Conversions <ArrowUpRight /></span><strong>{conversions.toLocaleString()}</strong><small className="positive">+12.8% <em>this month</em></small></div><div className="metric-card dark"><span>Revenue generated <ArrowUpRight /></span><strong>$14,820</strong><small>82% of $18K target</small><div className="metric-progress"><i /></div></div></div><section className="aye-panel"><div className="aye-intro"><p className="eyebrow">Acrostic Yield-Escrow <span>AYE</span></p><h2>Autonomous Micro-Sponsorship Clearinghouse</h2><p>Advertisers lock campaign funds in a PayPal Pre-Authorization Vault. When a reader interacts with an acrostic, AYE releases a verified micro-settlement to the publisher or AI provider.</p></div><div className="aye-grid"><div className="aye-card aye-vault"><span className="tiny-label">ADVERTISER VAULT PANEL</span><strong>${ayeVault.toFixed(2)}</strong><span>Locked Sandbox balance</span><div className="aye-actions"><button onClick={() => { setAyeVault(100); setAyeLogs((logs) => ['POST /v2/checkout/orders · 201 Created · $100.00 authorized', ...logs].slice(0, 100)) }}>Authorize $100</button><button onClick={() => { setAyeVault(600); setAyeLogs((logs) => ['POST /v2/checkout/orders · 201 Created · $600.00 authorized', ...logs].slice(0, 100)) }}>Authorize $600</button></div></div><div className="aye-card"><span className="tiny-label">PUBLISHER WALLET</span><strong>${publisherWallet.toFixed(2)}</strong><span>Net payout · 80% share</span><div className="aye-split"><span>Tier 1 impression <b>$0.40</b></span><span>Tier 2 engagement <b>$4.00</b></span></div></div><div className="aye-card aye-inspector"><div className="aye-inspector-head"><span className="tiny-label">API PROOF INSPECTOR</span><i>LIVE</i></div><div className="aye-terminal">{ayeLogs.map((log, index) => <code key={`${log}-${index}`}>{`> ${log}`}</code>)}</div></div></div><div className="aye-math"><b>How the $600 sandbox demo settles</b><span>Pre-authorize $600 → render ad → <strong>$0.50 impression</strong> → click → <strong>$5.00 engagement</strong></span><span>Each event splits 80% to the publisher and 20% to the Acrostic platform. PayPal payout fees are absorbed by the platform margin.</span></div></section><div className="campaign-grid"><form id="new-campaign" className="campaign-form" onSubmit={createCampaign}><div className="form-heading"><div><span className="tiny-label">CREATE CAMPAIGN</span><h3>Start a new partner flight</h3></div><span className="draft-chip">Draft</span></div><div className="field-grid"><label>Brand name<input value={campaign.name} onChange={(e) => setCampaign({ ...campaign, name: e.target.value })} placeholder="e.g. Northstar" /></label><label>Acrostic keyword<input value={campaign.keyword} maxLength={10} onChange={(e) => setCampaign({ ...campaign, keyword: e.target.value.toUpperCase() })} placeholder="e.g. NORTH" /></label><label>Monthly budget<input value={campaign.budget} onChange={(e) => setCampaign({ ...campaign, budget: e.target.value })} placeholder="$5,000" /></label><label>Target category<select value={campaign.category} onChange={(e) => setCampaign({ ...campaign, category: e.target.value })}><option>Business & finance</option><option>Technology</option><option>Lifestyle</option><option>Travel</option></select></label></div><label className="copy-field">Generated copy<textarea value={campaign.copy} onChange={(e) => setCampaign({ ...campaign, copy: e.target.value })} placeholder="Generate acrostic-ready copy or write your own..." rows={5} /></label><div className="form-actions"><button type="button" className="generate-button" onClick={generateCopy}><Sparkles /> Auto-generate sentences</button><Button type="submit">Launch campaign <ArrowUpRight /></Button></div></form><aside className="campaign-list"><div className="list-heading"><div><span className="tiny-label">ACTIVE CAMPAIGNS</span><h3>Live across the network</h3></div><button>View all <ArrowUpRight /></button></div>{brands.slice(0, 4).map((brand, i) => <div className="campaign-row" key={brand.name}><div className="campaign-logo" style={{ background: brand.color }}>{initials(brand.name)}</div><div className="campaign-info"><b>{brand.name}</b><span>{brand.keyword} · {i % 2 ? 'AI surfaces' : 'Publisher web'}</span></div><div className="campaign-stat"><b>{['482K', '1.2M', '640K', '214K'][i]}</b><span>impressions</span></div><span className="campaign-status">Active</span><button className="row-more">···</button></div>)}</aside></div><div className="paypal-strip"><div className="paypal-icon">P</div><div><b>PayPal sandbox connected</b><span>Payments are simulated for this showcase environment.</span></div><span className="connection-status"><i /> Connected</span><button>Manage settings <ArrowUpRight /></button></div></section>}

      {view === 'about' && <section className="workspace about-workspace"><div className="about-hero"><p className="eyebrow">About acrostic <span>PATENT PENDING</span></p><h1>Useful advertising, built into the answer.</h1><p className="lede">Acrostic turns a sponsor message into a natural, verifiable acrostic inside publisher stories and generative AI responses—without the visual interruption of a banner.</p><div className="about-badges"><span>US patent pending · USPTO</span><span>UK patent pending · UKIPO</span></div></div><div className="about-grid"><article className="about-card"><span className="tiny-label">For PayPal</span><h3>Turn trusted utility into a new revenue surface.</h3><p>PayPal can sponsor helpful, intent-rich moments across commerce answers and publisher content, creating a native path from discovery to action while keeping the experience useful. At platform scale, this infrastructure has the potential to create billions of dollars in revenue by enabling PayPal&apos;s financial innovations to power payment infrastructure for big-tech generative AI companies, media publishers, and text-rich social platforms.</p><ul><li>Higher-context placement than standard display banners</li><li>Designed to remain readable when traditional ad blockers remove banners</li><li>Measurable partner moments across publisher and AI surfaces</li></ul></article><article className="about-card"><span className="tiny-label">For AI companies</span><h3>Make every answer commercially intelligent.</h3><p>Generative AI products can pair relevant partners with answers without interrupting the conversation. The acrostic structure makes sponsorship visible, inspectable, and native to the response.</p><ul><li>Clear sponsored structure rather than hidden influence</li><li>Contextual relevance based on the user’s question</li><li>A new monetization layer that protects answer quality</li></ul></article><article className="about-card wide"><span className="tiny-label">For publishers and journalists</span><h3>A sustainable path for reporting that deserves support.</h3><p>Publishers can offer advertisers a premium, article-aware format while creating a transparent portal for supporting journalists whose reporting helps communities understand the truth.</p><div className="about-callout"><strong>Native by design.</strong><span>Useful content first. Sponsor visibility always. Editorial voice protected.</span></div></article></div></section>}

      <footer className="footer"><span>acrostic / contextual commerce infrastructure</span><span><span className="footer-dot" /> All systems operational</span><span>© 2026 Acrostic Labs</span></footer>

      {checkoutOpen && <div className="modal-backdrop" onClick={() => setCheckoutOpen(false)}><div className="checkout-modal" onClick={(e) => e.stopPropagation()}><button className="modal-close" onClick={() => setCheckoutOpen(false)} aria-label="Close checkout"><X /></button>{activeAdvertPaid ? <div className="success-state"><div className="success-icon"><Check /></div><span className="tiny-label">PAYMENT CONFIRMED</span><h2>{activeBrand.name} is paid.</h2><p>Your payment was approved and this advert is now eligible for publishing and AI-surface delivery.</p><div className="transaction-id"><span>Paid advert</span><b>{activeBrand.name} · {priceForKeyword(activeBrand.keyword)}</b></div><Button onClick={() => setCheckoutOpen(false)}>Back to preview</Button></div> : <><div className="checkout-brand"><div className="paypal-icon">P</div><span>PayPal</span><span className="sandbox-badge">TEST MODE</span></div><span className="tiny-label">PARTNER OFFER</span><h2>{activeBrand.name}</h2><p className="checkout-description">{activeBrand.description}</p><div className="order-summary"><div><span>Contextual partner placement</span><b>1 × Showcase activation</b></div><strong>{priceForKeyword(activeBrand.keyword)}</strong></div><button className="paypal-pay" onClick={payForAdvert}><span className="paypal-wordmark">PayPal</span> Pay securely <ArrowUpRight /></button><span className="checkout-footnote">Use a PayPal Sandbox Personal/Buyer account here, not your live PayPal login or REST app credentials. Approval is required before publishing or AI-surface use.</span></>}</div></div>}
    </main>
  )
}

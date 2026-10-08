import { useEffect, useState } from 'react'
import { Copy, ShoppingBag } from 'lucide-react'
import { publicApi } from '../../lib/api'
import { formatMoney, pick } from '../../lib/format'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { sharePreviewUrl } from '../../lib/sharePreviewUrl'

export default function ProductDetail({ slug, cart, onOpenCart }) {
  const [state, setState] = useState({ status: 'loading', product: null })
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setState({ status: 'loading', product: null })
    publicApi.getProduct(slug, controller.signal)
      .then((product) => setState({ status: 'ready', product }))
      .catch((error) => {
        if (!controller.signal.aborted) setState({ status: error.message?.includes('404') ? 'not-found' : 'error', product: null })
      })
    return () => controller.abort()
  }, [slug])

  const product = state.product
  const name = pick(product, 'name', 'Name')
  useDocumentTitle(name || 'Boutique')

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(sharePreviewUrl('product', slug))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { setCopied(false) }
  }

  return <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
    <a href="/boutique" className="text-sm font-bold text-jso-blue underline">← Boutique</a>
    {state.status === 'loading' && <p role="status" className="mt-8 rounded-2xl bg-white p-8">Chargement du produit…</p>}
    {state.status === 'not-found' && <p role="alert" className="mt-8 rounded-2xl bg-white p-8">Ce produit n'est plus disponible.</p>}
    {state.status === 'error' && <p role="alert" className="mt-8 rounded-2xl bg-white p-8">Impossible de charger ce produit pour le moment.</p>}
    {product && <article className="mt-8 grid overflow-hidden rounded-[2rem] bg-white shadow-xl md:grid-cols-2">
      <div className="grid min-h-72 place-items-center bg-slate-100">
        {pick(product, 'imageUrl', 'ImageUrl')
          ? <img src={pick(product, 'imageUrl', 'ImageUrl')} alt={name} className="h-full max-h-[600px] w-full object-contain" />
          : <ShoppingBag size={64} className="text-slate-300" aria-hidden="true" />}
      </div>
      <div className="flex flex-col p-7 sm:p-10">
        <p className="text-xs font-black uppercase tracking-widest text-jso-blue">{pick(product, 'category', 'Category') || 'Boutique JSO'}</p>
        <h1 className="mt-3 text-3xl font-black text-jso-navy sm:text-4xl">{name}</h1>
        <p className="mt-5 whitespace-pre-line leading-7 text-slate-600">{pick(product, 'description', 'Description')}</p>
        <p className="mt-auto pt-8 text-3xl font-black text-jso-navy">{formatMoney(pick(product, 'price', 'Price'), pick(product, 'currency', 'Currency') || 'TND')}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          {pick(product, 'inStock', 'InStock')
            ? <button type="button" onClick={() => { cart.add({ id: pick(product, 'id', 'Id'), name, price: pick(product, 'price', 'Price'), currency: pick(product, 'currency', 'Currency'), imageUrl: pick(product, 'imageUrl', 'ImageUrl') }); onOpenCart() }} className="rounded-full bg-jso-navy px-6 py-3 font-bold text-white">Ajouter au panier</button>
            : <span className="rounded-full bg-slate-100 px-5 py-3 font-bold text-slate-500">Épuisé</span>}
          <button type="button" onClick={copyLink} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-3 font-bold"><Copy size={16} />{copied ? 'Lien copié' : 'Copier le lien'}</button>
        </div>
      </div>
    </article>}
  </section>
}

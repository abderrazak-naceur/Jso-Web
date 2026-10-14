import { useEffect, useState } from 'react'
import { Link2, Pencil, X, Save, Plus } from 'lucide-react'
import Field from '../components/Field'
import { adminApi } from '../api'
import { emptyProduct } from '../constants'
import { adminEditIdFromPath, adminEditUrl, navigateAdminEdit } from '../adminRoutes'
import { sharePreviewUrl } from '../../lib/sharePreviewUrl'
export default function ShopModule({ onError }) {
  const [products, setProducts] = useState([])
  const [form, setForm] = useState(emptyProduct)
  const [editing, setEditing] = useState(null)
  const [modalOpen, setModalOpen] = useState(Boolean(adminEditIdFromPath('shop')))
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try { setProducts(await adminApi('/admin/shop/products')); onError('') }
    catch (e) { onError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])
  useEffect(() => {
    function syncRoute() {
      const id = adminEditIdFromPath('shop')
      if (!id) { setForm(emptyProduct); setEditing(null); setModalOpen(false); return }
      const item = products.find((product) => String(product.id) === id)
      if (item) { setSelected(item); setModalOpen(true) }
      else if (products.length) onError('Produit admin introuvable.')
    }
    syncRoute()
    window.addEventListener('popstate', syncRoute)
    return () => window.removeEventListener('popstate', syncRoute)
  }, [products, onError])

  async function handleImageFile(file) {
    if (!file) return
    if (!file.type.startsWith('image/')) { onError('Sélectionnez un fichier image (JPG, PNG, WebP…).'); return }
    if (file.size > 8 * 1024 * 1024) { onError('Image trop volumineuse (maximum 8 Mo).'); return }
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(new Error('Lecture de l’image impossible.'))
        reader.readAsDataURL(file)
      })
      const image = await new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error('Fichier image invalide.'))
        img.src = dataUrl
      })
      const maxSide = 1400
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(image.width * scale))
      canvas.height = Math.max(1, Math.round(image.height * scale))
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
      const compressed = canvas.toDataURL('image/jpeg', 0.82)
      if (compressed.length > 2_000_000) { onError('L’image reste trop lourde après compression. Choisissez une image plus petite.'); return }
      setForm(current => ({ ...current, imageUrl: compressed }))
      onError('')
    } catch (e) { onError(e.message || 'Impossible de charger cette image.') }
  }

  function slugify(s) { return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') }
  function setSelected(p) {
    setEditing(p.id)
    setForm({ name: p.name || '', slug: p.slug || '', description: p.description || '', price: p.price ?? '', currency: p.currency || 'TND', imageUrl: p.imageUrl || '', category: p.category || '', stock: p.stock ?? 0, isActive: p.isActive })
  }
  function edit(p) { navigateAdminEdit('shop', p.id); setSelected(p); setModalOpen(true) }
  function reset() { navigateAdminEdit('shop', null); setForm(emptyProduct); setEditing(null); setModalOpen(false) }
  async function copyAdminLink(p) { try { await navigator.clipboard.writeText(window.location.origin + adminEditUrl('shop', p.id)) } catch { onError('Impossible de copier le lien admin.') } }
  async function copyPublicLink(p) { try { await navigator.clipboard.writeText(sharePreviewUrl('product', p.slug)) } catch { onError('Impossible de copier le lien public.') } }

  async function save(e) {
    e.preventDefault()
    try {
      const body = {
        name: form.name.trim(),
        slug: (form.slug.trim() || slugify(form.name)),
        description: form.description.trim() || null,
        price: Number(form.price) || 0,
        currency: (form.currency || 'TND').trim().toUpperCase(),
        imageUrl: form.imageUrl.trim() || null,
        category: form.category.trim() || null,
        stock: Number(form.stock) || 0,
        isActive: form.isActive,
      }
      if (editing) await adminApi('/admin/shop/products/' + editing, { method: 'PUT', body: JSON.stringify(body) })
      else await adminApi('/admin/shop/products', { method: 'POST', body: JSON.stringify(body) })
      reset()
      await load()
    } catch (e) { onError(e.message) }
  }

  async function remove(id) {
    if (!confirm('Supprimer ce produit ?')) return
    try { await adminApi('/admin/shop/products/' + id, { method: 'DELETE' }); if (editing === id) reset(); await load() }
    catch (e) { onError(e.message) }
  }

  const money = (n, c) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: c || 'TND' }).format(n || 0)

  useEffect(() => {
    if (!modalOpen) return
    const closeOnEscape = event => { if (event.key === 'Escape') reset() }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [modalOpen])
  return <div className="space-y-6">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between"><h2 className="text-xl font-black">Boutique — Produits</h2><button type="button" onClick={() => { setForm(emptyProduct); setEditing(null); setModalOpen(true) }} className="rounded-xl bg-jso-navy px-3 py-2 font-bold text-white"><Plus size={16} className="inline mr-1"/>Nouveau produit</button></div>
      <div className="mt-5 overflow-x-auto">
        {loading ? <p className="text-sm text-slate-400">Chargement…</p>
          : products.length === 0 ? <p className="text-sm text-slate-400">Aucun produit pour le moment.</p>
          : <table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-400"><th className="p-2">Produit</th><th className="p-2">Prix</th><th className="p-2">Stock</th><th className="p-2">Actif</th><th className="p-2"></th></tr></thead><tbody>{products.map(p => <tr key={p.id} className="border-b last:border-0"><td className="p-2"><b>{p.name}</b><div className="text-xs text-slate-400">{p.category || '—'}</div></td><td className="p-2 whitespace-nowrap">{money(p.price, p.currency)}</td><td className="p-2">{p.stock}</td><td className="p-2">{p.isActive ? 'Oui' : 'Non'}</td><td className="p-2 whitespace-nowrap"><button type="button" onClick={() => edit(p)} title="Modifier" className="mr-2 text-jso-blue"><Pencil size={16}/></button><button type="button" onClick={() => copyAdminLink(p)} title="Copier le lien admin" className="mr-2 text-jso-blue"><Link2 size={16}/></button>{p.isActive && p.slug && <><a href={'/boutique/' + encodeURIComponent(p.slug)} target="_blank" rel="noopener noreferrer" title="Voir le produit" className="mr-2 text-jso-blue">Voir</a><button type="button" onClick={() => copyPublicLink(p)} title="Copier le lien public" className="mr-2 text-xs font-bold text-jso-blue">Copier</button></>}<button type="button" onClick={() => remove(p.id)} title="Supprimer" className="text-red-600"><X size={16}/></button></td></tr>)}</tbody></table>}
      </div>
    </div>
    {modalOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6" onMouseDown={e => { if(e.target===e.currentTarget) reset() }}>
      <section role="dialog" aria-modal="true" aria-labelledby="admin-form-title" className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <h2 id="admin-form-title" className="text-xl font-black">{editing ? 'Modifier' : 'Créer'} · produit</h2>
          <button type="button" aria-label="Fermer" onClick={reset} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20}/></button>
        </div>
        <form onSubmit={save} className="mt-5 space-y-3">
        <Field label="Nom" value={form.name} onChange={e => setForm({ ...form, name: e.target.value, slug: editing ? form.slug : slugify(e.target.value) })} required/>
        <Field label="Slug" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} required/>
        <label className="block text-sm font-bold">Description<textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows="3" className="mt-2 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-jso-blue"/></label>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prix" type="number" step="0.01" min="0" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required/>
          <Field label="Devise" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}/>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Stock" type="number" min="0" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })}/>
          <Field label="Catégorie" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}/>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-bold">Photo du produit <span className="font-normal text-slate-500">(choisir depuis votre ordinateur)</span>
            <input type="file" accept="image/*" onChange={e => handleImageFile(e.target.files?.[0])} className="mt-2 block w-full rounded-xl border border-slate-200 p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-bold"/>
          </label>
          {form.imageUrl && <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
            <img src={form.imageUrl} alt="Aperçu du produit" className="h-24 w-24 rounded-lg object-cover" />
            <div className="flex-1 text-sm text-slate-600">Aperçu de l’image qui sera enregistrée avec le produit.</div>
            <button type="button" onClick={() => setForm({ ...form, imageUrl: '' })} className="rounded-lg px-3 py-2 text-sm font-bold text-red-600">Supprimer</button>
          </div>}
          <details className="text-sm"><summary className="cursor-pointer font-semibold text-slate-500">Ou saisir une URL d’image</summary><div className="mt-2"><Field label="URL de l’image" value={form.imageUrl.startsWith('data:') ? '' : form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })}/></div></details>
        </div>
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })}/> Actif (visible dans la boutique)</label>
        <div className="flex gap-2 pt-2"><button className="flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white"><Save size={16}/> {editing ? 'Mettre à jour' : 'Créer'}</button>{editing && <button type="button" onClick={reset} className="rounded-xl px-4 py-2.5 font-bold text-slate-500 hover:bg-slate-100">Annuler</button>}</div>
      </form>
      </section>
    </div>}
  </div>
}
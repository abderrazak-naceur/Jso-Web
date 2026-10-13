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
        <Field label="Image URL" value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })}/>
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })}/> Actif (visible dans la boutique)</label>
        <div className="flex gap-2 pt-2"><button className="flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white"><Save size={16}/> {editing ? 'Mettre à jour' : 'Créer'}</button>{editing && <button type="button" onClick={reset} className="rounded-xl px-4 py-2.5 font-bold text-slate-500 hover:bg-slate-100">Annuler</button>}</div>
      </form>
      </section>
    </div>}
  </div>
}

import { useEffect, useState } from 'react'
import { adminApi } from '../api'
export default function ShopModule({ onError }) {
  const [products, setProducts] = useState([])
  const [form, setForm] = useState(emptyProduct)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try { setProducts(await adminApi('/admin/shop/products')); onError('') }
    catch (e) { onError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  function slugify(s) { return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') }
  function edit(p) {
    setEditing(p.id)
    setForm({ name: p.name || '', slug: p.slug || '', description: p.description || '', price: p.price ?? '', currency: p.currency || 'TND', imageUrl: p.imageUrl || '', category: p.category || '', stock: p.stock ?? 0, isActive: p.isActive })
  }
  function reset() { setForm(emptyProduct); setEditing(null) }

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
    try { await adminApi('/admin/shop/products/' + id, { method: 'DELETE' }); await load() }
    catch (e) { onError(e.message) }
  }

  const money = (n, c) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: c || 'TND' }).format(n || 0)

  return <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-black">Boutique — Produits</h2>
      <div className="mt-5 overflow-x-auto">
        {loading ? <p className="text-sm text-slate-400">Chargement…</p>
          : products.length === 0 ? <p className="text-sm text-slate-400">Aucun produit. Créez le premier avec le formulaire.</p>
          : <table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-400"><th className="p-2">Produit</th><th className="p-2">Prix</th><th className="p-2">Stock</th><th className="p-2">Actif</th><th className="p-2"></th></tr></thead><tbody>{products.map(p => <tr key={p.id} className="border-b last:border-0"><td className="p-2"><b>{p.name}</b><div className="text-xs text-slate-400">{p.category || '—'}</div></td><td className="p-2 whitespace-nowrap">{money(p.price, p.currency)}</td><td className="p-2">{p.stock}</td><td className="p-2">{p.isActive ? 'Oui' : 'Non'}</td><td className="p-2 whitespace-nowrap"><button onClick={() => edit(p)} className="mr-2 text-jso-blue"><Pencil size={16}/></button><button onClick={() => remove(p.id)} className="text-red-600"><X size={16}/></button></td></tr>)}</tbody></table>}
      </div>
    </div>
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-black">{editing ? 'Modifier le produit' : 'Nouveau produit'}</h2>
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
    </div>
  </div>
}

import { useEffect, useState } from 'react'
import { CheckCircle2, CircleAlert, Copy, CreditCard, ExternalLink, KeyRound, Landmark, Smartphone } from 'lucide-react'
import { adminApi } from '../api'

function Status({ configured }) {
  return configured
    ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700"><CheckCircle2 size={14}/> Configuré</span>
    : <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700"><CircleAlert size={14}/> À configurer</span>
}

function Variable({ name }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard?.writeText(name)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }
  return <button type="button" onClick={copy} className="flex w-full items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-left font-mono text-xs text-slate-600 hover:bg-slate-100">
    <span className="break-all">{name}</span><Copy size={14} className="shrink-0"/>
    {copied && <span className="text-[10px] font-bold text-emerald-600">Copié</span>}
  </button>
}

function ProviderCard({ icon: Icon, title, description, configured, children }) {
  return <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-jso-navy text-jso-gold"><Icon size={20}/></div>
        <div><h3 className="text-lg font-black">{title}</h3><p className="mt-1 text-sm text-slate-500">{description}</p></div>
      </div>
      <Status configured={configured}/>
    </div>
    {children}
  </section>
}

export default function PaymentSettingsModule({ onError = () => {} }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    try { setData(await adminApi('/admin/payment-config')); onError('') }
    catch (e) { onError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  if (loading) return <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 text-sm text-slate-500">Chargement de la configuration des paiements…</div>
  if (!data) return null

  return <div className="space-y-5">
    <div className="rounded-[1.5rem] bg-jso-navy p-6 text-white">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-jso-gold">Paiements</p>
      <h2 className="mt-2 text-2xl font-black">Configuration des moyens de paiement</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">
        Les clés secrètes ne sont jamais enregistrées dans le frontend ni dans la base de données. Elles doivent être ajoutées aux variables d’environnement du service API sur Render. Cette page vérifie ensuite automatiquement leur présence.
      </p>
    </div>

    <ProviderCard icon={Smartphone} title="Flouci — Tunisie" description="Paiement local TND pour les supporters en Tunisie." configured={data.flouci.configured}>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">Variables Render</p>
          <div className="mt-3 space-y-2">{data.flouci.variables.map(v => <Variable key={v} name={v}/>)}</div>
          <p className="mt-3 text-xs text-slate-500">Les valeurs ne sont jamais affichées dans l’admin.</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-4 text-sm">
          <p className="font-black">À faire dans Render</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-slate-600">
            <li>Créer/ouvrir le compte marchand Flouci du club.</li>
            <li>Récupérer App Token et App Secret.</li>
            <li>Ajouter les 2 secrets et le secret webhook dans <b>jso-api → Environment</b>.</li>
            <li>Redéployer l’API puis revenir ici et vérifier « Configuré ».</li>
          </ol>
          <p className="mt-3 text-xs text-slate-500">Webhook et URL de retour doivent pointer vers l’API publique JSO.</p>
        </div>
      </div>
    </ProviderCard>

    <ProviderCard icon={CreditCard} title="Stripe — international" description="Paiements internationaux et cartes hors Tunisie." configured={data.stripe.configured}>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">Variables Render</p>
          <div className="mt-3 space-y-2">{data.stripe.variables.map(v => <Variable key={v} name={v}/>)}</div>
          <p className="mt-3 text-xs text-slate-500">Devise actuelle : <b>{data.stripe.currency}</b> · taux TND → devise : <b>{data.stripe.rate}</b></p>
        </div>
        <div className="rounded-xl bg-slate-50 p-4 text-sm">
          <p className="font-black">Important</p>
          <p className="mt-2 text-slate-600">Le taux de conversion est une configuration métier, pas un taux de change temps réel. Il faut le mettre à jour avant d’utiliser Stripe.</p>
        </div>
      </div>
    </ProviderCard>

    <div className="grid gap-5 lg:grid-cols-3">
      <ProviderCard icon={Landmark} title="Virement bancaire" description={data.bankTransfer.description} configured={data.bankTransfer.configured}>
        <p className="mt-4 text-sm text-slate-500">À ajouter quand les coordonnées bancaires et le workflow de validation sont définis.</p>
      </ProviderCard>
      <ProviderCard icon={KeyRound} title="iPay / D17 / e-DINAR" description={data.ipay.description} configured={data.ipay.configured}>
        <p className="mt-4 text-sm text-slate-500">Les identifiants du prestataire sont nécessaires avant activation.</p>
      </ProviderCard>
      <ProviderCard icon={CheckCircle2} title="Espèces" description={data.cash.description} configured={data.cash.configured}>
        <p className="mt-4 text-sm text-slate-500">Déjà disponible pour les vendeurs et boutiques autorisés, avec reçu et WhatsApp optionnel.</p>
      </ProviderCard>
    </div>
  </div>
}

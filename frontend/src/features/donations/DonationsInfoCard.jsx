import { HeartHandshake } from 'lucide-react'

export default function DonationsInfoCard() {
  return (
    <section className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <div className="rounded-[2rem] bg-jso-navy p-7 text-white sm:p-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-jso-gold">Soutenir la JSO</p>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">Un petit geste. Un grand impact.</h2>
              <p className="mt-3 text-sm leading-6 text-white/65">Aidez la Jeunesse Sportive de Oudhref à poursuivre son projet sportif et associatif.</p>
            </div>
            <a href="/soutenir" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-jso-gold px-6 py-3 font-extrabold text-jso-navy hover:bg-white">
              Faire un don <HeartHandshake size={17} aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function Field({ label, ...props }) {
  return <label className="block text-sm font-bold">{label}<input {...props} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue" /></label>
}

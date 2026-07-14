export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-8 bg-surface px-4">
      <span className="text-2xl font-semibold tracking-tight text-primary">
        Dompet Digital
      </span>
      {children}
    </div>
  )
}

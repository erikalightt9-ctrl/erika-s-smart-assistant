export default function SignLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f3f4f6" }}>
      {/* Minimal branded header */}
      <header className="bg-white border-b px-6 py-3 flex items-center gap-3 shadow-sm">
        <div
          className="h-8 w-8 rounded-md flex items-center justify-center text-white font-bold text-sm shrink-0"
          style={{ backgroundColor: "#0a1628" }}
        >
          A
        </div>
        <div>
          <div className="text-sm font-bold tracking-tight" style={{ color: "#0a1628" }}>
            AILE
          </div>
          <div className="text-[10px] text-gray-400 leading-none">
            GDS Capital · Secure Document Signing
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
          <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
          Secure Session
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">{children}</main>

      <footer className="text-center py-6 text-xs text-gray-400">
        This is a secure document signing portal.{" "}
        <span className="font-medium text-gray-500">GDS Capital</span> · Powered by AILE
      </footer>
    </div>
  );
}

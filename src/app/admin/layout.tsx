export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-red-900 text-white p-6 shrink-0">
        <div className="font-bold text-xl mb-8">Admin Control</div>
        <nav className="flex flex-col gap-4">
          <a href="/admin?tab=users" className="hover:text-red-300">Users</a>
          <a href="/admin?tab=draws" className="hover:text-red-300">Draws</a>
          <a href="/admin?tab=charities" className="hover:text-red-300">Charities</a>
          <a href="/admin?tab=winners" className="hover:text-red-300">Winners</a>
          <a href="/admin?tab=reports" className="hover:text-red-300">Reports</a>
        </nav>
      </aside>
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
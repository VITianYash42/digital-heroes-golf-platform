export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <nav className="bg-gray-900 text-white p-4 flex justify-between">
        <div className="font-bold text-lg">Charity Golf // Dashboard</div>
        <div className="flex gap-4">
          <a href="/dashboard" className="hover:text-blue-300">Overview</a>
          <a href="/dashboard/scores" className="hover:text-blue-300">Scores</a>
          <a href="/dashboard/settings" className="hover:text-blue-300">Settings</a>
        </div>
      </nav>
      {children}
    </div>
  )
}
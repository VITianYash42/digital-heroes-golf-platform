import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Charity Golf Platform',
  description: 'Make an impact through golf.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
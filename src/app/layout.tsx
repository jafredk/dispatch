import './globals.css'

export const metadata = {
  title: 'Dispatch',
  description: 'Dispatch - Next.js + TypeScript + Tailwind'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  )
}

export const metadata = {
  title: 'FleetOps admin',
  description: 'Admin Dashboard UI built with Shadcn and Next.js',
}

import '../src/index.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="group/body">{children}</body>
    </html>
  )
}


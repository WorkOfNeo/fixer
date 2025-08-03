import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AppLayout } from '@/components/AppLayout'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '2-BIZ Stock Checker',
  description: 'AI-powered business operations system for stock checking, sales orders, and customer management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AppLayout>
          {children}
        </AppLayout>
      </body>
    </html>
  )
} 
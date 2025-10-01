import { Outlet } from '@tanstack/react-router'
import {
  IconBrowserCheck,
  IconNotification,
  IconPalette,
  IconTool,
  IconUser,
} from '@tabler/icons-react'
import SidebarNav from './components/sidebar-nav'

export default function Settings() {
  return (
    <div className='mx-auto max-w-6xl space-y-10 px-4 py-10'>
      <section className='rounded-4xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-emerald-100/40 px-6 py-8 shadow-sm'>
        <div className='space-y-3 text-slate-700'>
          <span className='inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700'>
            Account toolkit
          </span>
          <h1 className='text-3xl font-semibold text-slate-900'>Settings</h1>
          <p className='max-w-xl text-sm text-slate-600'>Manage credentials, notifications, and how your Hedgetech presence appears to buyers across every environment.</p>
        </div>
      </section>

      <section className='grid gap-6 lg:grid-cols-[0.28fr_1fr]'>
        <aside className='space-y-4'>
          <div className='rounded-3xl border border-slate-200 bg-white p-4 shadow-sm'>
            <SidebarNav items={sidebarNavItems} />
          </div>
          <div className='rounded-3xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-600'>
            <div className='font-semibold text-slate-900'>Need a hand?</div>
            <p className='mt-2'>Visit the seller academy for playbooks on security, branding, and multi-channel operations.</p>
            <a href='/docs/user-guides/seller-guide' className='mt-2 inline-flex items-center text-emerald-700 hover:underline'>View guides →</a>
          </div>
        </aside>
        <div className='rounded-4xl border border-slate-200 bg-white p-6 shadow-sm'>
          <Outlet />
        </div>
      </section>
    </div>
  )
}

const sidebarNavItems = [
  {
    title: 'Profile',
    icon: <IconUser size={18} />,
    href: '/settings',
  },
  {
    title: 'Account',
    icon: <IconTool size={18} />,
    href: '/settings/account',
  },
  {
    title: 'Appearance',
    icon: <IconPalette size={18} />,
    href: '/settings/appearance',
  },
  {
    title: 'Notifications',
    icon: <IconNotification size={18} />,
    href: '/settings/notifications',
  },
  {
    title: 'Display',
    icon: <IconBrowserCheck size={18} />,
    href: '/settings/display',
  },
]

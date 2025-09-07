// @ts-nocheck
import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { db } from '@/lib/data'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Button } from '@/components/ui/button'
import { SearchProvider } from '@/context/search-context'
import { SidebarProvider } from '@/components/ui/sidebar'

export const Route = createFileRoute('/blog/')({
  component: BlogList,
})

function BlogList() {
  const [posts, setPosts] = useState<any[]>([])
  useEffect(() => { (async () => { try { const p = await db.listBlogPosts?.(); setPosts(p || []) } catch {} })() }, [])
  return (
    <SearchProvider>
      <SidebarProvider defaultOpen={false}>
      <Header>
        <Search />
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>
      <Main>
        <div className='mb-4 flex items-center justify-between'>
          <h1 className='text-2xl font-bold'>Blog</h1>
          <div className='flex gap-2'>
            <Link to='/blog/manage'><Button variant='outline'>Manage</Button></Link>
            <Link to='/blog/new'><Button>New post</Button></Link>
          </div>
        </div>
        <div className='grid gap-4 md:grid-cols-3'>
          {posts.map((p) => (
            <Link key={p.id} to='/blog/$slug' params={{ slug: p.slug }} className='rounded-xl border p-3 hover:shadow'>
              {p.coverImage && <img src={p.coverImage} alt='' className='mb-2 h-40 w-full rounded-lg object-cover' />}
              <div className='font-semibold'>{p.title}</div>
              <div className='mt-1 text-xs text-gray-500'>{new Date(p.createdAt).toLocaleDateString()} {p.published ? '• Published' : '• Draft'}</div>
            </Link>
          ))}
          {posts.length === 0 && <div className='text-sm text-gray-500'>No posts yet.</div>}
        </div>
      </Main>
      </SidebarProvider>
    </SearchProvider>
  )
}

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

export const Route = createFileRoute('/blog/manage')({
  component: ManagePosts,
})

function ManagePosts() {
  const [me, setMe] = useState<any | null>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const user = await db.getMe?.()
        if (!mounted) return
        setMe(user || null)
        const p = await db.listBlogPosts?.(user?.id)
        if (!mounted) return
        setPosts(p || [])
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  async function remove(id: string) {
    if (!confirm('Delete this post?')) return
    setBusyId(id)
    try {
      await db.deleteBlogPost?.(id)
      setPosts((arr) => arr.filter((p) => p.id !== id))
    } finally {
      setBusyId(null)
    }
  }

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
            <div>
              <h1 className='text-2xl font-bold'>My Posts</h1>
              {!me && <div className='text-xs text-gray-500'>Sign in to manage your posts.</div>}
            </div>
            <div className='flex gap-2'>
              <Link to='/blog'><Button variant='outline'>View blog</Button></Link>
              <Link to='/blog/new'><Button>New post</Button></Link>
            </div>
          </div>

          {loading ? (
            <div className='text-sm text-gray-500'>Loading…</div>
          ) : posts.length === 0 ? (
            <div className='text-sm text-gray-500'>No posts yet.</div>
          ) : (
            <div className='grid gap-3'>
              {posts.map((p) => (
                <div key={p.id} className='flex items-center justify-between rounded-lg border p-3'>
                  <div>
                    <div className='font-medium'>{p.title}</div>
                    <div className='text-xs text-gray-500'>
                      {new Date(p.createdAt).toLocaleString()} {p.published ? '• Published' : '• Draft'}
                    </div>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Link to='/blog/$slug' params={{ slug: p.slug }}><Button size='sm' variant='outline'>View</Button></Link>
                    <Link to='/blog/$slug/edit' params={{ slug: p.slug }}><Button size='sm' variant='outline'>Edit</Button></Link>
                    <Button size='sm' variant='destructive' disabled={busyId === p.id} onClick={() => remove(p.id)}>
                      {busyId === p.id ? 'Deleting…' : 'Delete'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Main>
      </SidebarProvider>
    </SearchProvider>
  )
}


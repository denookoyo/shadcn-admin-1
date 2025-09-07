// @ts-nocheck
import { createFileRoute, Link, useParams } from '@tanstack/react-router'
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

export const Route = createFileRoute('/blog/$slug/')({
  component: BlogPost,
})

function BlogPost() {
  const { slug } = useParams({ from: '/blog/$slug/' })
  const [post, setPost] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const p = await db.getBlogPostBySlug?.(slug)
        if (mounted) setPost(p || null)
      } catch {
        if (mounted) setPost(null)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [slug])

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
            <div className='flex items-center gap-3'>
              <Link to='/blog'><Button variant='outline'>&larr; Back</Button></Link>
              <h1 className='text-2xl font-bold'>{post?.title || 'Post'}</h1>
            </div>
            <div className='text-xs text-gray-500'>
              {post?.createdAt ? new Date(post.createdAt).toLocaleDateString() : null}
              {post?.published ? ' • Published' : post ? ' • Draft' : null}
            </div>
              {post?.slug ? (
                <Link to='/blog/$slug/edit' params={{ slug: post.slug }}>
                  <button className='rounded-md border px-3 py-1.5 text-sm'>Edit</button>
                </Link>
              ) : null}
            </div>
          </div>

          {loading ? (
            <div className='text-sm text-gray-500'>Loading…</div>
          ) : !post ? (
            <div className='text-sm text-gray-500'>Post not found.</div>
          ) : (
            <article className='prose max-w-3xl'>
              {post.coverImage ? (
                <img src={post.coverImage} alt='' className='mb-4 w-full rounded-lg object-cover' />
              ) : null}
              <div className='whitespace-pre-wrap'>{post.content}</div>
            </article>
          )}
        </Main>
      </SidebarProvider>
    </SearchProvider>
  )
}


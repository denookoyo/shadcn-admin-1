// @ts-nocheck
import { createFileRoute, useNavigate, useParams, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { db } from '@/lib/data'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Button } from '@/components/ui/button'
import { BlogEditor, type BlogDraft } from '@/features/blog/editor'
import { SearchProvider } from '@/context/search-context'
import { SidebarProvider } from '@/components/ui/sidebar'

export const Route = createFileRoute('/blog/$slug/edit')({
  component: EditPost,
})

function EditPost() {
  const navigate = useNavigate()
  const { slug } = useParams({ from: '/blog/$slug/edit' })
  const [post, setPost] = useState<any | null>(null)
  const [draft, setDraft] = useState<BlogDraft>({ title: '', slug: '', coverImage: '', tags: '', content: '', published: false })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const p = await db.getBlogPostBySlug?.(slug)
        if (!mounted) return
        setPost(p || null)
        if (p) {
          setDraft({
            title: p.title || '',
            slug: p.slug || '',
            coverImage: p.coverImage || '',
            tags: Array.isArray(p.tags) ? p.tags.join(', ') : '',
            content: p.content || '',
            published: !!p.published,
          })
        }
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [slug])

  const canSave = useMemo(() => draft.title && draft.slug, [draft])

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
          <div className='mb-3 flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <Link to='/blog/$slug' params={{ slug }}><Button variant='outline'>&larr; Back</Button></Link>
              <h1 className='text-2xl font-bold'>Edit post</h1>
            </div>
            <div className='flex gap-2'>
              <Button variant='outline' onClick={() => navigate({ to: '/blog/$slug', params: { slug } })}>Cancel</Button>
              <Button disabled={!canSave || saving} onClick={async () => {
                if (!post?.id) return
                setSaving(true)
                try {
                  const tags = draft.tags.split(',').map((t) => t.trim()).filter(Boolean)
                  await db.updateBlogPost?.(post.id, { title: draft.title, slug: draft.slug, content: draft.content, coverImage: draft.coverImage || null, tags, published: draft.published })
                  const nextSlug = draft.slug || slug
                  navigate({ to: '/blog/$slug', params: { slug: nextSlug } })
                } finally { setSaving(false) }
              }}>{saving ? 'Saving…' : 'Save changes'}</Button>
            </div>
          </div>

          {loading ? (
            <div className='text-sm text-gray-500'>Loading…</div>
          ) : !post ? (
            <div className='text-sm text-gray-500'>Post not found.</div>
          ) : (
            <BlogEditor value={draft} onChange={setDraft} onGenerate={undefined} />
          )}
        </Main>
      </SidebarProvider>
    </SearchProvider>
  )
}

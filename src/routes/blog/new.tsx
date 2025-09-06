import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { db } from '@/lib/data'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Button } from '@/components/ui/button'
import { BlogEditor, type BlogDraft } from '@/features/blog/editor'

export const Route = createFileRoute('/blog/new')({
  component: NewPost,
})

function NewPost() {
  const navigate = useNavigate()
  const [draft, setDraft] = useState<BlogDraft>({ title: '', slug: '', coverImage: '', tags: '', content: '', published: false })
  const [saving, setSaving] = useState(false)
  return (
    <>
      <Header>
        <Search />
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>
      <Main>
        <div className='mb-3 flex items-center justify-between'>
          <h1 className='text-2xl font-bold'>New post</h1>
          <div className='flex gap-2'>
            <Button variant='outline' onClick={() => navigate({ to: '/blog' })}>Cancel</Button>
            <Button disabled={saving} onClick={async () => {
              setSaving(true)
              try {
                const tags = draft.tags.split(',').map((t) => t.trim()).filter(Boolean)
                await db.createBlogPost?.({ title: draft.title, slug: draft.slug, content: draft.content, coverImage: draft.coverImage, tags, published: draft.published })
                navigate({ to: '/blog/$slug', params: { slug: draft.slug } })
              } finally { setSaving(false) }
            }}>{saving ? 'Saving…' : 'Save post'}</Button>
          </div>
        </div>
        <BlogEditor value={draft} onChange={setDraft} onGenerate={undefined} />
      </Main>
    </>
  )
}


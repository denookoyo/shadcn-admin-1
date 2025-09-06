import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

function mdToHtml(md: string) {
  const esc = escapeHtml(md)
  // headings, bold, italic, bullets, code
  return esc
    .replace(/^###\s(.+)$/gm, '<h3>$1</h3>')
    .replace(/^##\s(.+)$/gm, '<h2>$1</h2>')
    .replace(/^#\s(.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^\-\s(.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)(\n?)/gs, '<ul>$1</ul>')
    .replace(/\n\n+/g, '</p><p>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>')
}

export type BlogDraft = {
  title: string
  slug: string
  coverImage?: string
  tags: string
  content: string
  published: boolean
}

export function BlogEditor({ value, onChange, onGenerate }: { value: BlogDraft; onChange: (p: BlogDraft) => void; onGenerate?: () => void }) {
  const [preview, setPreview] = useState(false)

  return (
    <div className='grid gap-3'>
      <div className='grid gap-3 md:grid-cols-3'>
        <div>
          <Label htmlFor='blog-title'>Title</Label>
          <Input id='blog-title' value={value.title} onChange={(e) => onChange({ ...value, title: e.target.value, slug: slugify(e.target.value) })} />
        </div>
        <div>
          <Label htmlFor='blog-slug'>Slug</Label>
          <Input id='blog-slug' value={value.slug} onChange={(e) => onChange({ ...value, slug: e.target.value })} />
        </div>
        <div>
          <Label htmlFor='blog-cover'>Cover image URL</Label>
          <Input id='blog-cover' value={value.coverImage || ''} onChange={(e) => onChange({ ...value, coverImage: e.target.value })} />
        </div>
        <div className='md:col-span-3'>
          <Label htmlFor='blog-tags'>Tags (comma separated)</Label>
          <Input id='blog-tags' value={value.tags} onChange={(e) => onChange({ ...value, tags: e.target.value })} />
        </div>
      </div>
      <div className='flex items-center gap-2'>
        <div className='text-sm font-medium'>Content</div>
        <div className='ml-auto flex gap-2'>
          {onGenerate && (
            <Button type='button' variant='outline' onClick={onGenerate}>AI Assist</Button>
          )}
          <Button type='button' variant='outline' onClick={() => setPreview((p) => !p)}>{preview ? 'Edit' : 'Preview'}</Button>
        </div>
      </div>
      {preview ? (
        <div className='prose max-w-none rounded-md border p-4' dangerouslySetInnerHTML={{ __html: mdToHtml(value.content || '') }} />
      ) : (
        <div className='rounded-md border'>
          <div className='flex flex-wrap gap-2 border-b p-2 text-xs'>
            <Button type='button' variant='ghost' onClick={() => onChange({ ...value, content: value.content + '\n\n## Subheading' })}>H2</Button>
            <Button type='button' variant='ghost' onClick={() => onChange({ ...value, content: value.content + '\n\n- Bullet point' })}>• List</Button>
            <Button type='button' variant='ghost' onClick={() => onChange({ ...value, content: value.content + '\n\n**bold** and *italic*' })}>B/I</Button>
          </div>
          <textarea className='h-72 w-full resize-y p-3 outline-none' placeholder='Write your story in Markdown…'
            value={value.content}
            onChange={(e) => onChange({ ...value, content: e.target.value })} />
        </div>
      )}
      <div className='flex items-center gap-2'>
        <input id='blog-published' type='checkbox' checked={value.published} onChange={(e) => onChange({ ...value, published: e.target.checked })} />
        <Label htmlFor='blog-published'>Publish</Label>
      </div>
    </div>
  )
}


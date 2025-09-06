import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useEffect, useMemo, useState } from 'react'
import { db, type Product, type Order, type Category } from '@/lib/data'
import { useAuthStore } from '@/stores/authStore'
import { Link } from '@tanstack/react-router'

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

export default function Dashboard() {
  const { user } = useAuthStore((s) => s.auth)
  const uid = (user as any)?.id as number | undefined
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState({
    title: '',
    price: 0,
    type: 'goods' as Product['type'],
    seller: 'You',
    img: '',
    images: '' as string,
    description: '' as string,
    slug: '',
    categoryId: '' as string,
  })
  const [generating, setGenerating] = useState(false)
  const [catDialog, setCatDialog] = useState(false)
  const [catForm, setCatForm] = useState({ name: '', slug: '' })
  const [catEditingId, setCatEditingId] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const [prods, ords, cats] = await Promise.all([
        db.listProducts(),
        db.listOrders(),
        db.listCategories?.() ?? Promise.resolve([] as Category[]),
      ])
      if (!mounted) return
      setProducts(prods)
      setOrders(ords)
      setCategories(cats)
    })()
    return () => {
      mounted = false
    }
  }, [uid])

  const totalRevenue = useMemo(() => orders.reduce((a, o) => a + o.total, 0), [orders])

  function resetForm() {
    setForm({ title: '', price: 0, type: 'goods', seller: 'You', img: '', images: '', description: '', slug: '', categoryId: '' })
    setEditing(null)
  }

  async function handleSave() {
    const imagesArr = (form.images || '')
      .split(/\n|,/)
      .map((s) => s.trim())
      .filter(Boolean)

    const payload = {
      title: form.title,
      price: Number(form.price) || 0,
      type: form.type,
      seller: form.seller || 'You',
      img: form.img,
      slug: form.slug || slugify(form.title),
      categoryId: form.categoryId || undefined,
      ...(imagesArr.length ? { images: imagesArr } : {}),
      ...(form.description ? { description: form.description } : {}),
    }
    if (editing) {
      const updated = await db.updateProduct(editing.id, payload)
      if (updated) setProducts((ps) => ps.map((p) => (p.id === updated.id ? updated : p)))
    } else {
      const created = await db.createProduct(payload)
      setProducts((ps) => [created, ...ps])
    }
    setOpen(false)
    resetForm()
  }

  async function handleDelete(id: string) {
    await db.deleteProduct(id)
    setProducts((ps) => ps.filter((p) => p.id !== id))
  }

  return (
    <>
      <Header>
        <TopNav links={[{ title: 'Products', href: '/_authenticated', isActive: true, disabled: false }]} />
        <div className='ml-auto flex items-center space-x-4'>
          <Search />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mb-2 flex items-center justify-between space-y-2'>
          <h1 className='text-2xl font-bold tracking-tight'>Product Management V1</h1>
          <div className='flex items-center space-x-2'>
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
              <DialogTrigger asChild>
                <Button onClick={() => setOpen(true)}>Add Product</Button>
              </DialogTrigger>
              <DialogContent className='max-h-[85vh] overflow-y-auto'>
                <DialogHeader>
                  <DialogTitle>{editing ? 'Edit product' : 'Add product'}</DialogTitle>
                </DialogHeader>
                <div className='grid gap-3'>
                  <div>
                    <Label htmlFor='title'>Title</Label>
                    <Input id='title' value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, slug: slugify(e.target.value) })} />
                  </div>
                <div className='grid gap-3 md:grid-cols-3'>
                    <div>
                      <Label htmlFor='price'>Price (A$)</Label>
                      <Input id='price' type='number' value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
                    </div>
                    <div>
                      <Label htmlFor='type'>Type</Label>
                      <select id='type' className='w-full rounded-md border px-3 py-2' value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Product['type'] })}>
                        <option value='goods'>Goods</option>
                        <option value='service'>Service</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor='seller'>Seller</Label>
                      <Input id='seller' value={form.seller} onChange={(e) => setForm({ ...form, seller: e.target.value })} />
                    </div>
                    <div className='md:col-span-3'>
                      <Label htmlFor='images'>Additional image URLs (comma or newline separated)</Label>
                      <textarea id='images' className='mt-1 w-full rounded-md border px-3 py-2 text-sm' rows={3}
                        value={form.images}
                        onChange={(e) => setForm({ ...form, images: e.target.value })} />
                      <div className='mt-2 flex flex-wrap gap-2'>
                        {form.images.split(/\n|,/).map((u) => u.trim()).filter(Boolean).slice(0,4).map((u,i)=> (
                          <img key={i} src={u} alt={`preview-${i}`} className='h-16 w-16 rounded-md object-cover' />
                        ))}
                      </div>
                    </div>
                    <div className='md:col-span-3 grid grid-cols-3 gap-3 items-end'>
                      <div className='col-span-2'>
                        <Label htmlFor='category'>Category</Label>
                        <select id='category' className='w-full rounded-md border px-3 py-2' value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                          <option value=''>{categories.length ? 'Select a category' : 'No categories'}</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <Button type='button' variant='outline' onClick={() => { setCatEditingId(null); setCatDialog(true); setCatForm({ name: '', slug: '' }) }}>New</Button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor='img'>Image URL</Label>
                    <Input id='img' value={form.img} onChange={(e) => setForm({ ...form, img: e.target.value })} placeholder='https://images…' />
                  </div>
                  <div>
                    <Label htmlFor='description'>Description</Label>
                    <textarea id='description' className='mt-1 w-full rounded-md border px-3 py-2 text-sm' rows={6}
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })} />
                    <div className='mt-2 flex items-center gap-2'>
                      <Button type='button' variant='outline' disabled={generating}
                        onClick={async () => {
                          setGenerating(true)
                          try {
                            const catName = categories.find((c) => c.id === form.categoryId)?.name
                            const r = await fetch('/api/ai/description', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                title: form.title,
                                price: Number(form.price) || undefined,
                                type: form.type,
                                seller: form.seller,
                                categoryName: catName,
                              }),
                            })
                            if (r.ok) {
                              const j = await r.json()
                              if (j?.description) setForm((f) => ({ ...f, description: j.description }))
                            }
                          } catch {}
                          setGenerating(false)
                        }}
                      >{generating ? 'Generating…' : 'Generate with AI'}</Button>
                      <span className='text-xs text-gray-500'>Uses your OpenAI key</span>
                    </div>
                    <div className='mt-2 rounded-md border p-3'>
                      <div className='mb-1 text-xs font-semibold text-gray-500'>Preview</div>
                      <div className='prose prose-sm max-w-none'>
                        {form.description ? form.description.split(/\n\n+/).map((p,i)=>(<p key={i}>{p}</p>)) : <p className='text-gray-400'>Type a description to preview…</p>}
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor='slug'>Slug</Label>
                    <Input id='slug' value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant='ghost' onClick={() => { setOpen(false); resetForm() }}>Cancel</Button>
                  <Button onClick={handleSave}>{editing ? 'Save changes' : 'Create product'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs orientation='vertical' defaultValue='products' className='space-y-4'>
          <div className='w-full overflow-x-auto pb-2'>
            <TabsList>
              <TabsTrigger value='products'>Products</TabsTrigger>
              <TabsTrigger value='orders'>Orders</TabsTrigger>
              <TabsTrigger value='analytics'>Analytics</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value='products' className='space-y-4'>
            <Card>
              <CardHeader>
                <CardTitle>Products ({products.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='w-full overflow-x-auto'>
                  <table className='w-full text-sm'>
                    <thead>
                      <tr className='border-b text-left text-xs text-gray-500'>
                        <th className='py-2 pr-4'>Title</th>
                        <th className='py-2 pr-4'>Type</th>
                        <th className='py-2 pr-4'>Category</th>
                        <th className='py-2 pr-4'>Price</th>
                        <th className='py-2 pr-4'>Seller</th>
                        <th className='py-2 pr-4'>Slug</th>
                        <th className='py-2 pr-4 text-right'>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((p) => (
                        <tr key={p.id} className='border-b'>
                          <td className='py-2 pr-4'>
                            <div className='flex items-center gap-2'>
                              {p.img && <img src={p.img} alt='' className='h-8 w-8 rounded object-cover' />}
                              <div className='font-medium'>{p.title}</div>
                            </div>
                          </td>
                          <td className='py-2 pr-4'>{p.type}</td>
                          <td className='py-2 pr-4'>{categories.find((c) => c.id === p.categoryId)?.name || '-'}</td>
                          <td className='py-2 pr-4'>A${p.price}</td>
                          <td className='py-2 pr-4'>{p.seller}</td>
                          <td className='py-2 pr-4'>{p.slug}</td>
                          <td className='py-2 pr-0 text-right'>
                            {(p as any).ownerId === uid ? (
                              <>
                                <Button
                                  variant='outline'
                                  size='sm'
                                  className='mr-2'
                                  onClick={() => {
                                    setEditing(p)
                                    setForm({
                                      title: p.title,
                                      price: p.price,
                                      type: p.type,
                                      seller: p.seller,
                                      img: p.img,
                                      images: Array.isArray((p as any).images) ? (p as any).images.join(',') : '',
                                      description: (p as any).description || '',
                                      slug: p.slug,
                                      categoryId: p.categoryId || '',
                                    })
                                    setOpen(true)
                                  }}
                                >
                                  Edit
                                </Button>
                                <Button variant='destructive' size='sm' className='mr-2' onClick={() => handleDelete(p.id)}>Delete</Button>
                              </>
                            ) : null}
                            <Link to='/marketplace/listing/$slug' params={{ slug: p.slug }} className='inline-flex items-center rounded-md border px-2 py-1 text-sm'>View</Link>
                          </td>
                        </tr>
                      ))}
                      {products.length === 0 && (
                        <tr>
                          <td colSpan={6} className='py-6 text-center text-gray-500'>No products found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='orders' className='space-y-4'>
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
              <Card>
                <CardHeader>
                  <CardTitle>Total revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>A${totalRevenue}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>{orders.length}</div>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Recent orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='w-full overflow-x-auto'>
                  <table className='w-full text-sm'>
                    <thead>
                      <tr className='border-b text-left text-xs text-gray-500'>
                        <th className='py-2 pr-4'>Order ID</th>
                        <th className='py-2 pr-4'>Date</th>
                        <th className='py-2 pr-4'>Items</th>
                        <th className='py-2 pr-4'>Total</th>
                        <th className='py-2 pr-4'>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => (
                        <tr key={o.id} className='border-b'>
                          <td className='py-2 pr-4 font-mono text-xs'>{o.id}</td>
                          <td className='py-2 pr-4'>{new Date(o.createdAt).toLocaleString()}</td>
                          <td className='py-2 pr-4'>{o.items.length}</td>
                          <td className='py-2 pr-4'>A${o.total}</td>
                          <td className='py-2 pr-4'>{o.status}</td>
                        </tr>
                      ))}
                      {orders.length === 0 && (
                        <tr>
                          <td colSpan={5} className='py-6 text-center text-gray-500'>No orders yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='analytics' className='space-y-4'>
            <Card>
              <CardHeader>
                <CardTitle>Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='mb-3 flex gap-2'>
                  <Button variant='outline' onClick={() => { setCatEditingId(null); setCatDialog(true); setCatForm({ name: '', slug: '' }) }}>New Category</Button>
                </div>
                <div className='w-full overflow-x-auto'>
                  <table className='w-full text-sm'>
                    <thead>
                      <tr className='border-b text-left text-xs text-gray-500'>
                        <th className='py-2 pr-4'>Name</th>
                        <th className='py-2 pr-4'>Slug</th>
                        <th className='py-2 pr-4 text-right'>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((c) => (
                        <tr key={c.id} className='border-b'>
                          <td className='py-2 pr-4'>{c.name}</td>
                          <td className='py-2 pr-4'>{c.slug}</td>
                          <td className='py-2 pr-0 text-right'>
                            <Button size='sm' variant='outline' className='mr-2' onClick={() => { setCatEditingId(c.id); setCatForm({ name: c.name, slug: c.slug }); setCatDialog(true) }}>Edit</Button>
                            <Button size='sm' variant='destructive' onClick={async () => { await db.deleteCategory?.(c.id); setCategories((cs) => cs.filter((x) => x.id !== c.id)) }}>Delete</Button>
                          </td>
                        </tr>
                      ))}
                      {categories.length === 0 && (
                        <tr><td colSpan={3} className='py-6 text-center text-gray-500'>No categories yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={catDialog} onOpenChange={(v) => { setCatDialog(v); if (!v) setCatEditingId(null) }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Category</DialogTitle>
            </DialogHeader>
            <div className='grid gap-3'>
              <div>
                <Label htmlFor='cat-name'>Name</Label>
                <Input id='cat-name' value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value, slug: slugify(e.target.value) })} />
              </div>
              <div>
                <Label htmlFor='cat-slug'>Slug</Label>
                <Input id='cat-slug' value={catForm.slug} onChange={(e) => setCatForm({ ...catForm, slug: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant='ghost' onClick={() => setCatDialog(false)}>Cancel</Button>
              <Button onClick={async () => {
                if (!catForm.name || !catForm.slug) return
                if (catEditingId) {
                  const updated = await db.updateCategory?.(catEditingId, { name: catForm.name, slug: catForm.slug })
                  if (updated) setCategories((cs) => cs.map((x) => (x.id === catEditingId ? updated : x)))
                } else {
                  const created = await db.createCategory?.({ name: catForm.name, slug: catForm.slug })
                  if (created) setCategories((cs) => [created, ...cs])
                }
                setCatDialog(false)
              }}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Main>
    </>
  )
}

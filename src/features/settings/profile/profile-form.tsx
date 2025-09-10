import { z } from 'zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { db } from '@/lib/data'
import { useAuthStore } from '@/stores/authStore'
import { toast } from 'sonner'

const schema = z.object({
  name: z.string().min(2, 'Name is too short').max(60).optional(),
  email: z.string().email(),
  image: z.string().url().optional().or(z.literal('')),
  phoneNo: z.string().optional().or(z.literal('')),
  ABN: z.string().optional().or(z.literal('')),
  bio: z.string().max(160).optional().or(z.literal('')),
})

type Values = z.infer<typeof schema>

export default function ProfileForm() {
  const setUser = useAuthStore((s) => s.auth.setUser)
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: '', email: '', image: '', phoneNo: '', ABN: '', bio: '' } })

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const me = await db.getMe?.()
        if (!mounted || !me) return
        // Reset the form once with fetched data to avoid re-render loops
        form.reset({
          name: me.name ?? '',
          email: me.email,
          image: me.image ?? '',
          phoneNo: me.phoneNo ?? '',
          ABN: me.ABN ?? '',
          bio: me.bio ?? '',
        })
      } catch {}
    })()
    return () => {
      mounted = false
    }
  }, [])

  async function onSubmit(values: Values) {
    try {
      const patch = { name: values.name, image: values.image, phoneNo: values.phoneNo, ABN: values.ABN, bio: values.bio }
      const updated = await db.updateMe?.(patch)
      if (updated) {
        setUser(updated)
        toast.success('Profile updated')
      }
    } catch (e) {
      toast.error('Update failed')
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
        <FormField control={form.control} name='name' render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input placeholder='Your name' {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name='email' render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input {...field} readOnly disabled />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name='image' render={({ field }) => (
          <FormItem>
            <FormLabel>Avatar URL</FormLabel>
            <FormControl>
              <Input placeholder='https://…' {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name='phoneNo' render={({ field }) => (
          <FormItem>
            <FormLabel>Phone</FormLabel>
            <FormControl>
              <Input placeholder='+61…' {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name='ABN' render={({ field }) => (
          <FormItem>
            <FormLabel>ABN</FormLabel>
            <FormControl>
              <Input placeholder='ABN' {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name='bio' render={({ field }) => (
          <FormItem>
            <FormLabel>Bio</FormLabel>
            <FormControl>
              <Textarea placeholder='Tell us a little bit about yourself' className='resize-none' {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <Button type='submit'>Save changes</Button>
      </form>
    </Form>
  )
}

import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { showSubmittedData } from '@/utils/show-submitted-data'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

// Avoid referencing FileList at module scope during SSR
const isFileList = (val: unknown): val is FileList =>
  typeof FileList !== 'undefined' && val instanceof FileList

const formSchema = z.object({
  file: z
    .any()
    .refine((files) => (typeof FileList === 'undefined' ? true : isFileList(files)), {
      message: 'Please upload a file',
    })
    .refine((files) => (typeof FileList === 'undefined' ? true : (files as FileList).length > 0), {
      message: 'Please upload a file',
    })
    .refine(
      (files) =>
        typeof FileList === 'undefined' ? true : ['text/csv'].includes((files as FileList)?.[0]?.type),
      'Please upload csv format.'
    ),
})

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TasksImportDialog({ open, onOpenChange }: Props) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { file: undefined },
  })

  const fileRef = form.register('file')

  const onSubmit = () => {
    const file = form.getValues('file')

    if (file && file[0]) {
      const fileDetails = {
        name: file[0].name,
        size: file[0].size,
        type: file[0].type,
      }
      showSubmittedData(fileDetails, 'You have imported the following file:')
    }
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        onOpenChange(val)
        form.reset()
      }}
    >
      <DialogContent className='gap-2 sm:max-w-sm'>
        <DialogHeader className='text-left'>
          <DialogTitle>Import Tasks</DialogTitle>
          <DialogDescription>
            Import tasks quickly from a CSV file.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form id='task-import-form' onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name='file'
              render={() => (
                <FormItem className='mb-2 space-y-1'>
                  <FormLabel>File</FormLabel>
                  <FormControl>
                    <Input type='file' {...fileRef} className='h-8' />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter className='gap-2'>
          <DialogClose asChild>
            <Button variant='outline'>Close</Button>
          </DialogClose>
          <Button type='submit' form='task-import-form'>
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

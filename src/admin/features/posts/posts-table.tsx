import { useState } from 'react'
import {
  type ColumnDef,
  type SortingState,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  flexRender,
} from '@tanstack/react-table'
import { MoreHorizontal } from 'lucide-react'
import { ConfirmDialog } from '@admin/components/confirm-dialog'
import { DataTableColumnHeader } from '@admin/components/data-table'
import { Badge } from '@admin/components/ui/badge'
import { Button } from '@admin/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@admin/components/ui/dropdown-menu'
import { Input } from '@admin/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@admin/components/ui/table'

export type PostRow = {
  slug: string
  title: string
  date?: string
  draft: boolean
}

const DELETE_FORM_ID = 'delete-post-form'

const duplicateFormId = (slug: string) => `duplicate-${slug}`

function formatDate(date?: string) {
  if (!date) return null
  const value = new Date(date)
  return (
    <time dateTime={value.toISOString()}>
      {value.toLocaleDateString('en-us', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })}
    </time>
  )
}

function StatusBadge({ draft }: { draft: boolean }) {
  return draft ? (
    <Badge variant='secondary'>Draft</Badge>
  ) : (
    <Badge className='bg-primary/10 text-primary'>Published</Badge>
  )
}

function RowActions({
  post,
  onDelete,
}: {
  post: PostRow
  onDelete: (post: PostRow) => void
}) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className='size-8 data-[state=open]:bg-muted'
          aria-label={`Actions for ${post.title}`}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-40'>
        <DropdownMenuItem asChild>
          <a href={`/admin/edit/${post.slug}`}>Edit</a>
        </DropdownMenuItem>
        {!post.draft && (
          <DropdownMenuItem asChild>
            <a href={`/projects/${post.slug}`}>View</a>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <button
            type='submit'
            form={duplicateFormId(post.slug)}
            className='w-full'
          >
            Duplicate
          </button>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant='destructive' onSelect={() => onDelete(post)}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * The Posts list. Status filters and counts stay as server links in the page;
 * this adds text search and sorting. Duplicate and Delete post forms to
 * /api/*, which redirect back to /admin.
 */
export default function PostsTable({ posts }: { posts: PostRow[] }) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [pendingDelete, setPendingDelete] = useState<PostRow | null>(null)

  const columns: ColumnDef<PostRow>[] = [
    {
      accessorKey: 'title',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Title' />
      ),
      cell: ({ row }) => (
        <div className='min-w-0'>
          <a
            href={`/admin/edit/${row.original.slug}`}
            className='font-medium hover:underline'
          >
            {row.original.title}
          </a>
          <p className='text-xs text-muted-foreground'>{row.original.slug}</p>
        </div>
      ),
    },
    {
      id: 'status',
      accessorFn: (post) => (post.draft ? 'Draft' : 'Published'),
      header: 'Status',
      enableSorting: false,
      cell: ({ row }) => <StatusBadge draft={row.original.draft} />,
    },
    {
      accessorKey: 'date',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Date' />
      ),
      sortUndefined: 'last',
      enableGlobalFilter: false,
      cell: ({ row }) => (
        <span className='text-muted-foreground'>
          {formatDate(row.original.date)}
        </span>
      ),
    },
    {
      id: 'actions',
      header: () => <span className='sr-only'>Actions</span>,
      cell: ({ row }) => (
        <RowActions post={row.original} onDelete={setPendingDelete} />
      ),
    },
  ]

  const table = useReactTable({
    data: posts,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, value: string) => {
      const query = value.toLowerCase()
      return (
        row.original.title.toLowerCase().includes(query) ||
        row.original.slug.includes(query)
      )
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const rows = table.getRowModel().rows

  return (
    <div className='mt-6 flex flex-col gap-4'>
      <Input
        type='search'
        placeholder='Filter posts...'
        aria-label='Filter posts'
        value={globalFilter}
        onChange={(event) => setGlobalFilter(event.target.value)}
        className='h-8 w-full sm:w-64'
      />

      <div className='hidden overflow-hidden rounded-md border md:block'>
        <Table aria-label='Posts'>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    scope='col'
                    className={header.id === 'actions' ? 'w-12' : undefined}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className='whitespace-normal'>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className='h-24 text-center text-muted-foreground'
                >
                  No matching posts.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <ul aria-label='Posts' className='grid list-none gap-4 p-0 md:hidden'>
        {rows.map(({ original: post }) => (
          <li key={post.slug} className='rounded-xl border bg-card p-4'>
            <div className='flex items-start justify-between gap-3'>
              <div className='min-w-0'>
                <a
                  href={`/admin/edit/${post.slug}`}
                  className='font-medium hover:underline'
                >
                  {post.title}
                </a>
                <p className='truncate text-xs text-muted-foreground'>
                  {post.slug}
                </p>
              </div>
              <RowActions post={post} onDelete={setPendingDelete} />
            </div>
            <div className='mt-3 flex items-center gap-3 text-sm text-muted-foreground'>
              <StatusBadge draft={post.draft} />
              {formatDate(post.date)}
            </div>
          </li>
        ))}
      </ul>

      {posts.map((post) => (
        <form
          key={post.slug}
          id={duplicateFormId(post.slug)}
          method='post'
          action='/api/duplicate'
          hidden
        >
          <input type='hidden' name='slug' value={post.slug} />
        </form>
      ))}
      <form id={DELETE_FORM_ID} method='post' action='/api/delete' hidden>
        <input type='hidden' name='slug' value={pendingDelete?.slug ?? ''} />
      </form>
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title='Delete this post?'
        desc={`"${pendingDelete?.title ?? ''}" will be removed. This cannot be undone.`}
        confirmText='Delete'
        destructive
        form={DELETE_FORM_ID}
      />
    </div>
  )
}

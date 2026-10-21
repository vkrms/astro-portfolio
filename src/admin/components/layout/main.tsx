import { cn } from '@admin/lib/utils'

/**
 * Padded page body. Renders a <div>: the shell owns the single <main> landmark.
 */
type MainProps = React.HTMLAttributes<HTMLDivElement> & {
  fixed?: boolean
  fluid?: boolean
  ref?: React.Ref<HTMLDivElement>
}

export function Main({ fixed, className, fluid, ...props }: MainProps) {
  return (
    <div
      data-layout={fixed ? 'fixed' : 'auto'}
      className={cn(
        'px-4 py-6',

        // If layout is fixed, make the main container flex and grow
        fixed && 'flex grow flex-col overflow-hidden',

        // If layout is not fluid, set the max-width
        !fluid &&
          '@7xl/content:mx-auto @7xl/content:w-full @7xl/content:max-w-7xl',
        className
      )}
      {...props}
    />
  )
}

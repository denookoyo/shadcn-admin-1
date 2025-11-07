import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Width = 'narrow' | 'default' | 'wide' | 'xl' | 'full'
type Spacing = 'none' | 'sm' | 'md' | 'lg'

const widthClass: Record<Width, string> = {
  narrow: 'max-w-3xl',
  default: 'max-w-5xl',
  wide: 'max-w-6xl',
  xl: 'max-w-7xl',
  full: 'max-w-none',
}

const topSpacingClass: Record<Spacing, string> = {
  none: '',
  sm: 'pt-6',
  md: 'pt-10',
  lg: 'pt-16',
}

const bottomSpacingClass: Record<Spacing, string> = {
  none: '',
  sm: 'pb-6',
  md: 'pb-12',
  lg: 'pb-16',
}

const horizontalPaddingClass = {
  true: 'px-4 sm:px-6 lg:px-8',
  false: '',
} as const

export type MarketplacePageShellProps = {
  children: ReactNode
  className?: string
  width?: Width
  padded?: boolean
  topSpacing?: Spacing
  bottomSpacing?: Spacing
}

/**
 * Provides a consistent content frame for marketplace routes so pages share spacing and max-width rules.
 * The component keeps sensible defaults but allows individual screens to opt into narrower or wider canvases.
 */
export function MarketplacePageShell({
  children,
  className,
  width = 'xl',
  padded = true,
  topSpacing = 'md',
  bottomSpacing = 'md',
}: MarketplacePageShellProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full',
        widthClass[width],
        horizontalPaddingClass[padded ? 'true' : 'false'],
        topSpacingClass[topSpacing],
        bottomSpacingClass[bottomSpacing],
        className
      )}
    >
      {children}
    </div>
  )
}

import { ImgHTMLAttributes } from 'react'

type Props = ImgHTMLAttributes<HTMLImageElement>

export function SafeImg({ src, alt, ...rest }: Props) {
  return (
    <img {...rest} src={typeof src === 'string' ? src : (src as any)} alt={alt} />
  )
}

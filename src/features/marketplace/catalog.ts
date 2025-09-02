import { imageFor } from '@/lib/helpers'
export type SeedItem = {
  title: string
  price: number
  seller: string
  rating: number
  slug: string
  type: 'goods' | 'service'
  img: string
}

export const CATALOG: SeedItem[] = [
  { title: 'Wireless ANC Headphones', price: 229, seller: 'Nova Audio', rating: 4.8, slug: 'anc-headphones', type: 'goods', img: imageFor('modern headphones product', 640, 640) },
  { title: 'Smartphone 128GB', price: 699, seller: 'Metro Gadgets', rating: 4.6, slug: 'smartphone-128', type: 'goods', img: imageFor('modern smartphone product', 640, 640) },
  { title: 'White Sneakers', price: 129, seller: 'Stride Co', rating: 4.5, slug: 'sneakers-white', type: 'goods', img: imageFor('white sneakers product', 640, 640) },
  { title: 'Apartment Cleaning (2h)', price: 89, seller: 'Sparkle Pro', rating: 4.9, slug: 'apartment-cleaning-2h', type: 'service', img: imageFor('apartment cleaning service', 640, 640) },
  { title: 'Portrait Photography (1h)', price: 150, seller: 'LensCraft', rating: 4.7, slug: 'portrait-photography-1h', type: 'service', img: imageFor('portrait photography studio', 640, 640) },
  { title: 'Logo Design Package', price: 320, seller: 'Pixel & Co', rating: 4.8, slug: 'logo-design', type: 'service', img: imageFor('graphic designer at desk', 640, 640) },
  { title: 'Bluetooth Speaker', price: 79, seller: 'Nova Audio', rating: 4.4, slug: 'bt-speaker', type: 'goods', img: imageFor('bluetooth speaker product', 640, 640) },
  { title: 'Professional Plumbing (call-out)', price: 120, seller: 'PipeFix', rating: 4.6, slug: 'plumbing-callout', type: 'service', img: imageFor('plumber tool bag service', 640, 640) },
  { title: '4K Action Camera', price: 249, seller: 'Metro Gadgets', rating: 4.5, slug: 'action-cam-4k', type: 'goods', img: imageFor('action camera product on table', 640, 640) },
  { title: 'UI/UX Audit (2h)', price: 180, seller: 'Design Studio', rating: 4.7, slug: 'uiux-audit', type: 'service', img: imageFor('ui ux design workspace', 640, 640) },
  { title: 'Mechanical Keyboard', price: 159, seller: 'KeyWorks', rating: 4.6, slug: 'mech-keyboard', type: 'goods', img: imageFor('mechanical keyboard product desk', 640, 640) },
  { title: 'Event Photography (2h)', price: 280, seller: 'LensCraft', rating: 4.8, slug: 'event-photo-2h', type: 'service', img: imageFor('event photographer camera', 640, 640) },
]

import type { Product } from '@/shared/types/api'

function mockProduct(
  partial: Pick<Product, 'id' | 'name' | 'value' | 'is_free'> &
    Partial<Pick<Product, 'imageURL' | 'quantity' | 'max_per_user'>>,
): Product {
  return {
    id: partial.id,
    name: partial.name,
    description: '',
    imageURL: partial.imageURL ?? null,
    user_id: '',
    is_free: partial.is_free,
    value: partial.value,
    quantity: partial.quantity ?? 50,
    max_per_user: partial.max_per_user ?? 5,
    type: 'MERCH',
    active: true,
    created_at: '',
    updated_at: '',
    created_by: '',
    last_updated_by: '',
  }
}

const MOCK_GIFT_PRODUCTS: Product[] = [
  mockProduct({
    id: 'gift-mock-1',
    name: 'Ceramic mug',
    value: 4500,
    is_free: false,
    imageURL: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400&h=400&fit=crop',
  }),
  mockProduct({
    id: 'gift-mock-2',
    name: 'Scented candle',
    value: 8900,
    is_free: false,
    imageURL: 'https://images.unsplash.com/photo-1602608648039-f95f50e62d45?w=400&h=400&fit=crop',
  }),
  mockProduct({
    id: 'gift-mock-3',
    name: 'Gift box',
    value: 12000,
    is_free: false,
    imageURL: 'https://images.unsplash.com/photo-1549465228-1b7a206a83d5?w=400&h=400&fit=crop',
  }),
  mockProduct({
    id: 'gift-mock-4',
    name: 'Tote bag',
    value: 0,
    is_free: true,
  }),
  mockProduct({
    id: 'gift-mock-5',
    name: 'Photo frame',
    value: 6500,
    is_free: false,
    imageURL: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=400&h=400&fit=crop',
  }),
  mockProduct({
    id: 'gift-mock-6',
    name: 'Wine set',
    value: 19900,
    is_free: false,
    imageURL: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&h=400&fit=crop',
  }),
  mockProduct({
    id: 'gift-mock-7',
    name: 'Chocolate box',
    value: 7500,
    is_free: false,
    imageURL: 'https://images.unsplash.com/photo-1548907040-4baa42d30517?w=400&h=400&fit=crop',
  }),
  mockProduct({
    id: 'gift-mock-8',
    name: 'Plant vase',
    value: 11000,
    is_free: false,
  }),
  mockProduct({
    id: 'gift-mock-9',
    name: 'Artisan honey jar',
    value: 5200,
    is_free: false,
  }),
  mockProduct({
    id: 'gift-mock-10',
    name: 'Guest book',
    value: 3800,
    is_free: false,
    imageURL: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=400&fit=crop',
  }),
]

export function getMockGiftProducts(): Product[] {
  return MOCK_GIFT_PRODUCTS
}

export const GIFT_PRODUCTS_PER_PAGE = 4

export const USE_MOCK_GIFT_PRODUCTS = true

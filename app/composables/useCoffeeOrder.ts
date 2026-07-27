export type CoffeeStep = 'shops' | 'menu' | 'cart' | 'success'

export interface CoffeeShop {
  id: string
  name: string
  address: string
  city: string
  phone: string
  opening_hours: Record<string, string>
  latitude: number | null
  longitude: number | null
  image_url: string
}

export interface CoffeeMenuItem {
  id: string
  shop_id: string
  name: string
  description: string
  price: number
  image_url: string
  category: 'classic' | 'specialty' | 'tea' | 'pastry' | 'seasonal'
  is_available: boolean
  sort_order: number
}

export type SugarLevel = 'full' | 'half' | 'none'
export type IceLevel = 'normal' | 'less' | 'none'
export type SizeOption = 'small' | 'medium' | 'large'
export type OrderType = 'dine_in' | 'takeout'

export interface CartItem {
  menu_item_id: string
  name: string
  price: number
  quantity: number
  sugar: SugarLevel
  ice: IceLevel
  size: SizeOption
}

export interface OrderResult {
  order_id: string
  pickup_code: string
  order_type: OrderType
  status: string
  items: CartItem[]
  total_amount: number
  created_at: string
}

export function useCoffeeOrder() {
  const currentStep = useState<CoffeeStep>('coffee_step', () => 'shops')
  const selectedShop = useState<CoffeeShop | null>('coffee_shop', () => null)
  const cartItems = useState<CartItem[]>('coffee_cart', () => [])
  const orderType = useState<OrderType>('coffee_order_type', () => 'takeout')
  const currentOrder = useState<OrderResult | null>('coffee_order', () => null)
  const isPlacingOrder = useState<boolean>('coffee_placing', () => false)

  const cartCount = computed(() => cartItems.value.reduce((sum, item) => sum + item.quantity, 0))
  const cartTotal = computed(() => cartItems.value.reduce((sum, item) => sum + item.price * item.quantity, 0))

  function selectShop(shop: CoffeeShop) {
    selectedShop.value = shop
    cartItems.value = []
    currentOrder.value = null
    currentStep.value = 'menu'
  }

  function backToShops() {
    selectedShop.value = null
    cartItems.value = []
    currentOrder.value = null
    currentStep.value = 'shops'
  }

  function addToCart(menuItem: CoffeeMenuItem, sugar: SugarLevel = 'full', ice: IceLevel = 'normal', size: SizeOption = 'medium') {
    const existing = cartItems.value.find(
      i => i.menu_item_id === menuItem.id && i.sugar === sugar && i.ice === ice && i.size === size
    )
    if (existing) {
      existing.quantity += 1
    } else {
      cartItems.value.push({
        menu_item_id: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: 1,
        sugar,
        ice,
        size,
      })
    }
  }

 function updateCartItem(index: number, updates: Partial<CartItem>) {
   if (index >= 0 && index < cartItems.value.length) {
     const item = cartItems.value[index]
     if (item) Object.assign(item, updates)
   }
 }

  function removeCartItem(index: number) {
    if (index >= 0 && index < cartItems.value.length) {
      cartItems.value.splice(index, 1)
    }
    if (cartItems.value.length === 0) {
      currentStep.value = 'menu'
    }
  }

  function setOrderType(type: OrderType) {
    orderType.value = type
  }

  function goToCart() {
    if (cartItems.value.length > 0) {
      currentStep.value = 'cart'
    }
  }

  function backToMenu() {
    currentStep.value = 'menu'
  }

  async function placeOrder() {
    if (cartItems.value.length === 0 || !selectedShop.value) {
      throw new Error('Cart is empty or no shop selected')
    }

    isPlacingOrder.value = true
    try {
      const res = await $fetch<{ data: OrderResult }>('/api/v1/orders', {
        method: 'POST',
        body: {
          shop_id: selectedShop.value.id,
          order_type: orderType.value,
          items: cartItems.value,
        },
      })
      currentOrder.value = res.data
      currentStep.value = 'success'
    } finally {
      isPlacingOrder.value = false
    }
  }

  function resetOrder() {
    currentStep.value = 'shops'
    selectedShop.value = null
    cartItems.value = []
    orderType.value = 'takeout'
    currentOrder.value = null
  }

  return {
    currentStep: readonly(currentStep),
    selectedShop: readonly(selectedShop),
    cartItems: readonly(cartItems),
    orderType: readonly(orderType),
    currentOrder: readonly(currentOrder),
    isPlacingOrder: readonly(isPlacingOrder),
    cartCount,
    cartTotal,

    selectShop,
    backToShops,
    addToCart,
    updateCartItem,
    removeCartItem,
    setOrderType,
    goToCart,
    backToMenu,
    placeOrder,
    resetOrder,
  }
}

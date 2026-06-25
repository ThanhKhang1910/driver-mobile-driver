import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

export interface CartItem {
  food_id: number;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
  description?: string;
}

interface CartContextType {
  cartItems: CartItem[];
  restaurantId: string | null;
  addToCart: (product: Omit<CartItem, 'quantity'>, restaurant_id: string) => void;
  removeFromCart: (foodId: number) => void;
  updateQuantity: (foodId: number, delta: number) => void;
  clearCart: () => void;
  setCart: (newItems: CartItem[], newRestaurantId: string) => void;
  totalAmount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  // Load cart from SecureStore on init
  useEffect(() => {
    const loadCart = async () => {
      const safeGetItemAsync = async (key: string) => {
        try {
          return await Promise.race([
            SecureStore.getItemAsync(key),
            new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
          ]);
        } catch (err) {
          console.warn(`SecureStore error/timeout for ${key}`, err);
          return null;
        }
      };

      try {
        const savedCart = await safeGetItemAsync('cart');
        const savedResId = await safeGetItemAsync('cart_restaurant_id');
        if (savedCart) {
          setCartItems(JSON.parse(savedCart));
        }
        if (savedResId) {
          setRestaurantId(savedResId);
        }
      } catch (e) {
        console.error('Failed to load cart from SecureStore:', e);
      }
    };
    loadCart();
  }, []);

  // Save cart to SecureStore on change
  useEffect(() => {
    const saveCart = async () => {
      try {
        await SecureStore.setItemAsync('cart', JSON.stringify(cartItems));
        if (restaurantId) {
          await SecureStore.setItemAsync('cart_restaurant_id', restaurantId);
        } else {
          await SecureStore.deleteItemAsync('cart_restaurant_id');
        }
      } catch (e) {
        console.error('Failed to save cart to SecureStore:', e);
      }
    };
    saveCart();
  }, [cartItems, restaurantId]);

  const addToCart = (product: Omit<CartItem, 'quantity'>, restaurant_id: string) => {
    // Check if adding from a different restaurant
    if (restaurantId && restaurantId !== restaurant_id) {
      Alert.alert(
        'Tạo giỏ hàng mới?',
        'Thêm món ăn từ nhà hàng khác sẽ xóa các món ăn hiện có trong giỏ hàng.',
        [
          {
            text: 'Hủy',
            style: 'cancel',
          },
          {
            text: 'Đồng ý',
            onPress: () => {
              setCartItems([{ ...product, quantity: 1 }]);
              setRestaurantId(restaurant_id);
            },
          },
        ]
      );
      return;
    }

    setRestaurantId(restaurant_id);
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.food_id === product.food_id);
      if (existingItem) {
        return prevItems.map((item) =>
          item.food_id === product.food_id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        return [...prevItems, { ...product, quantity: 1 }];
      }
    });
  };

  const removeFromCart = (foodId: number) => {
    setCartItems((prevItems) => {
      const newItems = prevItems.filter((item) => item.food_id !== foodId);
      if (newItems.length === 0) {
        setRestaurantId(null);
      }
      return newItems;
    });
  };

  const updateQuantity = (foodId: number, delta: number) => {
    setCartItems((prevItems) => {
      return prevItems.map((item) => {
        if (item.food_id === foodId) {
          return { ...item, quantity: Math.max(1, item.quantity + delta) };
        }
        return item;
      });
    });
  };

  const clearCart = () => {
    setCartItems([]);
    setRestaurantId(null);
  };

  const setCart = (newItems: CartItem[], newRestaurantId: string) => {
    setCartItems(newItems);
    setRestaurantId(newRestaurantId);
  };

  const totalAmount = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        cartItems,
        restaurantId,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        setCart,
        totalAmount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

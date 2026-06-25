import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axiosClient from '@/api/axiosClient';
import { useCart } from '@/context/CartContext';

const { width } = Dimensions.get('window');

interface FoodItem {
  food_id: number;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
}

interface MenuCategory {
  category_id: number;
  category_name: string;
  items: FoodItem[];
}

interface RestaurantInfo {
  restaurant_id: number;
  shop_name: string;
  address?: string;
  rating?: number | string;
  is_open?: boolean;
  review_count?: number;
}

export default function RestaurantDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { addToCart, cartItems, totalAmount } = useCart();

  const [restaurant, setRestaurant] = useState<RestaurantInfo | null>(null);
  const [menu, setMenu] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRestaurantData = async () => {
      setLoading(true);
      try {
        const res = await axiosClient.get(`/customer/restaurants/${id}/menu`);
        setRestaurant(res.data.restaurant);
        setMenu(res.data.menu || []);
      } catch (error) {
        console.error('Error fetching restaurant details:', error);
        Alert.alert('Lỗi', 'Không thể tải thông tin nhà hàng.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchRestaurantData();
    }
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3399FF" />
        <Text style={styles.loadingText}>Đang tải thực đơn...</Text>
      </View>
    );
  }

  if (!restaurant) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorIconContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#3399FF" />
        </View>
        <Text style={styles.errorText}>Không tìm thấy nhà hàng!</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Back Button */}
        <TouchableOpacity style={styles.backNav} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>

        {/* Restaurant Header */}
        <View style={styles.headerCard}>
          <Text style={styles.shopName}>{restaurant.shop_name}</Text>
          <Text style={styles.addressText}>{restaurant.address || 'Địa chỉ đang cập nhật'}</Text>
          
          <View style={styles.infoRow}>
            <View style={styles.badge}>
              <Ionicons name="star" size={14} color="#3399FF" />
              <Text style={styles.ratingText}>
                {restaurant.rating || '5.0'}
              </Text>
            </View>
            
            <View style={[
              styles.statusBadge, 
              { backgroundColor: restaurant.is_open ? '#EFF6FF' : '#FFF5F5' }
            ]}>
              <View style={[
                styles.statusDot,
                { backgroundColor: restaurant.is_open ? '#3399FF' : '#E53E3E' }
              ]} />
              <Text style={[
                styles.statusText, 
                { color: restaurant.is_open ? '#3399FF' : '#E53E3E' }
              ]}>
                {restaurant.is_open ? 'Đang mở cửa' : 'Đóng cửa'}
              </Text>
            </View>
          </View>
        </View>

        {/* Menu Sections */}
        <View style={styles.menuContainer}>
          {menu.map((category) => (
            <View key={category.category_id} style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <View style={styles.categoryDot} />
                <Text style={styles.categoryTitle}>{category.category_name}</Text>
                <Text style={styles.categoryCount}>{category.items.length} món</Text>
              </View>
              
              {category.items.map((food) => (
                <View key={food.food_id} style={styles.foodItemCard}>
                  <View style={styles.foodDetails}>
                    <Text style={styles.foodName}>{food.name}</Text>
                    <Text style={styles.foodDesc} numberOfLines={2}>
                      {food.description || 'Hương vị thơm ngon đậm đà, được chuẩn bị sạch sẽ.'}
                    </Text>
                    <Text style={styles.foodPrice}>
                      {parseInt(food.price.toString()).toLocaleString()} đ
                    </Text>
                  </View>

                  <View style={styles.foodImageContainer}>
                    {food.image_url ? (
                      <Image source={{ uri: food.image_url }} style={styles.foodImage} />
                    ) : (
                      <View style={[styles.foodImage, styles.foodPlaceholder]}>
                        <Text style={styles.placeholderEmoji}>🍲</Text>
                      </View>
                    )}
                    
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={() => addToCart(food, restaurant.restaurant_id.toString())}
                    >
                      <Ionicons name="add" size={20} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Floating Cart Bar */}
      {cartItems.length > 0 && (
        <View style={styles.cartBar}>
          <View style={styles.cartBarInfo}>
            <Text style={styles.cartItemCount}>{cartItems.reduce((acc, curr) => acc + curr.quantity, 0)} món đã chọn</Text>
            <Text style={styles.cartTotalPrice}>{totalAmount.toLocaleString()} đ</Text>
          </View>
          <TouchableOpacity
            style={styles.checkoutButton}
            onPress={() => router.push('/checkout')}
          >
            <Text style={styles.checkoutText}>Giỏ hàng</Text>
            <Ionicons name="arrow-forward" size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '700',
    marginBottom: 16,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3399FF',
    borderRadius: 12,
  },
  backButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  backNav: {
    position: 'absolute',
    top: 12,
    left: 16,
    zIndex: 10,
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#CBD5E1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 16,
  },
  shopName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 6,
  },
  addressText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 14,
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#3399FF',
    marginLeft: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  menuContainer: {
    paddingHorizontal: 20,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#E2E8F0',
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3399FF',
    marginRight: 10,
  },
  categoryTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  categoryCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
  foodItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#CBD5E1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  foodDetails: {
    flex: 1,
    marginRight: 12,
  },
  foodName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  foodDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
    marginBottom: 8,
    fontWeight: '500',
  },
  foodPrice: {
    fontSize: 16,
    fontWeight: '900',
    color: '#3399FF',
  },
  foodImageContainer: {
    position: 'relative',
  },
  foodImage: {
    width: 85,
    height: 85,
    borderRadius: 16,
    resizeMode: 'cover',
  },
  foodPlaceholder: {
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  placeholderEmoji: {
    fontSize: 32,
  },
  addButton: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: '#3399FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3399FF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  cartBar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  cartBarInfo: {
    flex: 1,
  },
  cartItemCount: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  cartTotalPrice: {
    color: '#FFD54F',
    fontSize: 17,
    fontWeight: '900',
  },
  checkoutButton: {
    backgroundColor: '#3399FF',
    paddingHorizontal: 20,
    height: 42,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#3399FF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  checkoutText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});

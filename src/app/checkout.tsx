import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useCart } from '@/context/CartContext';
import axiosClient from '@/api/axiosClient';

export default function CheckoutScreen() {
  const router = useRouter();
  const {
    cartItems,
    restaurantId,
    totalAmount,
    updateQuantity,
    removeFromCart,
    clearCart,
  } = useCart();

  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD'>('CASH');
  
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [discountApplied, setDiscountApplied] = useState(0);
  
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>({
    lat: 10.762622,
    lng: 106.660172,
  });

  const [shippingFee, setShippingFee] = useState(15000);
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    if (coordinates && restaurantId) {
      axiosClient
        .post('/orders/fee', {
          restaurant_id: Number(restaurantId),
          latitude: coordinates.lat,
          longitude: coordinates.lng,
        })
        .then((res) => {
          setShippingFee(res.data.shipping_fee || 15000);
          setDistance(res.data.distance_km || 1.2);
        })
        .catch((err) => {
          console.error('Failed to calculate fee:', err);
          setShippingFee(15000);
          setDistance(1.2);
        });
    }
  }, [coordinates, restaurantId]);

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mã giảm giá.');
      return;
    }
    
    setLoading(true);
    try {
      const res = await axiosClient.post('/orders/validate-discount', { code: discountCode });
      if (res.data.success) {
        setDiscountApplied(res.data.discount_value);
        Alert.alert('Thành công', res.data.message || 'Đã áp dụng mã giảm giá! 🎉');
      }
    } catch (error: any) {
      setDiscountApplied(0);
      Alert.alert('Thất bại', error.response?.data?.message || 'Mã giảm giá không hợp lệ.');
    } finally {
      setLoading(false);
    }
  };

  const handleGetLocation = async () => {
    setLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền bị từ chối', 'Vui lòng cấp quyền vị trí để lấy tọa độ tự động.');
        setLoading(false);
        return;
      }

      let location;
      try {
        // Try to get high accuracy position, but timeout after 5 seconds
        location = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
        ]) as Location.LocationObject;
      } catch (err) {
        // Fallback for Android Emulators that don't have location set
        console.warn('getCurrentPositionAsync failed, trying last known position', err);
        location = await Location.getLastKnownPositionAsync();
      }

      if (!location) {
        throw new Error('No location available');
      }

      setCoordinates({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });

      // Decode address (Reverse Geocoding)
      let geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (geocode.length > 0) {
        const place = geocode[0];
        const fullAddress = `${place.streetNumber || ''} ${place.street || ''}, ${place.subregion || place.city || ''}, ${place.region || ''}`;
        setAddress(fullAddress.trim());
      } else {
        setAddress('Vị trí hiện tại của bạn');
      }
    } catch (error) {
      console.warn('Location Error:', error);
      Alert.alert('Mẹo nhỏ', 'Máy ảo đôi khi không có GPS thật. Hệ thống sẽ điền tạm địa chỉ mặc định để bạn test nhé!');
      // Fallback cho máy ảo
      setAddress('227 Nguyễn Văn Cừ, Quận 5, TP. Hồ Chí Minh');
      setCoordinates({ lat: 10.762622, lng: 106.660172 });
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!address) {
      Alert.alert('Lỗi', 'Vui lòng nhập địa chỉ giao hàng.');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        restaurant_id: Number(restaurantId),
        payment_method: paymentMethod,
        address: address,
        customer_latitude: coordinates?.lat || null,
        customer_longitude: coordinates?.lng || null,
        note: note,
        discount: discountApplied,
        items: cartItems.map((item) => ({
          food_id: item.food_id,
          quantity: item.quantity,
          price: item.price,
        })),
      };

      const res = await axiosClient.post('/orders/create', orderData);
      
      Alert.alert('Thành công', `Đặt hàng thành công! Mã đơn: #${res.data.order_id}`, [
        {
          text: 'Theo dõi đơn',
          onPress: () => {
            clearCart();
            router.replace(`/order/${res.data.order_id}/tracking`);
          },
        },
      ]);
    } catch (error: any) {
      console.error('Order creation error:', error);
      const msg = error.response?.data?.message || 'Đặt hàng thất bại. Vui lòng thử lại.';
      Alert.alert('Lỗi đặt hàng', msg);
    } finally {
      setLoading(false);
    }
  };

  const finalTotal = totalAmount + shippingFee - discountApplied;

  if (cartItems.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Text style={styles.emptyIcon}>🛒</Text>
        </View>
        <Text style={styles.emptyTitle}>Giỏ hàng đang trống</Text>
        <Text style={styles.emptySubtitle}>Hãy chọn món ngon để bắt đầu!</Text>
        <TouchableOpacity style={styles.backHomeButton} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.backHomeText}>Quay lại trang chủ</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.screenHeader}>
          <TouchableOpacity style={styles.backNav} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Thanh toán</Text>
          <View style={{ width: 42 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* Delivery Address Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <Ionicons name="location" size={18} color="#3399FF" />
              </View>
              <Text style={styles.sectionTitle}>Địa chỉ giao hàng</Text>
            </View>
            
            <View style={styles.addressInputRow}>
              <TextInput
                style={[styles.input, styles.addressInput]}
                placeholder="Nhập địa chỉ giao hàng chi tiết..."
                placeholderTextColor="#94A3B8"
                value={address}
                onChangeText={setAddress}
                multiline
              />
              <TouchableOpacity style={styles.gpsButton} onPress={handleGetLocation}>
                <Ionicons name="locate" size={20} color="#3399FF" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, styles.noteInput]}
              placeholder="Ghi chú cho tài xế..."
              placeholderTextColor="#94A3B8"
              value={note}
              onChangeText={setNote}
            />
          </View>

          {/* Cart Items List */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <Ionicons name="basket" size={18} color="#3399FF" />
              </View>
              <Text style={styles.sectionTitle}>Món ăn đã chọn</Text>
              <Text style={styles.itemCount}>{cartItems.length} món</Text>
            </View>

            {cartItems.map((item) => (
              <View key={item.food_id} style={styles.cartItem}>
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={styles.itemImage} />
                ) : (
                  <View style={[styles.itemImage, styles.imagePlaceholder]}>
                    <Text style={styles.emojiText}>🍜</Text>
                  </View>
                )}
                
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.itemPrice}>{parseInt(item.price.toString()).toLocaleString()} đ</Text>
                  
                  <View style={styles.quantityRow}>
                    <View style={styles.quantityContainer}>
                      <TouchableOpacity
                        style={styles.quantityBtn}
                        onPress={() => updateQuantity(item.food_id, -1)}
                      >
                        <Ionicons name="remove" size={16} color="#334155" />
                      </TouchableOpacity>
                      <Text style={styles.quantityText}>{item.quantity}</Text>
                      <TouchableOpacity
                        style={[styles.quantityBtn, styles.quantityBtnPlus]}
                        onPress={() => updateQuantity(item.food_id, 1)}
                      >
                        <Ionicons name="add" size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                    
                    <TouchableOpacity onPress={() => removeFromCart(item.food_id)}>
                      <Ionicons name="trash-outline" size={18} color="#E53E3E" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Payment Method Selection */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <Ionicons name="card" size={18} color="#3399FF" />
              </View>
              <Text style={styles.sectionTitle}>Thanh toán</Text>
            </View>

            <View style={styles.paymentOptions}>
              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  paymentMethod === 'CASH' && styles.activePaymentOption,
                ]}
                onPress={() => setPaymentMethod('CASH')}
              >
                <Text style={styles.paymentIcon}>💵</Text>
                <Text style={[
                  styles.paymentLabel,
                  paymentMethod === 'CASH' && styles.activePaymentLabel
                ]}>Tiền mặt</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  paymentMethod === 'CARD' && styles.activePaymentOption,
                ]}
                onPress={() => setPaymentMethod('CARD')}
              >
                <Text style={styles.paymentIcon}>💳</Text>
                <Text style={[
                  styles.paymentLabel,
                  paymentMethod === 'CARD' && styles.activePaymentLabel
                ]}>Thẻ Visa/Master</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Discount code section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <Ionicons name="pricetag" size={18} color="#3399FF" />
              </View>
              <Text style={styles.sectionTitle}>Mã giảm giá</Text>
            </View>
            <View style={styles.discountRow}>
              <TextInput
                style={[styles.input, styles.discountInput]}
                placeholder="Nhập mã KM (VD: BRONAUTO50)"
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
                value={discountCode}
                onChangeText={setDiscountCode}
              />
              <TouchableOpacity style={styles.applyBtn} onPress={handleApplyDiscount}>
                <Text style={styles.applyBtnText}>Áp dụng</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Cost Summary Box */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tạm tính</Text>
              <Text style={styles.summaryValue}>{totalAmount.toLocaleString()} đ</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Phí giao hàng ({distance.toFixed(1)} km)</Text>
              <Text style={styles.summaryValue}>{shippingFee.toLocaleString()} đ</Text>
            </View>

            {discountApplied > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, styles.greenText]}>Giảm giá</Text>
                <Text style={[styles.summaryValue, styles.greenText]}>-{discountApplied.toLocaleString()} đ</Text>
              </View>
            )}

            <View style={styles.summaryDivider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tổng cộng</Text>
              <Text style={styles.totalValue}>{Math.max(0, finalTotal).toLocaleString()} đ</Text>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.orderButton, loading && styles.disabledBtn]}
            onPress={handlePlaceOrder}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <View style={styles.orderButtonContent}>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.orderButtonText}>Đặt hàng ngay</Text>
              </View>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  keyboardView: {
    flex: 1,
  },
  screenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backNav: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 32,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 28,
    fontWeight: '500',
  },
  backHomeButton: {
    height: 50,
    backgroundColor: '#3399FF',
    borderRadius: 14,
    paddingHorizontal: 28,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#3399FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  backHomeText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#CBD5E1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  itemCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },
  addressInputRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 10,
  },
  addressInput: {
    flex: 1,
    height: 60,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: 'top',
  },
  gpsButton: {
    width: 60,
    height: 60,
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  noteInput: {
    height: 44,
  },
  cartItem: {
    flexDirection: 'row',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  itemImage: {
    width: 68,
    height: 68,
    borderRadius: 14,
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emojiText: {
    fontSize: 24,
  },
  itemDetails: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 3,
  },
  itemPrice: {
    fontSize: 14,
    color: '#3399FF',
    fontWeight: '800',
    marginBottom: 10,
  },
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  quantityBtn: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityBtnPlus: {
    backgroundColor: '#3399FF',
    borderRadius: 8,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    paddingHorizontal: 10,
  },
  paymentOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
  },
  activePaymentOption: {
    borderColor: '#3399FF',
    backgroundColor: '#EFF6FF',
  },
  paymentIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  paymentLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  activePaymentLabel: {
    color: '#3399FF',
    fontWeight: '800',
  },
  discountRow: {
    flexDirection: 'row',
    gap: 10,
  },
  discountInput: {
    flex: 1,
    height: 46,
    fontWeight: '700',
  },
  applyBtn: {
    height: 46,
    backgroundColor: '#0F172A',
    paddingHorizontal: 18,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyBtnText: {
    color: '#FFD54F',
    fontSize: 13,
    fontWeight: '800',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#F5D780',
    shadowColor: '#CBD5E1',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '700',
  },
  greenText: {
    color: '#3399FF',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#3399FF',
  },
  orderButton: {
    height: 56,
    backgroundColor: '#3399FF',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3399FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  disabledBtn: {
    backgroundColor: '#E8D5A3',
  },
  orderButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
});

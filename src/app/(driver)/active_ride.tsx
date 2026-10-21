import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import GoongMapView, { GoongMapViewRef, GoongMarker } from '@/components/GoongMapView';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { Socket } from 'socket.io-client';
import axiosClient from '@/api/axiosClient';
import { connectSocket } from '@/api/socket';
import { useAuth } from '@/context/AuthContext';

export default function ActiveRide() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [order, setOrder] = useState<any>(null);
  const [status, setStatus] = useState('DRIVER_ASSIGNED');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const mapRef = useRef<GoongMapViewRef | null>(null);

  useEffect(() => {
    if (id) fetchOrderDetails();
    setupSocket();
    startTracking();

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (locationSubscription.current) locationSubscription.current.remove();
    };
  }, [id]);

  useEffect(() => {
    if (order && location && mapRef.current) {
      const destLat = status === 'DRIVER_ASSIGNED' 
        ? Number(order.service_type === 'FOOD' ? order.restaurant_lat : order.pickup_latitude)
        : Number(order.customer_latitude);
      const destLng = status === 'DRIVER_ASSIGNED'
        ? Number(order.service_type === 'FOOD' ? order.restaurant_lng : order.pickup_longitude)
        : Number(order.customer_longitude);

      if (destLat && destLng) {
        mapRef.current.fitToCoordinates([
          { latitude: location.coords.latitude, longitude: location.coords.longitude },
          { latitude: destLat, longitude: destLng }
        ], {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        });
      }
    }
  }, [order, location, status]);

  const fetchOrderDetails = async () => {
    try {
      const res = await axiosClient.get(`/orders/${id}`);
      setOrder(res.data);
      setStatus(res.data.status || 'DRIVER_ASSIGNED');
    } catch (error) {
      console.log('Error fetching order details:', error);
    }
  };

  const setupSocket = () => {
    const socket = connectSocket();
    socketRef.current = socket;
    
    const joinOrder = () => {
      if (id) {
        socket.emit('join_order', id);
        console.log('[ActiveRide] Driver joined order room:', id);
      }
    };

    if (socket.connected) {
      joinOrder();
    }
    socket.on('connect', joinOrder);
  };

  const startTracking = async () => {
    try {
      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
      if (fgStatus !== 'granted') {
        setErrorMsg('Quyền truy cập vị trí bị từ chối');
      }
    } catch (e) {
      console.warn('Location foreground permission error:', e);
    }

    // Lấy vị trí ban đầu (nhanh và an toàn)
    try {
      let initialLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(initialLocation);

      // Emit and save immediately
      if (initialLocation && id) {
        if (socketRef.current) {
          socketRef.current.emit('update_location', {
            order_id: Number(id),
            latitude: initialLocation.coords.latitude,
            longitude: initialLocation.coords.longitude,
            heading: initialLocation.coords.heading || 0,
          });
        }
        axiosClient.put('/driver/location', {
          lat: initialLocation.coords.latitude,
          lng: initialLocation.coords.longitude,
          order_id: Number(id),
        }).catch(() => {});
      }
    } catch (locErr) {
      console.warn('Could not get initial position:', locErr);
      try {
        const last = await Location.getLastKnownPositionAsync();
        if (last) setLocation(last);
      } catch (e) {}
    }

    // Theo dõi vị trí trực tiếp cho UI và socket
    try {
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000,
          distanceInterval: 5,
        },
        (newLocation) => {
          setLocation(newLocation);
          
          if (id) {
            if (socketRef.current) {
              socketRef.current.emit('update_location', {
                order_id: Number(id),
                latitude: newLocation.coords.latitude,
                longitude: newLocation.coords.longitude,
                heading: newLocation.coords.heading || 0,
              });
            }
            axiosClient.put('/driver/location', {
              lat: newLocation.coords.latitude,
              lng: newLocation.coords.longitude,
              order_id: Number(id),
            }).catch(() => {});
          }
        }
      );
    } catch (watchErr) {
      console.warn('watchPositionAsync error:', watchErr);
    }
  };

  const stopTracking = async () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    try {
      await SecureStore.deleteItemAsync('active_order_id');
    } catch (e) {}
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      await axiosClient.put('/driver/orders/status', { orderId: id, status: newStatus });
      setStatus(newStatus);
      if (newStatus === 'COMPLETED') {
        Alert.alert('Thành công', 'Đã hoàn thành cuốc xe!', [
          { 
            text: 'OK', 
            onPress: async () => {
              await stopTracking();
              router.replace('/(driver)/home');
            } 
          }
        ]);
      }
    } catch (error) {
      console.log('Error updating status:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái');
    }
  };
  const handleCancel = () => {
    Alert.alert('Hủy Chuyến', 'Bạn có chắc chắn muốn hủy chuyến xe này?', [
      { text: 'Không', style: 'cancel' },
      { text: 'Có', onPress: async () => {
          try {
            await axiosClient.put('/driver/orders/status', { orderId: id, status: 'CANCELLED' });
            await stopTracking();
            router.replace('/(driver)/home');
          } catch (error) {
            Alert.alert('Lỗi', 'Không thể hủy cuốc xe lúc này');
          }
      }, style: 'destructive' }
    ]);
  };

  const isFood = order?.service_type === 'FOOD';
  const isDelivery = order?.service_type === 'DELIVERY';
  const isRide = ['BIKE', 'CAR', 'CAR_4', 'CAR_7'].includes(order?.service_type);

  const openNavigation = () => {
    let destLat, destLng;
    if (status === 'DRIVER_ASSIGNED') {
      destLat = isFood ? (order?.restaurant_lat || order?.pickup_latitude) : order?.pickup_latitude;
      destLng = isFood ? (order?.restaurant_lng || order?.pickup_longitude) : order?.pickup_longitude;
    } else {
      destLat = order?.customer_latitude;
      destLng = order?.customer_longitude;
    }

    if (destLat && destLng) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`;
      Linking.openURL(url);
    } else {
      Alert.alert('Lỗi', 'Không tìm thấy tọa độ điểm đến');
    }
  };

  const handleCallCustomer = () => {
    const phone = order?.customer_phone;
    if (!phone) {
      Alert.alert(
        'Không có số điện thoại',
        'Không tìm thấy số điện thoại của khách hàng. Bạn có thể nhắn tin cho khách qua phần Chat.',
        [
          { text: 'Nhắn tin', onPress: () => router.push(`/chat/${id}`) },
          { text: 'Đóng', style: 'cancel' },
        ]
      );
      return;
    }

    Alert.alert(
      'Gọi cho Khách hàng 📞',
      `Khách hàng: ${order?.customer_name || 'Khách hàng'}\nSố điện thoại: ${phone}\n\nỨng dụng sẽ mở trình gọi điện thoại để kết nối trực tiếp.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Gọi ngay',
          onPress: () => {
            Linking.openURL(`tel:${phone}`);
          },
        },
      ]
    );
  };

  const currentLatitude = location?.coords?.latitude || Number(order?.pickup_latitude) || 10.8429;
  const currentLongitude = location?.coords?.longitude || Number(order?.pickup_longitude) || 106.7826;

  return (
    <View style={styles.container}>
      <View style={styles.mapArea}>
        {(() => {
          const markers: GoongMarker[] = [];
          if (location?.coords) {
            markers.push({
              id: 'driver',
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              title: 'Vị trí của bạn',
              icon: '🛵',
              color: '#3182CE',
            });
          }

          const restLat = order?.restaurant_lat || order?.pickup_latitude;
          const restLng = order?.restaurant_lng || order?.pickup_longitude;

          if (isFood) {
            // Điểm lấy món: Quán ăn / Nhà hàng
            if (restLat && restLng) {
              markers.push({
                id: 'restaurant',
                latitude: Number(restLat),
                longitude: Number(restLng),
                title: order?.shop_name ? `Quán: ${order.shop_name}` : 'Quán ăn (Điểm lấy món)',
                icon: '🍔',
                color: '#DD6B20',
              });
            }
            // Điểm giao món: Khách hàng
            if (order?.customer_latitude && order?.customer_longitude) {
              markers.push({
                id: 'customer',
                latitude: Number(order.customer_latitude),
                longitude: Number(order.customer_longitude),
                title: 'Khách hàng (Điểm giao món)',
                icon: '🏁',
                color: '#EF4444',
              });
            }
          } else {
            // Chở khách / Giao bưu phẩm
            if (order?.pickup_latitude && order?.pickup_longitude) {
              markers.push({
                id: 'pickup',
                latitude: Number(order.pickup_latitude),
                longitude: Number(order.pickup_longitude),
                title: isDelivery ? 'Điểm lấy bưu phẩm' : 'Điểm đón khách',
                icon: '🟢',
                color: '#10B981',
              });
            }
            if (order?.customer_latitude && order?.customer_longitude) {
              markers.push({
                id: 'customer',
                latitude: Number(order.customer_latitude),
                longitude: Number(order.customer_longitude),
                title: isDelivery ? 'Điểm giao bưu phẩm' : 'Điểm trả khách',
                icon: '🏁',
                color: '#EF4444',
              });
            }
          }

          let destCoords: { latitude: number; longitude: number } | null = null;
          let destinationTitle = 'Điểm đến';

          if (isFood) {
            if (status === 'DRIVER_ASSIGNED') {
              destCoords = restLat && restLng ? { latitude: Number(restLat), longitude: Number(restLng) } : null;
              destinationTitle = order?.shop_name ? `Quán: ${order.shop_name}` : 'Quán ăn (Điểm lấy món)';
            } else {
              destCoords = order?.customer_latitude && order?.customer_longitude
                ? { latitude: Number(order.customer_latitude), longitude: Number(order.customer_longitude) }
                : null;
              destinationTitle = 'Khách hàng (Điểm giao món)';
            }
          } else {
            if (status === 'DRIVER_ASSIGNED') {
              destCoords = order?.pickup_latitude && order?.pickup_longitude
                ? { latitude: Number(order.pickup_latitude), longitude: Number(order.pickup_longitude) }
                : null;
              destinationTitle = isDelivery ? 'Điểm lấy bưu phẩm' : 'Điểm đón khách';
            } else {
              destCoords = order?.customer_latitude && order?.customer_longitude
                ? { latitude: Number(order.customer_latitude), longitude: Number(order.customer_longitude) }
                : null;
              destinationTitle = isDelivery ? 'Điểm giao bưu phẩm' : 'Điểm trả khách';
            }
          }

          return (
            <GoongMapView
              ref={mapRef}
              style={styles.map}
              initialCenter={{
                latitude: currentLatitude,
                longitude: currentLongitude,
              }}
              markers={markers}
              origin={location?.coords || { latitude: currentLatitude, longitude: currentLongitude }}
              destination={destCoords}
              vehicle="bike"
              routeColor="#3399FF"
              routeWidth={5}
              hideOriginEndpoint={true}
              destinationTitle={destinationTitle}
            />
          );
        })()}

        {/* Floating Back Button */}
        <TouchableOpacity 
          style={[styles.floatingBackBtn, { top: Math.max(insets.top, 50) + 10 }]}
          onPress={() => router.replace('/(driver)/home')}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={22} color="#1A202C" />
        </TouchableOpacity>
      </View>

      <View style={[styles.infoCard, { paddingBottom: Math.max(insets.bottom + 16, 24) }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={styles.title}>
            {isFood ? '🍔 Đơn giao đồ ăn' : isDelivery ? '📦 Đơn giao bưu phẩm' : '🛵 Chuyến xe chở khách'}
          </Text>
          <View style={{ backgroundColor: '#EBF8FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#2B6CB0' }}>#{id}</Text>
          </View>
        </View>
        
        {isFood ? (
          <>
            <View style={styles.row}>
              <Ionicons name="restaurant" size={20} color="#DD6B20" />
              <Text style={styles.label} numberOfLines={2}>
                <Text style={{ fontWeight: '700', color: '#1A202C' }}>Lấy món: </Text>
                {order?.shop_name ? `${order.shop_name} - ` : ''}
                {order?.restaurant_address || order?.pickup_address || 'Đang cập nhật'}
              </Text>
            </View>
            <View style={styles.row}>
              <Ionicons name="location" size={20} color="#E53E3E" />
              <Text style={styles.label} numberOfLines={2}>
                <Text style={{ fontWeight: '700', color: '#1A202C' }}>Giao đến: </Text>
                {order?.address || 'Đang cập nhật'}
              </Text>
            </View>
            <View style={styles.row}>
              <Ionicons name="person" size={20} color="#4A5568" />
              <Text style={styles.label}>
                <Text style={{ fontWeight: '700', color: '#1A202C' }}>Khách nhận: </Text>
                {order?.customer_name || 'Khách hàng'}
              </Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.row}>
              <Ionicons name="person" size={20} color="#4A5568" />
              <Text style={styles.label}>Khách hàng: {order?.customer_name || 'Khách'}</Text>
            </View>
            <View style={styles.row}>
              <Ionicons name="location" size={20} color="#3182CE" />
              <Text style={styles.label}>
                {isDelivery ? 'Lấy hàng: ' : 'Đón: '}
                {order?.pickup_address || 'Đang cập nhật'}
              </Text>
            </View>
            <View style={styles.row}>
              <Ionicons name="flag" size={20} color="#E53E3E" />
              <Text style={styles.label}>
                {isDelivery ? 'Giao đến: ' : 'Trả: '}
                {order?.address || 'Đang cập nhật'}
              </Text>
            </View>
          </>
        )}
        
        <View style={styles.divider} />
        
        {(() => {
          const isPrepaid = order?.payment_method && order.payment_method !== 'CASH';
          return (
            <View style={styles.actionRow}>
              <View style={styles.priceContainer}>
                <Text style={[styles.priceLabel, isPrepaid && { color: '#059669' }]}>
                  {isPrepaid ? 'Đã thanh toán (Online):' : 'Thu tiền mặt:'}
                </Text>
                <Text style={[styles.priceValue, isPrepaid ? { color: '#059669', fontSize: 18 } : { color: '#DC2626' }]}>
                  {isPrepaid ? '0đ (Không thu khách)' : `${order ? parseFloat(order.total_amount).toLocaleString() : 0}đ`}
                </Text>
              </View>

              <View style={styles.btnActionGroup}>
                {/* Nút Gọi điện thoại cho khách */}
                <TouchableOpacity 
                  style={[styles.actionBtnCircle, { backgroundColor: '#10B981' }]}
                  onPress={handleCallCustomer}
                  activeOpacity={0.8}
                >
                  <Ionicons name="call" size={20} color="#FFF" />
                </TouchableOpacity>

                {/* Nút Nhắn tin Chat */}
                <TouchableOpacity 
                  style={[styles.actionBtnCircle, { backgroundColor: '#3B82F6' }]}
                  onPress={() => router.push(`/chat/${id}`)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="chatbubble-ellipses" size={20} color="#FFF" />
                </TouchableOpacity>

                {/* Nút Mở Google Maps chỉ đường */}
                <TouchableOpacity 
                  style={[styles.actionBtnCircle, { backgroundColor: '#6366F1' }]}
                  onPress={openNavigation}
                  activeOpacity={0.8}
                >
                  <Ionicons name="navigate" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          );
        })()}

        {status === 'DRIVER_ASSIGNED' && (
          <TouchableOpacity style={[styles.completeBtn, { backgroundColor: '#FC8181', marginBottom: 10 }]} onPress={handleCancel}>
            <Text style={styles.btnText}>Hủy Chuyến</Text>
          </TouchableOpacity>
        )}

        {status === 'DRIVER_ASSIGNED' ? (
          <TouchableOpacity style={styles.completeBtn} onPress={() => handleUpdateStatus('DELIVERING')}>
            <Text style={styles.btnText}>
              {isFood ? 'Đã lấy đồ ăn (Bắt đầu giao)' : isDelivery ? 'Đã lấy bưu phẩm' : 'Đã đón khách'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.completeBtn, { backgroundColor: '#38A169' }]} onPress={() => handleUpdateStatus('COMPLETED')}>
            <Text style={styles.btnText}>
              {isFood ? 'Giao Món Thành Công 🎉' : isDelivery ? 'Giao Hàng Thành Công 🎉' : 'Hoàn Thành Cuốc Xe 🎉'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  mapArea: {
    flex: 1,
    backgroundColor: '#E2E8F0',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#4A5568',
    fontWeight: '600',
  },
  errorText: {
    marginTop: 8,
    color: '#E53E3E',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    color: '#4A5568',
    marginLeft: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#EDF2F7',
    marginVertical: 16,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  priceContainer: {},
  priceLabel: {
    fontSize: 16,
    color: '#4A5568',
    fontWeight: 'bold',
  },
  priceValue: {
    fontSize: 24,
    color: '#3399FF',
    fontWeight: 'bold',
  },
  btnActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionBtnCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  completeBtn: {
    backgroundColor: '#3399FF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  floatingBackBtn: {
    position: 'absolute',
    left: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 99,
  },
});

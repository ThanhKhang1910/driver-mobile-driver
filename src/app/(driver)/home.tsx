import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, ScrollView, Vibration } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axiosClient from '@/api/axiosClient';
import { connectSocket } from '@/api/socket';
import { useAudioPlayer } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

export default function DriverHome() {
  const insets = useSafeAreaInsets();
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(false);
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const alarmPlayer = useAudioPlayer('https://actions.google.com/sounds/v1/alarms/bugle_tune.ogg');

  const [todayEarnings, setTodayEarnings] = useState(0);
  const [countdown, setCountdown] = useState(15);
  const timerRef = React.useRef<any>(null);
  const locationSubscription = React.useRef<Location.LocationSubscription | null>(null);

  const playAlarm = async () => {
    try {
      const isLoud = await AsyncStorage.getItem('driver_loud_notification');
      if (isLoud === 'false') {
        // Tài xế tắt âm báo lớn -> chỉ rung nhẹ 1 nhịp, không đổ chuông ồn
        Vibration.vibrate(500);
        return;
      }
      Vibration.vibrate([0, 500, 500, 500], true);
      alarmPlayer.loop = true;
      alarmPlayer.play();
    } catch (e) {
      console.log('Error playing alarm', e);
    }
  };

  const stopAlarm = async () => {
    Vibration.cancel();
    try {
      alarmPlayer.pause();
    } catch (e) {}
  };

  useEffect(() => {
    if (availableOrders.length > 0 && isOnline) {
      playAlarm();
      setCountdown(15);
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setAvailableOrders([]); // Timeout
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      stopAlarm();
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      stopAlarm();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [availableOrders, isOnline]);

  const fetchEarnings = async () => {
    try {
      const res = await axiosClient.get('/driver/earnings/today');
      setTodayEarnings(res.data.earnings || 0);
    } catch (e) {
      console.log('Error fetching earnings', e);
    }
  };

  useEffect(() => {
    let isMounted = true;
    if (isOnline) {
      (async () => {
        try {
          let { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted' && isMounted) {
            locationSubscription.current = await Location.watchPositionAsync(
              {
                accuracy: Location.Accuracy.Balanced,
                timeInterval: 8000,
                distanceInterval: 10,
              },
              (newLocation) => {
                axiosClient.put('/driver/location', {
                  lat: newLocation.coords.latitude,
                  lng: newLocation.coords.longitude
                }).catch(e => console.log('Location update err:', e));
              }
            );
          }
        } catch (locErr) {
          console.log('Location watch error caught:', locErr);
        }
      })();
    } else {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }
    }
    return () => {
      isMounted = false;
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, [isOnline]);

  // Polling available orders every 3s when online to guarantee no missed rides
  useEffect(() => {
    let pollInterval: any = null;
    if (isOnline) {
      fetchAvailableOrders();
      pollInterval = setInterval(() => {
        fetchAvailableOrders();
      }, 3000);
    }
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isOnline]);

  useEffect(() => {
    AsyncStorage.getItem('isOnline').then(val => {
      if (val === 'true') {
        setIsOnline(true);
      }
    });

    fetchEarnings();

    const socket = connectSocket();
    const joinDriver = () => {
      const driverId = user?.id || user?.user_id;
      if (driverId) {
        console.log('[Driver Home] Joining driver room:', driverId);
        socket.emit('join_driver_room', driverId);
      }
    };

    if (socket.connected) {
      joinDriver();
    }
    socket.on('connect', joinDriver);

    const onNewRide = (data: any) => {
      console.log('⚡ New ride request received on driver app via socket:', data);
      fetchAvailableOrders();
    };

    socket.on('new_ride_request', onNewRide);

    return () => {
      socket.off('connect', joinDriver);
      socket.off('new_ride_request', onNewRide);
    };
  }, [user?.id, user?.user_id]);

  const fetchAvailableOrders = async () => {
    try {
      const res = await axiosClient.get('/driver/orders', {
        params: { _t: Date.now() },
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });
      const newOrders = res.data || [];
      setAvailableOrders((prev) => {
        const prevIds = prev.map((o: any) => o.order_id).sort().join(',');
        const newIds = newOrders.map((o: any) => o.order_id).sort().join(',');
        if (prevIds === newIds) {
          return prev; // Giữ nguyên object reference để không reset countdown 15s và không ngắt âm thanh
        }
        return newOrders;
      });
    } catch (error) {
      console.log('Error fetching driver orders:', error);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const handleToggleStatus = async (value: boolean) => {
    try {
      // Always fetch latest user info to get the real-time status
      const meRes = await axiosClient.get('/auth/me');
      if (meRes.data) {
        await refreshUser(meRes.data);
      }
      
      const latestStatus = meRes.data?.status || user?.status;
      if (latestStatus === 'PENDING') {
        Alert.alert('Tài khoản chưa được duyệt', 'Vui lòng đợi Admin xác nhận tài khoản của bạn trước khi trực tuyến!');
        return;
      }

      setIsOnline(value);
      AsyncStorage.setItem('isOnline', value ? 'true' : 'false');
      await axiosClient.put('/driver/status', { isOnline: value });
    } catch (error) {
      console.log('Error updating status:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái');
      setIsOnline(false); // Revert
    }
  };

  const handleAcceptOrder = async (orderId: string | number) => {
    try {
      stopAlarm(); // Stop immediately for UX
      await axiosClient.post('/driver/orders/accept', { orderId: Number(orderId) });
      Alert.alert('Thành công 🎉', 'Đã nhận cuốc xe thành công!');
      router.push({ pathname: '/(driver)/active_ride', params: { id: String(orderId) } });
    } catch (error: any) {
      console.log('Error accepting order:', error?.response?.data || error?.message);
      const msg = error?.response?.data?.message || 'Không thể nhận cuốc xe này. Có thể tài xế khác đã nhận.';
      Alert.alert('Lỗi', msg);
      fetchAvailableOrders();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header tôn trọng Safe Area Insets của iPhone */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 50) + 10, paddingBottom: 16 }]}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={styles.greeting}>Xin chào Tài xế 👋</Text>
          <Text style={styles.name} numberOfLines={1}>{user?.fullName || 'Tài xế'}</Text>
        </View>
        <TouchableOpacity 
          onPress={handleLogout} 
          style={styles.logoutBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="log-out-outline" size={22} color="#E53E3E" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 24, 32) }}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity 
          style={{ backgroundColor: '#FFF', marginHorizontal: 20, marginTop: 14, padding: 16, borderRadius: 14, elevation: 2, alignItems: 'center', borderWidth: 1, borderColor: '#EDF2F7' }}
          onPress={() => router.push('/(driver)/earnings' as any)}
          activeOpacity={0.85}
        >
          <Text style={{ fontSize: 13, color: '#718096', marginBottom: 4 }}>Doanh thu hôm nay (Chạm để xem chi tiết ví)</Text>
          <Text style={{ fontSize: 26, fontWeight: 'bold', color: '#38A169' }}>{todayEarnings.toLocaleString()} đ</Text>
        </TouchableOpacity>

        {/* Driver Quick Navigation Grid */}
        <View style={{ flexDirection: 'row', marginHorizontal: 20, marginTop: 12, gap: 8 }}>
          <TouchableOpacity 
            style={{ flex: 1, backgroundColor: '#FFF', borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' }}
            onPress={() => router.push('/(driver)/earnings' as any)}
          >
            <Ionicons name="wallet-outline" size={22} color="#10B981" />
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569', marginTop: 4 }}>Ví & Thu nhập</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={{ flex: 1, backgroundColor: '#FFF', borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' }}
            onPress={() => router.push('/(driver)/history' as any)}
          >
            <Ionicons name="time-outline" size={22} color="#3B82F6" />
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569', marginTop: 4 }}>Lịch sử cuốc</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={{ flex: 1, backgroundColor: '#FFF', borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' }}
            onPress={() => router.push('/(driver)/reviews' as any)}
          >
            <Ionicons name="star-outline" size={22} color="#F59E0B" />
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569', marginTop: 4 }}>Đánh giá</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={{ flex: 1, backgroundColor: '#FFF', borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' }}
            onPress={() => router.push('/profile')}
          >
            <Ionicons name="person-outline" size={22} color="#6366F1" />
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569', marginTop: 4 }}>Hồ sơ</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusText}>
            Trạng thái: <Text style={{ color: isOnline ? '#3399FF' : '#718096', fontWeight: 'bold' }}>{isOnline ? 'Đang trực tuyến' : 'Ngoại tuyến'}</Text>
          </Text>
          <Switch 
            value={isOnline}
            onValueChange={handleToggleStatus}
            trackColor={{ false: '#CBD5E0', true: '#EBF8FF' }}
            thumbColor={isOnline ? '#3399FF' : '#f4f3f4'}
          />
        </View>

        {isOnline ? (
          <View style={styles.onlineContainer}>
            {availableOrders.length === 0 && (
              <>
                <View style={styles.radarEffect}>
                  <Ionicons name="radio-outline" size={60} color="#3399FF" />
                </View>
                <Text style={styles.waitingText}>Đang chờ cuốc xe mới...</Text>
                <Text style={styles.subWaitingText}>Hãy giữ ứng dụng mở để nhận thông báo</Text>
                <Text style={{ textAlign: 'center', marginTop: 10, color: '#A0AEC0', fontSize: 13 }}>Chưa có cuốc xe nào quanh đây.</Text>
              </>
            )}

            {availableOrders.length > 0 && (
              <View style={{ marginTop: 10, marginBottom: 14, alignItems: 'center' }}>
                <View style={[styles.radarEffect, { marginTop: 0, marginBottom: 8, backgroundColor: '#E6FFFA', borderColor: '#B2F5EA' }]}>
                   <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#38A169' }}>{countdown}</Text>
                </View>
                <Text style={[styles.waitingText, { color: '#38A169' }]}>⚡ Có cuốc xe mới!</Text>
              </View>
            )}

            {availableOrders.map((order) => (
              <TouchableOpacity 
                key={order.order_id}
                style={styles.dummyOrder}
                activeOpacity={0.88}
                onPress={() => handleAcceptOrder(order.order_id)}
              >
                <View style={styles.orderHeader}>
                  <Text style={styles.orderType}>
                    {order.service_type === 'BIKE'
                      ? '🛵 Chở khách (Bike)'
                      : order.service_type === 'CAR' || order.service_type === 'CAR_4'
                      ? '🚘 Chở khách (Car 4 chỗ)'
                      : order.service_type === 'CAR_7'
                      ? '🚐 Chở khách (Car 7 chỗ)'
                      : order.service_type === 'DELIVERY'
                      ? '📦 Giao bưu phẩm'
                      : '🍔 Giao đồ ăn'}
                  </Text>
                  <Text style={styles.orderPrice}>{parseFloat(order.total_amount).toLocaleString()}đ</Text>
                </View>
                <Text style={styles.addressText}>
                  <Ionicons name={order.service_type === 'FOOD' ? 'restaurant' : 'location'} color={order.service_type === 'FOOD' ? '#DD6B20' : '#3182CE'}/>{' '}
                  {order.service_type === 'FOOD' ? 'Quán: ' : order.service_type === 'DELIVERY' ? 'Lấy hàng: ' : 'Điểm đón: '}
                  {order.service_type === 'FOOD' && order.shop_name ? `${order.shop_name} - ` : ''}
                  {order.pickup_address || order.restaurant_address || 'Đang cập nhật'}
                </Text>
                <Text style={styles.addressText}>
                  <Ionicons name="flag" color="#E53E3E"/>{' '}
                  {order.service_type === 'FOOD' || order.service_type === 'DELIVERY' ? 'Giao đến: ' : 'Điểm đến: '}
                  {order.destination_address || order.address || 'Đang cập nhật'}
                </Text>
                <View style={styles.acceptButtonBadge}>
                  <Text style={styles.tapToAccept}>⚡ Chạm để nhận cuốc ngay</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.offlineContainer}>
            <Ionicons name="moon-outline" size={80} color="#A0AEC0" />
            <Text style={styles.offlineTitle}>Bạn đang nghỉ ngơi</Text>
            <Text style={styles.offlineDesc}>Bật trạng thái trực tuyến để bắt đầu nhận cuốc xe và đơn hàng mới</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
    zIndex: 10,
  },
  greeting: {
    fontSize: 14,
    color: '#718096',
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  logoutBtn: {
    padding: 8,
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
  },
  statusCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  statusText: {
    fontSize: 16,
    color: '#4A5568',
  },
  onlineContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  radarEffect: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EBF8FF',
  },
  waitingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 8,
  },
  subWaitingText: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 40,
  },
  dummyOrder: {
    width: '100%',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3399FF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  orderType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  orderPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3399FF',
  },
  addressText: {
    fontSize: 14,
    color: '#4A5568',
    marginBottom: 6,
  },
  acceptButtonBadge: {
    marginTop: 12,
    backgroundColor: '#EBF8FF',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BEE3F8',
    alignItems: 'center',
  },
  tapToAccept: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2B6CB0',
    textAlign: 'center',
  },
  offlineContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  offlineTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4A5568',
    marginTop: 20,
    marginBottom: 10,
  },
  offlineDesc: {
    fontSize: 15,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 22,
  }
});

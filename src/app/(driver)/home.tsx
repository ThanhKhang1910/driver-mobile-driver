import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
  Vibration,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
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
  const timerRef = useRef<any>(null);
  const dismissedOrderIds = useRef<Set<number>>(new Set());
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  // Animations (Đồng bộ hiệu ứng mượt 60 FPS như Customer Home)
  const headerAnim = useRef(new Animated.Value(0)).current;
  const walletAnim = useRef(new Animated.Value(0)).current;
  const navAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.stagger(100, [
      Animated.spring(headerAnim, {
        toValue: 1,
        friction: 8,
        tension: 45,
        useNativeDriver: true,
      }),
      Animated.spring(walletAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(navAnim, {
        toValue: 1,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(contentAnim, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.06,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    return () => pulseLoop.stop();
  }, []);

  const playAlarm = async () => {
    try {
      const isLoud = await AsyncStorage.getItem('driver_loud_notification');
      if (isLoud === 'false') {
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
            availableOrders.forEach((o: any) => {
              if (o?.order_id) dismissedOrderIds.current.add(Number(o.order_id));
            });
            setAvailableOrders([]);
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
                axiosClient
                  .put('/driver/location', {
                    lat: newLocation.coords.latitude,
                    lng: newLocation.coords.longitude,
                  })
                  .catch((e) => console.log('Location update err:', e));
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
    AsyncStorage.getItem('isOnline').then((val) => {
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
          Pragma: 'no-cache',
        },
      });
      const rawOrders = res.data || [];
      const newOrders = rawOrders.filter(
        (o: any) => !dismissedOrderIds.current.has(Number(o.order_id))
      );
      setAvailableOrders((prev) => {
        const prevIds = prev
          .map((o: any) => o.order_id)
          .sort()
          .join(',');
        const newIds = newOrders
          .map((o: any) => o.order_id)
          .sort()
          .join(',');
        if (prevIds === newIds) {
          return prev;
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
      const meRes = await axiosClient.get('/auth/me');
      if (meRes.data) {
        await refreshUser(meRes.data);
      }

      const latestStatus = meRes.data?.status || user?.status;
      if (latestStatus === 'PENDING') {
        Alert.alert(
          'Tài khoản chưa được duyệt',
          'Vui lòng đợi Admin xác nhận tài khoản của bạn trước khi trực tuyến!'
        );
        return;
      }

      setIsOnline(value);
      AsyncStorage.setItem('isOnline', value ? 'true' : 'false');
      await axiosClient.put('/driver/status', { isOnline: value });
    } catch (error) {
      console.log('Error updating status:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái');
      setIsOnline(false);
    }
  };

  const handleAcceptOrder = async (orderId: string | number) => {
    try {
      stopAlarm();
      await axiosClient.post('/driver/orders/accept', { orderId: Number(orderId) });
      Alert.alert('Thành công 🎉', 'Đã nhận cuốc xe thành công!');
      router.push({ pathname: '/(driver)/active_ride', params: { id: String(orderId) } });
    } catch (error: any) {
      console.log('Error accepting order:', error?.response?.data || error?.message);
      const msg =
        error?.response?.data?.message ||
        'Không thể nhận cuốc xe này. Có thể tài xế khác đã nhận.';
      Alert.alert('Lỗi', msg);
      fetchAvailableOrders();
    }
  };

  const quickNavItems = [
    {
      id: 'EARNINGS',
      title: 'Ví & Thu nhập',
      icon: 'wallet-outline',
      bg: '#E8F5E9',
      color: '#2E7D32',
      route: '/(driver)/earnings',
    },
    {
      id: 'HISTORY',
      title: 'Lịch sử cuốc',
      icon: 'receipt-outline',
      bg: '#F1F8E9',
      color: '#388E3C',
      route: '/(driver)/history',
    },
    {
      id: 'REVIEWS',
      title: 'Đánh giá',
      icon: 'star-outline',
      bg: '#FFF8E1',
      color: '#F59E0B',
      route: '/(driver)/reviews',
    },
    {
      id: 'PROFILE',
      title: 'Hồ sơ',
      icon: 'person-outline',
      bg: '#ECFDF5',
      color: '#10B981',
      route: '/profile',
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header NK Go Green Gradient (Đồng bộ giao diện Customer) */}
      <Animated.View
        style={{
          opacity: headerAnim,
          transform: [
            {
              translateY: headerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-24, 0],
              }),
            },
          ],
        }}
      >
        <LinearGradient
          colors={['#174A1B', '#236E27', '#388E3C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 10 }]}
        >
          <View style={styles.headerLeft}>
            <View style={styles.onlineIndicatorRow}>
              <View
                style={[
                  styles.onlineDot,
                  { backgroundColor: isOnline ? '#4ADE80' : '#CBD5E1' },
                ]}
              />
              <Text style={styles.greeting}>
                {isOnline ? 'Đối tác Tài xế • Trực tuyến' : 'Đối tác Tài xế • Ngoại tuyến'}
              </Text>
            </View>
            <Text style={styles.name} numberOfLines={1}>
              {user?.fullName || 'Tài xế NK Go'} 👋
            </Text>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.headerAvatar}
              activeOpacity={0.85}
              onPress={() => {
                Alert.alert('Tài khoản Tài xế', 'Bạn muốn xem hồ sơ hay đăng xuất?', [
                  { text: 'Xem Hồ Sơ', onPress: () => router.push('/profile') },
                  {
                    text: 'Đăng xuất',
                    style: 'destructive',
                    onPress: handleLogout,
                  },
                  { text: 'Hủy', style: 'cancel' },
                ]);
              }}
            >
              <Text style={styles.headerAvatarText}>
                {user?.fullName?.charAt(0).toUpperCase() || 'T'}
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 24, 32) }}
        showsVerticalScrollIndicator={false}
      >
        {/* Wallet / Today Earnings Card (Đồng bộ style Wallet Widget của Customer) */}
        <Animated.View
          style={{
            opacity: walletAnim,
            transform: [
              {
                translateY: walletAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          }}
        >
          <TouchableOpacity
            style={styles.earningsWidget}
            onPress={() => router.push('/(driver)/earnings' as any)}
            activeOpacity={0.9}
          >
            <View style={styles.earningsLeft}>
              <Text style={styles.earningsLabel}>Doanh thu hôm nay • Ví NK Go</Text>
              <Text style={styles.earningsValue}>{todayEarnings.toLocaleString()} đ</Text>
              <Text style={styles.earningsHint}>Chạm để xem chi tiết & rút tiền ›</Text>
            </View>
            <View style={styles.earningsIconCircle}>
              <Ionicons name="wallet-outline" size={26} color="#2E7D32" />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Quick Navigation Grid (Đồng bộ style Services Grid của Customer) */}
        <Animated.View
          style={[
            styles.servicesGrid,
            {
              opacity: navAnim,
              transform: [
                {
                  translateY: navAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [24, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {quickNavItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.serviceItem}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.8}
            >
              <View style={[styles.serviceCard, { backgroundColor: item.bg }]}>
                <Ionicons name={item.icon as any} size={24} color={item.color} />
              </View>
              <Text style={styles.serviceTitle}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* Main Content: Status Switch & Orders */}
        <Animated.View
          style={{
            opacity: contentAnim,
            transform: [
              {
                translateY: contentAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [28, 0],
                }),
              },
            ],
          }}
        >
          {/* Status Toggle Card */}
          <View style={[styles.statusCard, isOnline && styles.statusCardOnline]}>
            <View style={styles.statusLeft}>
              <View
                style={[
                  styles.statusBadgeIcon,
                  { backgroundColor: isOnline ? '#E8F5E9' : '#F1F5F9' },
                ]}
              >
                <Ionicons
                  name={isOnline ? 'radio' : 'moon-outline'}
                  size={20}
                  color={isOnline ? '#2E7D32' : '#64748B'}
                />
              </View>
              <View>
                <Text style={styles.statusTitle}>Trạng thái nhận cuốc</Text>
                <Text
                  style={[
                    styles.statusSub,
                    { color: isOnline ? '#2E7D32' : '#64748B' },
                  ]}
                >
                  {isOnline ? 'Đang trực tuyến • Sẵn sàng nổ đơn' : 'Đang ngoại tuyến • Tạm nghỉ'}
                </Text>
              </View>
            </View>
            <Switch
              value={isOnline}
              onValueChange={handleToggleStatus}
              trackColor={{ false: '#CBD5E0', true: '#C8E6C9' }}
              thumbColor={isOnline ? '#2E7D32' : '#f4f3f4'}
            />
          </View>

          {isOnline ? (
            <View style={styles.onlineContainer}>
              {availableOrders.length === 0 && (
                <>
                  <Animated.View
                    style={[
                      styles.radarEffect,
                      { transform: [{ scale: pulseAnim }] },
                    ]}
                  >
                    <Ionicons name="radio-outline" size={56} color="#2E7D32" />
                  </Animated.View>
                  <Text style={styles.waitingText}>Đang quét cuốc xe quanh bạn...</Text>
                  <Text style={styles.subWaitingText}>
                    Giữ ứng dụng mở để nhận thông báo đơn hàng mới ngay lập tức
                  </Text>
                </>
              )}

              {availableOrders.length > 0 && (
                <View style={styles.incomingHeaderBox}>
                  <Animated.View
                    style={[
                      styles.radarEffect,
                      {
                        marginTop: 0,
                        marginBottom: 8,
                        backgroundColor: '#E8F5E9',
                        borderColor: '#A5D6A7',
                        transform: [{ scale: pulseAnim }],
                      },
                    ]}
                  >
                    <Text style={styles.countdownText}>{countdown}s</Text>
                  </Animated.View>
                  <Text style={[styles.waitingText, { color: '#2E7D32' }]}>
                    ⚡ Có cuốc xe mới đang chờ bạn!
                  </Text>
                </View>
              )}

              {availableOrders.map((order) => (
                <TouchableOpacity
                  key={order.order_id}
                  style={styles.orderCard}
                  activeOpacity={0.9}
                  onPress={() => handleAcceptOrder(order.order_id)}
                >
                  <View style={styles.orderHeader}>
                    <View style={styles.orderTypeBadge}>
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
                    </View>
                    <Text style={styles.orderPrice}>
                      {parseFloat(order.total_amount).toLocaleString()}đ
                    </Text>
                  </View>

                  <View style={styles.routeBox}>
                    <Text style={styles.addressText}>
                      <Ionicons
                        name={order.service_type === 'FOOD' ? 'restaurant' : 'location'}
                        color="#2E7D32"
                        size={14}
                      />{' '}
                      <Text style={styles.addressLabel}>
                        {order.service_type === 'FOOD'
                          ? 'Quán: '
                          : order.service_type === 'DELIVERY'
                          ? 'Lấy hàng: '
                          : 'Điểm đón: '}
                      </Text>
                      {order.service_type === 'FOOD' && order.shop_name
                        ? `${order.shop_name} - `
                        : ''}
                      {order.pickup_address || order.restaurant_address || 'Đang cập nhật'}
                    </Text>

                    <Text style={[styles.addressText, { marginBottom: 0 }]}>
                      <Ionicons name="flag" color="#EF4444" size={14} />{' '}
                      <Text style={styles.addressLabel}>
                        {order.service_type === 'FOOD' || order.service_type === 'DELIVERY'
                          ? 'Giao đến: '
                          : 'Điểm đến: '}
                      </Text>
                      {order.destination_address || order.address || 'Đang cập nhật'}
                    </Text>
                  </View>

                  <LinearGradient
                    colors={['#43A047', '#2E7D32']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.acceptButtonBadge}
                  >
                    <Text style={styles.tapToAccept}>⚡ Chạm để nhận cuốc ngay</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.offlineContainer}>
              <View style={styles.offlineIconCircle}>
                <Ionicons name="moon-outline" size={54} color="#2E7D32" />
              </View>
              <Text style={styles.offlineTitle}>Bác tài đang nghỉ ngơi</Text>
              <Text style={styles.offlineDesc}>
                Gạt nút sang Trực tuyến ở trên để bắt đầu nhận cuốc xe và đơn giao đồ ăn quanh khu vực của bạn.
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    shadowColor: '#174A1B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 6,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 12,
  },
  onlineIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  greeting: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E8F5E9',
  },
  name: {
    fontSize: 21,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#43A047',
    borderWidth: 2,
    borderColor: '#A5D6A7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Earnings Widget
  earningsWidget: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 18,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  earningsLeft: {
    flex: 1,
  },
  earningsLabel: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '700',
    marginBottom: 4,
  },
  earningsValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 2,
  },
  earningsHint: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
  },
  earningsIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Quick Nav Grid
  servicesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    marginTop: 18,
    marginBottom: 18,
  },
  serviceItem: {
    flex: 1,
    alignItems: 'center',
  },
  serviceCard: {
    width: 56,
    height: 56,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  serviceTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },

  // Status Card
  statusCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statusCardOnline: {
    borderColor: '#A5D6A7',
    backgroundColor: '#FFFFFF',
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  statusBadgeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  statusSub: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },

  // Online Radar & Orders
  onlineContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  radarEffect: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#C8E6C9',
  },
  incomingHeaderBox: {
    marginTop: 6,
    marginBottom: 14,
    alignItems: 'center',
  },
  countdownText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2E7D32',
  },
  waitingText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  subWaitingText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 19,
  },
  orderCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 18,
    borderLeftWidth: 5,
    borderLeftColor: '#2E7D32',
    borderWidth: 1,
    borderColor: '#C8E6C9',
    marginBottom: 14,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderTypeBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  orderType: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1B5E20',
  },
  orderPrice: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2E7D32',
  },
  routeBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  addressText: {
    fontSize: 13.5,
    color: '#334155',
    marginBottom: 8,
    lineHeight: 19,
  },
  addressLabel: {
    fontWeight: '700',
    color: '#0F172A',
  },
  acceptButtonBadge: {
    paddingVertical: 12,
    borderRadius: 22,
    alignItems: 'center',
  },
  tapToAccept: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  offlineContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 36,
    paddingVertical: 30,
  },
  offlineIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#C8E6C9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 18,
    marginBottom: 8,
  },
  offlineDesc: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 21,
  },
});

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axiosClient from '@/api/axiosClient';
import { connectSocket } from '@/api/socket';
import { Audio } from 'expo-av';
import { Vibration } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

export default function DriverHome() {
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(false);
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const alarmSoundRef = React.useRef<Audio.Sound | null>(null);

  const [todayEarnings, setTodayEarnings] = useState(0);
  const [countdown, setCountdown] = useState(15);
  const timerRef = React.useRef<any>(null);
  const locationSubscription = React.useRef<Location.LocationSubscription | null>(null);

  const playAlarm = async () => {
    if (alarmSoundRef.current) return;
    try {
      Vibration.vibrate([0, 500, 500, 500], true); // true = repeat
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://actions.google.com/sounds/v1/alarms/bugle_tune.ogg' },
        { shouldPlay: true, isLooping: true }
      );
      alarmSoundRef.current = sound;
    } catch (e) {
      console.log('Error playing alarm', e);
    }
  };

  const stopAlarm = async () => {
    Vibration.cancel();
    if (alarmSoundRef.current) {
      try {
        await alarmSoundRef.current.stopAsync();
        await alarmSoundRef.current.unloadAsync();
      } catch (e) {}
      alarmSoundRef.current = null;
    }
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
    if (isOnline) {
      (async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          locationSubscription.current = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              timeInterval: 10000,
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
      })();
    } else {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }
    }
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, [isOnline]);

  useEffect(() => {
    AsyncStorage.getItem('isOnline').then(val => {
      if (val === 'true') {
        setIsOnline(true);
      }
    });

    // Optionally fetch initial state if backend stores online status
    fetchAvailableOrders();
    fetchEarnings();

    const socket = connectSocket();
    if (user) {
      socket.emit('join_driver_room', user.id);
    }

    socket.on('new_ride_request', async (data) => {
      console.log('New ride request received:', data);
      fetchAvailableOrders();
    });

    return () => {
      socket.off('new_ride_request');
    };
  }, [user]);

  const fetchAvailableOrders = async () => {
    try {
      const res = await axiosClient.get('/driver/orders');
      setAvailableOrders(res.data || []);
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

  const handleAcceptOrder = async (orderId: string) => {
    try {
      stopAlarm(); // Stop immediately for UX
      await axiosClient.post('/driver/orders/accept', { orderId });
      Alert.alert('Thành công', 'Đã nhận cuốc xe!');
      router.push({ pathname: '/(driver)/active_ride', params: { id: orderId } });
    } catch (error) {
      console.log('Error accepting order:', error);
      Alert.alert('Lỗi', 'Không thể nhận cuốc xe này. Có thể tài xế khác đã nhận.');
      fetchAvailableOrders();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Xin chào Tài xế,</Text>
          <Text style={styles.name}>{user?.fullName}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={24} color="#E53E3E" />
        </TouchableOpacity>
      </View>

      <View style={{ backgroundColor: '#FFF', marginHorizontal: 20, marginTop: 10, padding: 16, borderRadius: 12, elevation: 2, alignItems: 'center' }}>
        <Text style={{ fontSize: 14, color: '#718096', marginBottom: 4 }}>Doanh thu hôm nay</Text>
        <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#38A169' }}>{todayEarnings.toLocaleString()} đ</Text>
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
            </>
          )}

          {availableOrders.length > 0 && (
            <View style={{ marginTop: 20, marginBottom: 10, alignItems: 'center' }}>
              <View style={[styles.radarEffect, { marginTop: 0, marginBottom: 10, backgroundColor: '#E6FFFA', borderColor: '#B2F5EA' }]}>
                 <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#38A169' }}>{countdown}</Text>
              </View>
              <Text style={[styles.waitingText, { color: '#38A169' }]}>Có cuốc xe mới!</Text>
            </View>
          )}

          {availableOrders.length === 0 ? (
            <Text style={{ textAlign: 'center', marginTop: 20, color: '#718096' }}>Chưa có cuốc xe nào quanh đây.</Text>
          ) : (
            availableOrders.map((order) => (
              <TouchableOpacity 
                key={order.order_id}
                style={styles.dummyOrder}
                onPress={() => handleAcceptOrder(order.order_id)}
              >
                <View style={styles.orderHeader}>
                  <Text style={styles.orderType}>
                    {order.service_type === 'BIKE' ? 'Chở khách (Bike)' : order.service_type === 'CAR' ? 'Chở khách (Car)' : 'Giao đồ ăn'}
                  </Text>
                  <Text style={styles.orderPrice}>{parseFloat(order.total_amount).toLocaleString()}đ</Text>
                </View>
                <Text style={styles.addressText}><Ionicons name="location" color="#3182CE"/> Điểm đón: {order.pickup_address || 'Đang cập nhật'}</Text>
                <Text style={styles.addressText}><Ionicons name="flag" color="#E53E3E"/> Điểm đến: {order.destination_address || 'Đang cập nhật'}</Text>
                <Text style={styles.tapToAccept}>Chạm để nhận cuốc!</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      ) : (
        <View style={styles.offlineContainer}>
          <Ionicons name="moon-outline" size={80} color="#A0AEC0" />
          <Text style={styles.offlineTitle}>Bạn đang nghỉ ngơi</Text>
          <Text style={styles.offlineDesc}>Bật trạng thái trực tuyến để bắt đầu nhận cuốc xe và đơn hàng mới</Text>
        </View>
      )}
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
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
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
  tapToAccept: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3182CE',
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

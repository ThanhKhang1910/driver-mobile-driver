import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axiosClient from '@/api/axiosClient';

interface HistoryOrder {
  order_id: number;
  total_amount: string | number;
  status: string;
  created_at: string;
  service_type: string;
  pickup_address?: string;
  destination_address?: string;
  shop_name?: string;
  customer_name?: string;
  customer_phone?: string;
}

export default function DriverHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'COMPLETED' | 'CANCELLED'>('ALL');

  // 60FPS Entry & Tab Switch Animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const listAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(100, [
      Animated.spring(headerAnim, {
        toValue: 1,
        friction: 8,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.spring(listAnim, {
        toValue: 1,
        friction: 8,
        tension: 45,
        useNativeDriver: true,
      }),
    ]).start();
  }, [headerAnim, listAnim]);

  useEffect(() => {
    listAnim.setValue(0);
    Animated.spring(listAnim, {
      toValue: 1,
      friction: 8,
      tension: 50,
      useNativeDriver: true,
    }).start();
  }, [filterStatus, listAnim]);

  const fetchHistory = async () => {
    try {
      const res = await axiosClient.get('/driver/history');
      setOrders(res.data || []);
    } catch (err) {
      console.error('Fetch driver history error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const filteredOrders = orders.filter((o) => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'COMPLETED') return o.status === 'COMPLETED';
    if (filterStatus === 'CANCELLED') return o.status === 'CANCELLED';
    return true;
  });

  const getServiceBadge = (type: string) => {
    const sType = (type || 'FOOD').toUpperCase();
    if (sType === 'BIKE') return { label: '🛵 Xe ôm Bike', color: '#2E7D32', bg: '#E8F5E9' };
    if (sType === 'CAR' || sType === 'CAR_4' || sType === 'CAR_7')
      return { label: '🚘 Chở khách Car', color: '#388E3C', bg: '#F1F8E9' };
    if (sType === 'DELIVERY') return { label: '📦 Giao hàng', color: '#D97706', bg: '#FFF8E1' };
    return { label: '🍔 Giao đồ ăn', color: '#10B981', bg: '#ECFDF5' };
  };

  const renderItem = ({ item }: { item: HistoryOrder }) => {
    const badge = getServiceBadge(item.service_type);
    const amount = Number(item.total_amount || 0).toLocaleString();
    const dateFormatted = new Date(item.created_at).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const isCompleted = item.status === 'COMPLETED';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>
          <Text style={styles.orderId}>#{item.order_id}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: isCompleted ? '#DEF7EC' : '#FDE8E8' },
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                { color: isCompleted ? '#03543F' : '#9B1C1C' },
              ]}
            >
              {isCompleted ? 'Hoàn thành' : item.status}
            </Text>
          </View>
        </View>

        <Text style={styles.timeText}>
          <Ionicons name="time-outline" size={13} color="#94A3B8" /> {dateFormatted}
        </Text>

        <View style={styles.routeBox}>
          <View style={styles.routeItem}>
            <Ionicons name="radio-button-on" size={14} color="#2E7D32" />
            <Text style={styles.addressText} numberOfLines={1}>
              {item.pickup_address || item.shop_name || 'Điểm đón'}
            </Text>
          </View>
          <View style={styles.routeItem}>
            <Ionicons name="location" size={14} color="#EF4444" />
            <Text style={styles.addressText} numberOfLines={1}>
              {item.destination_address || 'Điểm trả khách'}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.customerInfo}>
            <Ionicons name="person-circle-outline" size={16} color="#64748B" />
            <Text style={styles.customerName}>
              {item.customer_name || 'Khách hàng'}
            </Text>
          </View>
          <Text style={styles.earningsAmount}>+{amount}đ</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header NK Go Green Gradient */}
      <Animated.View
        style={{
          opacity: headerAnim,
          transform: [
            {
              translateY: headerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-20, 0],
              }),
            },
          ],
        }}
      >
        <LinearGradient
          colors={['#174A1B', '#236E27', '#388E3C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 8 }]}
        >
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Lịch Sử Cuốc Xe</Text>
          <View style={{ width: 38 }} />
        </LinearGradient>
      </Animated.View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, filterStatus === 'ALL' && styles.filterChipActive]}
          onPress={() => setFilterStatus('ALL')}
        >
          <Text
            style={[
              styles.filterChipText,
              filterStatus === 'ALL' && styles.filterChipTextActive,
            ]}
          >
            Tất cả ({orders.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, filterStatus === 'COMPLETED' && styles.filterChipActive]}
          onPress={() => setFilterStatus('COMPLETED')}
        >
          <Text
            style={[
              styles.filterChipText,
              filterStatus === 'COMPLETED' && styles.filterChipTextActive,
            ]}
          >
            Hoàn thành
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, filterStatus === 'CANCELLED' && styles.filterChipActive]}
          onPress={() => setFilterStatus('CANCELLED')}
        >
          <Text
            style={[
              styles.filterChipText,
              filterStatus === 'CANCELLED' && styles.filterChipTextActive,
            ]}
          >
            Đã hủy
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={styles.loadingText}>Đang tải lịch sử chuyến xe...</Text>
        </View>
      ) : (
        <Animated.View
          style={{
            flex: 1,
            opacity: listAnim,
            transform: [
              {
                translateY: listAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          }}
        >
          <FlatList
            data={filteredOrders}
            keyExtractor={(item) => String(item.order_id)}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2E7D32']} />
            }
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Ionicons name="document-text-outline" size={60} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>Chưa có lịch sử chuyến xe</Text>
                <Text style={styles.emptySub}>
                  Các chuyến xe và đơn giao hàng hoàn thành sẽ hiển thị tại đây
                </Text>
              </View>
            }
          />
        </Animated.View>
      )}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#174A1B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  orderId: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  timeText: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 8,
  },
  routeBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    gap: 6,
    marginBottom: 10,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  customerName: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  earningsAmount: {
    fontSize: 15,
    fontWeight: '900',
    color: '#2E7D32',
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 10,
    color: '#64748B',
    fontSize: 13,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
});

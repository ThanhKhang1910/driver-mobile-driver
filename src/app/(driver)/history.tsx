import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Dimensions,
} from 'react-native';
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
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'COMPLETED' | 'CANCELLED'>('ALL');

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
    if (sType === 'BIKE') return { label: '🛵 Xe ôm Bike', color: '#38A169', bg: '#F0FFF4' };
    if (sType === 'CAR' || sType === 'CAR_4' || sType === 'CAR_7')
      return { label: '🚘 Chở khách Car', color: '#8B5CF6', bg: '#F5F3FF' };
    if (sType === 'DELIVERY') return { label: '📦 Giao hàng', color: '#E53E3E', bg: '#FFF5F5' };
    return { label: '🍔 Giao đồ ăn', color: '#3399FF', bg: '#EFF6FF' };
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
            <Ionicons name="radio-button-on" size={14} color="#3399FF" />
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
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lịch Sử Cuốc Xe</Text>
        <View style={{ width: 38 }} />
      </View>

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
          <ActivityIndicator size="large" color="#3399FF" />
          <Text style={styles.loadingText}>Đang tải lịch sử chuyến xe...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => String(item.order_id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3399FF']} />
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
      )}
    </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  filterChipActive: {
    backgroundColor: '#3399FF',
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
    borderColor: '#E2E8F0',
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
    color: '#10B981',
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

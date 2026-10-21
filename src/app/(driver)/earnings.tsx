import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axiosClient from '@/api/axiosClient';

const { width } = Dimensions.get('window');

interface EarningsData {
  today: number;
  todayTrips: number;
  week: number;
  weekTrips: number;
  total: number;
  totalTrips: number;
  walletBalance: number;
}

export default function DriverEarningsScreen() {
  const router = useRouter();
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Withdraw modal
  const [withdrawModal, setWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankAccount, setBankAccount] = useState('190368889999 - Techcombank');
  const [withdrawing, setWithdrawing] = useState(false);

  const fetchEarnings = async () => {
    try {
      const res = await axiosClient.get('/driver/earnings');
      setData(res.data);
    } catch (err) {
      console.error('Fetch earnings error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarnings();
  }, []);

  const handleWithdraw = () => {
    const amount = Number(withdrawAmount);
    if (!amount || amount < 50000) {
      Alert.alert('Số tiền không hợp lệ', 'Số tiền rút tối thiểu là 50.000đ!');
      return;
    }
    if (data && amount > data.walletBalance) {
      Alert.alert('Số dư không đủ', 'Số tiền rút vượt quá số dư khả dụng trong ví!');
      return;
    }

    setWithdrawing(true);
    setTimeout(() => {
      setWithdrawing(false);
      setWithdrawModal(false);
      Alert.alert(
        'Yêu cầu rút tiền thành công! 💸',
        `Đã tạo lệnh chuyển ${amount.toLocaleString()}đ về tài khoản ${bankAccount}. Tiền sẽ về trong vòng 5-15 phút.`,
        [
          {
            text: 'Đồng ý',
            onPress: () => {
              if (data) {
                setData({
                  ...data,
                  walletBalance: Math.max(0, data.walletBalance - amount),
                });
              }
              setWithdrawAmount('');
            },
          },
        ]
      );
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thu Nhập & Ví Tài Xế</Text>
        <TouchableOpacity style={styles.backBtn} onPress={fetchEarnings}>
          <Ionicons name="refresh" size={20} color="#0F172A" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Đang tổng hợp doanh thu...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Main Wallet Card */}
          <View style={styles.walletCard}>
            <View style={styles.walletTop}>
              <View>
                <Text style={styles.walletLabel}>Số dư ví tài xế khả dụng</Text>
                <Text style={styles.walletBalance}>
                  {(data?.walletBalance || 0).toLocaleString()} đ
                </Text>
              </View>
              <View style={styles.walletIcon}>
                <Ionicons name="wallet" size={28} color="#FFFFFF" />
              </View>
            </View>

            <View style={styles.walletActions}>
              <TouchableOpacity
                style={styles.withdrawBtn}
                onPress={() => setWithdrawModal(true)}
              >
                <Ionicons name="cash-outline" size={16} color="#10B981" />
                <Text style={styles.withdrawBtnText}>Rút tiền về ngân hàng</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Metric Cards Row */}
          <View style={styles.statsRow}>
            {/* Today */}
            <View style={styles.statCard}>
              <View style={styles.statIconBadge}>
                <Ionicons name="today-outline" size={18} color="#3B82F6" />
              </View>
              <Text style={styles.statLabel}>Hôm nay</Text>
              <Text style={styles.statValue}>
                {(data?.today || 0).toLocaleString()}đ
              </Text>
              <Text style={styles.statTrips}>{data?.todayTrips || 0} chuyến</Text>
            </View>

            {/* This Week */}
            <View style={styles.statCard}>
              <View style={[styles.statIconBadge, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="calendar-outline" size={18} color="#10B981" />
              </View>
              <Text style={styles.statLabel}>7 ngày qua</Text>
              <Text style={styles.statValue}>
                {(data?.week || 0).toLocaleString()}đ
              </Text>
              <Text style={styles.statTrips}>{data?.weekTrips || 0} chuyến</Text>
            </View>

            {/* Lifetime Total */}
            <View style={styles.statCard}>
              <View style={[styles.statIconBadge, { backgroundColor: '#FDF2F8' }]}>
                <Ionicons name="trophy-outline" size={18} color="#EC4899" />
              </View>
              <Text style={styles.statLabel}>Tổng tích lũy</Text>
              <Text style={styles.statValue}>
                {(data?.total || 0).toLocaleString()}đ
              </Text>
              <Text style={styles.statTrips}>{data?.totalTrips || 0} chuyến</Text>
            </View>
          </View>

          {/* Breakdown & Commission policy */}
          <View style={styles.policyCard}>
            <View style={styles.policyRow}>
              <Ionicons name="information-circle-outline" size={20} color="#3B82F6" />
              <View style={{ flex: 1 }}>
                <Text style={styles.policyTitle}>Chính sách chia sẻ doanh thu</Text>
                <Text style={styles.policyText}>
                  Tài xế thực nhận 80% cước phí chuyến xe. Phí nền tảng NKGO là 20% (đã bao gồm bảo hiểm chuyến đi).
                </Text>
              </View>
            </View>
          </View>

          {/* Quick Transaction History Header */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Lịch sử biến động gần đây</Text>
            <TouchableOpacity onPress={() => router.push('/(driver)/history' as any)}>
              <Text style={styles.seeAllText}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.historyList}>
            <View style={styles.historyItem}>
              <View style={styles.historyIconBox}>
                <Ionicons name="arrow-down-circle" size={24} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.historyTitle}>Nhận cước chuyến xe #Hoàn tất</Text>
                <Text style={styles.historyDate}>Hôm nay • NKGO Car/Bike</Text>
              </View>
              <Text style={styles.historyAmountPlus}>+{(data?.today || 35000).toLocaleString()}đ</Text>
            </View>
          </View>
        </ScrollView>
      )}

      {/* WITHDRAW MODAL */}
      <Modal
        visible={withdrawModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setWithdrawModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rút tiền về tài khoản</Text>
              <TouchableOpacity onPress={() => setWithdrawModal(false)}>
                <Ionicons name="close" size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Tài khoản nhận tiền</Text>
            <TextInput
              style={styles.modalInput}
              value={bankAccount}
              onChangeText={setBankAccount}
              placeholder="Số tài khoản - Ngân hàng"
            />

            <Text style={[styles.inputLabel, { marginTop: 12 }]}>Số tiền muốn rút (VNĐ)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Tối thiểu 50.000đ"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
            />

            <View style={styles.quickAmountRow}>
              {[100000, 200000, 500000].map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={styles.quickAmtBtn}
                  onPress={() => setWithdrawAmount(String(amt))}
                >
                  <Text style={styles.quickAmtText}>{amt.toLocaleString()}đ</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.confirmWithdrawBtn}
              onPress={handleWithdraw}
              disabled={withdrawing}
            >
              {withdrawing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmWithdrawText}>Xác nhận rút tiền</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  walletCard: {
    backgroundColor: '#10B981',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  walletTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  walletLabel: {
    color: '#D1FAE5',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  walletBalance: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
  },
  walletIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletActions: {
    flexDirection: 'row',
  },
  withdrawBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 11,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  withdrawBtnText: {
    color: '#065F46',
    fontSize: 13,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  statIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
    textAlign: 'center',
  },
  statTrips: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  policyCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 20,
  },
  policyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  policyTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E40AF',
    marginBottom: 2,
  },
  policyText: {
    fontSize: 11,
    color: '#1E3A8A',
    lineHeight: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  seeAllText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '700',
  },
  historyList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  historyIconBox: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  historyDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  historyAmountPlus: {
    fontSize: 14,
    fontWeight: '800',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13,
    color: '#0F172A',
  },
  quickAmountRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    marginBottom: 16,
  },
  quickAmtBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  quickAmtText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  confirmWithdrawBtn: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmWithdrawText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});

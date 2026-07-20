import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axiosClient from '@/api/axiosClient';
import { useAuth } from '@/context/AuthContext';

export default function DepositScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const predefinedAmounts = ['50000', '100000', '200000', '500000'];

  const handleDeposit = async () => {
    const numAmount = parseInt(amount.replace(/\D/g, ''), 10);

    if (!numAmount || numAmount < 10000) {
      Alert.alert('Lỗi', 'Số tiền nạp tối thiểu là 10.000đ');
      return;
    }

    setLoading(true);
    try {
      // Call our backend API to create MoMo payment link
      const res = await axiosClient.post('/payment/deposit', { amount: numAmount });
      
      if (res.data.success && res.data.payUrl) {
        // Open MoMo app / WebView for payment
        const supported = await Linking.canOpenURL(res.data.payUrl);
        if (supported) {
          await Linking.openURL(res.data.payUrl);
          // Wait a bit, then assume we return and ask user to check balance
          setTimeout(() => {
            Alert.alert('Đang xử lý', 'Vui lòng kiểm tra lại số dư sau khi thanh toán qua MoMo thành công.', [
              { text: 'OK', onPress: () => router.back() }
            ]);
          }, 2000);
        } else {
          Alert.alert('Lỗi', 'Không thể mở liên kết thanh toán MoMo.');
        }
      } else {
        Alert.alert('Lỗi', res.data.message || 'Không thể tạo yêu cầu thanh toán');
      }
    } catch (error: any) {
      console.error('Deposit Error:', error);
      Alert.alert('Lỗi', error.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  const formatInput = (val: string) => {
    const numericValue = val.replace(/\D/g, '');
    setAmount(numericValue ? parseInt(numericValue).toLocaleString('vi-VN') : '');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 10 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={28} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nạp tiền</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>Nhập số tiền cần nạp (VNĐ)</Text>
        
        <View style={styles.inputWrapper}>
          <Text style={styles.currency}>đ</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor="#94A3B8"
            value={amount}
            onChangeText={formatInput}
            autoFocus
          />
        </View>

        <View style={styles.quickAmounts}>
          {predefinedAmounts.map((amt) => (
            <TouchableOpacity 
              key={amt} 
              style={styles.chip}
              onPress={() => formatInput(amt)}
            >
              <Text style={styles.chipText}>{parseInt(amt).toLocaleString('vi-VN')}đ</Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <View style={styles.paymentMethodCard}>
          <View style={styles.iconBox}>
            <Ionicons name="wallet" size={24} color="#3399FF" />
          </View>
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentTitle}>Thanh toán qua MoMo</Text>
            <Text style={styles.paymentDesc}>Miễn phí giao dịch</Text>
          </View>
          <Ionicons name="checkmark-circle" size={24} color="#3399FF" />
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.btn, (!amount || loading) && styles.btnDisabled]}
          onPress={handleDeposit}
          disabled={!amount || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.btnText}>Xác nhận nạp tiền</Text>
          )}
        </TouchableOpacity>
      </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  label: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#3399FF',
    paddingBottom: 8,
    marginBottom: 24,
  },
  currency: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0F172A',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 40,
    fontWeight: '800',
    color: '#0F172A',
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 40,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3399FF',
    backgroundColor: '#EFF6FF',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  paymentDesc: {
    fontSize: 13,
    color: '#64748B',
  },
  footer: {
    padding: 20,
    paddingBottom: 30,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  btn: {
    height: 54,
    backgroundColor: '#3399FF',
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3399FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: {
    backgroundColor: '#E2D5B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

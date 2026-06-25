import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import axiosClient from '@/api/axiosClient';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleType, setVehicleType] = useState('BIKE');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState('');

  const handleRegister = async () => {
    if (!fullName || !email || !phone || !password || !confirmPassword) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Lỗi', 'Email không đúng định dạng.');
      return;
    }

    if (phone.length < 10 || isNaN(Number(phone))) {
      Alert.alert('Lỗi', 'Số điện thoại không hợp lệ (phải gồm các chữ số và ít nhất 10 số).');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu phải có tối thiểu 6 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp.');
      return;
    }

    if (!vehiclePlate) {
      Alert.alert('Lỗi', 'Vui lòng nhập biển số xe.');
      return;
    }

    setLoading(true);
    try {
      const res = await axiosClient.post('/auth/register', {
        full_name: fullName,
        email,
        phone,
        password,
        role: 'DRIVER',
        vehiclePlate,
        vehicleType,
      });

      await login(res.data.user, res.data.token);
      Alert.alert('Thành công', 'Đăng ký Tài xế thành công! 🎉');
      router.replace('/(driver)/home');
    } catch (error: any) {
      console.log('Register error:', error);
      const msg = error.response?.data?.message || 'Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.';
      Alert.alert('Đăng ký thất bại', msg);
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (
    label: string,
    fieldName: string,
    icon: string,
    value: string,
    onChangeText: (text: string) => void,
    options?: {
      placeholder?: string;
      keyboardType?: any;
      autoCapitalize?: any;
      secureTextEntry?: boolean;
      showToggle?: boolean;
      toggleValue?: boolean;
      onToggle?: () => void;
    }
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={[
        styles.inputWrapper,
        focusedField === fieldName && styles.inputFocused,
      ]}>
        <Ionicons 
          name={icon as any} 
          size={20} 
          color={focusedField === fieldName ? '#3399FF' : '#94A3B8'} 
          style={styles.inputIcon} 
        />
        <TextInput
          style={styles.input}
          placeholder={options?.placeholder || ''}
          placeholderTextColor="#94A3B8"
          keyboardType={options?.keyboardType || 'default'}
          autoCapitalize={options?.autoCapitalize || 'sentences'}
          secureTextEntry={options?.secureTextEntry || false}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocusedField(fieldName)}
          onBlur={() => setFocusedField('')}
        />
        {options?.showToggle && (
          <TouchableOpacity onPress={options.onToggle} style={styles.eyeButton}>
            <Ionicons 
              name={options.toggleValue ? 'eye-outline' : 'eye-off-outline'} 
              size={20} 
              color="#94A3B8" 
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Decorative circles */}
          <View style={styles.topDecoration}>
            <View style={styles.wave1} />
            <View style={styles.wave2} />
          </View>

          {/* Header */}
          <View style={styles.headerContainer}>
            <View style={styles.iconContainer}>
              <View style={styles.iconInner}>
                <Ionicons name="person-add" size={28} color="#FFFFFF" />
              </View>
            </View>
            <Text style={styles.title}>Đăng ký Tài xế</Text>
            <Text style={styles.subtitle}>Gia nhập đội ngũ giao hàng của FoodDelivery</Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            {renderInput('Họ và tên', 'fullName', 'person-outline', fullName, setFullName, {
              placeholder: 'Nguyễn Văn A',
            })}

            {renderInput('Email', 'email', 'mail-outline', email, setEmail, {
              placeholder: 'example@gmail.com',
              keyboardType: 'email-address',
              autoCapitalize: 'none',
            })}

            {renderInput('Số điện thoại', 'phone', 'call-outline', phone, setPhone, {
              placeholder: '0901234567',
              keyboardType: 'phone-pad',
            })}

            {renderInput('Mật khẩu', 'password', 'lock-closed-outline', password, setPassword, {
              placeholder: 'Tối thiểu 6 ký tự',
              secureTextEntry: !showPassword,
              showToggle: true,
              toggleValue: showPassword,
              onToggle: () => setShowPassword(!showPassword),
            })}

            {renderInput('Xác nhận mật khẩu', 'confirmPassword', 'shield-checkmark-outline', confirmPassword, setConfirmPassword, {
              placeholder: 'Nhập lại mật khẩu',
              secureTextEntry: !showConfirmPassword,
              showToggle: true,
              toggleValue: showConfirmPassword,
              onToggle: () => setShowConfirmPassword(!showConfirmPassword),
            })}

            {renderInput('Biển số xe', 'vehiclePlate', 'car-outline', vehiclePlate, setVehiclePlate, {
              placeholder: 'VD: 59-X1 123.45',
              autoCapitalize: 'characters',
            })}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Loại xe</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity 
                  style={[styles.typeButton, vehicleType === 'BIKE' && styles.typeButtonActive]}
                  onPress={() => setVehicleType('BIKE')}
                >
                  <Ionicons name="bicycle" size={20} color={vehicleType === 'BIKE' ? '#FFFFFF' : '#94A3B8'} />
                  <Text style={[styles.typeText, vehicleType === 'BIKE' && styles.typeTextActive]}>Xe máy</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.typeButton, vehicleType === 'CAR' && styles.typeButtonActive]}
                  onPress={() => setVehicleType('CAR')}
                >
                  <Ionicons name="car" size={20} color={vehicleType === 'CAR' ? '#FFFFFF' : '#94A3B8'} />
                  <Text style={[styles.typeText, vehicleType === 'CAR' && styles.typeTextActive]}>Ô tô</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.registerButton, loading && styles.disabledButton]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={styles.registerButtonText}>Đăng ký</Text>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer links */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>Đã có tài khoản? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.loginLink}>Đăng nhập ngay</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  topDecoration: {
    position: 'absolute',
    top: -80,
    left: -60,
    width: 200,
    height: 200,
  },
  wave1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(245, 166, 35, 0.08)',
  },
  wave2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 213, 79, 0.1)',
    top: 30,
    left: 30,
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 28,
  },
  iconContainer: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#3399FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  iconInner: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#3399FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  formContainer: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    shadowColor: '#E8D5A3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  inputFocused: {
    borderColor: '#3399FF',
    backgroundColor: '#FFFCF0',
    shadowColor: '#3399FF',
    shadowOpacity: 0.12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '500',
  },
  eyeButton: {
    padding: 4,
  },
  registerButton: {
    height: 54,
    backgroundColor: '#3399FF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#3399FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  disabledButton: {
    backgroundColor: '#E8D5A3',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  registerButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '800',
    color: '#3399FF',
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
  },
  typeButtonActive: {
    backgroundColor: '#3399FF',
    borderColor: '#3399FF',
  },
  typeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  typeTextActive: {
    color: '#FFFFFF',
  },
});

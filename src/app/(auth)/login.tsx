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
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import axiosClient from '@/api/axiosClient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }
    
    if (!email.includes('@')) {
      Alert.alert('Lỗi', 'Email không hợp lệ.');
      return;
    }

    setLoading(true);
    try {
      const res = await axiosClient.post('/auth/login', { email, password });
      const userData = res.data.user;
      await login(userData, res.data.token);
      
      // Route based on role
      if (userData.role === 'DRIVER') {
        router.replace('/(driver)/home');
      } else {
        Alert.alert('Lỗi', 'Tài khoản không phải là Tài xế!');
      }
    } catch (error: any) {
      console.log('Login Error:', error.response?.data || error.message);
      const msg = error.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.';
      Alert.alert('Đăng nhập thất bại', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Decorative Top Wave */}
          <View style={styles.topDecoration}>
            <View style={styles.wave1} />
            <View style={styles.wave2} />
            <View style={styles.wave3} />
          </View>

          {/* Header/Logo */}
          <View style={styles.headerContainer}>
            <View style={styles.logoContainer}>
              <View style={styles.logoInner}>
                <Ionicons name="fast-food" size={36} color="#FFFFFF" />
              </View>
            </View>
            <Text style={styles.appName}>FoodDelivery</Text>
            <Text style={styles.title}>Chào mừng trở lại!</Text>
            <Text style={styles.subtitle}>Đăng nhập để tiếp tục đặt đồ ăn ngon</Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={[
                styles.inputWrapper,
                focusedField === 'email' && styles.inputFocused,
              ]}>
                <Ionicons name="mail-outline" size={20} color={focusedField === 'email' ? '#3399FF' : '#94A3B8'} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="example@gmail.com"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField('')}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mật khẩu</Text>
              <View style={[
                styles.inputWrapper,
                focusedField === 'password' && styles.inputFocused,
              ]}>
                <Ionicons name="lock-closed-outline" size={20} color={focusedField === 'password' ? '#3399FF' : '#94A3B8'} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Nhập mật khẩu của bạn"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField('')}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  <Ionicons 
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'} 
                    size={20} 
                    color="#94A3B8" 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity style={styles.forgotContainer}>
              <Text style={styles.forgotText}>Quên mật khẩu?</Text>
            </TouchableOpacity>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.loginButton, loading && styles.disabledButton]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={styles.loginButtonText}>Đăng nhập</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer links */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>Chưa có tài khoản? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.registerLink}>Đăng ký ngay</Text>
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
    paddingBottom: 40,
  },
  topDecoration: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 300,
    height: 300,
  },
  wave1: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(245, 166, 35, 0.08)',
    top: 0,
    right: 0,
  },
  wave2: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 213, 79, 0.1)',
    top: 40,
    right: 30,
  },
  wave3: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(245, 166, 35, 0.12)',
    top: 80,
    right: 70,
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: 80,
    marginBottom: 40,
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 28,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#3399FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  logoInner: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#3399FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#3399FF',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 16,
    shadowColor: '#E8D5A3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  inputFocused: {
    borderColor: '#3399FF',
    backgroundColor: '#FFFCF0',
    shadowColor: '#3399FF',
    shadowOpacity: 0.15,
  },
  inputIcon: {
    marginRight: 12,
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
  forgotContainer: {
    alignSelf: 'flex-end',
    marginBottom: 28,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3399FF',
  },
  loginButton: {
    height: 56,
    backgroundColor: '#3399FF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3399FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  disabledButton: {
    backgroundColor: '#E8D5A3',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '800',
    color: '#3399FF',
  },
});

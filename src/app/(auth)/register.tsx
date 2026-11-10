import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
  Image,
  StatusBar,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import axiosClient from '@/api/axiosClient';

const { width } = Dimensions.get('window');

export default function RegisterScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const insets = useSafeAreaInsets();

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
  const [focusedField, setFocusedField] = useState<string>('');

  // Animated Values
  const headerSlideDown = useRef(new Animated.Value(-120)).current;
  const riderSlideFromRight = useRef(new Animated.Value(width * 0.7)).current;
  const riderOpacity = useRef(new Animated.Value(0)).current;
  const riderBob = useRef(new Animated.Value(0)).current;

  const formSlideUp = useRef(new Animated.Value(150)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(headerSlideDown, {
      toValue: 0,
      friction: 7,
      tension: 40,
      useNativeDriver: true,
    }).start();

    Animated.parallel([
      Animated.spring(riderSlideFromRight, {
        toValue: 0,
        friction: 6.5,
        tension: 30,
        delay: 80,
        useNativeDriver: true,
      }),
      Animated.timing(riderOpacity, {
        toValue: 1,
        duration: 350,
        delay: 80,
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(riderBob, {
            toValue: -3,
            duration: 700,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(riderBob, {
            toValue: 0,
            duration: 700,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      ).start();
    });

    Animated.parallel([
      Animated.spring(formSlideUp, {
        toValue: 0,
        friction: 8,
        tension: 35,
        delay: 240,
        useNativeDriver: true,
      }),
      Animated.timing(formOpacity, {
        toValue: 1,
        duration: 400,
        delay: 240,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(btnScale, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(btnScale, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  };

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
      Alert.alert('Thành công', 'Đăng ký Đối tác Tài xế NK Go thành công! 🎉');
      router.replace('/(driver)/home');
    } catch (error: any) {
      console.log('Register error:', error);
      const msg = error.response?.data?.message || 'Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.';
      Alert.alert('Đăng ký thất bại', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.safeArea}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* 1. COMPACT TOP CURVED HEADER */}
          <View style={styles.headerWrapper}>
            <LinearGradient
              colors={['#174A1B', '#236E27', '#388E3C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.headerGradient,
                { paddingTop: Math.max(insets.top, 20) + 10 },
              ]}
            >
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.headerTextGroup}>
                <Image
                  source={require('../../../assets/images/brand-logo.png')}
                  style={styles.headerBrandLogo}
                  resizeMode="contain"
                />
                <Text style={styles.headerSubtitle}>Gia nhập Đội ngũ Tài xế NK Go</Text>
              </View>

              <Animated.View
                style={[
                  styles.headerRiderBadge,
                  {
                    opacity: riderOpacity,
                    transform: [
                      { translateX: riderSlideFromRight },
                      { translateY: riderBob },
                    ],
                  },
                ]}
              >
                <Image
                  source={require('../../../assets/images/rider-login.png')}
                  style={styles.headerRiderImage}
                  resizeMode="contain"
                />
              </Animated.View>
            </LinearGradient>
          </View>

          {/* 2. FORM CARD */}
          <View
            style={[
              styles.formCard,
              {
                paddingBottom: Math.max(insets.bottom, 14) + 8,
              },
            ]}
          >
            <View style={styles.titleGroup}>
              <Text style={styles.welcomeTitle}>Đăng ký Đối tác Tài xế</Text>
              <Text style={styles.welcomeSub}>Điền thông tin cá nhân và phương tiện hoạt động</Text>
            </View>

            <View style={styles.inputsSection}>
              {/* Họ và tên */}
              <View
                style={[
                  styles.inputWrapper,
                  focusedField === 'fullName' && styles.inputWrapperFocused,
                ]}
              >
                <View style={styles.iconCircle}>
                  <Ionicons
                    name="person-outline"
                    size={17}
                    color={focusedField === 'fullName' ? '#2E7D32' : '#8E9AA8'}
                  />
                </View>
                <TextInput
                  style={styles.inputField}
                  placeholder="Họ và tên tài xế"
                  placeholderTextColor="#9EAAB7"
                  value={fullName}
                  onChangeText={setFullName}
                  onFocus={() => setFocusedField('fullName')}
                  onBlur={() => setFocusedField((prev) => (prev === 'fullName' ? '' : prev))}
                />
              </View>

              {/* Email */}
              <View
                style={[
                  styles.inputWrapper,
                  focusedField === 'email' && styles.inputWrapperFocused,
                ]}
              >
                <View style={styles.iconCircle}>
                  <Ionicons
                    name="mail-outline"
                    size={17}
                    color={focusedField === 'email' ? '#2E7D32' : '#8E9AA8'}
                  />
                </View>
                <TextInput
                  style={styles.inputField}
                  placeholder="Email của bạn"
                  placeholderTextColor="#9EAAB7"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField((prev) => (prev === 'email' ? '' : prev))}
                />
              </View>

              {/* Số điện thoại */}
              <View
                style={[
                  styles.inputWrapper,
                  focusedField === 'phone' && styles.inputWrapperFocused,
                ]}
              >
                <View style={styles.iconCircle}>
                  <Ionicons
                    name="call-outline"
                    size={17}
                    color={focusedField === 'phone' ? '#2E7D32' : '#8E9AA8'}
                  />
                </View>
                <TextInput
                  style={styles.inputField}
                  placeholder="Số điện thoại liên hệ"
                  placeholderTextColor="#9EAAB7"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  onFocus={() => setFocusedField('phone')}
                  onBlur={() => setFocusedField((prev) => (prev === 'phone' ? '' : prev))}
                />
              </View>

              {/* Biển số xe */}
              <View
                style={[
                  styles.inputWrapper,
                  focusedField === 'vehiclePlate' && styles.inputWrapperFocused,
                ]}
              >
                <View style={styles.iconCircle}>
                  <Ionicons
                    name="card-outline"
                    size={17}
                    color={focusedField === 'vehiclePlate' ? '#2E7D32' : '#8E9AA8'}
                  />
                </View>
                <TextInput
                  style={styles.inputField}
                  placeholder="Biển số xe (VD: 59-X1 123.45)"
                  placeholderTextColor="#9EAAB7"
                  autoCapitalize="characters"
                  value={vehiclePlate}
                  onChangeText={setVehiclePlate}
                  onFocus={() => setFocusedField('vehiclePlate')}
                  onBlur={() => setFocusedField((prev) => (prev === 'vehiclePlate' ? '' : prev))}
                />
              </View>

              {/* Loại phương tiện */}
              <View style={styles.vehicleTypeRow}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    vehicleType === 'BIKE' && styles.typeButtonActive,
                  ]}
                  onPress={() => setVehicleType('BIKE')}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name="bicycle"
                    size={18}
                    color={vehicleType === 'BIKE' ? '#FFFFFF' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.typeText,
                      vehicleType === 'BIKE' && styles.typeTextActive,
                    ]}
                  >
                    Xe máy (Bike)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    vehicleType === 'CAR' && styles.typeButtonActive,
                  ]}
                  onPress={() => setVehicleType('CAR')}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name="car"
                    size={18}
                    color={vehicleType === 'CAR' ? '#FFFFFF' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.typeText,
                      vehicleType === 'CAR' && styles.typeTextActive,
                    ]}
                  >
                    Ô tô (Car)
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Mật khẩu */}
              <View
                style={[
                  styles.inputWrapper,
                  focusedField === 'password' && styles.inputWrapperFocused,
                ]}
              >
                <View style={styles.iconCircle}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={17}
                    color={focusedField === 'password' ? '#2E7D32' : '#8E9AA8'}
                  />
                </View>
                <TextInput
                  style={styles.inputField}
                  placeholder="Mật khẩu (tối thiểu 6 ký tự)"
                  placeholderTextColor="#9EAAB7"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField((prev) => (prev === 'password' ? '' : prev))}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={18}
                    color="#8E9AA8"
                  />
                </TouchableOpacity>
              </View>

              {/* Xác nhận mật khẩu */}
              <View
                style={[
                  styles.inputWrapper,
                  focusedField === 'confirmPassword' && styles.inputWrapperFocused,
                ]}
              >
                <View style={styles.iconCircle}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={17}
                    color={focusedField === 'confirmPassword' ? '#2E7D32' : '#8E9AA8'}
                  />
                </View>
                <TextInput
                  style={styles.inputField}
                  placeholder="Xác nhận lại mật khẩu"
                  placeholderTextColor="#9EAAB7"
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onFocus={() => setFocusedField('confirmPassword')}
                  onBlur={() => setFocusedField((prev) => (prev === 'confirmPassword' ? '' : prev))}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={18}
                    color="#8E9AA8"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Cụm Nút Đăng ký và Footer */}
            <View style={styles.bottomSection}>
              <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                <TouchableOpacity
                  onPress={handleRegister}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                  disabled={loading}
                  activeOpacity={0.9}
                  style={styles.btnShadow}
                >
                  <LinearGradient
                    colors={['#43A047', '#2E7D32']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.registerBtnGradient}
                  >
                    {loading ? (
                      <View style={styles.loadingRow}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                        <Text style={styles.loadingText}>Đang xử lý...</Text>
                      </View>
                    ) : (
                      <Text style={styles.registerBtnText}>Đăng ký Tài xế ngay</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              <View style={styles.footerRow}>
                <Text style={styles.footerNote}>Đã có tài khoản tài xế? </Text>
                <TouchableOpacity
                  onPress={() => router.push('/(auth)/login')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.loginLink}>Đăng nhập</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
  },
  headerWrapper: {
    width: '100%',
    overflow: 'hidden',
  },
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 22 : 14,
    paddingBottom: 14,
    paddingHorizontal: 18,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTextGroup: {
    flex: 1,
  },
  headerBrandLogo: {
    width: 155,
    height: 52,
    marginBottom: 2,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.92)',
  },
  headerRiderBadge: {
    width: 78,
    height: 78,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRiderImage: {
    width: 78,
    height: 78,
  },

  formCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'android' ? 14 : 20,
    justifyContent: 'space-between',
  },
  titleGroup: {
    marginBottom: 4,
  },
  welcomeTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  welcomeSub: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },

  inputsSection: {
    marginVertical: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 43,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  inputWrapperFocused: {
    borderColor: '#2E7D32',
    backgroundColor: '#FFFFFF',
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  inputField: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '500',
    color: '#0F172A',
  },
  eyeBtn: {
    padding: 6,
  },
  vehicleTypeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
  },
  typeButtonActive: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  typeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  typeTextActive: {
    color: '#FFFFFF',
  },

  bottomSection: {
    marginTop: 4,
  },
  btnShadow: {
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.24,
    shadowRadius: 8,
    elevation: 4,
    borderRadius: 22,
  },
  registerBtnGradient: {
    height: 46,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  footerNote: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '500',
  },
  loginLink: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#2E7D32',
  },
});

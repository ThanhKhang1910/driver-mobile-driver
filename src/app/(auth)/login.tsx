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

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const insets = useSafeAreaInsets();

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | ''>('');

  // Splash Screen State
  const [showSplash, setShowSplash] = useState(true);

  // -------------------------------------------------------------
  // ANIMATED VALUES (Tất cả đều dùng useNativeDriver để đạt 60 FPS)
  // -------------------------------------------------------------
  const splashRiderX = useRef(new Animated.Value(-width * 0.85)).current;
  const splashRiderDriveX = useRef(new Animated.Value(0)).current;
  const splashRiderBob = useRef(new Animated.Value(0)).current;
  const splashTextFade = useRef(new Animated.Value(0)).current;
  const splashContainerFade = useRef(new Animated.Value(1)).current;
  const splashScale = useRef(new Animated.Value(1)).current;

  // 4 Vạch màu xám phía sau đuôi xe (Tốc độ / khói gió)
  const greyStreak1 = useRef(new Animated.Value(0)).current;
  const greyStreak2 = useRef(new Animated.Value(0)).current;
  const greyStreak3 = useRef(new Animated.Value(0)).current;
  const greyStreak4 = useRef(new Animated.Value(0)).current;

  // Login Screen Animations
  const headerSlideDown = useRef(new Animated.Value(-160)).current;
  const riderSlideFromRight = useRef(new Animated.Value(width * 0.88)).current;
  const riderOpacity = useRef(new Animated.Value(0)).current;
  const riderBob = useRef(new Animated.Value(0)).current;

  // Form Card trượt từ dưới lên
  const formSlideUp = useRef(new Animated.Value(220)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;

  // Nút bấm nảy khi ấn
  const btnScale = useRef(new Animated.Value(1)).current;

  // -------------------------------------------------------------
  // CHUỖI HOẠT ẢNH (SPLASH -> LOGIN)
  // -------------------------------------------------------------
  useEffect(() => {
    Animated.spring(splashRiderX, {
      toValue: 0,
      friction: 6,
      tension: 32,
      useNativeDriver: true,
    }).start();

    Animated.timing(splashTextFade, {
      toValue: 1,
      duration: 500,
      delay: 200,
      useNativeDriver: true,
    }).start();

    const driveLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(splashRiderDriveX, {
          toValue: 6,
          duration: 240,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(splashRiderDriveX, {
          toValue: -3,
          duration: 200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(splashRiderDriveX, {
          toValue: 4,
          duration: 220,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(splashRiderDriveX, {
          toValue: 0,
          duration: 200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    driveLoop.start();

    const bobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(splashRiderBob, {
          toValue: -8,
          duration: 240,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(splashRiderBob, {
          toValue: 0,
          duration: 220,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(splashRiderBob, {
          toValue: -4,
          duration: 180,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(splashRiderBob, {
          toValue: 0,
          duration: 200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    bobLoop.start();

    const streakLoop1 = Animated.loop(
      Animated.timing(greyStreak1, {
        toValue: 1,
        duration: 360,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    const streakLoop2 = Animated.loop(
      Animated.timing(greyStreak2, {
        toValue: 1,
        duration: 460,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    const streakLoop3 = Animated.loop(
      Animated.timing(greyStreak3, {
        toValue: 1,
        duration: 320,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    const streakLoop4 = Animated.loop(
      Animated.timing(greyStreak4, {
        toValue: 1,
        duration: 420,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    streakLoop1.start();
    streakLoop2.start();
    streakLoop3.start();
    streakLoop4.start();

    const timer = setTimeout(() => {
      transitionToLogin();
    }, 2600);

    return () => {
      clearTimeout(timer);
      driveLoop.stop();
      bobLoop.stop();
      streakLoop1.stop();
      streakLoop2.stop();
      streakLoop3.stop();
      streakLoop4.stop();
    };
  }, []);

  const restartSplashAnimation = () => {
    splashRiderX.setValue(-width * 0.85);
    splashRiderDriveX.setValue(0);
    splashRiderBob.setValue(0);
    splashTextFade.setValue(0);
    splashContainerFade.setValue(1);
    splashScale.setValue(1);
    greyStreak1.setValue(0);
    greyStreak2.setValue(0);
    greyStreak3.setValue(0);
    greyStreak4.setValue(0);
    headerSlideDown.setValue(-160);
    riderSlideFromRight.setValue(width * 0.88);
    riderOpacity.setValue(0);
    formSlideUp.setValue(220);
    formOpacity.setValue(0);

    setShowSplash(true);

    Animated.spring(splashRiderX, {
      toValue: 0,
      friction: 6,
      tension: 32,
      useNativeDriver: true,
    }).start();

    Animated.timing(splashTextFade, {
      toValue: 1,
      duration: 500,
      delay: 200,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      transitionToLogin();
    }, 2600);
  };

  useEffect(() => {
    if (!showSplash) {
      headerSlideDown.setValue(-180);
      riderSlideFromRight.setValue(width * 0.88);
      riderOpacity.setValue(0);
      formSlideUp.setValue(220);
      formOpacity.setValue(0);

      Animated.spring(headerSlideDown, {
        toValue: 0,
        friction: 7.5,
        tension: 40,
        useNativeDriver: true,
      }).start();

      Animated.parallel([
        Animated.spring(riderSlideFromRight, {
          toValue: 0,
          friction: 6.5,
          tension: 28,
          delay: 100,
          useNativeDriver: true,
        }),
        Animated.timing(riderOpacity, {
          toValue: 1,
          duration: 400,
          delay: 100,
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
          tension: 32,
          delay: 380,
          useNativeDriver: true,
        }),
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: 460,
          delay: 380,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showSplash]);

  const transitionToLogin = () => {
    Animated.parallel([
      Animated.timing(splashContainerFade, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(splashScale, {
        toValue: 0.9,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowSplash(false);
    });
  };

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

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Lỗi', 'Email không hợp lệ. Vui lòng kiểm tra lại.');
      return;
    }

    setLoading(true);
    try {
      const res = await axiosClient.post('/auth/login', { email, password });
      const userData = res.data.user;
      await login(userData, res.data.token);

      if (userData.role === 'DRIVER') {
        router.replace('/(driver)/home');
      } else {
        Alert.alert('Thông báo', 'Tài khoản này không phải là Đối tác Tài xế!');
      }
    } catch (error: any) {
      console.log('Login Error:', error.response?.data || error.message);
      const msg = error.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.';
      Alert.alert('Đăng nhập thất bại', msg);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // GIAO DIỆN 1: MÀN HÌNH SPLASH CHÀO MỪNG ĐỐI TÁC TÀI XẾ
  // -------------------------------------------------------------
  if (showSplash) {
    return (
      <View style={[styles.splashContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
        <TouchableOpacity
          activeOpacity={1}
          style={styles.splashTouchArea}
          onPress={transitionToLogin}
        >
          <Animated.View
            style={[
              styles.splashContent,
              {
                opacity: splashContainerFade,
                transform: [{ scale: splashScale }],
              },
            ]}
          >
            <Animated.View style={{ transform: [{ translateX: splashRiderX }] }}>
              <Animated.View
                style={[
                  styles.rider1Wrapper,
                  {
                    transform: [
                      { translateX: splashRiderDriveX },
                      { translateY: splashRiderBob },
                    ],
                  },
                ]}
              >
                <Animated.View
                  style={[
                    styles.greyStreak,
                    styles.greyStreak1,
                    {
                      transform: [
                        {
                          translateX: greyStreak1.interpolate({
                            inputRange: [0, 1],
                            outputRange: [15, -60],
                          }),
                        },
                      ],
                      opacity: greyStreak1.interpolate({
                        inputRange: [0, 0.2, 0.7, 1],
                        outputRange: [0, 0.9, 0.6, 0],
                      }),
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.greyStreak,
                    styles.greyStreak2,
                    {
                      transform: [
                        {
                          translateX: greyStreak2.interpolate({
                            inputRange: [0, 1],
                            outputRange: [20, -75],
                          }),
                        },
                      ],
                      opacity: greyStreak2.interpolate({
                        inputRange: [0, 0.2, 0.8, 1],
                        outputRange: [0, 0.85, 0.5, 0],
                      }),
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.greyStreak,
                    styles.greyStreak3,
                    {
                      transform: [
                        {
                          translateX: greyStreak3.interpolate({
                            inputRange: [0, 1],
                            outputRange: [10, -65],
                          }),
                        },
                      ],
                      opacity: greyStreak3.interpolate({
                        inputRange: [0, 0.2, 0.7, 1],
                        outputRange: [0, 0.9, 0.6, 0],
                      }),
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.greyStreak,
                    styles.greyStreak4,
                    {
                      transform: [
                        {
                          translateX: greyStreak4.interpolate({
                            inputRange: [0, 1],
                            outputRange: [15, -55],
                          }),
                        },
                      ],
                      opacity: greyStreak4.interpolate({
                        inputRange: [0, 0.2, 0.8, 1],
                        outputRange: [0, 0.8, 0.5, 0],
                      }),
                    },
                  ]}
                />

                <Image
                  source={require('../../../assets/images/rider-splash.png')}
                  style={styles.rider1Image}
                  resizeMode="contain"
                />
              </Animated.View>
            </Animated.View>

            <Animated.View style={[styles.splashBrandBox, { opacity: splashTextFade }]}>
              <Image
                source={require('../../../assets/images/brand-logo.png')}
                style={styles.splashBrandLogo}
                resizeMode="contain"
              />
              <View style={styles.partnerSplashPill}>
                <Ionicons name="bicycle" size={14} color="#2E7D32" />
                <Text style={styles.partnerSplashPillText}>ĐỐI TÁC TÀI XẾ</Text>
              </View>
              <Text style={styles.splashTagline}>Vững tay lái, thu nhập bứt phá cùng NK Go</Text>

              <View style={styles.splashLoader}>
                <View style={styles.loaderDot} />
                <View style={[styles.loaderDot, styles.loaderDotActive]} />
                <View style={styles.loaderDot} />
              </View>
            </Animated.View>
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  }

  // -------------------------------------------------------------
  // GIAO DIỆN 2: MÀN HÌNH ĐĂNG NHẬP TÀI XẾ (ĐỒNG BỘ NK GO)
  // -------------------------------------------------------------
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
          {/* 1. TOP CURVED HEADER */}
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
              <View style={styles.headerTextGroup}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={restartSplashAnimation}
                >
                  <Image
                    source={require('../../../assets/images/brand-logo.png')}
                    style={styles.headerBrandLogo}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
                <View style={styles.roleHeaderBadge}>
                  <Ionicons name="speedometer-outline" size={13} color="#A5D6A7" />
                  <Text style={styles.roleHeaderBadgeText}>NK Go Driver Partner</Text>
                </View>
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

          {/* 2. MAIN FORM CARD */}
          <View
            style={[
              styles.formCard,
              {
                paddingBottom: Math.max(insets.bottom, 16) + 8,
              },
            ]}
          >
            <View style={styles.titleGroup}>
              <Text style={styles.welcomeTitle}>Chào Bác Tài! 👋</Text>
              <Text style={styles.welcomeSub}>Đăng nhập ứng dụng Tài xế NK Go để nhận cuốc ngay</Text>
            </View>

            <View style={styles.inputsSection}>
              {/* Email Field */}
              <View style={styles.inputGroup}>
                <View
                  style={[
                    styles.inputWrapper,
                    focusedField === 'email' && styles.inputWrapperFocused,
                  ]}
                >
                  <View style={styles.iconCircle}>
                    <Ionicons
                      name="mail-outline"
                      size={18}
                      color={focusedField === 'email' ? '#2E7D32' : '#8E9AA8'}
                    />
                  </View>
                  <TextInput
                    style={styles.inputField}
                    placeholder="Email hoặc số điện thoại tài xế"
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
              </View>

              {/* Password Field */}
              <View style={styles.inputGroup}>
                <View
                  style={[
                    styles.inputWrapper,
                    focusedField === 'password' && styles.inputWrapperFocused,
                  ]}
                >
                  <View style={styles.iconCircle}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={18}
                      color={focusedField === 'password' ? '#2E7D32' : '#8E9AA8'}
                    />
                  </View>
                  <TextInput
                    style={styles.inputField}
                    placeholder="Mật khẩu"
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
              </View>

              {/* Remember Me & Forgot Password */}
              <View style={styles.optionsRow}>
                <TouchableOpacity
                  style={styles.rememberRow}
                  onPress={() => setKeepSignedIn(!keepSignedIn)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.checkbox,
                      keepSignedIn && styles.checkboxActive,
                    ]}
                  >
                    {keepSignedIn && (
                      <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                    )}
                  </View>
                  <Text style={styles.rememberText}>Duy trì đăng nhập</Text>
                </TouchableOpacity>

                <TouchableOpacity activeOpacity={0.7}>
                  <Text style={styles.forgotText}>Quên mật khẩu?</Text>
                </TouchableOpacity>
              </View>

              {/* Pill-shaped Gradient Log In Button */}
              <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                <TouchableOpacity
                  onPress={handleLogin}
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
                    style={styles.loginBtnGradient}
                  >
                    {loading ? (
                      <View style={styles.loadingRow}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                        <Text style={styles.loadingText}>Đang kết nối...</Text>
                      </View>
                    ) : (
                      <Text style={styles.loginBtnText}>Đăng nhập Tài xế</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* Cụm Social & Footer */}
            <View style={styles.bottomSection}>
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Hoặc tiếp tục với</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.socialRow}>
                <TouchableOpacity style={styles.socialBtn} activeOpacity={0.8}>
                  <Ionicons name="logo-google" size={16} color="#EA4335" />
                  <Text style={styles.socialBtnText}>Google</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.socialBtn} activeOpacity={0.8}>
                  <Ionicons name="logo-apple" size={18} color="#0F172A" />
                  <Text style={styles.socialBtnText}>Apple</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.footerRow}>
                <Text style={styles.footerNote}>Chưa là đối tác tài xế? </Text>
                <TouchableOpacity
                  onPress={() => router.push('/(auth)/register')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.signUpLink}>Đăng ký ngay</Text>
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

  // Splash Styles
  splashContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashTouchArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rider1Wrapper: {
    width: 250,
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  rider1Image: {
    width: '100%',
    height: '100%',
  },
  greyStreak: {
    position: 'absolute',
    height: 3.5,
    borderRadius: 2,
    zIndex: 10,
  },
  greyStreak1: {
    width: 60,
    top: 95,
    left: -20,
    backgroundColor: '#64748B',
  },
  greyStreak2: {
    width: 75,
    top: 125,
    left: -35,
    backgroundColor: '#94A3B8',
  },
  greyStreak3: {
    width: 65,
    bottom: 45,
    left: -25,
    backgroundColor: '#64748B',
  },
  greyStreak4: {
    width: 50,
    bottom: 20,
    left: -5,
    height: 3,
    backgroundColor: '#CBD5E1',
  },
  splashBrandBox: {
    alignItems: 'center',
    marginTop: 6,
  },
  splashBrandLogo: {
    width: 270,
    height: 90,
    marginBottom: 6,
  },
  partnerSplashPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#C8E6C9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginBottom: 6,
  },
  partnerSplashPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2E7D32',
    letterSpacing: 1,
  },
  splashTagline: {
    marginTop: 2,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  splashLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
  },
  loaderDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#CBD5E1',
  },
  loaderDotActive: {
    width: 22,
    backgroundColor: '#2E7D32',
  },

  // Top Header Gradient Styles
  headerWrapper: {
    width: '100%',
    overflow: 'hidden',
  },
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 24 : 14,
    paddingBottom: 16,
    paddingHorizontal: 22,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTextGroup: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingRight: 4,
  },
  headerBrandLogo: {
    width: 200,
    height: 68,
  },
  roleHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  roleHeaderBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E8F5E9',
  },
  headerRiderBadge: {
    width: 125,
    height: 125,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRiderImage: {
    width: 125,
    height: 125,
  },

  // Form Card Styles
  formCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'android' ? 16 : 24,
    justifyContent: 'space-between',
  },
  titleGroup: {
    marginBottom: 4,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  welcomeSub: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },

  inputsSection: {
    marginVertical: 4,
  },
  inputGroup: {
    marginBottom: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
  },
  inputWrapperFocused: {
    borderColor: '#2E7D32',
    backgroundColor: '#FFFFFF',
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  inputField: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
  },
  eyeBtn: {
    padding: 6,
  },

  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 12,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    backgroundColor: '#FFFFFF',
  },
  checkboxActive: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  rememberText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  forgotText: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '700',
  },

  btnShadow: {
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 10,
    elevation: 4,
    borderRadius: 24,
  },
  loginBtnGradient: {
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginBtnText: {
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
    fontSize: 14,
    fontWeight: '600',
  },

  bottomSection: {
    marginTop: 4,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    paddingHorizontal: 10,
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },

  socialRow: {
    flexDirection: 'row',
    gap: 12,
  },
  socialBtn: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  socialBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },

  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
  },
  footerNote: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  signUpLink: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2E7D32',
  },
});

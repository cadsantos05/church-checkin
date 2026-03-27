import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { fontSize } from '../lib/theme';

export default function SplashScreen() {
  const router = useRouter();
  const { isDeviceAuthorized, deviceMode, volunteer, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return; // wait until auth state is loaded

    const timer = setTimeout(() => {
      if (!isDeviceAuthorized) {
        router.replace('/(auth)/device-setup');
      } else if (deviceMode === 'parent') {
        router.replace('/checkin/search');
      } else if (!volunteer) {
        router.replace('/(auth)/volunteer-login');
      } else {
        router.replace('/volunteer/dashboard');
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [isLoading, isDeviceAuthorized, deviceMode, volunteer]);

  return (
    <View style={styles.container}>
      <View style={styles.logoCircle}>
        <Text style={styles.logoEmoji}>✓</Text>
      </View>
      <Text style={styles.title}>Check-in</Text>
      <Text style={styles.subtitle}>Kids Ministry</Text>
      <ActivityIndicator size="small" color="rgba(255,255,255,0.5)" style={{ marginTop: 40 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
  },
  logoEmoji: { fontSize: 36, color: '#FFFFFF', fontWeight: '700' },
  title: { fontSize: fontSize.hero, fontWeight: '800', color: '#FFFFFF', letterSpacing: -1 },
  subtitle: { fontSize: fontSize.lg, color: 'rgba(255,255,255,0.4)', marginTop: 4, fontWeight: '500' },
});

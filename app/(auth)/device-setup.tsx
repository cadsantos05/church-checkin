import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, borderRadius, fontSize, shadow } from '../../lib/theme';
import { Lang, t } from '../../lib/i18n';
import LangToggle from '../../components/LangToggle';

type DeviceMode = 'parent' | 'volunteer';

export default function DeviceSetup() {
  const [pin, setPin] = useState('');
  const [mode, setMode] = useState<DeviceMode | null>(null);
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<Lang>('pt');
  const { authorizeDevice } = useAuth();
  const router = useRouter();

  async function handleAuthorize() {
    if (!mode) {
      Alert.alert(t(lang, 'attention'), t(lang, 'selectDeviceType'));
      return;
    }
    if (pin.length < 4) {
      Alert.alert(t(lang, 'attention'), t(lang, 'enterAdminPin'));
      return;
    }
    setLoading(true);
    const result = await authorizeDevice(pin, mode);
    setLoading(false);
    if (result.success) {
      if (mode === 'parent') {
        router.replace('/checkin/search');
      } else {
        router.replace('/(auth)/volunteer-login');
      }
    } else {
      Alert.alert(t(lang, 'error'), result.error);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.topRow}>
          <LangToggle lang={lang} onChangeLang={setLang} />
        </View>

        <View style={styles.iconCircle}>
          <Text style={styles.icon}>👶</Text>
        </View>
        <Text style={styles.brand}>{t(lang, 'kidsCheckin')}</Text>

        <Text style={styles.title}>{t(lang, 'setupDevice')}</Text>
        <Text style={styles.subtitle}>{t(lang, 'setupSubtitle')}</Text>

        <Text style={styles.label}>{t(lang, 'stationType')}</Text>
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeCard, mode === 'parent' && styles.modeCardActive]}
            onPress={() => setMode('parent')}
            activeOpacity={0.7}
          >
            <Text style={styles.modeEmoji}>📱</Text>
            <Text style={[styles.modeTitle, mode === 'parent' && styles.modeTitleActive]}>
              {t(lang, 'parentTotem')}
            </Text>
            <Text style={styles.modeDesc}>{t(lang, 'parentTotemDesc')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeCard, mode === 'volunteer' && styles.modeCardActive]}
            onPress={() => setMode('volunteer')}
            activeOpacity={0.7}
          >
            <Text style={styles.modeEmoji}>💻</Text>
            <Text style={[styles.modeTitle, mode === 'volunteer' && styles.modeTitleActive]}>
              {t(lang, 'volunteerStation')}
            </Text>
            <Text style={styles.modeDesc}>{t(lang, 'volunteerStationDesc')}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>{t(lang, 'adminPin')}</Text>
        <TextInput
          style={styles.input}
          placeholder="• • • • • •"
          placeholderTextColor={colors.textMuted}
          value={pin}
          onChangeText={setPin}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={6}
        />

        <TouchableOpacity
          style={[styles.button, (!mode || loading) && styles.buttonDisabled]}
          onPress={handleAuthorize}
          disabled={!mode || loading}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {loading ? t(lang, 'connecting') : t(lang, 'connectDevice')}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl },

  topRow: { position: 'absolute', top: 56, left: spacing.xl },

  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#111111',
    justifyContent: 'center', alignItems: 'center',
    alignSelf: 'center', marginBottom: spacing.sm,
  },
  icon: { fontSize: 36 },
  brand: {
    fontSize: fontSize.md, fontWeight: '700', color: colors.primary,
    textAlign: 'center', marginBottom: spacing.lg, letterSpacing: 0.5,
  },

  title: {
    fontSize: fontSize.xxl, fontWeight: '700', color: colors.text,
    textAlign: 'center', letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: fontSize.md, color: colors.textSecondary,
    textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.xl, lineHeight: 22,
  },

  label: {
    fontSize: fontSize.xs, fontWeight: '600', color: colors.textMuted,
    letterSpacing: 1, marginBottom: spacing.sm,
  },

  modeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  modeCard: {
    flex: 1, backgroundColor: colors.surface, borderWidth: 2,
    borderColor: colors.border, borderRadius: borderRadius.lg,
    padding: spacing.md, alignItems: 'center', ...shadow.small,
  },
  modeCardActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  modeEmoji: { fontSize: 32, marginBottom: spacing.sm },
  modeTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  modeTitleActive: { color: colors.primary },
  modeDesc: { fontSize: fontSize.xs, color: colors.textSecondary, textAlign: 'center', lineHeight: 16 },

  input: {
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: borderRadius.md, padding: spacing.md,
    fontSize: fontSize.xxl, textAlign: 'center', letterSpacing: 10,
    fontWeight: '700', color: colors.text, marginBottom: spacing.lg, ...shadow.small,
  },

  button: {
    backgroundColor: colors.primary, borderRadius: borderRadius.md,
    paddingVertical: 16, alignItems: 'center', ...shadow.medium,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#FFFFFF', fontSize: fontSize.lg, fontWeight: '600' },
});

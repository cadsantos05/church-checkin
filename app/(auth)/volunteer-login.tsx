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
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, borderRadius, fontSize, shadow } from '../../lib/theme';
import { Lang, t } from '../../lib/i18n';
import LangToggle from '../../components/LangToggle';

export default function VolunteerLogin() {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<Lang>('pt');
  const { volunteerLogin, resetDevice, churchConfig } = useAuth();
  const router = useRouter();

  const brandColor = churchConfig?.primary_color || colors.primary;

  async function handleLogin() {
    if (!name.trim() || pin.length < 4) {
      Alert.alert(t(lang, 'error'), t(lang, 'fillNamePin'));
      return;
    }
    setLoading(true);
    const result = await volunteerLogin(name.trim(), pin);
    setLoading(false);
    if (result.success) {
      router.replace('/volunteer/dashboard');
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

        {/* Church branding */}
        <View style={styles.brandSection}>
          {churchConfig?.logo_url ? (
            <Image source={{ uri: churchConfig.logo_url }} style={styles.logo} />
          ) : (
            <View style={[styles.logoPlaceholder, { backgroundColor: brandColor + '15' }]}>
              <Text style={[styles.logoText, { color: brandColor }]}>
                {churchConfig?.name?.charAt(0) || '⛪'}
              </Text>
            </View>
          )}
          <Text style={styles.churchName}>{churchConfig?.name || 'Igreja'}</Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.title}>{t(lang, 'volunteerLogin')}</Text>
        <Text style={styles.subtitle}>{t(lang, 'volunteerLoginSubtitle')}</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t(lang, 'yourName')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t(lang, 'typeName')}
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoFocus
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t(lang, 'yourPin')}</Text>
          <TextInput
            style={styles.input}
            placeholder="• • • •"
            placeholderTextColor={colors.textMuted}
            value={pin}
            onChangeText={setPin}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: brandColor }, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {loading ? t(lang, 'entering') : t(lang, 'enter')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.resetLink}
          onPress={async () => {
            await resetDevice();
            router.replace('/(auth)/device-setup');
          }}
        >
          <Text style={styles.resetLinkText}>{t(lang, 'switchDevice')}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl },

  topRow: { position: 'absolute', top: 56, left: spacing.xl },

  brandSection: { alignItems: 'center', marginBottom: spacing.lg },
  logo: { width: 72, height: 72, borderRadius: 36, marginBottom: spacing.sm },
  logoPlaceholder: {
    width: 72, height: 72, borderRadius: 36,
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm,
  },
  logoText: { fontSize: 28, fontWeight: '700' },
  churchName: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },

  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.lg },

  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
  subtitle: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.xl },

  inputGroup: { marginBottom: spacing.md },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: borderRadius.md, padding: spacing.md, fontSize: fontSize.lg,
    color: colors.text, ...shadow.small,
  },

  button: {
    borderRadius: borderRadius.md, paddingVertical: 16,
    alignItems: 'center', marginTop: spacing.sm, ...shadow.medium,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.textLight, fontSize: fontSize.lg, fontWeight: '600' },

  resetLink: { alignItems: 'center', marginTop: spacing.xl, padding: spacing.sm },
  resetLinkText: { color: colors.textMuted, fontSize: fontSize.sm },
});

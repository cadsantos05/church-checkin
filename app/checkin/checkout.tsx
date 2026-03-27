import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { colors, spacing, borderRadius, fontSize, shadow } from '../../lib/theme';
import { getTodayDate, formatTime } from '../../lib/utils';

export default function CheckoutScreen() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    childName: string;
    guardianName: string;
    classroom: string;
    checkedOutAt: string;
  } | null>(null);
  const { churchId, volunteer, churchConfig } = useAuth();
  const brandColor = churchConfig?.primary_color || colors.primary;
  const router = useRouter();

  async function handleCheckout() {
    if (code.trim().length < 6) {
      Alert.alert('Atenção', 'Digite o código completo (6 caracteres).');
      return;
    }
    setLoading(true);
    setResult(null);

    const { data: checkin, error } = await supabase
      .from('checkins')
      .select(`
        id,
        security_code,
        children:child_id (full_name, classroom),
        guardians:guardian_id (full_name)
      `)
      .eq('church_id', churchId)
      .eq('service_date', getTodayDate())
      .eq('security_code', code.trim().toUpperCase())
      .is('checked_out_at', null)
      .single();

    if (error || !checkin) {
      setLoading(false);
      Alert.alert('Não encontrado', 'Código inválido ou criança já fez check-out.');
      return;
    }

    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('checkins')
      .update({ checked_out_at: now, checkout_volunteer_id: volunteer?.id })
      .eq('id', checkin.id);

    setLoading(false);
    if (updateError) {
      Alert.alert('Erro', 'Não foi possível realizar o check-out.');
      return;
    }

    const child = checkin.children as any;
    const guardian = checkin.guardians as any;
    setResult({
      childName: child.full_name,
      guardianName: guardian.full_name,
      classroom: child.classroom,
      checkedOutAt: formatTime(new Date()),
    });
    setCode('');
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.checkedOut }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Check-out</Text>
        <View style={{ width: 70 }} />
      </View>

      <View style={styles.content}>
        {/* Instructions */}
        <View style={styles.instructionCard}>
          <Text style={styles.instructionIcon}>🏷️</Text>
          <Text style={styles.instructionTitle}>Código do Label</Text>
          <Text style={styles.instructionText}>
            Digite o código de 6 caracteres do label do responsável.
          </Text>
        </View>

        {/* Code Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>CÓDIGO DE SEGURANÇA</Text>
          <TextInput
            style={[styles.codeInput, { borderColor: colors.checkedOut }]}
            placeholder="ABC123"
            placeholderTextColor={colors.textMuted}
            value={code}
            onChangeText={(text) => setCode(text.toUpperCase())}
            autoCapitalize="characters"
            maxLength={6}
            autoFocus
            onSubmitEditing={handleCheckout}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.checkedOut }, loading && styles.buttonDisabled]}
          onPress={handleCheckout}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Verificando...' : 'Realizar Check-out'}
          </Text>
        </TouchableOpacity>

        {/* Result */}
        {result && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <View style={styles.resultCircle}>
                <Text style={styles.resultIcon}>✓</Text>
              </View>
              <Text style={styles.resultTitle}>Check-out realizado!</Text>
            </View>
            <View style={styles.resultDetails}>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Criança</Text>
                <Text style={styles.resultValue}>{result.childName}</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Sala</Text>
                <Text style={styles.resultValue}>{result.classroom}</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Responsável</Text>
                <Text style={styles.resultValue}>{result.guardianName}</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Saída</Text>
                <Text style={styles.resultValue}>{result.checkedOutAt}</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    paddingTop: 56,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: { padding: spacing.sm },
  backText: { color: colors.textLight, fontSize: fontSize.md, fontWeight: '500' },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textLight },

  content: { padding: spacing.lg },

  instructionCard: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  instructionIcon: { fontSize: 40, marginBottom: spacing.sm },
  instructionTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  instructionText: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs },

  inputGroup: { marginBottom: spacing.lg },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  codeInput: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    fontSize: fontSize.hero,
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: '800',
    color: colors.text,
    ...shadow.small,
  },

  button: {
    borderRadius: borderRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
    ...shadow.medium,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.textLight, fontSize: fontSize.lg, fontWeight: '600' },

  resultCard: {
    backgroundColor: colors.successSoft,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  resultCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  resultIcon: { color: colors.textLight, fontSize: 16, fontWeight: '700' },
  resultTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.success },

  resultDetails: { gap: spacing.sm },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  resultLabel: { fontSize: fontSize.md, color: colors.textSecondary },
  resultValue: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
});

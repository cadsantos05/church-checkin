import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { colors, spacing, borderRadius, fontSize, shadow } from '../../lib/theme';
import { generateSecurityCode, calculateAge, getTodayDate } from '../../lib/utils';

interface Child {
  id: string;
  full_name: string;
  birth_date: string;
  classroom: string;
  allergies: string | null;
  checked_in: boolean;
}

export default function ConfirmScreen() {
  const params = useLocalSearchParams();
  const guardianName = params.guardianName as string;
  const guardianId = params.guardianId as string;
  const serviceId = params.serviceId as string;
  const serviceName = params.serviceName as string;
  const children: Child[] = JSON.parse(params.children as string);
  const router = useRouter();
  const { volunteer, churchId, churchConfig } = useAuth();
  const brandColor = churchConfig?.primary_color || colors.primary;

  const [selected, setSelected] = useState<Set<string>>(
    new Set(children.filter((c) => !c.checked_in).map((c) => c.id))
  );
  const [loading, setLoading] = useState(false);

  function toggleChild(childId: string) {
    const child = children.find((c) => c.id === childId);
    if (child?.checked_in) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(childId)) next.delete(childId);
      else next.add(childId);
      return next;
    });
  }

  async function handleCheckin() {
    if (selected.size === 0) {
      Alert.alert('Atenção', 'Selecione pelo menos uma criança.');
      return;
    }
    setLoading(true);
    const labels: { childName: string; classroom: string; securityCode: string; allergies: string | null }[] = [];

    for (const childId of selected) {
      const child = children.find((c) => c.id === childId)!;
      const securityCode = generateSecurityCode();
      const { error } = await supabase.from('checkins').insert({
        church_id: churchId,
        child_id: childId,
        guardian_id: guardianId,
        volunteer_id: volunteer?.id,
        service_id: serviceId || null,
        service_date: getTodayDate(),
        security_code: securityCode,
        checked_in_at: new Date().toISOString(),
      });
      if (error) {
        Alert.alert('Erro', `Erro no check-in de ${child.full_name}: ${error.message}`);
        setLoading(false);
        return;
      }
      labels.push({
        childName: child.full_name,
        classroom: child.classroom,
        securityCode,
        allergies: child.allergies,
      });
    }
    setLoading(false);
    router.push({
      pathname: '/checkin/label',
      params: { guardianName, labels: JSON.stringify(labels) },
    });
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: brandColor }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirmar Check-in</Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Guardian info */}
        <View style={styles.guardianCard}>
          <View style={[styles.guardianAvatar, { backgroundColor: brandColor + '15' }]}>
            <Text style={[styles.guardianInitial, { color: brandColor }]}>
              {guardianName.charAt(0)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.guardianLabel}>Responsável</Text>
            <Text style={styles.guardianName}>{guardianName}</Text>
            {serviceName ? (
              <View style={styles.serviceTag}>
                <Text style={styles.serviceTagText}>⛪ {serviceName}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Children selection */}
        <Text style={styles.sectionTitle}>Selecione as crianças</Text>

        {children.map((child) => {
          const isSelected = selected.has(child.id);
          const age = calculateAge(child.birth_date);

          return (
            <TouchableOpacity
              key={child.id}
              style={[
                styles.childCard,
                isSelected && { borderColor: brandColor },
                child.checked_in && styles.childCardDisabled,
              ]}
              onPress={() => toggleChild(child.id)}
              disabled={child.checked_in}
              activeOpacity={0.7}
            >
              <View style={[
                styles.checkbox,
                isSelected && { backgroundColor: brandColor, borderColor: brandColor },
                child.checked_in && { backgroundColor: colors.checkedIn, borderColor: colors.checkedIn },
              ]}>
                {(isSelected || child.checked_in) && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>

              <View style={styles.childInfo}>
                <Text style={styles.childName}>{child.full_name}</Text>
                <Text style={styles.childMeta}>
                  {age} anos  •  Sala: {child.classroom}
                </Text>
                {child.allergies && (
                  <View style={styles.allergyBadge}>
                    <Text style={styles.allergyText}>⚠️ {child.allergies}</Text>
                  </View>
                )}
                {child.checked_in && (
                  <Text style={styles.alreadyText}>Já fez check-in hoje</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.confirmButton,
            { backgroundColor: brandColor },
            (loading || selected.size === 0) && styles.buttonDisabled,
          ]}
          onPress={handleCheckin}
          disabled={loading || selected.size === 0}
          activeOpacity={0.8}
        >
          <Text style={styles.confirmText}>
            {loading ? 'Processando...' : `Fazer Check-in (${selected.size})`}
          </Text>
        </TouchableOpacity>
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

  content: { padding: spacing.lg, paddingBottom: 120 },

  guardianCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.xl,
    ...shadow.small,
  },
  guardianAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  guardianInitial: { fontSize: fontSize.xl, fontWeight: '700' },
  guardianLabel: { fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  guardianName: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
  serviceTag: {
    backgroundColor: '#F0F0F5', borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    alignSelf: 'flex-start', marginTop: spacing.sm,
  },
  serviceTagText: { fontSize: fontSize.xs, fontWeight: '600', color: '#8D8D9B' },

  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },

  childCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: colors.border,
    ...shadow.small,
  },
  childCardDisabled: { opacity: 0.5 },

  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    marginTop: 2,
  },
  checkmark: { color: colors.textLight, fontSize: 14, fontWeight: '700' },

  childInfo: { flex: 1 },
  childName: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
  childMeta: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  allergyBadge: {
    backgroundColor: colors.warningSoft,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  allergyText: { fontSize: fontSize.xs, color: colors.warning, fontWeight: '500' },
  alreadyText: { fontSize: fontSize.sm, color: colors.checkedIn, fontWeight: '500', marginTop: 4 },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    ...shadow.large,
  },
  confirmButton: {
    borderRadius: borderRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.4 },
  confirmText: { color: colors.textLight, fontSize: fontSize.lg, fontWeight: '700' },
});

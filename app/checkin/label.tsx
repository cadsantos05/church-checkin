import { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, borderRadius, fontSize, shadow } from '../../lib/theme';
import { formatDate, formatTime } from '../../lib/utils';

interface Label {
  childName: string;
  classroom: string;
  securityCode: string;
  allergies: string | null;
}

export default function LabelScreen() {
  const params = useLocalSearchParams();
  const guardianName = params.guardianName as string;
  const labels: Label[] = JSON.parse(params.labels as string);
  const router = useRouter();
  const { churchConfig, deviceMode } = useAuth();
  const brandColor = churchConfig?.primary_color || colors.primary;
  const now = new Date();

  function handlePrint() {
    // TODO: integrate with thermal printer / AirPrint
    Alert.alert(
      'Imprimindo...',
      'Labels enviados para a impressora.',
      [{
        text: 'OK',
        onPress: () => {
          // After printing, auto-return to main screen
          if (deviceMode === 'parent') {
            router.replace('/checkin/search');
          } else {
            router.replace('/volunteer/dashboard');
          }
        },
      }]
    );
  }

  return (
    <View style={styles.container}>
      {/* Success Header */}
      <View style={styles.successHeader}>
        <View style={styles.successCircle}>
          <Text style={styles.successIcon}>✓</Text>
        </View>
        <Text style={styles.successTitle}>Check-in Realizado!</Text>
        <Text style={styles.successSubtitle}>
          {labels.length} criança{labels.length > 1 ? 's' : ''}  •  {formatDate(now)} às {formatTime(now)}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {labels.map((label, index) => (
          <View key={index} style={styles.labelPair}>
            {/* Child Label */}
            <View style={styles.labelCard}>
              <View style={[styles.labelStripe, { backgroundColor: brandColor }]} />
              <View style={styles.labelContent}>
                <View style={styles.labelRow}>
                  <View style={[styles.labelBadge, { backgroundColor: brandColor }]}>
                    <Text style={styles.labelBadgeText}>CRIANÇA</Text>
                  </View>
                  <Text style={styles.labelDate}>{formatDate(now)}</Text>
                </View>
                <Text style={styles.labelName}>{label.childName}</Text>
                <Text style={styles.labelDetail}>Sala: {label.classroom}</Text>
                <Text style={styles.labelDetail}>Resp: {guardianName}</Text>
                {label.allergies && (
                  <View style={styles.allergyRow}>
                    <Text style={styles.allergyLabel}>⚠️ {label.allergies}</Text>
                  </View>
                )}
                <View style={styles.codeBox}>
                  <Text style={[styles.securityCode, { color: brandColor }]}>{label.securityCode}</Text>
                </View>
              </View>
            </View>

            {/* Guardian Label */}
            <View style={styles.labelCard}>
              <View style={[styles.labelStripe, { backgroundColor: colors.checkedOut }]} />
              <View style={styles.labelContent}>
                <View style={styles.labelRow}>
                  <View style={[styles.labelBadge, { backgroundColor: colors.checkedOut }]}>
                    <Text style={styles.labelBadgeText}>RESPONSÁVEL</Text>
                  </View>
                </View>
                <Text style={styles.labelName}>{label.childName}</Text>
                <Text style={styles.labelDetail}>Sala: {label.classroom}</Text>
                <View style={styles.codeBox}>
                  <Text style={[styles.securityCode, { color: colors.checkedOut }]}>{label.securityCode}</Text>
                </View>
                <Text style={styles.labelHint}>
                  Apresente este label no check-out
                </Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Footer - only print button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.printButton, { backgroundColor: brandColor }]}
          onPress={handlePrint}
          activeOpacity={0.8}
        >
          <Text style={styles.printIcon}>🖨️</Text>
          <Text style={styles.printText}>Imprimir Labels</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  successHeader: {
    backgroundColor: colors.successSoft,
    paddingTop: 64,
    paddingBottom: spacing.xl,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.success + '30',
  },
  successCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  successIcon: { color: colors.textLight, fontSize: 28, fontWeight: '700' },
  successTitle: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.success },
  successSubtitle: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.xs },

  content: { padding: spacing.lg, paddingBottom: 120 },

  labelPair: { marginBottom: spacing.xl },

  labelCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    overflow: 'hidden',
    ...shadow.medium,
  },
  labelStripe: { width: 5 },
  labelContent: { flex: 1, padding: spacing.md },

  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  labelBadge: {
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  labelBadgeText: { color: colors.textLight, fontSize: fontSize.xs, fontWeight: '700', letterSpacing: 1 },
  labelDate: { fontSize: fontSize.xs, color: colors.textMuted },

  labelName: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  labelDetail: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: 2 },

  allergyRow: {
    backgroundColor: colors.warningSoft,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  allergyLabel: { fontSize: fontSize.sm, color: colors.warning, fontWeight: '500' },

  codeBox: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    alignItems: 'center',
  },
  securityCode: { fontSize: fontSize.title, fontWeight: '800', letterSpacing: 8 },

  labelHint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    ...shadow.large,
  },
  printButton: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadow.medium,
  },
  printIcon: { fontSize: 18 },
  printText: { color: '#FFFFFF', fontSize: fontSize.lg, fontWeight: '700' },
});

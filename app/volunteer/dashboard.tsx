import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { colors, spacing, borderRadius, fontSize, shadow } from '../../lib/theme';
import { getTodayDate, formatDate, formatTime, calculateAge } from '../../lib/utils';

interface CheckedInChild {
  checkin_id: string;
  child_name: string;
  classroom: string;
  guardian_name: string;
  security_code: string;
  checked_in_at: string;
  birth_date: string;
  allergies: string | null;
}

interface ClassroomGroup {
  name: string;
  count: number;
  children: CheckedInChild[];
}

export default function VolunteerDashboard() {
  const [classrooms, setClassrooms] = useState<ClassroomGroup[]>([]);
  const [totalCheckedIn, setTotalCheckedIn] = useState(0);
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);
  const { volunteer, volunteerLogout, resetDevice, churchId, churchConfig } = useAuth();
  const router = useRouter();

  const brandColor = churchConfig?.primary_color || colors.primary;
  const now = new Date();

  useFocusEffect(
    useCallback(() => {
      loadCheckedIn();
    }, [])
  );

  async function loadCheckedIn() {
    if (!churchId) return;

    const { data } = await supabase
      .from('checkins')
      .select(`
        id,
        security_code,
        checked_in_at,
        children:child_id (full_name, classroom, birth_date, allergies),
        guardians:guardian_id (full_name)
      `)
      .eq('church_id', churchId)
      .eq('service_date', getTodayDate())
      .is('checked_out_at', null)
      .order('checked_in_at', { ascending: false });

    if (data) {
      const items: CheckedInChild[] = data.map((row: any) => ({
        checkin_id: row.id,
        child_name: row.children.full_name,
        classroom: row.children.classroom,
        guardian_name: row.guardians.full_name,
        security_code: row.security_code,
        checked_in_at: row.checked_in_at,
        birth_date: row.children.birth_date,
        allergies: row.children.allergies,
      }));

      const grouped = new Map<string, CheckedInChild[]>();
      for (const item of items) {
        const key = item.classroom || 'Sem sala';
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(item);
      }

      const rooms: ClassroomGroup[] = Array.from(grouped.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, children]) => ({ name, count: children.length, children }));

      setClassrooms(rooms);
      setTotalCheckedIn(items.length);
    }
  }

  async function handleQuickCheckout(checkinId: string, childName: string) {
    Alert.alert('Check-out', `Confirmar check-out de ${childName}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: async () => {
          await supabase
            .from('checkins')
            .update({ checked_out_at: new Date().toISOString(), checkout_volunteer_id: volunteer?.id })
            .eq('id', checkinId);
          loadCheckedIn();
        },
      },
    ]);
  }

  function handleLogout() {
    Alert.alert('Sair', 'O que deseja fazer?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Trocar voluntário',
        onPress: () => {
          volunteerLogout();
          router.replace('/(auth)/volunteer-login');
        },
      },
      {
        text: 'Desconectar dispositivo',
        style: 'destructive',
        onPress: async () => {
          await resetDevice();
          router.replace('/(auth)/device-setup');
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.brandRow}>
            {churchConfig?.logo_url ? (
              <Image source={{ uri: churchConfig.logo_url }} style={styles.logo} />
            ) : (
              <View style={styles.logoCircle}>
                <Text style={styles.logoEmoji}>⛪</Text>
              </View>
            )}
            <View>
              <Text style={styles.churchName}>{churchConfig?.name || 'Igreja'}</Text>
              <Text style={styles.headerDate}>{formatDate(now)} • {formatTime(now)}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Sair</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.volunteerGreeting}>Olá, {volunteer?.full_name}</Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: brandColor }]}>
            <Text style={styles.statNumber}>{totalCheckedIn}</Text>
            <Text style={styles.statLabel}>Check-ins</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#1E1E2E' }]}>
            <Text style={styles.statNumber}>{classrooms.length}</Text>
            <Text style={styles.statLabel}>Salas ativas</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.checkedOut }]}
          onPress={() => router.push('/checkin/checkout')}
          activeOpacity={0.8}
        >
          <Text style={styles.actionIcon}>🏷️</Text>
          <Text style={styles.actionLabel}>Check-out</Text>
          <Text style={styles.actionHint}>Por código</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: brandColor }]}
          onPress={() => router.push('/register/family')}
          activeOpacity={0.8}
        >
          <Text style={styles.actionIcon}>👨‍👩‍👧</Text>
          <Text style={styles.actionLabel}>Cadastrar</Text>
          <Text style={styles.actionHint}>Nova família</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#2D2D3F' }]}
          onPress={() => router.push('/volunteer/classrooms')}
          activeOpacity={0.8}
        >
          <Text style={styles.actionIcon}>🏫</Text>
          <Text style={styles.actionLabel}>Salas</Text>
          <Text style={styles.actionHint}>Configurar</Text>
        </TouchableOpacity>
      </View>

      {/* Children by classroom */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Crianças por Sala</Text>
        <TouchableOpacity onPress={loadCheckedIn}>
          <Text style={[styles.refreshText, { color: brandColor }]}>Atualizar ↻</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {classrooms.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyTitle}>Nenhum check-in hoje</Text>
            <Text style={styles.emptyText}>As crianças aparecerão aqui conforme fizerem check-in.</Text>
          </View>
        ) : (
          classrooms.map((room) => (
            <View key={room.name} style={styles.roomCard}>
              <TouchableOpacity
                style={styles.roomHeader}
                onPress={() => setExpandedRoom(expandedRoom === room.name ? null : room.name)}
                activeOpacity={0.7}
              >
                <View style={styles.roomHeaderLeft}>
                  <View style={[styles.roomDot, { backgroundColor: brandColor }]} />
                  <Text style={styles.roomName}>{room.name}</Text>
                </View>
                <View style={styles.roomHeaderRight}>
                  <View style={[styles.countBadge, { backgroundColor: brandColor + '15' }]}>
                    <Text style={[styles.countText, { color: brandColor }]}>{room.count}</Text>
                  </View>
                  <Text style={styles.expandIcon}>
                    {expandedRoom === room.name ? '▲' : '▼'}
                  </Text>
                </View>
              </TouchableOpacity>

              {expandedRoom === room.name && (
                <View style={styles.roomChildren}>
                  {room.children.map((child) => (
                    <View key={child.checkin_id} style={styles.childRow}>
                      <View style={styles.childInfo}>
                        <Text style={styles.childName}>{child.child_name}</Text>
                        <Text style={styles.childMeta}>
                          {calculateAge(child.birth_date)} anos • Resp: {child.guardian_name}
                        </Text>
                        {child.allergies && (
                          <View style={styles.allergyTag}>
                            <Text style={styles.allergyText}>⚠️ {child.allergies}</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.childRight}>
                        <Text style={[styles.codeText, { color: brandColor }]}>{child.security_code}</Text>
                        <Text style={styles.timeText}>{formatTime(new Date(child.checked_in_at))}</Text>
                        <TouchableOpacity
                          style={styles.checkoutMiniBtn}
                          onPress={() => handleQuickCheckout(child.checkin_id, child.child_name)}
                        >
                          <Text style={styles.checkoutMiniText}>Saída</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))
        )}
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },

  // Header
  header: {
    backgroundColor: '#111111',
    paddingTop: 52,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logo: { width: 36, height: 36, borderRadius: 18 },
  logoCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  logoEmoji: { fontSize: 16 },
  churchName: { fontSize: fontSize.md, fontWeight: '600', color: '#FFFFFF' },
  headerDate: { fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 1 },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  logoutText: { color: 'rgba(255,255,255,0.5)', fontSize: fontSize.sm, fontWeight: '500' },

  volunteerGreeting: {
    fontSize: fontSize.xxl, fontWeight: '700', color: '#FFFFFF',
    letterSpacing: -0.5, marginBottom: spacing.md,
  },

  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: {
    flex: 1, borderRadius: borderRadius.md, padding: spacing.md, alignItems: 'center',
  },
  statNumber: { fontSize: 28, fontWeight: '800', color: '#FFFFFF' },
  statLabel: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.6)', marginTop: 2 },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    ...shadow.small,
  },
  actionIcon: { fontSize: 22, marginBottom: 4 },
  actionLabel: { color: '#FFFFFF', fontSize: fontSize.sm, fontWeight: '700' },
  actionHint: { color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 2 },

  // Section
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.sm, fontWeight: '700', color: '#1A1A2E',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  refreshText: { fontSize: fontSize.sm, fontWeight: '600' },

  scrollContent: { paddingHorizontal: spacing.lg },

  // Room card
  roomCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    ...shadow.small,
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  roomHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  roomDot: { width: 10, height: 10, borderRadius: 5 },
  roomName: { fontSize: fontSize.lg, fontWeight: '600', color: '#1A1A2E' },
  roomHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  countBadge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  countText: { fontSize: fontSize.sm, fontWeight: '700' },
  expandIcon: { fontSize: 10, color: '#CCCCCC' },

  // Room children
  roomChildren: {
    borderTopWidth: 1,
    borderTopColor: '#F5F5F8',
  },
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F8',
  },
  childInfo: { flex: 1 },
  childName: { fontSize: fontSize.md, fontWeight: '600', color: '#1A1A2E' },
  childMeta: { fontSize: fontSize.sm, color: '#8D8D9B', marginTop: 2 },
  allergyTag: {
    backgroundColor: '#FFF8E1', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 2,
    alignSelf: 'flex-start', marginTop: 4,
  },
  allergyText: { fontSize: 11, color: '#F59E0B', fontWeight: '500' },

  childRight: { alignItems: 'flex-end', gap: 4 },
  codeText: { fontSize: fontSize.sm, fontWeight: '700', letterSpacing: 1.5 },
  timeText: { fontSize: 10, color: '#CCCCCC' },
  checkoutMiniBtn: {
    backgroundColor: '#EF4444',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 2,
  },
  checkoutMiniText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },

  // Empty
  emptyState: { alignItems: 'center', paddingTop: spacing.xxl },
  emptyEmoji: { fontSize: 44, marginBottom: spacing.md },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '600', color: '#1A1A2E' },
  emptyText: { fontSize: fontSize.md, color: '#8D8D9B', textAlign: 'center', marginTop: spacing.xs },
});

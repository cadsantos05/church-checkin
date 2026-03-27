import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { colors, spacing, borderRadius, fontSize, shadow } from '../../lib/theme';
import { calculateAge, getTodayDate, formatDate, formatTime } from '../../lib/utils';
import { Lang, t } from '../../lib/i18n';

interface FamilyResult {
  guardian_id: string;
  guardian_name: string;
  children: {
    id: string;
    full_name: string;
    birth_date: string;
    classroom: string;
    allergies: string | null;
    checked_in: boolean;
  }[];
}

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FamilyResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [lang, setLang] = useState<Lang>('pt');
  const [services, setServices] = useState<{ id: string; name: string; start_time: string | null }[]>([]);
  const [selectedService, setSelectedService] = useState<{ id: string; name: string } | null>(null);
  const { churchId, churchConfig, resetDevice } = useAuth();
  const router = useRouter();

  const brandColor = churchConfig?.primary_color || colors.primary;
  const now = new Date();

  useFocusEffect(
    useCallback(() => {
      loadServices();
      setQuery('');
      setResults([]);
      setHasSearched(false);
    }, [])
  );

  async function loadServices() {
    if (!churchId) return;
    const dayOfWeek = new Date().getDay();
    const { data } = await supabase
      .from('services').select('id, name, start_time')
      .eq('church_id', churchId).eq('day_of_week', dayOfWeek)
      .eq('active', true).order('start_time', { ascending: true });
    if (data && data.length > 0) {
      setServices(data);
      // Auto-select the closest service to current time
      if (!selectedService) {
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        let closest = data[0];
        let minDiff = Infinity;
        for (const svc of data) {
          if (svc.start_time) {
            const [h, m] = svc.start_time.split(':').map(Number);
            const diff = Math.abs(h * 60 + m - currentMinutes);
            if (diff < minDiff) { minDiff = diff; closest = svc; }
          }
        }
        setSelectedService({ id: closest.id, name: closest.name });
      }
    }
  }

  async function handleSearch() {
    if (query.trim().length < 2) return;
    setSearching(true);
    setHasSearched(true);

    const { data: guardians } = await supabase
      .from('guardians').select('id, full_name')
      .eq('church_id', churchId).ilike('full_name', `%${query.trim()}%`).limit(10);

    const { data: childrenByName } = await supabase
      .from('children').select('id, full_name, birth_date, classroom, allergies, guardian_id')
      .eq('church_id', churchId).ilike('full_name', `%${query.trim()}%`).limit(10);

    const familyMap = new Map<string, FamilyResult>();

    if (guardians) {
      for (const g of guardians) {
        const { data: kids } = await supabase.from('children')
          .select('id, full_name, birth_date, classroom, allergies').eq('guardian_id', g.id);
        const withStatus = await Promise.all(
          (kids ?? []).map(async (c) => {
            const { data: ci } = await supabase.from('checkins').select('id')
              .eq('child_id', c.id).eq('service_date', getTodayDate())
              .is('checked_out_at', null).maybeSingle();
            return { ...c, checked_in: !!ci };
          })
        );
        familyMap.set(g.id, { guardian_id: g.id, guardian_name: g.full_name, children: withStatus });
      }
    }

    if (childrenByName) {
      for (const c of childrenByName) {
        if (!familyMap.has(c.guardian_id)) {
          const { data: g } = await supabase.from('guardians').select('id, full_name').eq('id', c.guardian_id).single();
          if (g) {
            const { data: siblings } = await supabase.from('children')
              .select('id, full_name, birth_date, classroom, allergies').eq('guardian_id', g.id);
            const withStatus = await Promise.all(
              (siblings ?? []).map(async (s) => {
                const { data: ci } = await supabase.from('checkins').select('id')
                  .eq('child_id', s.id).eq('service_date', getTodayDate())
                  .is('checked_out_at', null).maybeSingle();
                return { ...s, checked_in: !!ci };
              })
            );
            familyMap.set(g.id, { guardian_id: g.id, guardian_name: g.full_name, children: withStatus });
          }
        }
      }
    }

    setResults(Array.from(familyMap.values()));
    setSearching(false);
  }

  function handleSelectFamily(family: FamilyResult) {
    router.push({
      pathname: '/checkin/confirm',
      params: {
        guardianId: family.guardian_id,
        guardianName: family.guardian_name,
        children: JSON.stringify(family.children),
        serviceId: selectedService?.id || '',
        serviceName: selectedService?.name || '',
      },
    });
  }

  return (
    <View style={styles.container}>
      {/* ====== HEADER BAR - compact, dark ====== */}
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          {churchConfig?.logo_url ? (
            <Image source={{ uri: churchConfig.logo_url }} style={styles.logo} />
          ) : (
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>⛪</Text>
            </View>
          )}
          <View>
            <Text style={styles.churchName}>{churchConfig?.name || 'Igreja'}</Text>
            <Text style={styles.headerMeta}>
              {formatDate(now)} • {formatTime(now)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.resetBtn}
          onPress={() => {
            Alert.alert('Desconectar', 'Deseja desconectar este dispositivo?', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Desconectar', style: 'destructive', onPress: async () => {
                await resetDevice();
                router.replace('/(auth)/device-setup');
              }},
            ]);
          }}
        >
          <Text style={styles.resetIcon}>⚙️</Text>
        </TouchableOpacity>
        <View style={styles.langToggle}>
          <TouchableOpacity
            style={[styles.langBtn, lang === 'pt' && styles.langActive]}
            onPress={() => setLang('pt')}
          >
            <Text style={[styles.langText, lang === 'pt' && styles.langTextActive]}>PT</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.langBtn, lang === 'en' && styles.langActive]}
            onPress={() => setLang('en')}
          >
            <Text style={[styles.langText, lang === 'en' && styles.langTextActive]}>EN</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ====== CONTENT ====== */}
      <FlatList
        data={results}
        keyExtractor={(item) => item.guardian_id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
          {services.length > 0 && (
            <View style={styles.serviceSection}>
              {services.length === 1 ? (
                <View style={styles.serviceSingle}>
                  <Text style={styles.serviceIcon}>⛪</Text>
                  <Text style={styles.serviceName}>{services[0].name}</Text>
                </View>
              ) : (
                <View style={styles.serviceRow}>
                  {services.map((svc) => (
                    <TouchableOpacity
                      key={svc.id}
                      style={[
                        styles.serviceChip,
                        selectedService?.id === svc.id && { backgroundColor: brandColor },
                      ]}
                      onPress={() => setSelectedService({ id: svc.id, name: svc.name })}
                    >
                      <Text style={[
                        styles.serviceChipText,
                        selectedService?.id === svc.id && { color: '#FFFFFF' },
                      ]}>
                        {svc.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          <View style={styles.welcomeSection}>
            {/* Welcome */}
            <Text style={styles.welcomeEmoji}>👋</Text>
            <Text style={styles.welcomeTitle}>{t(lang, 'welcome')}</Text>
            <Text style={styles.welcomeSub}>{t(lang, 'searchInstruction')}</Text>

            {/* Search input */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder={t(lang, 'searchPlaceholder')}
                placeholderTextColor={colors.textMuted}
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
                autoCapitalize="words"
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => { setQuery(''); setResults([]); setHasSearched(false); }}>
                  <Text style={styles.clearBtn}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Search button */}
            <TouchableOpacity
              style={[styles.searchBtn, { backgroundColor: brandColor }]}
              onPress={handleSearch}
              activeOpacity={0.8}
            >
              <Text style={styles.searchBtnText}>{t(lang, 'search')}</Text>
            </TouchableOpacity>
          </View>
          </>
        }
        ListEmptyComponent={
          hasSearched && !searching ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>😕</Text>
              <Text style={styles.emptyTitle}>{t(lang, 'noResults')}</Text>
              <Text style={styles.emptyText}>{t(lang, 'noResultsHint')}</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.familyCard}
            onPress={() => handleSelectFamily(item)}
            activeOpacity={0.7}
          >
            {/* Guardian row */}
            <View style={styles.guardianRow}>
              <View style={[styles.avatar, { backgroundColor: brandColor + '15' }]}>
                <Text style={[styles.avatarLetter, { color: brandColor }]}>
                  {item.guardian_name.charAt(0)}
                </Text>
              </View>
              <View style={styles.guardianInfo}>
                <Text style={styles.guardianName}>{item.guardian_name}</Text>
                <Text style={styles.guardianMeta}>
                  {item.children.length} {item.children.length > 1 ? t(lang, 'children') : t(lang, 'child')}
                </Text>
              </View>
              <View style={styles.chevron}>
                <Text style={styles.chevronText}>›</Text>
              </View>
            </View>

            {/* Children */}
            {item.children.map((child) => (
              <View key={child.id} style={styles.childRow}>
                <View style={styles.childDot} />
                <View style={styles.childInfo}>
                  <Text style={styles.childName}>{child.full_name}</Text>
                  <Text style={styles.childMeta}>
                    {calculateAge(child.birth_date)} {t(lang, 'years')}  •  {child.classroom}
                  </Text>
                  {child.allergies && (
                    <View style={styles.allergyTag}>
                      <Text style={styles.allergyText}>⚠️ {child.allergies}</Text>
                    </View>
                  )}
                </View>
                {child.checked_in && (
                  <View style={styles.checkBadge}>
                    <Text style={styles.checkIcon}>✓</Text>
                  </View>
                )}
              </View>
            ))}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },

  // ====== HEADER BAR ======
  headerBar: {
    backgroundColor: '#111111',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 54,
    paddingBottom: 14,
    paddingHorizontal: spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logo: { width: 38, height: 38, borderRadius: 19 },
  logoCircle: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  logoEmoji: { fontSize: 18 },
  churchName: { fontSize: fontSize.md, fontWeight: '700', color: '#FFFFFF' },
  headerMeta: { fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 1 },
  resetBtn: { padding: spacing.sm, opacity: 0.3 },
  resetIcon: { fontSize: 14 },

  langToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: borderRadius.full,
    padding: 2,
  },
  langBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: borderRadius.full },
  langActive: { backgroundColor: 'rgba(255,255,255,0.15)' },
  langText: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.3)' },
  langTextActive: { color: '#FFFFFF' },

  // Service selector
  serviceSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  serviceSingle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#F0F0F5',
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignSelf: 'center',
  },
  serviceIcon: { fontSize: 14 },
  serviceName: { fontSize: fontSize.sm, fontWeight: '600', color: '#1A1A2E' },
  serviceRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  serviceChip: {
    backgroundColor: '#F0F0F5',
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  serviceChipText: { fontSize: fontSize.sm, fontWeight: '600', color: '#8D8D9B' },

  // ====== CONTENT ======
  listContent: { paddingBottom: 40 },

  welcomeSection: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
    alignItems: 'center',
  },
  welcomeEmoji: { fontSize: 44, marginBottom: spacing.sm },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A2E',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  welcomeSub: {
    fontSize: fontSize.md,
    color: '#8D8D9B',
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
    textAlign: 'center',
    lineHeight: 22,
  },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E8E8EE',
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    width: '100%',
    ...shadow.small,
  },
  inputIcon: { fontSize: 16, marginRight: spacing.sm },
  searchInput: {
    flex: 1,
    fontSize: fontSize.lg,
    color: '#1A1A2E',
    paddingVertical: 16,
  },
  clearBtn: { fontSize: 14, color: '#CCCCCC', padding: spacing.xs },

  searchBtn: {
    width: '100%',
    borderRadius: borderRadius.xl,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: spacing.sm,
    ...shadow.medium,
  },
  searchBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: fontSize.lg },

  // ====== RESULTS ======
  familyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadow.medium,
  },
  guardianRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarLetter: { fontSize: fontSize.xl, fontWeight: '700' },
  guardianInfo: { flex: 1, marginLeft: spacing.md },
  guardianName: { fontSize: fontSize.lg, fontWeight: '700', color: '#1A1A2E' },
  guardianMeta: { fontSize: fontSize.sm, color: '#8D8D9B', marginTop: 1 },
  chevron: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F5F5F8',
    justifyContent: 'center', alignItems: 'center',
  },
  chevronText: { fontSize: 20, color: '#CCCCCC', fontWeight: '300' },

  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    marginLeft: 30,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F8',
  },
  childDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#DDDDE5',
    marginRight: spacing.md,
  },
  childInfo: { flex: 1 },
  childName: { fontSize: fontSize.md, fontWeight: '500', color: '#1A1A2E' },
  childMeta: { fontSize: fontSize.sm, color: '#8D8D9B', marginTop: 1 },
  allergyTag: {
    backgroundColor: '#FFF8E1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  allergyText: { fontSize: 11, color: '#F59E0B', fontWeight: '500' },
  checkBadge: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#10B981',
    justifyContent: 'center', alignItems: 'center',
  },
  checkIcon: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

  // Empty
  emptyState: { alignItems: 'center', paddingTop: spacing.xl, paddingHorizontal: spacing.xl },
  emptyEmoji: { fontSize: 44, marginBottom: spacing.md },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: '600', color: '#1A1A2E', marginBottom: spacing.xs },
  emptyText: { fontSize: fontSize.md, color: '#8D8D9B', textAlign: 'center', lineHeight: 22 },
});

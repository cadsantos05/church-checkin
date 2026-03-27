import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { colors, spacing, borderRadius, fontSize, shadow } from '../../lib/theme';
import { Lang, t } from '../../lib/i18n';
import LangToggle from '../../components/LangToggle';
import PhoneInput from '../../components/PhoneInput';

interface ChildForm {
  full_name: string;
  birth_date: string;
  classroom: string;
  allergies: string;
  notes: string;
}

export default function RegisterFamily() {
  const { churchId, volunteer, churchConfig } = useAuth();
  const router = useRouter();
  const [classroomList, setClassroomList] = useState<string[]>([]);
  const [lang, setLang] = useState<Lang>('pt');
  const brandColor = churchConfig?.primary_color || colors.primary;

  useEffect(() => {
    loadClassrooms();
  }, []);

  async function loadClassrooms() {
    const { data } = await supabase
      .from('classrooms')
      .select('name')
      .eq('church_id', churchId)
      .eq('active', true)
      .order('sort_order', { ascending: true });
    if (data) setClassroomList(data.map((r) => r.name));
  }

  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianRelationship, setGuardianRelationship] = useState('Pai/Mãe');
  const [children, setChildren] = useState<ChildForm[]>([
    { full_name: '', birth_date: '', classroom: '', allergies: '', notes: '' },
  ]);
  const [loading, setLoading] = useState(false);

  const relationships = [
    { key: 'Pai/Mãe', label: t(lang, 'parentRel') },
    { key: 'Avô/Avó', label: t(lang, 'grandparentRel') },
    { key: 'Tio/Tia', label: t(lang, 'uncleRel') },
    { key: 'Outro', label: t(lang, 'otherRel') },
  ];

  function updateChild(index: number, field: keyof ChildForm, value: string) {
    setChildren((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  function addChild() {
    setChildren((prev) => [
      ...prev,
      { full_name: '', birth_date: '', classroom: '', allergies: '', notes: '' },
    ]);
  }

  function removeChild(index: number) {
    if (children.length === 1) return;
    setChildren((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!guardianName.trim()) {
      Alert.alert(t(lang, 'attention'), t(lang, 'fillGuardianName'));
      return;
    }
    const validChildren = children.filter((c) => c.full_name.trim());
    if (validChildren.length === 0) {
      Alert.alert(t(lang, 'attention'), t(lang, 'fillChildName'));
      return;
    }

    setLoading(true);
    const { data: guardian, error: guardianError } = await supabase
      .from('guardians')
      .insert({
        church_id: churchId,
        full_name: guardianName.trim(),
        phone: guardianPhone.trim() || null,
        relationship: guardianRelationship,
        registered_by: volunteer?.id,
      })
      .select('id')
      .single();

    if (guardianError || !guardian) {
      setLoading(false);
      Alert.alert(t(lang, 'error'), 'Could not register guardian.');
      return;
    }

    for (const child of validChildren) {
      const { error } = await supabase.from('children').insert({
        church_id: churchId,
        guardian_id: guardian.id,
        full_name: child.full_name.trim(),
        birth_date: child.birth_date || null,
        classroom: child.classroom || 'Não definida',
        allergies: child.allergies.trim() || null,
        notes: child.notes.trim() || null,
      });
      if (error) {
        setLoading(false);
        Alert.alert(t(lang, 'error'), `Error: ${child.full_name}: ${error.message}`);
        return;
      }
    }

    setLoading(false);
    Alert.alert(
      t(lang, 'familyRegistered'),
      `${guardianName} ${t(lang, 'registeredSuccess')}`,
      [{ text: t(lang, 'ok'), onPress: () => router.back() }]
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← {t(lang, 'back')}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t(lang, 'registerFamily')}</Text>
        <LangToggle lang={lang} onChangeLang={setLang} dark />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Guardian */}
        <Text style={styles.sectionTitle}>{t(lang, 'guardianSection')}</Text>
        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t(lang, 'fullName')} *</Text>
            <TextInput
              style={styles.input}
              placeholder={t(lang, 'fullName')}
              placeholderTextColor="#CCCCCC"
              value={guardianName}
              onChangeText={setGuardianName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t(lang, 'phone')}</Text>
            <PhoneInput
              value={guardianPhone}
              onChangeText={setGuardianPhone}
              placeholder={t(lang, 'phonePlaceholder')}
            />
          </View>

          <Text style={styles.label}>{t(lang, 'relationship')}</Text>
          <View style={styles.chipRow}>
            {relationships.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.chip,
                  guardianRelationship === key && { backgroundColor: brandColor, borderColor: brandColor },
                ]}
                onPress={() => setGuardianRelationship(key)}
              >
                <Text style={[
                  styles.chipText,
                  guardianRelationship === key && { color: '#FFFFFF' },
                ]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Children */}
        <Text style={styles.sectionTitle}>{t(lang, 'childrenSection')}</Text>
        {children.map((child, index) => (
          <View key={index} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{t(lang, 'childNumber')} {index + 1}</Text>
              {children.length > 1 && (
                <TouchableOpacity onPress={() => removeChild(index)}>
                  <Text style={styles.removeText}>{t(lang, 'remove')}</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t(lang, 'fullName')} *</Text>
              <TextInput
                style={styles.input}
                placeholder={t(lang, 'childNamePlaceholder')}
                placeholderTextColor="#CCCCCC"
                value={child.full_name}
                onChangeText={(v) => updateChild(index, 'full_name', v)}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t(lang, 'birthDate')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t(lang, 'birthDatePlaceholder')}
                placeholderTextColor="#CCCCCC"
                value={child.birth_date}
                onChangeText={(v) => updateChild(index, 'birth_date', v)}
                keyboardType="number-pad"
              />
            </View>

            <Text style={styles.label}>{t(lang, 'classroom')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              {classroomList.map((room) => (
                <TouchableOpacity
                  key={room}
                  style={[
                    styles.chip, { marginRight: spacing.sm },
                    child.classroom === room && { backgroundColor: brandColor, borderColor: brandColor },
                  ]}
                  onPress={() => updateChild(index, 'classroom', room)}
                >
                  <Text style={[
                    styles.chipText,
                    child.classroom === room && { color: '#FFFFFF' },
                  ]}>
                    {room}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t(lang, 'allergies')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t(lang, 'allergiesPlaceholder')}
                placeholderTextColor="#CCCCCC"
                value={child.allergies}
                onChangeText={(v) => updateChild(index, 'allergies', v)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t(lang, 'notes')}</Text>
              <TextInput
                style={[styles.input, { minHeight: 60 }]}
                placeholder={t(lang, 'notesPlaceholder')}
                placeholderTextColor="#CCCCCC"
                value={child.notes}
                onChangeText={(v) => updateChild(index, 'notes', v)}
                multiline
              />
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.addButton} onPress={addChild} activeOpacity={0.7}>
          <Text style={[styles.addText, { color: brandColor }]}>{t(lang, 'addChild')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: brandColor }, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.submitText}>
            {loading ? t(lang, 'registering') : t(lang, 'registerFamily')}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },

  header: {
    backgroundColor: '#111111',
    paddingTop: 56,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: { padding: spacing.sm },
  backText: { color: '#FFFFFF', fontSize: fontSize.md, fontWeight: '500' },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '700', color: '#FFFFFF' },

  content: { padding: spacing.lg },

  sectionTitle: {
    fontSize: fontSize.sm, fontWeight: '700', color: '#1A1A2E',
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: spacing.sm, marginTop: spacing.md,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.small,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  cardTitle: { fontSize: fontSize.md, fontWeight: '600', color: '#1A1A2E' },
  removeText: { fontSize: fontSize.sm, color: '#EF4444', fontWeight: '500' },

  inputGroup: { marginBottom: spacing.md },
  label: { fontSize: fontSize.sm, fontWeight: '500', color: '#8D8D9B', marginBottom: spacing.xs },
  input: {
    borderWidth: 1.5, borderColor: '#E8E8EE', borderRadius: borderRadius.md,
    padding: spacing.md, fontSize: fontSize.md, color: '#1A1A2E', backgroundColor: '#FAFAFA',
  },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1.5, borderColor: '#E8E8EE', borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  chipText: { fontSize: fontSize.sm, color: '#8D8D9B', fontWeight: '500' },

  addButton: {
    borderWidth: 1.5, borderColor: '#E8E8EE', borderStyle: 'dashed',
    borderRadius: borderRadius.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.sm,
  },
  addText: { fontSize: fontSize.md, fontWeight: '600' },

  submitButton: {
    borderRadius: borderRadius.md, paddingVertical: 16,
    alignItems: 'center', marginTop: spacing.lg, ...shadow.medium,
  },
  buttonDisabled: { opacity: 0.6 },
  submitText: { color: '#FFFFFF', fontSize: fontSize.lg, fontWeight: '700' },
});

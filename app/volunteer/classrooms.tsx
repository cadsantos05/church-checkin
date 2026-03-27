import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { colors, spacing, borderRadius, fontSize, shadow } from '../../lib/theme';

interface Classroom {
  id: string;
  name: string;
  age_range: string | null;
  max_capacity: number | null;
  active: boolean;
}

export default function ClassroomsScreen() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAgeRange, setNewAgeRange] = useState('');
  const [newCapacity, setNewCapacity] = useState('');
  const [saving, setSaving] = useState(false);
  const { churchId, churchConfig } = useAuth();
  const router = useRouter();
  const brandColor = churchConfig?.primary_color || colors.primary;

  useFocusEffect(
    useCallback(() => {
      loadClassrooms();
    }, [])
  );

  async function loadClassrooms() {
    if (!churchId) return;
    const { data } = await supabase
      .from('classrooms')
      .select('*')
      .eq('church_id', churchId)
      .order('sort_order', { ascending: true });
    if (data) setClassrooms(data);
  }

  async function handleAdd() {
    if (!newName.trim()) {
      Alert.alert('Atenção', 'Digite o nome da sala.');
      return;
    }
    setSaving(true);
    const nextOrder = classrooms.length + 1;
    const { error } = await supabase.from('classrooms').insert({
      church_id: churchId,
      name: newName.trim(),
      age_range: newAgeRange.trim() || null,
      max_capacity: newCapacity ? parseInt(newCapacity) : null,
      sort_order: nextOrder,
    });
    setSaving(false);
    if (error) {
      Alert.alert('Erro', error.message);
      return;
    }
    setNewName('');
    setNewAgeRange('');
    setNewCapacity('');
    setShowForm(false);
    loadClassrooms();
  }

  async function handleToggle(classroom: Classroom) {
    await supabase
      .from('classrooms')
      .update({ active: !classroom.active })
      .eq('id', classroom.id);
    loadClassrooms();
  }

  async function handleDelete(classroom: Classroom) {
    Alert.alert('Remover sala', `Deseja remover "${classroom.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('classrooms').delete().eq('id', classroom.id);
          loadClassrooms();
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Salas</Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>
          Configure as salas do ministério infantil. Essas salas aparecerão no cadastro de crianças e no painel.
        </Text>

        {/* Classroom list */}
        {classrooms.map((room) => (
          <View key={room.id} style={[styles.roomCard, !room.active && styles.roomInactive]}>
            <View style={styles.roomInfo}>
              <View style={styles.roomNameRow}>
                <View style={[styles.dot, { backgroundColor: room.active ? brandColor : '#CCCCCC' }]} />
                <Text style={[styles.roomName, !room.active && styles.roomNameInactive]}>
                  {room.name}
                </Text>
              </View>
              <View style={styles.roomMeta}>
                {room.age_range && <Text style={styles.metaText}>{room.age_range}</Text>}
                {room.max_capacity && <Text style={styles.metaText}>• Máx: {room.max_capacity}</Text>}
              </View>
            </View>
            <View style={styles.roomActions}>
              <TouchableOpacity
                style={[styles.toggleBtn, room.active && { backgroundColor: '#10B981' }]}
                onPress={() => handleToggle(room)}
              >
                <Text style={styles.toggleText}>{room.active ? 'Ativa' : 'Inativa'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(room)}>
                <Text style={styles.deleteText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Add form */}
        {showForm ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Nova Sala</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome da sala *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Kids 3"
                placeholderTextColor="#CCCCCC"
                value={newName}
                onChangeText={setNewName}
                autoFocus
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Faixa etária</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: 6-8 anos"
                  placeholderTextColor="#CCCCCC"
                  value={newAgeRange}
                  onChangeText={setNewAgeRange}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Capacidade</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: 25"
                  placeholderTextColor="#CCCCCC"
                  value={newCapacity}
                  onChangeText={setNewCapacity}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowForm(false)}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: brandColor }, saving && { opacity: 0.5 }]}
                onPress={handleAdd}
                disabled={saving}
              >
                <Text style={styles.saveText}>{saving ? 'Salvando...' : 'Salvar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.addBtn, { borderColor: brandColor }]}
            onPress={() => setShowForm(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.addText, { color: brandColor }]}>+ Adicionar nova sala</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
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

  subtitle: {
    fontSize: fontSize.md,
    color: '#8D8D9B',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },

  // Room cards
  roomCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadow.small,
  },
  roomInactive: { opacity: 0.5 },
  roomInfo: { flex: 1 },
  roomNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  roomName: { fontSize: fontSize.lg, fontWeight: '600', color: '#1A1A2E' },
  roomNameInactive: { color: '#8D8D9B' },
  roomMeta: { flexDirection: 'row', gap: spacing.xs, marginTop: 4, marginLeft: 20 },
  metaText: { fontSize: fontSize.sm, color: '#8D8D9B' },

  roomActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  toggleBtn: {
    backgroundColor: '#E5E5EA',
    borderRadius: borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  toggleText: { fontSize: 11, fontWeight: '600', color: '#FFFFFF' },
  deleteText: { fontSize: 16, color: '#CCCCCC', padding: spacing.xs },

  // Form
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.sm,
    ...shadow.medium,
  },
  formTitle: { fontSize: fontSize.lg, fontWeight: '700', color: '#1A1A2E', marginBottom: spacing.md },

  inputGroup: { marginBottom: spacing.md },
  label: { fontSize: fontSize.sm, fontWeight: '500', color: '#8D8D9B', marginBottom: spacing.xs },
  input: {
    borderWidth: 1.5,
    borderColor: '#E8E8EE',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: '#1A1A2E',
  },

  formRow: { flexDirection: 'row', gap: spacing.sm },

  formActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  cancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E8E8EE',
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: { color: '#8D8D9B', fontSize: fontSize.md, fontWeight: '600' },
  saveBtn: {
    flex: 1,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveText: { color: '#FFFFFF', fontSize: fontSize.md, fontWeight: '600' },

  // Add button
  addBtn: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  addText: { fontSize: fontSize.md, fontWeight: '600' },
});

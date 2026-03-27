import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, FlatList } from 'react-native';
import { borderRadius, fontSize, spacing } from '../lib/theme';

interface Country {
  code: string;
  dial: string;
  flag: string;
  mask: string;
}

const COUNTRIES: Country[] = [
  { code: 'BR', dial: '+55', flag: '🇧🇷', mask: '(##) #####-####' },
  { code: 'US', dial: '+1', flag: '🇺🇸', mask: '(###) ###-####' },
  { code: 'PT', dial: '+351', flag: '🇵🇹', mask: '### ### ###' },
  { code: 'MX', dial: '+52', flag: '🇲🇽', mask: '## #### ####' },
  { code: 'CO', dial: '+57', flag: '🇨🇴', mask: '### ### ####' },
  { code: 'AR', dial: '+54', flag: '🇦🇷', mask: '## ####-####' },
  { code: 'CL', dial: '+56', flag: '🇨🇱', mask: '# #### ####' },
  { code: 'PE', dial: '+51', flag: '🇵🇪', mask: '### ### ###' },
  { code: 'GB', dial: '+44', flag: '🇬🇧', mask: '#### ######' },
  { code: 'ES', dial: '+34', flag: '🇪🇸', mask: '### ## ## ##' },
  { code: 'FR', dial: '+33', flag: '🇫🇷', mask: '# ## ## ## ##' },
  { code: 'DE', dial: '+49', flag: '🇩🇪', mask: '### #######' },
  { code: 'IT', dial: '+39', flag: '🇮🇹', mask: '### ### ####' },
  { code: 'CA', dial: '+1', flag: '🇨🇦', mask: '(###) ###-####' },
  { code: 'AU', dial: '+61', flag: '🇦🇺', mask: '#### ### ###' },
];

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

function applyMask(text: string, mask: string): string {
  const digits = text.replace(/\D/g, '');
  let result = '';
  let digitIndex = 0;
  for (let i = 0; i < mask.length && digitIndex < digits.length; i++) {
    if (mask[i] === '#') {
      result += digits[digitIndex];
      digitIndex++;
    } else {
      result += mask[i];
    }
  }
  return result;
}

export default function PhoneInput({ value, onChangeText, placeholder }: Props) {
  const [country, setCountry] = useState<Country>(COUNTRIES[0]); // BR default
  const [showPicker, setShowPicker] = useState(false);

  function handleChange(text: string) {
    const masked = applyMask(text, country.mask);
    onChangeText(`${country.dial} ${masked}`);
  }

  // Extract just the local number (without dial code) for display
  const displayValue = value.startsWith(country.dial)
    ? value.slice(country.dial.length).trim()
    : value.replace(/^\+\d+\s?/, '');

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.countryBtn} onPress={() => setShowPicker(true)}>
        <Text style={styles.flag}>{country.flag}</Text>
        <Text style={styles.dial}>{country.dial}</Text>
        <Text style={styles.arrow}>▾</Text>
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        value={displayValue}
        onChangeText={handleChange}
        placeholder={placeholder || country.mask.replace(/#/g, '0')}
        placeholderTextColor="#CCCCCC"
        keyboardType="phone-pad"
      />

      <Modal visible={showPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecione o país</Text>
            <FlatList
              data={COUNTRIES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.countryRow, item.code === country.code && styles.countryRowActive]}
                  onPress={() => {
                    setCountry(item);
                    onChangeText('');
                    setShowPicker(false);
                  }}
                >
                  <Text style={styles.countryFlag}>{item.flag}</Text>
                  <Text style={styles.countryName}>{item.code}</Text>
                  <Text style={styles.countryDial}>{item.dial}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowPicker(false)}>
              <Text style={styles.closeText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E8E8EE',
    borderRadius: borderRadius.md,
    backgroundColor: '#FAFAFA',
    overflow: 'hidden',
  },
  countryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRightWidth: 1,
    borderRightColor: '#E8E8EE',
    gap: 4,
  },
  flag: { fontSize: 18 },
  dial: { fontSize: fontSize.sm, color: '#1A1A2E', fontWeight: '600' },
  arrow: { fontSize: 10, color: '#CCCCCC' },

  input: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: fontSize.md,
    color: '#1A1A2E',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: spacing.lg,
    maxHeight: '60%',
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  countryRowActive: { backgroundColor: '#F0F0F5' },
  countryFlag: { fontSize: 22 },
  countryName: { fontSize: fontSize.md, color: '#1A1A2E', fontWeight: '500', flex: 1 },
  countryDial: { fontSize: fontSize.md, color: '#8D8D9B' },
  closeBtn: {
    padding: spacing.lg,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F5',
  },
  closeText: { fontSize: fontSize.md, color: '#8D8D9B', fontWeight: '600' },
});

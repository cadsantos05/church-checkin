import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Lang } from '../lib/i18n';
import { borderRadius } from '../lib/theme';

interface Props {
  lang: Lang;
  onChangeLang: (lang: Lang) => void;
  dark?: boolean;
}

export default function LangToggle({ lang, onChangeLang, dark = false }: Props) {
  const bg = dark ? 'rgba(255,255,255,0.08)' : '#F1F1F5';
  const activeBg = dark ? 'rgba(255,255,255,0.15)' : '#FFFFFF';
  const inactiveColor = dark ? 'rgba(255,255,255,0.3)' : '#AAAAAA';
  const activeColor = dark ? '#FFFFFF' : '#1A1A2E';

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <TouchableOpacity
        style={[styles.btn, lang === 'pt' && { backgroundColor: activeBg }]}
        onPress={() => onChangeLang('pt')}
      >
        <Text style={[styles.text, { color: lang === 'pt' ? activeColor : inactiveColor }]}>PT</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.btn, lang === 'en' && { backgroundColor: activeBg }]}
        onPress={() => onChangeLang('en')}
      >
        <Text style={[styles.text, { color: lang === 'en' ? activeColor : inactiveColor }]}>EN</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: borderRadius.full,
    padding: 2,
  },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
  },
});

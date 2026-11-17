import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, Clipboard, Linking, Alert,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { BackButton } from '@/components/layout/BackButton';
import { useToast } from '@/components/ui/Toast';

interface AddressRow { label: string; value: string; }

export default function AdressesUSScreen() {
  const { profile } = useAuth();
  const { colors } = useTheme();
  const { show, ToastEl } = useToast();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const suiteId = profile?.us_suite ?? 'JJUS-XXXXX';

  const MIAMI_ROWS: AddressRow[] = [
    { label: 'Nom complet', value: `JJ's IMEX / ${profile?.full_name ?? 'Votre Nom'}` },
    { label: 'Adresse ligne 1', value: '15490 NW 7th Ave' },
    { label: 'Suite / Apt', value: `Unit 207 — ${suiteId}` },
    { label: 'Ville', value: 'Miami' },
    { label: 'État', value: 'FL' },
    { label: 'Code postal', value: '33169' },
    { label: 'Pays', value: 'United States' },
    { label: 'Téléphone', value: '+1 (305) 600-9364' },
  ];

  const BOSTON_ROWS: AddressRow[] = [
    { label: 'Adresse ligne 1', value: '1234 Broadway Ave' },
    { label: 'Suite', value: `Suite B — ${suiteId}` },
    { label: 'Ville', value: 'Boston' },
    { label: 'État', value: 'MA' },
    { label: 'Code postal', value: '02101' },
    { label: 'Pays', value: 'United States' },
  ];

  const STEPS = [
    { icon: '🛍️', text: 'Faites vos achats en ligne sur Amazon, Nike, Shein, etc.' },
    { icon: '📦', text: 'Utilisez l\'adresse Miami comme adresse de livraison.' },
    { icon: '📲', text: 'Vous recevrez une notification dès que votre colis arrive.' },
    { icon: '🚚', text: 'On expédie vers votre ville en Haïti ou en Rép. Dom.' },
  ];

  function copyField(key: string, value: string) {
    Clipboard.setString(value);
    setCopiedKey(key);
    show('Copié !', 'success');
    setTimeout(() => setCopiedKey(null), 2000);
  }

  function copyAll() {
    const full = MIAMI_ROWS.map(r => `${r.label}: ${r.value}`).join('\n');
    Clipboard.setString(full);
    show('Adresse complète copiée !', 'success');
  }

  function shareWhatsApp() {
    const msg = `Mon adresse US pour JJ's IMEX:\n${MIAMI_ROWS.map(r => `${r.label}: ${r.value}`).join('\n')}`;
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(msg)}`);
  }

  return (
    <SafeAreaView style={styles.container}>
      {ToastEl}

      <View style={styles.header}>
        <BackButton />
        <View style={{ marginLeft: 12 }}>
          <Text style={styles.title}>Mes adresses US</Text>
          <Text style={styles.subtitle}>Utilisez ces adresses pour vos achats</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* MIAMI */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Text style={{ fontSize: 22 }}>🌴</Text>
            <View>
              <Text style={styles.sectionTitle}>Adresse Miami</Text>
              <Text style={styles.sectionSub}>Principale — tout type de colis</Text>
            </View>
          </View>
          <View style={styles.card}>
            {MIAMI_ROWS.map((row) => (
              <TouchableOpacity
                key={row.label}
                onPress={() => copyField(row.label, row.value)}
                activeOpacity={0.7}
                style={styles.addressRow}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{row.label}</Text>
                  <Text style={[styles.rowValue, row.label === 'Suite / Apt' && { color: colors.accent }]}>{row.value}</Text>
                </View>
                <View style={[styles.copyIcon, copiedKey === row.label && styles.copyIconDone]}>
                  <Text style={{ fontSize: 13 }}>{copiedKey === row.label ? '✓' : '📋'}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <TouchableOpacity onPress={copyAll} style={[styles.btn, { flex: 1 }]} activeOpacity={0.85}>
              <Text style={{ fontSize: 15 }}>📋</Text>
              <Text style={styles.btnText}>Tout copier</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={shareWhatsApp} style={[styles.btnGreen, { flex: 1 }]} activeOpacity={0.85}>
              <Text style={{ fontSize: 15 }}>💬</Text>
              <Text style={styles.btnGreenText}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* BOSTON */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Text style={{ fontSize: 22 }}>🏙️</Text>
            <View>
              <Text style={styles.sectionTitle}>Adresse Boston</Text>
              <Text style={styles.sectionSub}>Alternative — Nord-Est USA</Text>
            </View>
          </View>
          <View style={styles.card}>
            {BOSTON_ROWS.map((row) => (
              <TouchableOpacity
                key={row.label}
                onPress={() => copyField(`boston_${row.label}`, row.value)}
                activeOpacity={0.7}
                style={styles.addressRow}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{row.label}</Text>
                  <Text style={styles.rowValue}>{row.value}</Text>
                </View>
                <View style={[styles.copyIcon, copiedKey === `boston_${row.label}` && styles.copyIconDone]}>
                  <Text style={{ fontSize: 13 }}>{copiedKey === `boston_${row.label}` ? '✓' : '📋'}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* HOW IT WORKS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Comment ça marche ?</Text>
          <View style={styles.card}>
            {STEPS.map((step, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 12, paddingVertical: 10, borderBottomWidth: i < STEPS.length - 1 ? 1 : 0, borderBottomColor: '#1F1F1F' }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.accentLight, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 18 }}>{step.icon}</Text>
                </View>
                <View style={{ flex: 1, justifyContent: 'center' }}>
                  <Text style={{ fontSize: 13, color: '#E5E7EB', lineHeight: 19 }}>{step.text}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* WARNING */}
        <View style={[styles.section, { marginBottom: 40 }]}>
          <View style={{ backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', flexDirection: 'row', gap: 10 }}>
            <Text style={{ fontSize: 18 }}>⚠️</Text>
            <Text style={{ flex: 1, fontSize: 13, color: '#FCA5A5', lineHeight: 19 }}>
              N'oubliez pas d'inclure votre numéro de suite unique (<Text style={{ color: colors.accent, fontWeight: '700' }}>{suiteId}</Text>) dans l'adresse de livraison pour que nous puissions identifier votre colis.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  title: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  subtitle: { fontSize: 13, color: '#9CA3AF' },
  content: { padding: 20, gap: 24, paddingBottom: 20 },
  section: { gap: 0 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  sectionSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  card: { backgroundColor: '#1A1A1A', borderRadius: 16, borderWidth: 1, borderColor: '#242424', overflow: 'hidden', marginTop: 12 },
  addressRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#1F1F1F' },
  rowLabel: { fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.4 },
  rowValue: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', marginTop: 3 },
  copyIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: '#2A2A2A', alignItems: 'center', justifyContent: 'center' },
  copyIconDone: { backgroundColor: 'rgba(34,197,94,0.15)', borderColor: '#22C55E' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1A1A1A', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#2A2A2A' },
  btnText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  btnGreen: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#22C55E', borderRadius: 12, padding: 14 },
  btnGreenText: { fontSize: 14, fontWeight: '700', color: '#052E14' },
});

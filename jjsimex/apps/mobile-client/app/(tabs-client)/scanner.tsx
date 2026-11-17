import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { scanPackage } from '@jjsimex/supabase/packages';

export default function ScannerScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');

  async function handleManualEntry(tracking: string) {
    if (!tracking.trim()) return;
    setError('');
    try {
      const pkg = await scanPackage(tracking.trim());
      if (pkg) {
        router.push(`/colis/${pkg.id}`);
      } else {
        setError('Colis introuvable avec ce numéro de tracking.');
      }
    } catch (e) {
      setError('Erreur lors de la recherche.');
    }
  }

  const [manual, setManual] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      {/* Viewfinder */}
      <View style={styles.viewfinder}>
        <View style={styles.corner} />
        <View style={[styles.corner, { right: 0, left: undefined }]} />
        <View style={[styles.corner, { bottom: 0, top: undefined }]} />
        <View style={[styles.corner, { bottom: 0, top: undefined, right: 0, left: undefined }]} />
        <Text style={styles.scanLabel}>Pointez vers le QR code de votre colis</Text>
      </View>

      <View style={styles.bottom}>
        <Text style={styles.orText}>— ou entrez le numéro manuellement —</Text>
        <View style={styles.inputRow}>
          <View style={styles.inputWrap}>
            <Text style={styles.inputPrefix}>JJI-</Text>
            <View style={{ flex: 1, height: 50, justifyContent: 'center' }}>
              <Text
                style={{ color: manual ? '#FFFFFF' : '#6B7280', fontSize: 15 }}
                onPress={() => {}}
              >
                {manual || '2025-XXXXX'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => handleManualEntry(manual)}
            style={styles.searchBtn}
            activeOpacity={0.85}
          >
            <Text style={{ fontSize: 20 }}>🔍</Text>
          </TouchableOpacity>
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.exampleRow}>
          {['JJI-2025-00847', 'JJI-2025-00621'].map(ex => (
            <TouchableOpacity
              key={ex}
              onPress={() => setManual(ex)}
              style={styles.exampleChip}
              activeOpacity={0.7}
            >
              <Text style={styles.exampleText}>{ex}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D', alignItems: 'center' },
  viewfinder: {
    width: 260, height: 260, marginTop: 80, position: 'relative',
    alignItems: 'center', justifyContent: 'center',
    borderColor: 'rgba(34,197,94,0.2)', borderWidth: 1, borderRadius: 16,
    backgroundColor: 'rgba(34,197,94,0.04)',
  },
  corner: {
    position: 'absolute', top: 0, left: 0, width: 32, height: 32,
    borderTopWidth: 3, borderLeftWidth: 3, borderColor: '#22C55E', borderTopLeftRadius: 4,
  },
  scanLabel: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 24 },
  bottom: { width: '100%', padding: 28, marginTop: 40, gap: 16 },
  orText: { fontSize: 12, color: '#6B7280', textAlign: 'center' },
  inputRow: { flexDirection: 'row', gap: 10 },
  inputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    height: 50, backgroundColor: '#1A1A1A', borderRadius: 12, borderWidth: 1, borderColor: '#2A2A2A', paddingHorizontal: 14,
  },
  inputPrefix: { fontSize: 15, color: '#22C55E', fontWeight: '700' },
  searchBtn: { width: 50, height: 50, backgroundColor: '#22C55E', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#EF4444', fontSize: 13, textAlign: 'center' },
  exampleRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', flexWrap: 'wrap' },
  exampleChip: { backgroundColor: '#1A1A1A', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: '#2A2A2A' },
  exampleText: { fontSize: 12, color: '#9CA3AF', fontFamily: 'monospace' },
});

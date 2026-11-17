import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Platform, StatusBar, Alert, TextInput, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, RefreshCw } from 'lucide-react-native';
import { getExchangeRates, updateExchangeRate } from '@jjsimex/supabase/shipping';

const statusBarH = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;
const ACCENT = '#22C55E';

interface ExchangeRate {
  id: string;
  usd_to_htg: number;
  usd_to_dop: number;
  eur_to_htg: number;
  cad_to_htg: number;
  updated_at: string;
}

const FIELDS: { key: keyof Omit<ExchangeRate, 'id' | 'updated_at'>; label: string }[] = [
  { key: 'usd_to_htg', label: 'USD → HTG' },
  { key: 'usd_to_dop', label: 'USD → DOP' },
  { key: 'eur_to_htg', label: 'EUR → HTG' },
  { key: 'cad_to_htg', label: 'CAD → HTG' },
];

export default function AdminTaux() {
  const router = useRouter();
  const { profile } = useAuth();
  const [rate, setRate] = useState<ExchangeRate | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isSuperAdmin = profile?.role === 'super_admin';
  const isAdmin = profile?.role === 'admin' || isSuperAdmin;

  useEffect(() => {
    if (!isAdmin) return;
    fetchRate();
  }, []);

  async function fetchRate() {
    try {
      const r = await getExchangeRates() as ExchangeRate;
      setRate(r);
      setValues({
        usd_to_htg: String(r.usd_to_htg),
        usd_to_dop: String(r.usd_to_dop),
        eur_to_htg: String(r.eur_to_htg),
        cad_to_htg: String(r.cad_to_htg),
      });
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!rate) return;
    setSaving(true);
    try {
      const rateData: Record<string, number> = {};
      for (const f of FIELDS) {
        const val = parseFloat(values[f.key] ?? '');
        if (isNaN(val) || val <= 0) throw new Error(`Valeur invalide pour ${f.label}`);
        rateData[f.key] = val;
      }
      await updateExchangeRate(rateData as any, profile!.id);
      Alert.alert('Succès', 'Taux de change mis à jour.');
      fetchRate();
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
    setSaving(false);
  }

  if (!isAdmin) {
    return (
      <View style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
            <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Taux de change</Text>
        </View>
        <View style={s.centered}>
          <Text style={s.errorText}>Accès réservé aux administrateurs.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Taux de change</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={ACCENT} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          {rate && (
            <Text style={s.lastUpdate}>
              Dernière mise à jour : {new Date(rate.updated_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}

          <View style={s.card}>
            {FIELDS.map((f, i) => (
              <React.Fragment key={f.key}>
                {i > 0 && <View style={s.sep} />}
                <View style={s.fieldRow}>
                  <Text style={s.fieldLabel}>{f.label}</Text>
                  <TextInput
                    style={s.input}
                    value={values[f.key] ?? ''}
                    onChangeText={(v) => setValues(prev => ({ ...prev, [f.key]: v }))}
                    keyboardType="decimal-pad"
                    placeholderTextColor="#4B5563"
                  />
                </View>
              </React.Fragment>
            ))}
          </View>

          <TouchableOpacity
            style={[s.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.7}
          >
            {saving ? (
              <ActivityIndicator color="#0D0D0D" size="small" />
            ) : (
              <>
                <RefreshCw size={18} color="#0D0D0D" strokeWidth={2} />
                <Text style={s.saveBtnText}>Mettre à jour</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 18, paddingTop: statusBarH + 10, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#1A1A1A',
  },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  errorText: { color: '#EF4444', fontSize: 14, textAlign: 'center' },

  lastUpdate: { fontSize: 11, color: '#6B7280', marginBottom: 16, textAlign: 'center' },

  card: {
    backgroundColor: '#1A1A1A', borderRadius: 14, borderWidth: 1, borderColor: '#1F1F1F',
    padding: 16,
  },
  sep: { height: 1, backgroundColor: '#222222', marginVertical: 12 },
  fieldRow: { gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  input: {
    height: 42, backgroundColor: '#0D0D0D', borderRadius: 10,
    borderWidth: 1, borderColor: '#2A2A2A', color: '#FFFFFF',
    paddingHorizontal: 12, fontSize: 14,
  },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: ACCENT, borderRadius: 12, padding: 16, marginTop: 24,
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#0D0D0D' },
});

import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Platform, StatusBar, Alert, TextInput, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Save } from 'lucide-react-native';
import { getShippingRates, updateShippingRate } from '@jjsimex/supabase/shipping';

const statusBarH = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;
const ACCENT = '#22C55E';

interface ShippingRate {
  id: string;
  destination_country: string;
  destination_city: string;
  air_rate_per_lb: number;
  sea_rate_per_lb: number;
  is_active: boolean;
}

export default function AdminTarifs() {
  const router = useRouter();
  const { profile } = useAuth();
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [editedRates, setEditedRates] = useState<Record<string, { air?: string; sea?: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isSuperAdmin = profile?.role === 'super_admin';
  const isAdmin = profile?.role === 'admin' || isSuperAdmin;

  useEffect(() => {
    if (!isAdmin) return;
    fetchRates();
  }, []);

  async function fetchRates() {
    try {
      const data = await getShippingRates();
      setRates(data as ShippingRate[]);
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
    setLoading(false);
  }

  function handleChange(id: string, field: 'air' | 'sea', value: string) {
    setEditedRates(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  }

  async function handleSave() {
    const entries = Object.entries(editedRates);
    if (entries.length === 0) {
      Alert.alert('Info', 'Aucune modification à enregistrer.');
      return;
    }

    setSaving(true);
    try {
      for (const [id, changes] of entries) {
        const update: { air_rate_per_lb?: number; sea_rate_per_lb?: number } = {};
        if (changes.air !== undefined) {
          const val = parseFloat(changes.air);
          if (isNaN(val) || val < 0) throw new Error(`Tarif aérien invalide pour l'entrée.`);
          update.air_rate_per_lb = val;
        }
        if (changes.sea !== undefined) {
          const val = parseFloat(changes.sea);
          if (isNaN(val) || val < 0) throw new Error(`Tarif maritime invalide pour l'entrée.`);
          update.sea_rate_per_lb = val;
        }
        await updateShippingRate(id, update, profile!.id);
      }
      Alert.alert('Succès', 'Tarifs mis à jour avec succès.');
      setEditedRates({});
      fetchRates();
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
          <Text style={s.headerTitle}>Tarifs de livraison</Text>
        </View>
        <View style={s.centered}>
          <Text style={s.errorText}>Accès réservé aux administrateurs.</Text>
        </View>
      </View>
    );
  }

  const countryLabel: Record<string, string> = { haiti: 'Haïti', dr: 'Rép. Dominicaine' };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Tarifs de livraison</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={ACCENT} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          {rates.map((rate) => {
            const edited = editedRates[rate.id];
            const airVal = edited?.air ?? String(rate.air_rate_per_lb);
            const seaVal = edited?.sea ?? String(rate.sea_rate_per_lb);

            return (
              <View key={rate.id} style={s.card}>
                <View style={s.cardHeader}>
                  <Text style={s.cityName}>{rate.destination_city}</Text>
                  <Text style={s.countryName}>{countryLabel[rate.destination_country] ?? rate.destination_country}</Text>
                </View>
                <View style={s.fieldsRow}>
                  <View style={s.fieldGroup}>
                    <Text style={s.fieldLabel}>Aérien ($/lb)</Text>
                    <TextInput
                      style={s.input}
                      value={airVal}
                      onChangeText={(v) => handleChange(rate.id, 'air', v)}
                      keyboardType="decimal-pad"
                      placeholderTextColor="#4B5563"
                    />
                  </View>
                  <View style={s.fieldGroup}>
                    <Text style={s.fieldLabel}>Maritime ($/lb)</Text>
                    <TextInput
                      style={s.input}
                      value={seaVal}
                      onChangeText={(v) => handleChange(rate.id, 'sea', v)}
                      keyboardType="decimal-pad"
                      placeholderTextColor="#4B5563"
                    />
                  </View>
                </View>
              </View>
            );
          })}

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
                <Save size={18} color="#0D0D0D" strokeWidth={2} />
                <Text style={s.saveBtnText}>Enregistrer</Text>
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

  card: {
    backgroundColor: '#1A1A1A', borderRadius: 14, borderWidth: 1, borderColor: '#1F1F1F',
    padding: 16, marginBottom: 12,
  },
  cardHeader: { marginBottom: 12 },
  cityName: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  countryName: { fontSize: 11, color: '#6B7280', marginTop: 2 },

  fieldsRow: { flexDirection: 'row', gap: 12 },
  fieldGroup: { flex: 1 },
  fieldLabel: { fontSize: 11, color: '#6B7280', marginBottom: 6 },
  input: {
    height: 42, backgroundColor: '#0D0D0D', borderRadius: 10,
    borderWidth: 1, borderColor: '#2A2A2A', color: '#FFFFFF',
    paddingHorizontal: 12, fontSize: 14,
  },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: ACCENT, borderRadius: 12, padding: 16, marginTop: 20,
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#0D0D0D' },
});

import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone_whatsapp: '',
    destination_country: '',
    destination_city: '',
  });

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('users')
      .select('full_name, email, phone_whatsapp, destination_country, destination_city')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setForm({
            full_name: data.full_name ?? '',
            email: data.email ?? '',
            phone_whatsapp: data.phone_whatsapp ?? '',
            destination_country: data.destination_country ?? '',
            destination_city: data.destination_city ?? '',
          });
        }
        setLoading(false);
      });
  }, [user?.id]);

  async function handleSave() {
    if (!user?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from('users')
      .update({
        full_name: form.full_name,
        phone_whatsapp: form.phone_whatsapp,
        destination_country: form.destination_country,
        destination_city: form.destination_city,
      })
      .eq('id', user.id);
    setSaving(false);
    if (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder les modifications.');
    } else {
      Alert.alert('Succès', 'Vos informations ont été mises à jour.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  }

  const fields: { key: keyof typeof form; label: string; editable?: boolean }[] = [
    { key: 'full_name', label: 'Nom complet' },
    { key: 'email', label: 'Email', editable: false },
    { key: 'phone_whatsapp', label: 'Téléphone WhatsApp' },
    { key: 'destination_country', label: 'Pays de destination' },
    { key: 'destination_city', label: 'Ville de destination' },
  ];

  if (loading) {
    return (
      <View style={S.container}>
        <ActivityIndicator color="#22C55E" style={{ marginTop: 60 }} />
      </View>
    );
  }

  return (
    <View style={S.container}>
      <View style={S.header}>
        <TouchableOpacity style={S.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Text style={{ color: '#FFFFFF', fontSize: 20 }}>&#8592;</Text>
        </TouchableOpacity>
        <Text style={S.headerTitle}>Mes informations</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 40 }}>
        {fields.map(({ key, label, editable }) => (
          <View key={key} style={{ marginBottom: 18 }}>
            <Text style={S.label}>{label}</Text>
            <TextInput
              style={[S.input, editable === false && { opacity: 0.5 }]}
              value={form[key]}
              onChangeText={(t) => setForm((p) => ({ ...p, [key]: t }))}
              editable={editable !== false}
              placeholderTextColor="#6B7280"
            />
          </View>
        ))}

        <TouchableOpacity onPress={handleSave} activeOpacity={0.85} disabled={saving}
          style={S.saveBtn}>
          <Text style={{ color: '#0D0D0D', fontSize: 15, fontWeight: '700' }}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  header: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  backBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  label: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', marginBottom: 6 },
  input: { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, color: '#FFFFFF', fontSize: 14 },
  saveBtn: { height: 50, backgroundColor: '#22C55E', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
});

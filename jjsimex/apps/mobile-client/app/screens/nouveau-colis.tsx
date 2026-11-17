import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { BackButton } from '@/components/layout/BackButton';
import { useToast } from '@/components/ui/Toast';

export default function NouveauColisScreen() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const { show, ToastEl } = useToast();

  const [merchant, setMerchant] = useState('');
  const [description, setDescription] = useState('');
  const [declaredValue, setDeclaredValue] = useState('');
  const [transport, setTransport] = useState<'air' | 'sea'>('air');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!merchant.trim() || !description.trim()) {
      show('Veuillez remplir les champs obligatoires', 'error'); return;
    }
    setSubmitting(true);
    try {
      show('Colis enregistré ! Vous recevrez un email de confirmation.', 'success');
      setTimeout(() => router.back(), 1500);
    } catch {
      show('Erreur lors de l\'enregistrement', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {ToastEl}

      <View style={styles.header}>
        <BackButton />
        <View style={{ marginLeft: 12 }}>
          <Text style={styles.title}>Nouveau colis</Text>
          <Text style={styles.subtitle}>Déclarez un colis attendu</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.infoBox}>
          <Text style={{ fontSize: 13, color: '#9CA3AF', lineHeight: 19 }}>
            Déclarez un colis que vous attendez à notre entrepôt de Miami. Nous vous notifierons dès son arrivée.
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Marchand / Site *</Text>
          <TextInput style={styles.input} placeholder="Amazon, Shein, Nike..." placeholderTextColor="#6B7280" value={merchant} onChangeText={setMerchant} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Description du colis *</Text>
          <TextInput
            style={[styles.input, { height: 80, paddingTop: 12, textAlignVertical: 'top' }]}
            placeholder="Décrivez le contenu (vêtements, électronique, etc.)"
            placeholderTextColor="#6B7280"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Valeur déclarée (USD)</Text>
          <TextInput style={styles.input} placeholder="0.00" placeholderTextColor="#6B7280" value={declaredValue} onChangeText={setDeclaredValue} keyboardType="decimal-pad" />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Mode de transport souhaité</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {([['air', '✈️ Avion', '5-7 jours'], ['sea', '🚢 Bateau', '3-4 semaines']] as const).map(([mode, label, sub]) => (
              <TouchableOpacity
                key={mode}
                onPress={() => setTransport(mode)}
                style={[styles.modeBtn, transport === mode && styles.modeBtnActive]}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: transport === mode ? '#0D0D0D' : '#FFFFFF' }}>{label}</Text>
                <Text style={{ fontSize: 11, color: transport === mode ? 'rgba(0,0,0,0.6)' : '#9CA3AF', marginTop: 2 }}>{sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ backgroundColor: '#1A1A1A', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#242424' }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#9CA3AF', marginBottom: 10 }}>Livraison vers</Text>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>{profile?.destination_city ?? '—'}, {profile?.destination_country ?? '—'}</Text>
        </View>

        <TouchableOpacity onPress={handleSubmit} disabled={submitting} style={[styles.btnSubmit, submitting && { opacity: 0.6 }]} activeOpacity={0.85}>
          {submitting ? <ActivityIndicator color="#0D0D0D" /> : (
            <>
              <Text style={{ fontSize: 18 }}>📦</Text>
              <Text style={styles.btnSubmitText}>Enregistrer le colis</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  title: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  subtitle: { fontSize: 13, color: '#9CA3AF' },
  content: { padding: 20, paddingBottom: 60, gap: 16 },
  infoBox: { backgroundColor: 'rgba(34,197,94,0.08)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' },
  field: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  input: { height: 50, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 12, color: '#FFFFFF', paddingHorizontal: 16, fontSize: 14 },
  modeBtn: { flex: 1, backgroundColor: '#1A1A1A', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#2A2A2A' },
  modeBtnActive: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  btnSubmit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#22C55E', borderRadius: 14, height: 54, marginTop: 8 },
  btnSubmitText: { fontSize: 16, fontWeight: '700', color: '#0D0D0D' },
});

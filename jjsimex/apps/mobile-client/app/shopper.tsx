import { useState, useContext } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { createShopperRequest } from '@jjsimex/supabase/shopper';
import { AuthContext } from '@/contexts/AuthContext';

const SITES = ['Amazon', 'Shein', 'Nike', 'Adidas', 'eBay', 'Walmart', 'Autre'];
const DESTINATIONS = [
  'Port-au-Prince', 'Cap-Haïtien', 'Pétion-Ville', 'Les Cayes', 'Gonaïves', 'Jacmel',
  'Santo Domingo', 'Santiago', 'Punta Cana',
];

type Mode = 'avion' | 'bateau';

const CITY_TO_COUNTRY: Record<string, 'haiti' | 'dr'> = {
  'Port-au-Prince': 'haiti',
  'Cap-Haïtien': 'haiti',
  'Pétion-Ville': 'haiti',
  'Les Cayes': 'haiti',
  'Gonaïves': 'haiti',
  'Jacmel': 'haiti',
  'Santo Domingo': 'dr',
  'Santiago': 'dr',
  'Punta Cana': 'dr',
};

export default function PersonalShopperScreen() {
  const router = useRouter();
  const authContext = useContext(AuthContext);
  const [lien, setLien] = useState('');
  const [site, setSite] = useState('Amazon');
  const [qty, setQty] = useState(1);
  const [variante, setVariante] = useState('');
  const [destination, setDestination] = useState('Port-au-Prince');
  const [mode, setMode] = useState<Mode>('avion');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!lien) { Alert.alert('Champ requis', 'Veuillez entrer le lien du produit.'); return; }
    if (!authContext?.user) { Alert.alert('Erreur', 'Veuillez vous connecter pour soumettre une demande.'); return; }

    setLoading(true);
    try {
      await createShopperRequest({
        product_url: lien,
        merchant: site,
        quantity: qty,
        variant: variante || undefined,
        destination_city: destination,
        destination_country: CITY_TO_COUNTRY[destination],
        transport_mode: mode === 'avion' ? 'air' : 'sea',
        notes: notes || undefined,
      }, authContext.user.id);

      setLoading(false);
      Alert.alert('Demande envoyée !', 'Nos experts analyseront votre demande et vous enverront un devis sous 2h.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      setLoading(false);
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Erreur lors de l\'envoi de la demande.');
    }
  }

  const modeBtn = (m: Mode, label: string, sub: string) => ({
    style: {
      flex: 1, borderWidth: 1.5, borderRadius: 12, padding: 14,
      backgroundColor: mode === m ? 'rgba(34,197,94,0.12)' : '#1A1A1A',
      borderColor: mode === m ? '#22C55E' : '#2A2A2A',
    } as const,
    textColor: mode === m ? '#22C55E' : '#9CA3AF',
  });

  return (
    <KeyboardAvoidingView style={S.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity style={S.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Text style={{ color: '#FFFFFF', fontSize: 20 }}>←</Text>
        </TouchableOpacity>
        <Text style={S.headerTitle}>Personal Shopper</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 22, paddingBottom: 40 }}>
        {/* Bannière */}
        <View style={S.banner}>
          <Text style={S.bannerTitle}>Pas de carte internationale ?</Text>
          <Text style={S.bannerSub}>Envoyez-nous le lien du produit, nous achetons pour vous et livrons à votre porte.</Text>
        </View>

        <Text style={S.formTitle}>Nouvelle demande</Text>

        {/* Lien */}
        <Text style={S.label}>Lien du produit</Text>
        <TextInput
          style={S.input} value={lien} onChangeText={setLien}
          placeholder="https://amazon.com/..." placeholderTextColor="#5B6470"
          autoCapitalize="none" keyboardType="url"
        />

        {/* Site */}
        <Text style={S.label}>Site marchand</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {SITES.map(s => (
              <TouchableOpacity key={s} onPress={() => setSite(s)} activeOpacity={0.8}
                style={{ height: 36, borderRadius: 99, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: site === s ? '#22C55E' : '#1A1A1A', borderWidth: 1, borderColor: site === s ? '#22C55E' : '#2A2A2A' }}>
                <Text style={{ color: site === s ? '#0D0D0D' : '#9CA3AF', fontSize: 13, fontWeight: '600' }}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Quantité */}
        <Text style={S.label}>Quantité</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 50, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 8, paddingHorizontal: 8, marginBottom: 18 }}>
          <TouchableOpacity onPress={() => setQty(q => Math.max(1, q - 1))} activeOpacity={0.7}
            style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#242424', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#FFFFFF', fontSize: 20 }}>−</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>{qty}</Text>
          <TouchableOpacity onPress={() => setQty(q => q + 1)} activeOpacity={0.7}
            style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#242424', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#FFFFFF', fontSize: 20 }}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Variante */}
        <Text style={S.label}>Variante du produit</Text>
        <TextInput
          style={S.input} value={variante} onChangeText={setVariante}
          placeholder="Taille, couleur, modèle..." placeholderTextColor="#5B6470"
        />

        {/* Destination */}
        <Text style={S.label}>Destination</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {DESTINATIONS.map(d => (
              <TouchableOpacity key={d} onPress={() => setDestination(d)} activeOpacity={0.8}
                style={{ height: 36, borderRadius: 99, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: destination === d ? '#22C55E' : '#1A1A1A', borderWidth: 1, borderColor: destination === d ? '#22C55E' : '#2A2A2A' }}>
                <Text style={{ color: destination === d ? '#0D0D0D' : '#9CA3AF', fontSize: 13, fontWeight: '600' }}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Mode transport */}
        <Text style={S.label}>Mode de transport</Text>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 18 }}>
          {([['avion', '✈️ Avion', '5-7 jours'], ['bateau', '🚢 Bateau', '3-4 semaines']] as [Mode, string, string][]).map(([m, label, sub]) => (
            <TouchableOpacity key={m} onPress={() => setMode(m)} activeOpacity={0.8}
              style={[{ flex: 1, borderWidth: 1.5, borderRadius: 12, padding: 14 }, mode === m ? { backgroundColor: 'rgba(34,197,94,0.12)', borderColor: '#22C55E' } : { backgroundColor: '#1A1A1A', borderColor: '#2A2A2A' }]}>
              <Text style={{ fontWeight: '700', fontSize: 15, color: mode === m ? '#22C55E' : '#FFFFFF' }}>{label}</Text>
              <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4, opacity: 0.8 }}>{sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Notes */}
        <Text style={S.label}>Notes / Instructions (optionnel)</Text>
        <TextInput
          style={[S.input, { height: 90, textAlignVertical: 'top', paddingTop: 12 }]}
          value={notes} onChangeText={setNotes} multiline
          placeholder="Instructions spéciales, couleur exacte..." placeholderTextColor="#5B6470"
        />

        {/* Estimation */}
        <View style={S.estimationCard}>
          <Text style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>Frais de service</Text>
          <Text style={{ fontSize: 28, fontWeight: '800', color: '#22C55E', textAlign: 'center', marginTop: 4 }}>10%</Text>
          <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginTop: 4 }}>du prix du produit + expédition</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <View style={{ flex: 1, backgroundColor: '#2A2A2A', borderRadius: 10, padding: 10, alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>✈️ {mode === 'avion' ? '5-7 jours' : '3-4 semaines'}</Text>
              <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>Livraison estimée</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#2A2A2A', borderRadius: 10, padding: 10, alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>📦 {qty}x</Text>
              <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>Quantité</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity onPress={handleSubmit} disabled={loading} activeOpacity={0.9}
          style={{ height: 54, backgroundColor: '#22C55E', borderRadius: 12, alignItems: 'center', justifyContent: 'center', opacity: loading ? 0.7 : 1 }}>
          <Text style={{ color: '#0D0D0D', fontWeight: '700', fontSize: 16 }}>
            {loading ? 'Envoi en cours...' : 'Envoyer la demande'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  header: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: '#1A1A1A', backgroundColor: '#0D0D0D' },
  backBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  banner: { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#1F1F1F', borderLeftWidth: 4, borderLeftColor: '#22C55E', borderRadius: 12, padding: 16, marginBottom: 26 },
  bannerTitle: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', marginBottom: 6 },
  bannerSub: { fontSize: 13, lineHeight: 20, color: '#9CA3AF' },
  formTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 22 },
  label: { fontSize: 13, fontWeight: '500', color: '#9CA3AF', marginBottom: 8 },
  input: { width: '100%', height: 50, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 8, color: '#FFFFFF', paddingHorizontal: 14, fontSize: 15, marginBottom: 18 },
  estimationCard: { backgroundColor: '#1A1A1A', borderWidth: 1.5, borderColor: '#22C55E', borderRadius: 16, padding: 20, marginBottom: 24 },
});

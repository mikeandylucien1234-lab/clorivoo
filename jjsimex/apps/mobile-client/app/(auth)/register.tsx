import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator,
  Modal, FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

const CITIES_HT = ['Port-au-Prince', 'Cap-Haïtien', 'Gonaïves', 'Saint-Marc', 'Pétion-Ville', 'Delmas', 'Jacmel', 'Les Cayes', 'Jérémie'];
const CITIES_RD = ['Santo Domingo', 'Santiago', 'Punta Cana', 'La Romana', 'San Pedro de Macorís', 'Puerto Plata'];

const US_AREA_CODES = [
  '201','202','212','213','305','312','347','404','407','415','469','502','503','504','505','510','512','516','561','571',
  '602','617','619','646','678','702','713','718','720','727','732','737','754','757','770','773','786','801','802','803',
  '804','808','813','818','832','845','847','848','850','856','857','858','860','862','863','901','903','904','908','909',
  '910','912','913','914','915','917','918','919','920','925','929','931','936','937','940','941','949','951','954','956',
  '959','970','971','972','973','978','979','980',
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [dest, setDest] = useState<'HT' | 'DO'>('HT');
  const [city, setCity] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const [areaCode, setAreaCode] = useState('305');
  const [showAreaCodeModal, setShowAreaCodeModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);

  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const cities = dest === 'HT' ? CITIES_HT : CITIES_RD;

  const markTouched = (field: string) => setTouched(prev => ({ ...prev, [field]: true }));

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = 'Le prénom est requis.';
    if (!lastName.trim()) e.lastName = 'Le nom est requis.';
    if (!EMAIL_REGEX.test(email)) e.email = 'Email invalide.';
    if (phone.replace(/\D/g, '').length < 7) e.phone = 'Numéro incomplet (7 chiffres requis).';
    if (password.length < 8) e.password = '8 caractères minimum.';
    if (!city) e.city = 'Veuillez sélectionner une ville.';
    return e;
  }, [firstName, lastName, email, phone, password, city]);

  const isValid = Object.keys(errors).length === 0;

  async function handleRegister() {
    if (!isValid) {
      setTouched({ firstName: true, lastName: true, email: true, phone: true, password: true, city: true });
      setError('Veuillez corriger les erreurs ci-dessous.');
      return;
    }
    setError(''); setLoading(true);
    try {
      const fullPhone = `+1 (${areaCode}) ${phone}`;
      const { error: err } = await signUp({ email, password, firstName, lastName, whatsapp: fullPhone, destinationCountry: dest === 'HT' ? 'haiti' : 'dr', destinationCity: city || cities[0] });
      if (err) { setError(err); return; }
      router.replace('/(tabs-client)/');
    } finally {
      setLoading(false);
    }
  }

  const renderFieldError = (field: string) => {
    if (!touched[field] || !errors[field]) return null;
    return <Text style={styles.fieldError}>{errors[field]}</Text>;
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={{ flex: 1, backgroundColor: '#0D0D0D' }} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ color: '#22C55E', fontSize: 24 }}>←</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Créer mon compte</Text>
        <Text style={styles.subtitle}>Rejoignez JJ's IMEX et recevez votre adresse US gratuite</Text>

        <View style={styles.form}>
          {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Prénom *</Text>
              <TextInput style={styles.input} placeholder="Jean" placeholderTextColor="#6B7280" value={firstName} onChangeText={setFirstName} onBlur={() => markTouched('firstName')} autoCapitalize="words" />
              {renderFieldError('firstName')}
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Nom *</Text>
              <TextInput style={styles.input} placeholder="Paul" placeholderTextColor="#6B7280" value={lastName} onChangeText={setLastName} onBlur={() => markTouched('lastName')} autoCapitalize="words" />
              {renderFieldError('lastName')}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email *</Text>
            <TextInput style={styles.input} placeholder="votre@email.com" placeholderTextColor="#6B7280" value={email} onChangeText={setEmail} onBlur={() => markTouched('email')} keyboardType="email-address" autoCapitalize="none" />
            {renderFieldError('email')}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Téléphone WhatsApp</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={() => setShowAreaCodeModal(true)} style={styles.areaCodeBtn} activeOpacity={0.7}>
                <Text style={styles.areaCodeText}>+1 ({areaCode})</Text>
                <Text style={{ color: '#9CA3AF', fontSize: 10 }}>▼</Text>
              </TouchableOpacity>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="XXXXXXX"
                placeholderTextColor="#6B7280"
                value={phone}
                onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 7))}
                onBlur={() => markTouched('phone')}
                keyboardType="phone-pad"
                maxLength={7}
              />
            </View>
            {renderFieldError('phone')}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Mot de passe *</Text>
            <View style={{ position: 'relative' }}>
              <TextInput style={styles.input} placeholder="8 caractères minimum" placeholderTextColor="#6B7280" value={password} onChangeText={setPassword} onBlur={() => markTouched('password')} secureTextEntry={!showPw} />
              <TouchableOpacity onPress={() => setShowPw(s => !s)} style={styles.eyeBtn}>
                <Text style={{ fontSize: 18 }}>{showPw ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
            {renderFieldError('password')}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Destination</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['HT', 'DO'] as const).map(d => (
                <TouchableOpacity
                  key={d}
                  onPress={() => { setDest(d); setCity(''); }}
                  style={{ flex: 1, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: dest === d ? '#22C55E' : '#1A1A1A', borderWidth: 1, borderColor: dest === d ? '#22C55E' : '#2A2A2A' }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: dest === d ? '#0D0D0D' : '#9CA3AF' }}>{d === 'HT' ? '🇭🇹 Haïti' : '🇩🇴 Rép. Dom.'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Ville de retrait</Text>
            <TouchableOpacity onPress={() => { setShowCityModal(true); markTouched('city'); }} style={styles.dropdownBtn} activeOpacity={0.7}>
              <Text style={{ fontSize: 15, color: city ? '#FFFFFF' : '#6B7280' }}>{city || 'Sélectionner une ville'}</Text>
              <Text style={{ color: '#9CA3AF', fontSize: 10 }}>▼</Text>
            </TouchableOpacity>
            {renderFieldError('city')}
          </View>

          <TouchableOpacity onPress={handleRegister} disabled={loading || !isValid} style={[styles.btnPrimary, (loading || !isValid) && { opacity: 0.4 }]} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color="#0D0D0D" /> : <Text style={styles.btnPrimaryText}>Créer mon compte</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Déjà un compte ? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.footerLink}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Area Code Modal */}
      <Modal visible={showAreaCodeModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Indicatif régional</Text>
              <TouchableOpacity onPress={() => setShowAreaCodeModal(false)}>
                <Text style={{ color: '#22C55E', fontSize: 16, fontWeight: '700' }}>Fermer</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={US_AREA_CODES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => { setAreaCode(item); setShowAreaCodeModal(false); }}
                  style={[styles.modalItem, areaCode === item && { backgroundColor: '#22C55E' }]}
                >
                  <Text style={{ fontSize: 15, color: areaCode === item ? '#0D0D0D' : '#FFFFFF', fontWeight: areaCode === item ? '700' : '400' }}>+1 ({item})</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* City Modal */}
      <Modal visible={showCityModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ville de retrait</Text>
              <TouchableOpacity onPress={() => setShowCityModal(false)}>
                <Text style={{ color: '#22C55E', fontSize: 16, fontWeight: '700' }}>Fermer</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={cities}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => { setCity(item); setShowCityModal(false); }}
                  style={[styles.modalItem, city === item && { backgroundColor: '#22C55E' }]}
                >
                  <Text style={{ fontSize: 15, color: city === item ? '#0D0D0D' : '#FFFFFF', fontWeight: city === item ? '700' : '400' }}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 28, gap: 20 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: '#FFFFFF' },
  subtitle: { fontSize: 14, color: '#9CA3AF', lineHeight: 20 },
  form: { gap: 14 },
  errorBox: { backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: '#EF4444', borderRadius: 10, padding: 12 },
  errorText: { color: '#EF4444', fontSize: 13 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  input: { height: 50, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 12, color: '#FFFFFF', paddingHorizontal: 16, fontSize: 15 },
  eyeBtn: { position: 'absolute', right: 14, top: 0, height: 50, justifyContent: 'center' },
  fieldError: { fontSize: 12, color: '#EF4444', marginTop: 2 },
  areaCodeBtn: { height: 50, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  areaCodeText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  dropdownBtn: { height: 50, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  btnPrimary: { height: 52, backgroundColor: '#22C55E', borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  btnPrimaryText: { fontSize: 15, fontWeight: '700', color: '#0D0D0D' },
  footer: { flexDirection: 'row', justifyContent: 'center', paddingBottom: 20 },
  footerText: { fontSize: 14, color: '#9CA3AF' },
  footerLink: { fontSize: 14, fontWeight: '700', color: '#22C55E' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1A1A1A', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%', paddingBottom: Platform.OS === 'ios' ? 34 : 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#2A2A2A' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  modalItem: { paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#2A2A2A' },
});

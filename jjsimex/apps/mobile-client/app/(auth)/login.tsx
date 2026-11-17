import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (!email || !password) { setError('Veuillez remplir tous les champs.'); return; }
    setError(''); setLoading(true);
    try {
      const { error: err, role } = await signIn(email, password);
      if (err) { setError(err); return; }
      const isAdmin = role === 'admin' || role === 'super_admin' || role === 'employee';
      router.replace(isAdmin ? '/(tabs-admin)/' : '/(tabs-client)/');
    } finally {
      setLoading(false);
    }
  }

  function handleSocial(provider: string) {
    Alert.alert(
      'Bientôt disponible',
      `La connexion via ${provider} sera disponible dans une prochaine mise à jour.`,
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={{ flex: 1, backgroundColor: '#0D0D0D' }} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.logoBlock}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={[styles.logoText, { color: '#FFFFFF' }]}>JJ</Text>
            <Text style={[styles.logoText, { color: '#22C55E' }]}>'s</Text>
            <Text style={[styles.logoText, { color: '#FFFFFF' }]}> IMEX</Text>
          </View>
          <Text style={styles.tagline}>Bon retour 👋</Text>
          <Text style={styles.taglineSub}>Connectez-vous pour gérer vos colis</Text>
        </View>

        <View style={styles.form}>
          {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="votre@email.com"
              placeholderTextColor="#6B7280"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={styles.field}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.label}>Mot de passe</Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
                <Text style={styles.forgot}>Mot de passe oublié ?</Text>
              </TouchableOpacity>
            </View>
            <View style={{ position: 'relative' }}>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#6B7280"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
                autoComplete="password"
              />
              <TouchableOpacity onPress={() => setShowPw(s => !s)} style={styles.eyeBtn}>
                <Text style={{ fontSize: 18 }}>{showPw ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity onPress={handleLogin} disabled={loading} style={[styles.btnPrimary, loading && { opacity: 0.6 }]} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color="#0D0D0D" /> : <Text style={styles.btnPrimaryText}>Se connecter</Text>}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou continuer avec</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity style={[styles.btnSocial, { flex: 1 }]} activeOpacity={0.8} onPress={() => handleSocial('Google')}>
              <Text style={styles.btnSocialText}>G  Google</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnSocial, { flex: 1 }]} activeOpacity={0.8} onPress={() => handleSocial('Facebook')}>
              <Text style={styles.btnSocialText}>f  Facebook</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Pas encore de compte ? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.footerLink}>Créer un compte</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 28, justifyContent: 'center', gap: 32 },
  logoBlock: { alignItems: 'center', gap: 8 },
  logoText: { fontSize: 36, fontWeight: '800', letterSpacing: -1 },
  tagline: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginTop: 12 },
  taglineSub: { fontSize: 14, color: '#9CA3AF' },
  form: { gap: 16 },
  errorBox: { backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: '#EF4444', borderRadius: 10, padding: 12 },
  errorText: { color: '#EF4444', fontSize: 13 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  input: { height: 50, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 12, color: '#FFFFFF', paddingHorizontal: 16, fontSize: 15 },
  eyeBtn: { position: 'absolute', right: 14, top: 0, height: 50, justifyContent: 'center' },
  forgot: { fontSize: 13, color: '#22C55E', fontWeight: '600' },
  btnPrimary: { height: 52, backgroundColor: '#22C55E', borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  btnPrimaryText: { fontSize: 15, fontWeight: '700', color: '#0D0D0D' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#2A2A2A' },
  dividerText: { fontSize: 12, color: '#6B7280' },
  btnSocial: { height: 48, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnSocialText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  footer: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { fontSize: 14, color: '#9CA3AF' },
  footerLink: { fontSize: 14, fontWeight: '700', color: '#22C55E' },
});

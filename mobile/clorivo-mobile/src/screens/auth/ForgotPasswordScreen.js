import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { COLORS, RADIUS } from '../../lib/tokens';
import { Btn, Input } from '../../components/UI';
import { resetPasswordForEmail } from '../../lib/supabase';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSend() {
    setError('');
    const trimmed = email.trim();
    if (!trimmed) { setError('Entrez votre adresse email.'); return; }
    if (!/\S+@\S+\.\S+/.test(trimmed)) { setError('Adresse email invalide.'); return; }
    setLoading(true);
    try {
      const { error: resetErr } = await resetPasswordForEmail(trimmed);
      if (resetErr) throw resetErr;
      setSent(true);
    } catch (e) {
      setError(e.message?.includes('rate') ? 'Trop de tentatives. Attendez quelques minutes.' : (e.message ?? 'Une erreur est survenue.'));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <Text style={{ fontSize: 40 }}>📬</Text>
        </View>
        <Text style={{ fontSize: 24, fontWeight: '800', color: COLORS.ink, marginBottom: 10, textAlign: 'center' }}>
          Email envoyé !
        </Text>
        <Text style={{ fontSize: 15, color: COLORS.mute, textAlign: 'center', lineHeight: 24, marginBottom: 32 }}>
          Un lien de réinitialisation a été envoyé à{'\n'}
          <Text style={{ fontWeight: '700', color: COLORS.ink }}>{email.trim()}</Text>
          {'\n\n'}
          Vérifiez vos spams si vous ne le trouvez pas. Le lien expire dans 1 heure.
        </Text>
        <TouchableOpacity onPress={() => navigation.replace('Login')}
          style={{ backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 14, paddingHorizontal: 32 }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Retour à la connexion</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setSent(false)} style={{ marginTop: 16 }}>
          <Text style={{ color: COLORS.mute, fontSize: 13 }}>Mauvais email ? Modifier</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: COLORS.white }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 60 }} keyboardShouldPersistTaps="handled">

        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 32 }}>
          <Text style={{ fontSize: 22, color: COLORS.mute }}>←</Text>
        </TouchableOpacity>

        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 36 }}>🔐</Text>
          </View>
          <Text style={{ fontSize: 26, fontWeight: '800', color: COLORS.ink, letterSpacing: -0.5, marginBottom: 8 }}>
            Mot de passe oublié ?
          </Text>
          <Text style={{ fontSize: 15, color: COLORS.mute, textAlign: 'center', lineHeight: 22 }}>
            Entrez votre email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
          </Text>
        </View>

        {error ? (
          <View style={{ backgroundColor: '#FEF2F2', borderRadius: RADIUS.md, padding: 14, marginBottom: 16, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Text style={{ fontSize: 16 }}>⚠️</Text>
            <Text style={{ flex: 1, color: '#B91C1C', fontSize: 14, fontWeight: '500' }}>{error}</Text>
          </View>
        ) : null}

        <Input
          label="Adresse email"
          value={email}
          onChangeText={v => { setEmail(v); setError(''); }}
          placeholder="vous@mail.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <View style={{ marginTop: 24 }}>
          <TouchableOpacity
            onPress={handleSend}
            disabled={loading}
            style={{ backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 16, alignItems: 'center', opacity: loading ? 0.75 : 1 }}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Envoyer le lien</Text>}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20, alignItems: 'center' }}>
          <Text style={{ fontSize: 14, color: COLORS.mute }}>
            Vous vous souvenez ?{' '}
            <Text style={{ color: COLORS.primary, fontWeight: '700' }}>Se connecter</Text>
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

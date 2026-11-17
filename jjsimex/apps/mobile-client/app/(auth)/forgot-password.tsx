import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function ForgotPasswordScreen() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReset() {
    if (!email) {
      setError('Entrez votre adresse email.');
      return;
    }
    setLoading(true);
    setError(null);
    const { error: err } = await resetPassword(email);
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      setSent(true);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#0D0D0D]"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 p-6 justify-center">
        {/* Header */}
        <View className="items-center mb-10">
          <Text className="text-3xl font-bold text-white">
            JJ&apos;s <Text className="text-[#22C55E]">IMEX</Text>
          </Text>
        </View>

        <View className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
          <Text className="text-xl font-semibold text-white mb-2">Mot de passe oublié</Text>
          <Text className="text-[#9CA3AF] text-sm mb-6">
            Entrez votre email pour recevoir un lien de réinitialisation.
          </Text>

          {sent ? (
            <View className="items-center py-4">
              <View className="w-12 h-12 bg-green-500/10 rounded-full items-center justify-center mb-3">
                <Text className="text-green-400 text-xl">✓</Text>
              </View>
              <Text className="text-white font-semibold text-center">Email envoyé !</Text>
              <Text className="text-[#9CA3AF] text-sm text-center mt-2">
                Vérifiez votre boîte de réception.
              </Text>
            </View>
          ) : (
            <>
              {error && (
                <View className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-5">
                  <Text className="text-red-400 text-sm">{error}</Text>
                </View>
              )}
              <View className="mb-5">
                <Text className="text-[#9CA3AF] text-sm mb-1.5">Adresse email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="votre@email.com"
                  placeholderTextColor="#4B5563"
                  className="bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-3 text-white text-sm"
                />
              </View>
              <TouchableOpacity
                onPress={handleReset}
                disabled={loading}
                className="bg-[#22C55E] rounded-xl py-3.5 items-center"
                style={{ opacity: loading ? 0.7 : 1 }}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-semibold text-sm">Envoyer le lien</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        <TouchableOpacity onPress={() => router.back()} className="items-center mt-6">
          <Text className="text-[#9CA3AF] text-sm">← Retour à la connexion</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

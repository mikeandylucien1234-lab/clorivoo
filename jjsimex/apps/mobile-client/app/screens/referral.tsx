import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Share, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function ReferralScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('users')
      .select('referral_code')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setReferralCode(data?.referral_code ?? null);
        setLoading(false);
      });
  }, [user?.id]);

  function handleShare() {
    Share.share({
      message: `Rejoins JJ's IMEX pour expédier tes colis des USA ! Utilise mon code de parrainage : ${referralCode ?? '---'}\n\nTélécharge l'app : https://play.google.com/store/apps/details?id=com.jjsimex.client`,
    });
  }

  return (
    <View style={S.container}>
      <View style={S.header}>
        <TouchableOpacity style={S.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Text style={{ color: '#FFFFFF', fontSize: 20 }}>&#8592;</Text>
        </TouchableOpacity>
        <Text style={S.headerTitle}>Parrainage</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 40, alignItems: 'center' }}>
        <View style={S.card}>
          <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: 12 }}>🎁</Text>
          <Text style={S.title}>Invitez vos amis</Text>
          <Text style={S.subtitle}>
            Partagez votre code de parrainage et gagnez des points pour chaque ami qui s'inscrit et envoie son premier colis.
          </Text>

          {loading ? (
            <ActivityIndicator color="#22C55E" style={{ marginTop: 24 }} />
          ) : (
            <>
              <Text style={S.codeLabel}>Votre code de parrainage</Text>
              <View style={S.codeBox}>
                <Text style={S.codeText}>{referralCode ?? 'Non disponible'}</Text>
              </View>
            </>
          )}

          <TouchableOpacity onPress={handleShare} activeOpacity={0.85} style={S.shareBtn}>
            <Text style={{ color: '#0D0D0D', fontSize: 15, fontWeight: '700' }}>Partager mon code</Text>
          </TouchableOpacity>
        </View>

        <View style={S.infoCard}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginBottom: 12 }}>Comment ça marche ?</Text>
          {[
            ['1.', 'Partagez votre code avec un ami'],
            ['2.', 'Votre ami s\'inscrit avec votre code'],
            ['3.', 'Vous gagnez tous les deux des points bonus'],
          ].map(([num, text]) => (
            <View key={num} style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <Text style={{ color: '#22C55E', fontWeight: '700', fontSize: 14 }}>{num}</Text>
              <Text style={{ color: '#9CA3AF', fontSize: 13, flex: 1 }}>{text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  header: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  backBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  card: { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 20, padding: 24, width: '100%', alignItems: 'center', marginBottom: 18 },
  title: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 13, lineHeight: 20, color: '#9CA3AF', textAlign: 'center' },
  codeLabel: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', marginTop: 24, marginBottom: 8 },
  codeBox: { backgroundColor: '#0D0D0D', borderWidth: 2, borderColor: '#22C55E', borderRadius: 12, paddingHorizontal: 28, paddingVertical: 14, borderStyle: 'dashed' },
  codeText: { fontSize: 22, fontWeight: '800', color: '#22C55E', letterSpacing: 2 },
  shareBtn: { height: 50, backgroundColor: '#22C55E', borderRadius: 12, alignItems: 'center', justifyContent: 'center', width: '100%', marginTop: 24 },
  infoCard: { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 12, padding: 18, width: '100%' },
});

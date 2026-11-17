import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Dimensions, Platform, StatusBar, Linking, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { BackButton } from '@/components/layout/BackButton';
import { MapPin, Send, Lightbulb, MessageCircle } from 'lucide-react-native';
import { getActiveBranches, isBranchOpen, getClosingTime } from '@jjsimex/supabase/branches';

const { width } = Dimensions.get('window');
const ACCENT = '#22C55E';
const statusBarH = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;
const WA_NUMBER = '18097851234';

export default function DropoffScreen() {
  const router = useRouter();
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getActiveBranches().then(data => {
      setBranches(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  function openMaps(address: string) {
    const encoded = encodeURIComponent(address);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encoded}`);
  }

  function openWhatsApp(branch: any) {
    const msg = encodeURIComponent(
      `Bonjour JJ's IMEX,\n\nJe souhaite déposer un colis au point de dépôt "${branch.name}" (${branch.address}).\n\nPouvez-vous me confirmer les horaires d'ouverture et les instructions de dépôt ?\n\nMerci !`
    );
    Linking.openURL(`https://wa.me/${WA_NUMBER}?text=${msg}`);
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <BackButton />
        <Text style={s.headerTitle}>Points de dépôt</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Banner */}
        <View style={s.banner}>
          <View style={s.bannerIcon}>
            <MapPin size={26} color="#FFFFFF" strokeWidth={1.9} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.bannerTitle}>Déposez vous-même</Text>
            <Text style={s.bannerSub}>Trouvez le point de dépôt JJ's IMEX le plus proche de chez vous.</Text>
          </View>
        </View>

        {/* Branches list */}
        <View style={{ gap: 12, marginTop: 18 }}>
          {loading ? (
            <ActivityIndicator size="large" color={ACCENT} style={{ marginTop: 24 }} />
          ) : branches.length === 0 ? (
            <Text style={{ color: '#9CA3AF', textAlign: 'center', marginTop: 24, fontSize: 14 }}>
              Aucun point de dépôt disponible.
            </Text>
          ) : branches.map((b, i) => {
            const nearest = i === 0;
            const open = isBranchOpen(b);
            const openLabel = open ? 'Ouvert maintenant' : 'Fermé';
            const hours = getClosingTime(b);
            return (
              <View key={b.id} style={[s.branchCard, nearest && s.branchCardNearest]}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 13 }}>
                  <View style={[s.pinIcon, nearest && s.pinIconNearest]}>
                    <MapPin size={20} color={nearest ? '#0D0D0D' : '#9CA3AF'} strokeWidth={1.9} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={s.branchName}>{b.name}</Text>
                      {nearest && (
                        <View style={s.nearestBadge}>
                          <Text style={s.nearestText}>LE PLUS PROCHE</Text>
                        </View>
                      )}
                    </View>
                    <Text style={s.branchAddr}>{b.address}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 }}>
                      <View style={[s.openBadge, !open && s.closedBadge]}>
                        <Text style={[s.openText, !open && s.closedText]}>{openLabel}</Text>
                      </View>
                      <Text style={s.hoursText}>{hours}</Text>
                    </View>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 13 }}>
                  <TouchableOpacity style={s.routeBtn} onPress={() => openMaps(b.address)} activeOpacity={0.85}>
                    <Send size={15} color={ACCENT} strokeWidth={1.9} />
                    <Text style={s.routeBtnText}>Itinéraire</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.waBtn} onPress={() => openWhatsApp(b)} activeOpacity={0.85}>
                    <MessageCircle size={15} color="#22C55E" strokeWidth={1.9} />
                    <Text style={s.waBtnText}>WhatsApp</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        {/* Tip */}
        <View style={s.tipCard}>
          <Lightbulb size={18} color={ACCENT} strokeWidth={1.8} style={{ marginTop: 1 }} />
          <View style={{ flex: 1 }}>
            <Text style={s.tipTitle}>Astuce</Text>
            <Text style={s.tipText}>
              Apportez votre colis avec le numéro de votre suite US déjà visible sur l'emballage pour un traitement plus rapide.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingTop: statusBarH + 10, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#1A1A1A',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  banner: {
    backgroundColor: ACCENT, borderRadius: 16, padding: 18,
    flexDirection: 'row', alignItems: 'center', gap: 15,
  },
  bannerIcon: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  bannerTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', lineHeight: 20 },
  bannerSub: { fontSize: 12.5, color: 'rgba(255,255,255,0.88)', marginTop: 4, lineHeight: 18 },

  branchCard: {
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#1F1F1F',
    borderRadius: 16, padding: 14,
  },
  branchCardNearest: { borderColor: 'rgba(34,197,94,0.4)' },

  pinIcon: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: '#2A2A2A',
    alignItems: 'center', justifyContent: 'center',
  },
  pinIconNearest: { backgroundColor: ACCENT },

  branchName: { fontSize: 14.5, fontWeight: '700', color: '#FFFFFF' },
  branchAddr: { fontSize: 12, color: '#9CA3AF', marginTop: 4, lineHeight: 18 },

  nearestBadge: {
    backgroundColor: 'rgba(34,197,94,0.14)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99,
  },
  nearestText: { fontSize: 9.5, fontWeight: '700', color: ACCENT, letterSpacing: 0.3 },

  openBadge: {
    backgroundColor: 'rgba(34,197,94,0.14)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99,
  },
  closedBadge: { backgroundColor: '#2A2A2A' },
  openText: { fontSize: 11, fontWeight: '700', color: '#22C55E' },
  closedText: { color: '#9CA3AF' },
  hoursText: { fontSize: 11.5, color: '#6B7280' },

  routeBtn: {
    flex: 1, height: 42, backgroundColor: '#2A2A2A', borderRadius: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  routeBtnText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },

  waBtn: {
    flex: 1, height: 42, backgroundColor: 'rgba(34,197,94,0.12)', borderRadius: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  waBtnText: { fontSize: 13, fontWeight: '600', color: '#22C55E' },

  tipCard: {
    marginTop: 18, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#1F1F1F',
    borderLeftWidth: 3, borderLeftColor: ACCENT, borderRadius: 12,
    padding: 14, paddingHorizontal: 16, flexDirection: 'row', gap: 12,
  },
  tipTitle: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  tipText: { fontSize: 12.5, color: '#9CA3AF', marginTop: 4, lineHeight: 19 },
});

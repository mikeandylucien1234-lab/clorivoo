import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, StyleSheet, Linking, SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { getPackageDetail } from '@jjsimex/supabase/packages';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { BackButton } from '@/components/layout/BackButton';

const TIMELINE_STEPS = [
  { key: 'received_usa', label: 'Reçu à Miami', sub: 'Entrepôt Miami, FL' },
  { key: 'in_transit', label: 'En transit', sub: 'Acheminement en cours' },
  { key: 'arrived', label: 'Arrivé à destination', sub: 'En attente de dédouanement' },
  { key: 'ready_pickup', label: 'Prêt au retrait', sub: 'Disponible en succursale' },
  { key: 'delivered', label: 'Livré', sub: 'Retrait effectué' },
];

const STATUS_ORDER = ['pending', 'received_usa', 'in_transit', 'arrived', 'ready_pickup', 'delivered'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PkgDetail = any;

export default function ColisDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const router = useRouter();
  const [pkg, setPkg] = useState<PkgDetail>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session?.user.id || !id) return;
    getPackageDetail(id, session.user.id)
      .then(setPkg)
      .catch((e: Error) => setError(e.message ?? 'Erreur lors du chargement.'))
      .finally(() => setLoading(false));
  }, [id, session?.user.id]);

  const statusIdx = pkg ? STATUS_ORDER.indexOf(pkg.status) : -1;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color="#22C55E" size="large" style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  if (error || !pkg) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ padding: 24 }}>
          <BackButton />
          <Text style={{ color: '#EF4444', fontSize: 15, marginTop: 40, textAlign: 'center' }}>{error || 'Colis introuvable.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const whatsappUrl = `https://wa.me/13056009364?text=Bonjour, j'ai une question sur mon colis ${pkg.tracking_number}`;

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>{pkg.tracking_number}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* HERO CARD */}
        <View style={styles.heroCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <View>
              <Text style={styles.heroLabel}>Numéro de suivi</Text>
              <Text style={styles.heroTracking}>{pkg.tracking_number}</Text>
            </View>
            <StatusBadge status={pkg.status} size="md" />
          </View>

          {/* Route */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Origine</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginTop: 2 }}>Miami, FL</Text>
            </View>
            <View style={{ flex: 1, height: 1, borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }} />
            <Text style={{ fontSize: 18 }}>{pkg.transport_mode === 'air' ? '✈️' : '🚢'}</Text>
            <View style={{ flex: 1, height: 1, borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }} />
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Destination</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginTop: 2 }}>{pkg.destination_city ?? '—'}</Text>
            </View>
          </View>

          {/* Meta row */}
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <View style={styles.metaPill}>
              <Text style={styles.metaValue}>{pkg.weight_billed ? `${pkg.weight_billed} lbs` : '—'}</Text>
              <Text style={styles.metaLabel}>Poids</Text>
            </View>
            <View style={styles.metaPill}>
              <Text style={styles.metaValue}>{pkg.transport_mode === 'air' ? '✈ Avion' : '🚢 Bateau'}</Text>
              <Text style={styles.metaLabel}>Mode</Text>
            </View>
            {pkg.estimated_delivery && (
              <View style={styles.metaPill}>
                <Text style={styles.metaValue}>{new Date(pkg.estimated_delivery).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</Text>
                <Text style={styles.metaLabel}>Livraison est.</Text>
              </View>
            )}
          </View>
        </View>

        {/* TIMELINE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Suivi du colis</Text>
          <View style={styles.card}>
            {TIMELINE_STEPS.map((step, i) => {
              const done = STATUS_ORDER.indexOf(step.key) <= statusIdx;
              const current = STATUS_ORDER.indexOf(step.key) === statusIdx;
              const historyEntry = pkg.package_status_history?.find((h: PkgDetail) => h.status === step.key);
              return (
                <View key={step.key} style={{ flexDirection: 'row', gap: 14, marginBottom: i < TIMELINE_STEPS.length - 1 ? 0 : 0 }}>
                  {/* Left: dot + line */}
                  <View style={{ alignItems: 'center', width: 20 }}>
                    <View style={[styles.timelineDot, done && styles.timelineDotDone, current && styles.timelineDotCurrent]} />
                    {i < TIMELINE_STEPS.length - 1 && (
                      <View style={[styles.timelineLine, done && i < statusIdx && styles.timelineLineDone]} />
                    )}
                  </View>
                  {/* Right: content */}
                  <View style={{ flex: 1, paddingBottom: i < TIMELINE_STEPS.length - 1 ? 20 : 0 }}>
                    <Text style={[styles.timelineTitle, done && styles.timelineTitleDone]}>{step.label}</Text>
                    <Text style={styles.timelineSub}>{step.sub}</Text>
                    {historyEntry?.created_at && (
                      <Text style={styles.timelineDate}>{new Date(historyEntry.created_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* INFOS GRID */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Détails</Text>
          <View style={[styles.card, { flexDirection: 'row', flexWrap: 'wrap', gap: 0 }]}>
            {[
              { label: 'Poids réel', value: pkg.weight_real ? `${pkg.weight_real} lbs` : '—' },
              { label: 'Poids facturé', value: pkg.weight_billed ? `${pkg.weight_billed} lbs` : '—' },
              { label: 'Dimensions', value: pkg.dimensions ?? '—' },
              { label: 'Valeur déclarée', value: pkg.declared_value ? `$${pkg.declared_value}` : '—' },
            ].map((item, i) => (
              <View key={i} style={{ width: '50%', paddingVertical: 10, paddingRight: 12, borderBottomWidth: i < 2 ? 1 : 0, borderBottomColor: '#1F1F1F' }}>
                <Text style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>{item.label}</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ASSURANCE */}
        {pkg.insurance_amount > 0 && (
          <View style={[styles.section]}>
            <View style={{ backgroundColor: 'rgba(34,197,94,0.08)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)', flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <Text style={{ fontSize: 20 }}>🛡️</Text>
              <Text style={{ fontSize: 14, color: '#22C55E', fontWeight: '600' }}>Colis assuré jusqu'à ${pkg.insurance_amount}</Text>
            </View>
          </View>
        )}

        {/* ACTIONS */}
        <View style={{ paddingHorizontal: 20, gap: 12, marginTop: 8 }}>
          <TouchableOpacity onPress={() => Linking.openURL(whatsappUrl)} style={styles.btnWhatsApp} activeOpacity={0.85}>
            <Text style={{ fontSize: 18 }}>💬</Text>
            <Text style={styles.btnWhatsAppText}>Contacter via WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnGray} activeOpacity={0.8}>
            <Text style={{ fontSize: 16 }}>⚠️</Text>
            <Text style={styles.btnGrayText}>Signaler un problème</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  heroCard: { margin: 20, backgroundColor: '#22C55E', borderRadius: 20, padding: 20 },
  heroLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.5 },
  heroTracking: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginTop: 2 },
  metaPill: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 10, alignItems: 'center' },
  metaValue: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  metaLabel: { fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', marginBottom: 12 },
  card: { backgroundColor: '#1A1A1A', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#242424' },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#2A2A2A', borderWidth: 2, borderColor: '#3A3A3A' },
  timelineDotDone: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  timelineDotCurrent: { backgroundColor: '#22C55E', borderColor: '#22C55E', width: 14, height: 14, borderRadius: 7 },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#2A2A2A', marginVertical: 2 },
  timelineLineDone: { backgroundColor: '#22C55E' },
  timelineTitle: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  timelineTitleDone: { color: '#FFFFFF' },
  timelineSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  timelineDate: { fontSize: 11, color: '#22C55E', marginTop: 4, fontWeight: '600' },
  btnWhatsApp: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#22C55E', borderRadius: 14, padding: 16, justifyContent: 'center' },
  btnWhatsAppText: { fontSize: 15, fontWeight: '700', color: '#052E14' },
  btnGray: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1A1A1A', borderRadius: 14, padding: 16, justifyContent: 'center', borderWidth: 1, borderColor: '#2A2A2A' },
  btnGrayText: { fontSize: 15, fontWeight: '600', color: '#9CA3AF' },
});

import { useEffect, useState, useContext } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { getMyPayments, subscribeToPayments, type Payment } from '@jjsimex/supabase/payments';
import { AuthContext } from '@/contexts/AuthContext';

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  header: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  backBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  listContainer: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#222', borderRadius: 12, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#22C55E' },
  cardDate: { fontSize: 11, color: '#9CA3AF' },
  cardInfo: { fontSize: 12, color: '#D1D5DB', marginBottom: 6 },
  status: { fontSize: 11, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 8, alignSelf: 'flex-start', fontWeight: '600' },
  statusPending: { backgroundColor: 'rgba(34,197,94,0.12)', color: '#22C55E' },
  statusConfirmed: { backgroundColor: 'rgba(34,197,94,0.12)', color: '#22C55E' },
  statusFailed: { backgroundColor: 'rgba(239,68,68,0.12)', color: '#EF4444' },
  statusRefunded: { backgroundColor: 'rgba(59,130,246,0.12)', color: '#3B82F6' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
});

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    moncash: 'MonCash',
    zelle: 'Zelle',
    wire: 'Virement',
    cash: 'Espèces',
    visa_mc: 'Carte bancaire',
  };
  return labels[method] || method;
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'En attente',
    confirmed: 'Confirmé ✅',
    failed: 'Échoué',
    refunded: 'Remboursé',
  };
  return labels[status] || status;
}

function getStatusStyle(status: string): Record<string, string> {
  const styles: Record<string, Record<string, string>> = {
    pending: { backgroundColor: 'rgba(34,197,94,0.12)', color: '#22C55E' },
    confirmed: { backgroundColor: 'rgba(34,197,94,0.12)', color: '#22C55E' },
    failed: { backgroundColor: 'rgba(239,68,68,0.12)', color: '#EF4444' },
    refunded: { backgroundColor: 'rgba(59,130,246,0.12)', color: '#3B82F6' },
  };
  return styles[status] || styles.pending;
}

export default function PaiementsScreen() {
  const router = useRouter();
  const authContext = useContext(AuthContext);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authContext?.user) {
      router.back();
      return;
    }
    loadPayments();

    const unsubscribe = subscribeToPayments((updatedPayments) => {
      setPayments(updatedPayments.filter(p => p.user_id === authContext.user!.id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    });

    return () => unsubscribe();
  }, [authContext?.user]);

  async function loadPayments() {
    try {
      setLoading(true);
      const data = await getMyPayments(authContext!.user!.id);
      setPayments(data);
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={S.container}>
      <View style={S.header}>
        <TouchableOpacity style={S.backBtn} onPress={() => router.back()}>
          <Text style={{ color: '#FFFFFF', fontSize: 20 }}>←</Text>
        </TouchableOpacity>
        <Text style={S.headerTitle}>Mes paiements</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={S.emptyState}>
          <ActivityIndicator color="#22C55E" size="large" />
        </View>
      ) : payments.length === 0 ? (
        <View style={S.emptyState}>
          <Text style={S.emptyIcon}>💳</Text>
          <Text style={S.emptyText}>Aucun paiement pour le moment</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} style={S.listContainer}>
          {payments.map(payment => {
            const statusStyle = getStatusStyle(payment.status);
            return (
              <View key={payment.id} style={S.card}>
                <View style={S.cardHeader}>
                  <Text style={S.cardTitle}>{payment.transaction_number}</Text>
                  <Text style={S.cardDate}>{formatDate(payment.created_at)}</Text>
                </View>
                <Text style={S.cardInfo}>💰 ${payment.amount.toFixed(2)}</Text>
                <Text style={S.cardInfo}>💳 {getMethodLabel(payment.method)}</Text>
                {payment.package?.tracking_number && (
                  <Text style={S.cardInfo}>📦 {payment.package.tracking_number}</Text>
                )}
                {payment.reference && (
                  <Text style={S.cardInfo}>🔖 {payment.reference}</Text>
                )}
                <Text style={[S.status, { backgroundColor: statusStyle.backgroundColor, color: statusStyle.color }]}>
                  {getStatusLabel(payment.status)}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

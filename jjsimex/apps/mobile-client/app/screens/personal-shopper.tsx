import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Linking, Modal, FlatList,
  Platform, StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { createShopperRequest, getMyShopperRequests } from '@jjsimex/supabase/shopper';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { BackButton } from '@/components/layout/BackButton';
import { useToast } from '@/components/ui/Toast';
import { QRCodeMini } from '@/components/ui/QRCodeDisplay';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Request = any;

const TABS = ['Nouvelle demande', 'En cours', 'Complétées'] as const;
type Tab = (typeof TABS)[number];

const ACTIVE_STATUSES = ['pending', 'quoted', 'purchased', 'shipped'];
const DONE_STATUSES = ['delivered', 'cancelled'];

const MERCHANTS = ['Amazon', 'Walmart', 'Nike', 'Adidas', 'Apple', 'Shein', 'Temu', 'eBay', 'Best Buy', 'Autre'];

const statusBarH = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;

const URL_REGEX = /^https?:\/\/.+\..+/i;

export default function PersonalShopperScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { session, profile } = useAuth();
  const { show, ToastEl } = useToast();

  const [tab, setTab] = useState<Tab>(params.tab === 'history' ? 'En cours' : 'Nouvelle demande');
  const [requests, setRequests] = useState<Request[]>([]);
  const [loadingReqs, setLoadingReqs] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [productUrl, setProductUrl] = useState('');
  const [urlTouched, setUrlTouched] = useState(false);
  const [merchant, setMerchant] = useState('');
  const [customMerchant, setCustomMerchant] = useState('');
  const [merchantModalVisible, setMerchantModalVisible] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [variant, setVariant] = useState('');
  const [transport, setTransport] = useState<'air' | 'sea'>('air');
  const [notes, setNotes] = useState('');

  const isUrlValid = URL_REGEX.test(productUrl.trim());
  const effectiveMerchant = merchant === 'Autre' ? customMerchant : merchant;

  const loadRequests = useCallback(async () => {
    if (!session?.user.id) return;
    try {
      const data = await getMyShopperRequests(session.user.id);
      setRequests(Array.isArray(data) ? data : []);
    } catch {}
    setLoadingReqs(false);
  }, [session?.user.id]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  async function handleSubmit() {
    if (!productUrl.trim() || !effectiveMerchant.trim()) {
      show('Veuillez remplir le lien produit et le marchand', 'error'); return;
    }
    if (!isUrlValid) {
      show('Veuillez entrer un lien valide', 'error'); return;
    }
    if (!session?.user.id) return;
    setSubmitting(true);
    try {
      await createShopperRequest({
        product_url: productUrl.trim(),
        merchant: effectiveMerchant.trim(),
        quantity,
        variant: variant.trim() || undefined,
        transport_mode: transport,
        destination_country: profile?.destination_country ?? 'haiti',
        destination_city: profile?.destination_city ?? '',
        notes: notes.trim() || undefined,
      }, session.user.id);
      show('Demande envoyée ! On vous contactera sous 24h.', 'success');
      setProductUrl(''); setMerchant(''); setCustomMerchant(''); setQuantity(1); setVariant(''); setNotes(''); setUrlTouched(false);
      setTab('En cours');
      loadRequests();
    } catch (e: unknown) {
      show((e instanceof Error ? e.message : 'Erreur lors de l\'envoi'), 'error');
    } finally {
      setSubmitting(false);
    }
  }

  const activeReqs = requests.filter((r: Request) => ACTIVE_STATUSES.includes(r.status));
  const doneReqs = requests.filter((r: Request) => DONE_STATUSES.includes(r.status));

  return (
    <View style={styles.container}>
      {ToastEl}

      {/* Header */}
      <View style={styles.header}>
        <BackButton />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.title}>Personal Shopper</Text>
          <Text style={styles.subtitle}>On achète pour vous aux USA</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {TABS.map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tabBtn, tab === t && styles.tabBtnActive]} activeOpacity={0.8}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'Nouvelle demande' && (
        <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.infoBox}>
            <Text style={{ fontSize: 13, color: '#9CA3AF', lineHeight: 19 }}>
              Envoyez-nous le lien du produit que vous souhaitez et nous l'achèterons pour vous. Délai de réponse : 24h ouvrées.
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Lien du produit *</Text>
            <TextInput
              style={[styles.input, urlTouched && !isUrlValid && productUrl.length > 0 && { borderColor: '#EF4444' }]}
              placeholder="https://amazon.com/dp/..."
              placeholderTextColor="#6B7280"
              value={productUrl}
              onChangeText={setProductUrl}
              onBlur={() => setUrlTouched(true)}
              autoCapitalize="none"
              keyboardType="url"
            />
            {urlTouched && !isUrlValid && productUrl.length > 0 && (
              <Text style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>
                Veuillez entrer un lien valide (ex: https://amazon.com/...)
              </Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Marchand / Site *</Text>
            <TouchableOpacity
              style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
              onPress={() => setMerchantModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 14, color: merchant ? '#FFFFFF' : '#6B7280' }}>
                {merchant || 'Sélectionner un marchand'}
              </Text>
              <Text style={{ fontSize: 14, color: '#9CA3AF' }}>▼</Text>
            </TouchableOpacity>
            {merchant === 'Autre' && (
              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                placeholder="Nom du marchand..."
                placeholderTextColor="#6B7280"
                value={customMerchant}
                onChangeText={setCustomMerchant}
              />
            )}
          </View>

          {/* Merchant Modal */}
          <Modal visible={merchantModalVisible} transparent animationType="fade" onRequestClose={() => setMerchantModalVisible(false)}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMerchantModalVisible(false)}>
              <View style={styles.modalContent}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 16 }}>Sélectionner un marchand</Text>
                <FlatList
                  data={MERCHANTS}
                  keyExtractor={item => item}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.modalItem, merchant === item && { backgroundColor: 'rgba(34,197,94,0.15)' }]}
                      onPress={() => { setMerchant(item); setMerchantModalVisible(false); }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ fontSize: 15, color: merchant === item ? '#22C55E' : '#FFFFFF' }}>{item}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </TouchableOpacity>
          </Modal>

          <View style={styles.field}>
            <Text style={styles.label}>Quantité</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <TouchableOpacity onPress={() => setQuantity(q => Math.max(1, q - 1))} style={styles.qtyBtn} activeOpacity={0.8}>
                <Text style={styles.qtyBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#FFFFFF', minWidth: 30, textAlign: 'center' }}>{quantity}</Text>
              <TouchableOpacity onPress={() => setQuantity(q => q + 1)} style={styles.qtyBtn} activeOpacity={0.8}>
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Variante (taille, couleur...)</Text>
            <TextInput style={styles.input} placeholder="Ex: Taille L, Noir" placeholderTextColor="#6B7280" value={variant} onChangeText={setVariant} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Mode de transport</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {([['air', '✈️ Avion', '5-7 jours'], ['sea', '🚢 Bateau', '3-4 semaines']] as const).map(([mode, label, sub]) => (
                <TouchableOpacity
                  key={mode}
                  onPress={() => setTransport(mode)}
                  style={[styles.transportBtn, transport === mode && styles.transportBtnActive]}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: transport === mode ? '#0D0D0D' : '#FFFFFF' }}>{label}</Text>
                  <Text style={{ fontSize: 11, color: transport === mode ? 'rgba(0,0,0,0.6)' : '#9CA3AF', marginTop: 2 }}>{sub}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Notes supplémentaires</Text>
            <TextInput
              style={[styles.input, { height: 90, paddingTop: 12, textAlignVertical: 'top' }]}
              placeholder="Instructions spéciales, lien alternatif..."
              placeholderTextColor="#6B7280"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
          </View>

          <TouchableOpacity onPress={handleSubmit} disabled={submitting} style={[styles.btnSubmit, submitting && { opacity: 0.6 }]} activeOpacity={0.85}>
            {submitting ? <ActivityIndicator color="#0D0D0D" /> : (
              <>
                <Text style={{ fontSize: 18 }}>🛒</Text>
                <Text style={styles.btnSubmitText}>Envoyer ma demande</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}

      {tab !== 'Nouvelle demande' && (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {loadingReqs && <ActivityIndicator color="#22C55E" style={{ marginTop: 40 }} />}
          {!loadingReqs && (tab === 'En cours' ? activeReqs : doneReqs).length === 0 && (
            <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
              <Text style={{ fontSize: 36 }}>🛒</Text>
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#FFFFFF' }}>Aucune demande</Text>
              <TouchableOpacity onPress={() => setTab('Nouvelle demande')}>
                <Text style={{ color: '#22C55E', fontWeight: '600', fontSize: 14 }}>Faire une demande →</Text>
              </TouchableOpacity>
            </View>
          )}
          {(tab === 'En cours' ? activeReqs : doneReqs).map((req: Request) => (
            <View key={req.id} style={styles.reqCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <View style={{ flex: 1 }}>
                  {req.request_number && <Text style={{ fontSize: 11, color: '#22C55E', fontWeight: '700', marginBottom: 2 }}>{req.request_number}</Text>}
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>{req.merchant}</Text>
                  <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }} numberOfLines={1}>{req.product_url}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <StatusBadge status={req.status} />
                  {req.request_number && (
                    <QRCodeMini type="shopper" referenceNumber={req.request_number} id={req.id} />
                  )}
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Qté: {req.quantity}</Text>
                <Text style={{ fontSize: 12, color: '#9CA3AF' }}>{req.transport_mode === 'air' ? '✈️ Avion' : '🚢 Bateau'}</Text>
                {req.total_price && <Text style={{ fontSize: 12, color: '#22C55E', fontWeight: '600' }}>${req.total_price}</Text>}
              </View>
              {req.status === 'quoted' && (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <TouchableOpacity style={[styles.reqBtn, { backgroundColor: '#22C55E', flex: 1 }]} activeOpacity={0.85}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#052E14' }}>✓ Confirmer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.reqBtn, { backgroundColor: '#1A1A1A', flex: 1, borderWidth: 1, borderColor: '#2A2A2A' }]} activeOpacity={0.8}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#9CA3AF' }}>✕ Annuler</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, paddingTop: statusBarH + 18, paddingBottom: 14 },
  title: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  subtitle: { fontSize: 13, color: '#9CA3AF' },
  tabsRow: { flexDirection: 'row' as const, paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  tabBtn: { flex: 1, paddingHorizontal: 8, paddingVertical: 10, borderRadius: 10, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', alignItems: 'center' as const, justifyContent: 'center' as const },
  tabBtnActive: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  tabText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' as const },
  tabTextActive: { color: '#0D0D0D' },
  formContainer: { padding: 20, paddingBottom: 60, gap: 16 },
  infoBox: { backgroundColor: 'rgba(34,197,94,0.08)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' },
  field: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  input: { height: 50, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 12, color: '#FFFFFF', paddingHorizontal: 16, fontSize: 14 },
  qtyBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 22, color: '#FFFFFF', lineHeight: 26 },
  transportBtn: { flex: 1, backgroundColor: '#1A1A1A', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#2A2A2A' },
  transportBtnActive: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  btnSubmit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#22C55E', borderRadius: 14, height: 54, marginTop: 8 },
  btnSubmitText: { fontSize: 16, fontWeight: '700', color: '#0D0D0D' },
  reqCard: { backgroundColor: '#1A1A1A', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#242424', marginBottom: 12 },
  reqBtn: { height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#1A1A1A', borderRadius: 16, padding: 20, width: '85%', maxHeight: '60%', borderWidth: 1, borderColor: '#2A2A2A' },
  modalItem: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 10 },
});

import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput,
  Dimensions, Platform, StatusBar, KeyboardAvoidingView, Alert, Linking,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { BackButton } from '@/components/layout/BackButton';
import { calculateShipping, getDestinationCities } from '@jjsimex/supabase/shipping';
import { createShipmentRequest } from '@jjsimex/supabase/packages';
import {
  Smartphone, Laptop, Shirt, Footprints, Cpu, Home, Sparkles, MoreHorizontal,
  Plane, Ship, CheckCircle, Copy, ChevronDown, Camera, AlertTriangle, X,
} from 'lucide-react-native';
import { QRCodeDisplay } from '@/components/ui/QRCodeDisplay';
import { Image } from 'react-native';
import { getClient } from '@jjsimex/supabase/client';

const { width } = Dimensions.get('window');
const ACCENT_FALLBACK = '#22C55E';
const statusBarH = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;

const CATEGORIES = [
  { key: 'phone', label: 'Téléphone', Icon: Smartphone },
  { key: 'laptop', label: 'Ordinateur', Icon: Laptop },
  { key: 'clothes', label: 'Vêtements', Icon: Shirt },
  { key: 'shoes', label: 'Chaussures', Icon: Footprints },
  { key: 'electronics', label: 'Électronique', Icon: Cpu },
  { key: 'home', label: 'Maison', Icon: Home },
  { key: 'cosmetics', label: 'Cosmétiques', Icon: Sparkles },
  { key: 'other', label: 'Autre', Icon: MoreHorizontal },
];

type Step = 1 | 2 | 3 | 4 | 5;

export default function CreateShipmentScreen() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();

  const catLabel = (key: string) => { const m: Record<string,string> = { phone: t('cat_phone'), laptop: t('cat_laptop'), clothes: t('cat_clothes'), shoes: t('cat_shoes'), electronics: t('cat_electronics'), home: t('cat_home'), cosmetics: t('cat_cosmetics'), other: t('cat_other') }; return m[key] ?? key; };
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [category, setCategory] = useState('');

  // Step 2
  const [description, setDescription] = useState('');
  const [weightEstimated, setWeightEstimated] = useState('');
  const [declaredValue, setDeclaredValue] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [receiverFirst, setReceiverFirst] = useState('');
  const [receiverLast, setReceiverLast] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [destCountry, setDestCountry] = useState<'haiti' | 'dr'>('haiti');
  const [destCity, setDestCity] = useState('');
  const [destAddress, setDestAddress] = useState('');
  const [cities, setCities] = useState<{ haiti: string[]; dr: string[] }>({ haiti: [], dr: [] });
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [photo1, setPhoto1] = useState<string | null>(null);
  const [photo2, setPhoto2] = useState<string | null>(null);

  // Step 3
  const [transport, setTransport] = useState<'air' | 'sea'>('air');
  const [airPrice, setAirPrice] = useState(0);
  const [seaPrice, setSeaPrice] = useState(0);
  const [airDays, setAirDays] = useState('5 - 7 jours');
  const [seaDays, setSeaDays] = useState('3 - 4 semaines');

  // Step 4 result
  const [requestNumber, setRequestNumber] = useState('');
  const [requestId, setRequestId] = useState('');

  useEffect(() => {
    getDestinationCities().then(setCities).catch(() => {});
  }, []);

  useEffect(() => {
    const cityList = destCountry === 'haiti' ? cities.haiti : cities.dr;
    if (cityList.length > 0 && !cityList.includes(destCity)) {
      setDestCity(cityList[0]);
    }
  }, [destCountry, cities]);

  useEffect(() => {
    if (!destCity || !weightEstimated) return;
    const w = parseFloat(weightEstimated) || 1;
    const country = destCountry === 'haiti' ? 'haiti' : 'dr';
    Promise.all([
      calculateShipping({ destination_city: destCity, destination_country: country, transport_mode: 'air', real_weight_lbs: w, user_id: session?.user?.id }),
      calculateShipping({ destination_city: destCity, destination_country: country, transport_mode: 'sea', real_weight_lbs: w, user_id: session?.user?.id }),
    ]).then(([air, sea]) => {
      setAirPrice(air.final_price);
      setSeaPrice(sea.final_price);
      setAirDays(`${air.estimated_days_min} - ${air.estimated_days_max} jours`);
      setSeaDays(`${Math.round(sea.estimated_days_min / 7)} - ${Math.round(sea.estimated_days_max / 7)} semaines`);
    }).catch(() => {});
  }, [destCity, weightEstimated, destCountry]);

  const selectedPrice = transport === 'air' ? airPrice : seaPrice;
  const insurance = 3;
  const total = selectedPrice + insurance;

  async function pickPhoto(setter: (uri: string | null) => void) {
    try {
      const ImagePicker = require('expo-image-picker');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: true,
      });
      if (!result.canceled && result.assets[0]) {
        setter(result.assets[0].uri);
      }
    } catch {
      Alert.alert(t('not_available'), t('photo_needs_build'));
    }
  }

  async function uploadPhoto(uri: string, index: number): Promise<string | null> {
    try {
      const ext = uri.split('.').pop() ?? 'jpg';
      const fileName = `${session!.user.id}/${Date.now()}_photo${index}.${ext}`;
      const response = await fetch(uri);
      const blob = await response.blob();
      const { error } = await getClient().storage.from('shipment-photos').upload(fileName, blob, { contentType: `image/${ext}` });
      if (error) return null;
      const { data } = getClient().storage.from('shipment-photos').getPublicUrl(fileName);
      return data.publicUrl;
    } catch {
      return null;
    }
  }

  async function handleConfirm() {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      let photo1Url: string | undefined;
      let photo2Url: string | undefined;
      if (photo1) photo1Url = (await uploadPhoto(photo1, 1)) ?? undefined;
      if (photo2) photo2Url = (await uploadPhoto(photo2, 2)) ?? undefined;

      const result = await createShipmentRequest({
        client_id: session.user.id,
        category,
        description,
        weight_estimated: parseFloat(weightEstimated) || 0,
        declared_value: parseFloat(declaredValue) || 0,
        transport_mode: transport,
        destination_country: destCountry,
        destination_city: destCity,
        destination_address: destAddress,
        recipient_first_name: receiverFirst,
        recipient_last_name: receiverLast,
        recipient_phone: receiverPhone,
        quantity,
        client_photo_1_url: photo1Url,
        client_photo_2_url: photo2Url,
      });
      setRequestNumber((result as any).request_number);
      setRequestId((result as any).id);
      setStep(5);
    } catch (e: any) {
      Alert.alert(t('error'), e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleWhatsApp() {
    const categoryLabel = CATEGORIES.find(c => c.key === category)?.label ?? category;
    const msg = encodeURIComponent(
      `Bonjour JJ's IMEX,\n\nNouvelle demande d'envoi :\n` +
      `Réf: ${requestNumber || 'En attente'}\n` +
      `Catégorie: ${categoryLabel}\n` +
      `Description: ${description}\n` +
      `Poids estimé: ${weightEstimated} lbs\n` +
      `Mode: ${transport === 'air' ? 'Avion' : 'Bateau'}\n` +
      `Destination: ${destCity}, ${destCountry === 'haiti' ? 'Haïti' : 'Rép. Dom.'}\n` +
      `Destinataire: ${receiverFirst} ${receiverLast}\n` +
      `Tél: ${receiverPhone}\n` +
      `Total estimé: $${total.toFixed(2)}\n\n` +
      `Merci de confirmer la réception.`
    );
    Linking.openURL(`https://wa.me/18097851234?text=${msg}`);
  }

  function canContinue(): boolean {
    if (step === 1) return category !== '';
    if (step === 2) return description !== '' && weightEstimated !== '' && declaredValue !== '' && receiverFirst !== '' && receiverLast !== '' && receiverPhone !== '' && destCity !== '';
    if (step === 3) return true;
    return true;
  }

  const cityList = destCountry === 'haiti' ? cities.haiti : cities.dr;

  return (
    <View style={[s.container, { backgroundColor: colors.bg }]}>
      <View style={s.header}>
        <BackButton onPress={step > 1 && step < 5 ? () => setStep((step - 1) as Step) : () => router.replace('/(tabs-client)/')} />
        <Text style={[s.headerTitle, { color: colors.text }]}>{t('create_shipment')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {step < 5 && (
        <View style={s.stepper}>
          {[1, 2, 3, 4].map((n) => (
            <React.Fragment key={n}>
              <View style={[s.stepCircle, { borderColor: colors.border }, n <= step && s.stepCircleActive]}>
                <Text style={[s.stepNum, { color: colors.textMuted }, n <= step && s.stepNumActive]}>{n}</Text>
              </View>
              {n < 4 && <View style={[s.stepLine, { backgroundColor: colors.border }, n < step && s.stepLineActive]} />}
            </React.Fragment>
          ))}
        </View>
      )}
      {step < 5 && <Text style={[s.stepLabel, { color: colors.textMuted }]}>{t('step_of')} {step} {t('of')} 4</Text>}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

          {/* STEP 1: Category */}
          {step === 1 && (
            <>
              <Text style={[s.sectionTitle, { color: colors.text }]}>{t('what_sending')}</Text>
              <View style={s.catGrid}>
                {CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c.key}
                    style={[s.catCard, { backgroundColor: colors.card }, category === c.key && s.catCardActive]}
                    onPress={() => setCategory(c.key)}
                    activeOpacity={0.8}
                  >
                    <View style={[s.catIcon, category === c.key && s.catIconActive]}>
                      <c.Icon size={24} color={category === c.key ? '#FFFFFF' : ACCENT} strokeWidth={1.8} />
                    </View>
                    <Text style={[s.catLabel, { color: colors.textSecondary }, category === c.key && { color: colors.text }]}>{catLabel(c.key)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* STEP 2: Details + Receiver */}
          {step === 2 && (
            <>
              <Text style={[s.sectionTitle, { color: colors.text }]}>{t('the_product')}</Text>
              <Text style={[s.inputLabel, { color: colors.textSecondary }]}>{t('description')}</Text>
              <TextInput style={[s.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} value={description} onChangeText={setDescription} placeholder="Ex: iPhone 16 Pro Max" placeholderTextColor={colors.textMuted} />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.inputLabel, { color: colors.textSecondary }]}>{t('weight_lbs')}</Text>
                  <TextInput style={[s.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} value={weightEstimated} onChangeText={setWeightEstimated} placeholder="0.0" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.inputLabel, { color: colors.textSecondary }]}>{t('declared_value')}</Text>
                  <TextInput style={[s.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} value={declaredValue} onChangeText={setDeclaredValue} placeholder="0.00" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
                </View>
              </View>

              <Text style={[s.inputLabel, { color: colors.textSecondary }]}>{t('quantity')}</Text>
              <View style={s.stepper2}>
                <TouchableOpacity onPress={() => setQuantity(Math.max(1, quantity - 1))} style={[s.stepperBtn, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[s.stepperBtnText, { color: colors.text }]}>−</Text></TouchableOpacity>
                <Text style={[s.stepperVal, { color: colors.text }]}>{quantity}</Text>
                <TouchableOpacity onPress={() => setQuantity(quantity + 1)} style={[s.stepperBtn, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[s.stepperBtnText, { color: colors.text }]}>+</Text></TouchableOpacity>
              </View>

              <View style={[s.divider, { backgroundColor: colors.border }]} />

              <Text style={[s.sectionTitle, { color: colors.text }]}>{t('product_photos')}</Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 12, marginTop: -8 }}>
                {t('photo_help')}
              </Text>

              <View style={s.warningBox}>
                <AlertTriangle size={20} color={ACCENT} style={{ marginBottom: 6 }} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 4 }}>{t('photo_warning_title')}</Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 18 }}>
                  {t('photo_warning_text')}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                {[{ photo: photo1, setPhoto: setPhoto1, label: 'Photo 1' }, { photo: photo2, setPhoto: setPhoto2, label: 'Photo 2' }].map((p, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[s.photoZone, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => pickPhoto(p.setPhoto)}
                    activeOpacity={0.8}
                  >
                    {p.photo ? (
                      <View style={{ flex: 1, width: '100%' }}>
                        <Image source={{ uri: p.photo }} style={{ width: '100%', height: '100%', borderRadius: 12 }} resizeMode="cover" />
                        <TouchableOpacity style={s.photoRemove} onPress={() => p.setPhoto(null)} activeOpacity={0.7}>
                          <X size={14} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={{ alignItems: 'center' }}>
                        <Camera size={28} color={ACCENT} strokeWidth={1.5} />
                        <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 6 }}>{t('tap_to_add')}</Text>
                        <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>{p.label}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <View style={[s.divider, { backgroundColor: colors.border }]} />

              <Text style={[s.sectionTitle, { color: colors.text }]}>{t('recipient_in')} {destCountry === 'haiti' ? t('in_haiti') : t('in_dr')}</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.inputLabel, { color: colors.textSecondary }]}>{t('first_name')}</Text>
                  <TextInput style={[s.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} value={receiverFirst} onChangeText={setReceiverFirst} placeholder="Jean" placeholderTextColor={colors.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.inputLabel, { color: colors.textSecondary }]}>{t('last_name')}</Text>
                  <TextInput style={[s.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} value={receiverLast} onChangeText={setReceiverLast} placeholder="Louis" placeholderTextColor={colors.textMuted} />
                </View>
              </View>

              <Text style={[s.inputLabel, { color: colors.textSecondary }]}>{t('recipient_phone')}</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={[s.input, { width: 70, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={{ color: '#F97316', fontSize: 15, fontWeight: '700' }}>{destCountry === 'haiti' ? '+509' : '+1'}</Text>
                </View>
                <TextInput style={[s.input, { flex: 1, backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} value={receiverPhone} onChangeText={setReceiverPhone} placeholder="33 12 3456" placeholderTextColor={colors.textMuted} keyboardType="phone-pad" />
              </View>

              <Text style={[s.inputLabel, { color: colors.textSecondary }]}>{t('country')}</Text>
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                {(['haiti', 'dr'] as const).map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[s.transportCard, { flex: 1, backgroundColor: colors.card, borderColor: colors.border }, destCountry === c && s.transportCardActive]}
                    onPress={() => setDestCountry(c)}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.transportTitle, { color: colors.text }, destCountry === c && { color: ACCENT }]}>
                      {c === 'haiti' ? '🇭🇹 Haïti' : '🇩🇴 Rép. Dom.'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[s.inputLabel, { color: colors.textSecondary }]}>{t('destination_city')}</Text>
              <TouchableOpacity style={[s.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setShowCityPicker(!showCityPicker)} activeOpacity={0.8}>
                <Text style={{ color: destCity ? colors.text : colors.textMuted, fontSize: 15 }}>{destCity || t('choose_city_picker')}</Text>
                <ChevronDown size={18} color={colors.textMuted} />
              </TouchableOpacity>
              {showCityPicker && (
                <View style={[s.pickerList, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {cityList.map((city) => (
                    <TouchableOpacity key={city} style={[s.pickerItem, { borderBottomColor: colors.border }]} onPress={() => { setDestCity(city); setShowCityPicker(false); }}>
                      <Text style={[s.pickerItemText, { color: colors.text }, destCity === city && { color: ACCENT }]}>{city}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={[s.inputLabel, { color: colors.textSecondary }]}>{t('delivery_address')}</Text>
              <TextInput style={[s.input, { height: 80, textAlignVertical: 'top', backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} value={destAddress} onChangeText={setDestAddress} placeholder={t('full_address')} placeholderTextColor={colors.textMuted} multiline />
            </>
          )}

          {/* STEP 3: Transport */}
          {step === 3 && (
            <>
              <Text style={[s.sectionTitle, { color: colors.text }]}>{t('choose_transport')}</Text>
              <TouchableOpacity
                style={[s.transportCard, { backgroundColor: colors.card, borderColor: colors.border }, transport === 'air' && s.transportCardActive]}
                onPress={() => setTransport('air')}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={[s.transportIcon, { backgroundColor: colors.border }, transport === 'air' && { backgroundColor: ACCENT }]}>
                      <Plane size={22} color="#FFFFFF" strokeWidth={1.8} />
                    </View>
                    <View>
                      <Text style={[s.transportTitle, { color: colors.text }]}>{t('air_freight')}</Text>
                      <Text style={[s.transportSub, { color: colors.textSecondary }]}>{t('fast_delivery')}</Text>
                    </View>
                  </View>
                  {transport === 'air' && <View style={[s.radioActive, { borderColor: colors.bg }]} />}
                </View>
                <View style={[s.transportMeta, { borderTopColor: colors.border }]}>
                  <View>
                    <Text style={[s.transportMetaLabel, { color: colors.textMuted }]}>{t('estimated_delay')}</Text>
                    <Text style={[s.transportMetaVal, { color: colors.text }]}>{airDays}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[s.transportMetaLabel, { color: colors.textMuted }]}>{t('estimated_price')}</Text>
                    <Text style={[s.transportPrice, { color: colors.text }, transport === 'air' && { color: ACCENT }]}>${airPrice.toFixed(2)}</Text>
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.transportCard, { marginTop: 12, backgroundColor: colors.card, borderColor: colors.border }, transport === 'sea' && s.transportCardActive]}
                onPress={() => setTransport('sea')}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={[s.transportIcon, { backgroundColor: colors.border }, transport === 'sea' && { backgroundColor: ACCENT }]}>
                      <Ship size={22} color="#FFFFFF" strokeWidth={1.8} />
                    </View>
                    <View>
                      <Text style={[s.transportTitle, { color: colors.text }]}>{t('sea_freight')}</Text>
                      <Text style={[s.transportSub, { color: colors.textSecondary }]}>{t('cheaper_slower')}</Text>
                    </View>
                  </View>
                  {transport === 'sea' && <View style={[s.radioActive, { borderColor: colors.bg }]} />}
                </View>
                <View style={[s.transportMeta, { borderTopColor: colors.border }]}>
                  <View>
                    <Text style={[s.transportMetaLabel, { color: colors.textMuted }]}>{t('estimated_delay')}</Text>
                    <Text style={[s.transportMetaVal, { color: colors.text }]}>{seaDays}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[s.transportMetaLabel, { color: colors.textMuted }]}>{t('estimated_price')}</Text>
                    <Text style={[s.transportPrice, { color: colors.text }, transport === 'sea' && { color: ACCENT }]}>${seaPrice.toFixed(2)}</Text>
                  </View>
                </View>
              </TouchableOpacity>

              <View style={[s.divider, { backgroundColor: colors.border }]} />

              <Text style={[s.sectionTitle, { color: colors.text }]}>{t('order_summary')}</Text>
              <View style={[s.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <SummaryRow label={t('category')} value={catLabel(category)} labelColor={colors.textSecondary} valueColor={colors.text} />
                <SummaryRow label={t('description')} value={description} labelColor={colors.textSecondary} valueColor={colors.text} />
                <SummaryRow label={t('estimated_weight')} value={`${weightEstimated} lbs`} labelColor={colors.textSecondary} valueColor={colors.text} />
                <SummaryRow label={t('quantity')} value={String(quantity)} labelColor={colors.textSecondary} valueColor={colors.text} />
                <SummaryRow label={t('mode')} value={transport === 'air' ? t('airplane') : t('boat')} labelColor={colors.textSecondary} valueColor={colors.text} />
                <SummaryRow label={t('estimated_delay')} value={transport === 'air' ? airDays : seaDays} labelColor={colors.textSecondary} valueColor={colors.text} />
                <View style={[s.summaryDivider, { backgroundColor: colors.border }]} />
                <SummaryRow label={t('shipping_price')} value={`$${selectedPrice.toFixed(2)}`} labelColor={colors.textSecondary} valueColor={colors.text} />
                <SummaryRow label={t('insurance')} value={`$${insurance.toFixed(2)}`} labelColor={colors.textSecondary} valueColor={colors.text} />
                <View style={[s.summaryDivider, { backgroundColor: colors.border }]} />
                <View style={s.summaryRow}>
                  <Text style={[s.summaryLabel, { fontWeight: '800', color: colors.text }]}>{t('total_estimated')}</Text>
                  <Text style={[s.summaryValue, { fontWeight: '800', color: ACCENT, fontSize: 18 }]}>${total.toFixed(2)}</Text>
                </View>
              </View>
              <Text style={[s.noteText, { color: colors.textMuted }]}>{t('price_note')}</Text>
            </>
          )}

          {/* STEP 4: Confirm */}
          {step === 4 && (
            <>
              <Text style={[s.sectionTitle, { color: colors.text }]}>{t('finalize_request')}</Text>
              <View style={[s.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <SummaryRow label={t('category')} value={catLabel(category)} labelColor={colors.textSecondary} valueColor={colors.text} />
                <SummaryRow label={t('description')} value={description} labelColor={colors.textSecondary} valueColor={colors.text} />
                <SummaryRow label={t('estimated_weight')} value={`${weightEstimated} lbs`} labelColor={colors.textSecondary} valueColor={colors.text} />
                <SummaryRow label={t('quantity')} value={String(quantity)} labelColor={colors.textSecondary} valueColor={colors.text} />
                <SummaryRow label={t('mode')} value={transport === 'air' ? t('airplane') : t('boat')} labelColor={colors.textSecondary} valueColor={colors.text} />
                <SummaryRow label={t('estimated_delay')} value={transport === 'air' ? airDays : seaDays} labelColor={colors.textSecondary} valueColor={colors.text} />
                <View style={[s.summaryDivider, { backgroundColor: colors.border }]} />
                <SummaryRow label={t('recipient_label')} value={`${receiverFirst} ${receiverLast}`} labelColor={colors.textSecondary} valueColor={colors.text} />
                <SummaryRow label={t('recipient_phone_label')} value={receiverPhone} labelColor={colors.textSecondary} valueColor={colors.text} />
                <SummaryRow label={t('destination')} value={`${destCity}, ${destCountry === 'haiti' ? 'Haïti' : 'Rép. Dom.'}`} labelColor={colors.textSecondary} valueColor={colors.text} />
                <SummaryRow label={t('address')} value={destAddress || '—'} labelColor={colors.textSecondary} valueColor={colors.text} />
                <View style={[s.summaryDivider, { backgroundColor: colors.border }]} />
                <SummaryRow label={t('shipping_price')} value={`$${selectedPrice.toFixed(2)}`} labelColor={colors.textSecondary} valueColor={colors.text} />
                <SummaryRow label={t('insurance')} value={`$${insurance.toFixed(2)}`} labelColor={colors.textSecondary} valueColor={colors.text} />
                <View style={[s.summaryDivider, { backgroundColor: colors.border }]} />
                <View style={s.summaryRow}>
                  <Text style={[s.summaryLabel, { fontWeight: '800', color: colors.text }]}>{t('total_estimated')}</Text>
                  <Text style={[s.summaryValue, { fontWeight: '800', color: ACCENT, fontSize: 18 }]}>${total.toFixed(2)}</Text>
                </View>
              </View>
              <Text style={[s.noteText, { color: colors.textMuted }]}>{t('price_note')}</Text>

              <TouchableOpacity style={s.ctaBtn} onPress={handleConfirm} activeOpacity={0.85} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={s.ctaBtnText}>{t('confirm_request')}</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={s.whatsappBtn} onPress={handleWhatsApp} activeOpacity={0.85}>
                <Text style={s.whatsappBtnText}>{t('finalize_whatsapp')}</Text>
              </TouchableOpacity>
            </>
          )}

          {/* STEP 5: Confirmation */}
          {step === 5 && (
            <View style={{ alignItems: 'center', paddingTop: 40 }}>
              <CheckCircle size={72} color="#22C55E" strokeWidth={1.5} />
              <Text style={[s.confirmTitle, { color: colors.text }]}>{t('request_saved')}</Text>

              <View style={{ marginVertical: 20 }}>
                <QRCodeDisplay
                  type="shipment"
                  referenceNumber={requestNumber}
                  id={requestId}
                  label={t('scan_at_dropoff') ?? 'Présentez ce QR au dépôt'}
                />
              </View>

              <TouchableOpacity
                style={s.copyBtn}
                onPress={() => {
                  try {
                    const Clipboard = require('expo-clipboard');
                    Clipboard.setStringAsync(requestNumber);
                    Alert.alert(t('copied'), requestNumber);
                  } catch {
                    Alert.alert(t('tracking_number'), requestNumber);
                  }
                }}
                activeOpacity={0.7}
              >
                <Copy size={16} color={ACCENT} />
                <Text style={s.copyText}>{t('copy')}</Text>
              </TouchableOpacity>

              <Text style={[s.confirmDesc, { color: colors.textSecondary }]}>
                {t('request_desc')}
              </Text>

              <TouchableOpacity
                style={[s.ctaBtn, { marginTop: 24, width: '100%' }]}
                onPress={() => router.push({ pathname: '/screens/add-carrier-tracking', params: { packageId: requestId, requestNumber } })}
                activeOpacity={0.85}
              >
                <Text style={s.ctaBtnText}>{t('add_tracking_now')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.outlineBtn, { marginTop: 12, width: '100%', borderColor: colors.border }]}
                onPress={() => router.replace('/(tabs-client)/')}
                activeOpacity={0.85}
              >
                <Text style={[s.outlineBtnText, { color: colors.textSecondary }]}>{t('later_back_home')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom CTA for steps 1-3 */}
      {step < 4 && (
        <View style={[s.bottomBar, { backgroundColor: colors.bg, borderTopColor: colors.card }]}>
          <TouchableOpacity
            style={[s.ctaBtn, !canContinue() && s.ctaBtnDisabled]}
            onPress={() => canContinue() && setStep((step + 1) as Step)}
            activeOpacity={0.85}
            disabled={!canContinue()}
          >
            <Text style={s.ctaBtnText}>{t('continue_btn')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function SummaryRow({ label, value, labelColor, valueColor }: { label: string; value: string; labelColor?: string; valueColor?: string }) {
  return (
    <View style={s.summaryRow}>
      <Text style={[s.summaryLabel, labelColor ? { color: labelColor } : undefined]}>{label}</Text>
      <Text style={[s.summaryValue, valueColor ? { color: valueColor } : undefined]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: statusBarH + 10, paddingBottom: 12,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },

  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, marginTop: 8 },
  stepCircle: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: '#333',
    alignItems: 'center', justifyContent: 'center',
  },
  stepCircleActive: { borderColor: ACCENT, backgroundColor: ACCENT },
  stepNum: { fontSize: 13, fontWeight: '700', color: '#555' },
  stepNumActive: { color: '#FFFFFF' },
  stepLine: { flex: 1, height: 2, backgroundColor: '#333', marginHorizontal: 4 },
  stepLineActive: { backgroundColor: ACCENT },
  stepLabel: { textAlign: 'center', fontSize: 12, color: '#666', marginTop: 6, marginBottom: 8 },

  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginBottom: 16 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catCard: {
    width: (width - 70) / 4, backgroundColor: '#1A1A1A', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', borderWidth: 2, borderColor: 'transparent',
  },
  catCardActive: { borderColor: ACCENT },
  catIcon: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(249,115,22,0.12)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  catIconActive: { backgroundColor: ACCENT },
  catLabel: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', textAlign: 'center' },
  catLabelActive: { color: '#FFFFFF' },

  inputLabel: { fontSize: 13, fontWeight: '600', color: '#9CA3AF', marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: '#1A1A1A', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#FFFFFF', borderWidth: 1, borderColor: '#2A2A2A',
  },

  stepper2: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4 },
  stepperBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#1A1A1A',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2A2A2A',
  },
  stepperBtnText: { fontSize: 20, color: '#FFFFFF', fontWeight: '600' },
  stepperVal: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', minWidth: 30, textAlign: 'center' },

  divider: { height: 1, backgroundColor: '#2A2A2A', marginVertical: 24 },

  dropdown: {
    backgroundColor: '#1A1A1A', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: '#2A2A2A', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  pickerList: { backgroundColor: '#1A1A1A', borderRadius: 12, marginTop: 4, borderWidth: 1, borderColor: '#2A2A2A', overflow: 'hidden' },
  pickerItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#2A2A2A' },
  pickerItemText: { fontSize: 15, color: '#FFFFFF' },

  transportCard: {
    backgroundColor: '#1A1A1A', borderRadius: 16, padding: 16,
    borderWidth: 2, borderColor: '#2A2A2A',
  },
  transportCardActive: { borderColor: ACCENT },
  transportIcon: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#2A2A2A',
    alignItems: 'center', justifyContent: 'center',
  },
  transportTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  transportSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  radioActive: { width: 22, height: 22, borderRadius: 11, backgroundColor: ACCENT, borderWidth: 3, borderColor: '#0D0D0D' },
  transportMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#2A2A2A' },
  transportMetaLabel: { fontSize: 11, color: '#666', marginBottom: 2 },
  transportMetaVal: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  transportPrice: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },

  summaryCard: { backgroundColor: '#1A1A1A', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#2A2A2A' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  summaryLabel: { fontSize: 13, color: '#9CA3AF' },
  summaryValue: { fontSize: 13, fontWeight: '600', color: '#FFFFFF', maxWidth: '55%', textAlign: 'right' },
  summaryDivider: { height: 1, backgroundColor: '#2A2A2A', marginVertical: 8 },

  noteText: { fontSize: 12, color: '#666', textAlign: 'center', marginTop: 12 },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20, paddingBottom: 30, backgroundColor: '#0D0D0D',
    borderTopWidth: 1, borderTopColor: '#1A1A1A',
  },
  ctaBtn: {
    height: 56, borderRadius: 16, backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center',
  },
  ctaBtnDisabled: { opacity: 0.4 },
  ctaBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  whatsappBtn: {
    height: 56, borderRadius: 16, backgroundColor: '#22C55E',
    alignItems: 'center', justifyContent: 'center', marginTop: 12,
  },
  whatsappBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  outlineBtn: {
    height: 56, borderRadius: 16, backgroundColor: 'transparent',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#2A2A2A',
  },
  outlineBtnText: { fontSize: 16, fontWeight: '600', color: '#9CA3AF' },

  warningBox: {
    backgroundColor: 'rgba(249,115,22,0.1)', borderWidth: 1, borderColor: ACCENT,
    borderRadius: 12, padding: 14, marginBottom: 12,
  },
  photoZone: {
    flex: 1, height: 120, backgroundColor: '#1A1A1A', borderRadius: 12,
    borderWidth: 1, borderColor: '#2A2A2A', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  photoRemove: {
    position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center',
  },

  confirmTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginTop: 20, marginBottom: 8 },
  requestNum: { fontSize: 22, fontWeight: '800', color: ACCENT, marginBottom: 12 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 99, backgroundColor: 'rgba(249,115,22,0.12)' },
  copyText: { fontSize: 13, fontWeight: '600', color: ACCENT },
  confirmDesc: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 20, marginTop: 20, paddingHorizontal: 10 },
});

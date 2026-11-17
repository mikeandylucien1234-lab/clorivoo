import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Linking, ActivityIndicator, Image, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import {
  User, Package, ShoppingCart, MapPin, CreditCard, Calculator,
  Globe, MessageCircle, HelpCircle, Star, Megaphone, LogOut,
  Camera, ChevronRight, Sun, Moon, Bell,
} from 'lucide-react-native';

function Toggle({ value, onToggle }: { value: boolean; onToggle: () => void }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.8}
      style={{ width: 44, height: 26, borderRadius: 99, backgroundColor: value ? colors.accent : colors.border, justifyContent: 'center', padding: 3 }}>
      <View style={{ width: 20, height: 20, borderRadius: 99, backgroundColor: '#FFFFFF', marginLeft: value ? 18 : 0 }} />
    </TouchableOpacity>
  );
}

function MenuItem({ icon: Icon, label, sub, onPress, iconBg, textColor }: {
  icon: React.ComponentType<{ size: number; color: string }>;
  label: string;
  sub?: string;
  onPress?: () => void;
  iconBg?: string;
  textColor?: string;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 14 }}>
      <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: iconBg ?? colors.accentLight, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: textColor ?? colors.text }}>{label}</Text>
        {sub ? <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{sub}</Text> : null}
      </View>
      <ChevronRight size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

function Sep() {
  const { colors } = useTheme();
  return <View style={{ height: 1, backgroundColor: colors.border }} />;
}

function mapCountry(code?: string | null): string {
  if (!code) return '—';
  if (code === 'haiti') return 'Haïti';
  if (code === 'dr') return 'Rép. Dominicaine';
  return code;
}

function getMemberSince(createdAt?: string | null, t: (k: string) => string = k => k): string {
  try {
    if (!createdAt) return '—';
    const created = new Date(createdAt);
    if (isNaN(created.getTime())) return '—';
    const now = new Date();
    if (created.getFullYear() === now.getFullYear()) return t('new_member');
    const years = now.getFullYear() - created.getFullYear();
    return `${years} ${t('years')}`;
  } catch {
    return '—';
  }
}

export default function ProfilScreen() {
  const router = useRouter();
  const { profile, signOut, refreshProfile } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const { lang, setLang, t } = useLanguage();
  const [toggles, setToggles] = useState<Record<string, boolean>>({ whatsapp: true, email: true });
  const [uploading, setUploading] = useState(false);
  const [langModal, setLangModal] = useState(false);
  const toggle = (k: string) => setToggles(p => ({ ...p, [k]: !p[k] }));

  if (!profile) {
    return (
      <View style={[S.container, { backgroundColor: colors.bg }]}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={{ color: colors.textSecondary, marginTop: 12, fontSize: 14 }}>Chargement du profil…</Text>
        </View>
      </View>
    );
  }

  const fullName = profile.full_name ?? '';
  const initials = fullName
    ? fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    : '??';

  const destination = [mapCountry(profile.destination_country), profile.destination_city].filter(Boolean).join(', ');

  async function uploadAvatar(uri: string) {
    try {
      setUploading(true);
      const filePath = `${profile!.id}/avatar.jpg`;
      const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
      const formData = new FormData();
      formData.append('file', { uri, name: 'avatar.jpg', type: mimeType } as any);
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, formData, { contentType: mimeType, upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const ts = Date.now();
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: `${publicUrl}?t=${ts}` })
        .eq('id', profile!.id);
      if (updateError) throw updateError;
      await refreshProfile();
    } catch (err: any) {
      Alert.alert('Erreur', err.message ?? 'Impossible de télécharger la photo.');
    } finally {
      setUploading(false);
    }
  }

  async function deleteAvatar() {
    try {
      setUploading(true);
      const filePath = `${profile!.id}/avatar.jpg`;
      await supabase.storage.from('avatars').remove([filePath]);
      await supabase.from('users').update({ avatar_url: null }).eq('id', profile!.id);
      await refreshProfile();
    } catch (err: any) {
      Alert.alert('Erreur', err.message ?? 'Impossible de supprimer la photo.');
    } finally {
      setUploading(false);
    }
  }

  async function pickImage(source: 'camera' | 'gallery') {
    let result: ImagePicker.ImagePickerResult;
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission requise'); return; }
      result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, allowsEditing: true, aspect: [1, 1] });
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission requise'); return; }
      result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, allowsEditing: true, aspect: [1, 1] });
    }
    if (!result.canceled && result.assets[0]) {
      await uploadAvatar(result.assets[0].uri);
    }
  }

  function handleAvatarPress() {
    Alert.alert(t('select_photo'), undefined, [
      { text: t('take_photo'), onPress: () => pickImage('camera') },
      { text: t('choose_gallery'), onPress: () => pickImage('gallery') },
      { text: t('delete_photo'), style: 'destructive', onPress: deleteAvatar },
      { text: t('cancel'), style: 'cancel' },
    ]);
  }

  async function handleSignOut() {
    Alert.alert(t('disconnect'), t('sign_out_confirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('sign_out'), style: 'destructive', onPress: async () => {
        await signOut();
        router.replace('/(auth)/login');
      }},
    ]);
  }

  const stats: [string, string][] = [
    [String(profile.total_packages ?? 0), t('packages_sent')],
    ['—', t('in_progress')],
    [getMemberSince(profile.created_at, t), t('member_since')],
  ];

  return (
    <View style={[S.container, { backgroundColor: colors.bg }]}>
      <View style={[S.header, { backgroundColor: colors.bg }]}>
        <Text style={[S.headerTitle, { color: colors.text }]}>{t('my_profile')}</Text>
        <TouchableOpacity style={[S.editBtn, { backgroundColor: colors.card, borderColor: colors.border }]} activeOpacity={0.8}>
          <User size={16} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 22, paddingTop: 8, paddingBottom: 40 }}>
        {/* Profile card */}
        <View style={[S.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.8} style={{ position: 'relative' }}>
              <View style={S.avatar}>
                {profile.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={{ width: 72, height: 72, borderRadius: 36 }} />
                ) : (
                  <Text style={S.avatarText}>{initials}</Text>
                )}
                {uploading && (
                  <View style={{ ...StyleSheet.absoluteFillObject, borderRadius: 36, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  </View>
                )}
              </View>
              <View style={S.cameraButton}><Camera size={12} color="#FFFFFF" /></View>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>{fullName}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#14532D', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginTop: 6 }}>
                <Text style={{ color: '#22C55E', fontSize: 11, fontWeight: '600' }}>✓ {t('verified_client')}</Text>
              </View>
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 8 }}>{profile.email}</Text>
              {profile.phone_whatsapp ? <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>{profile.phone_whatsapp}</Text> : null}
              {destination ? <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>{destination}</Text> : null}
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 20, paddingTop: 18, borderTopWidth: 1, borderTopColor: colors.border }}>
            {stats.map(([val, lbl], i) => (
              <React.Fragment key={lbl}>
                {i > 0 && <View style={{ width: 1, height: 34, backgroundColor: colors.border }} />}
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 19, fontWeight: '800', color: colors.accent }}>{val}</Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 3, textAlign: 'center' }}>{lbl}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Mon compte */}
        <Text style={[S.sectionTitle, { color: colors.textSecondary }]}>{t('my_account')}</Text>
        <View style={[S.section, { backgroundColor: colors.card, borderColor: isDark ? '#1F1F1F' : colors.border }]}>
          <MenuItem icon={User} label={t('personal_info')} sub={t('personal_info_sub')} onPress={() => router.push('/screens/edit-profile')} />
          <Sep /><MenuItem icon={Package} label={t('package_history')} sub={t('package_history_sub')} onPress={() => router.push('/(tabs-client)/colis')} />
          <Sep /><MenuItem icon={ShoppingCart} label={t('personal_shopper')} sub={t('personal_shopper_sub')} onPress={() => router.push('/screens/personal-shopper?tab=history')} />
          <Sep /><MenuItem icon={MapPin} label={t('us_addresses')} sub={t('us_addresses_sub')} onPress={() => router.push('/screens/adresses-us')} />
          <Sep /><MenuItem icon={CreditCard} label={t('payments')} sub={t('payments_sub')} onPress={() => router.push('/paiements')} />
          <Sep /><MenuItem icon={Calculator} label={t('calculator')} sub={t('calculator_sub')} onPress={() => router.push('/screens/calculateur')} />
        </View>

        {/* Préférences */}
        <Text style={[S.sectionTitle, { color: colors.textSecondary }]}>{t('preferences')}</Text>
        <View style={[S.section, { backgroundColor: colors.card, borderColor: isDark ? '#1F1F1F' : colors.border }]}>
          {/* Language */}
          <TouchableOpacity onPress={() => setLangModal(true)} activeOpacity={0.7}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 14 }}>
            <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: colors.accentLight, alignItems: 'center', justifyContent: 'center' }}>
              <Globe size={18} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{t('language')}</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{lang === 'fr' ? t('french') : t('english')}</Text>
            </View>
            <View style={{ backgroundColor: colors.border, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginRight: 8 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700' }}>{lang.toUpperCase()}</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>
          <Sep />
          {/* WhatsApp notifications */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 14 }}>
            <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: colors.accentLight, alignItems: 'center', justifyContent: 'center' }}>
              <MessageCircle size={18} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{t('whatsapp_notif')}</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{toggles.whatsapp ? t('enabled') : t('disabled')}</Text>
            </View>
            <Toggle value={toggles.whatsapp} onToggle={() => toggle('whatsapp')} />
          </View>
          <Sep />
          {/* Email notifications */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 14 }}>
            <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(249,115,22,0.12)', alignItems: 'center', justifyContent: 'center' }}>
              <Bell size={18} color="#F97316" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{t('email_notif')}</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{toggles.email ? t('enabled') : t('disabled')}</Text>
            </View>
            <Toggle value={toggles.email} onToggle={() => toggle('email')} />
          </View>
          <Sep />
          {/* Theme */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 14 }}>
            <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(249,115,22,0.12)', alignItems: 'center', justifyContent: 'center' }}>
              {isDark ? <Moon size={18} color="#F97316" /> : <Sun size={18} color="#F97316" />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{t('theme')}</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{isDark ? t('dark_mode') : t('light_mode')}</Text>
            </View>
            <Toggle value={!isDark} onToggle={toggleTheme} />
          </View>
        </View>

        {/* Support */}
        <Text style={[S.sectionTitle, { color: colors.textSecondary }]}>{t('support')}</Text>
        <View style={[S.section, { backgroundColor: colors.card, borderColor: isDark ? '#1F1F1F' : colors.border }]}>
          <MenuItem icon={MessageCircle} label={t('contact_whatsapp')} sub="+1 (305) 600-9364" iconBg="rgba(34,197,94,0.12)" onPress={() => Linking.openURL('https://wa.me/13056009364')} />
          <Sep /><MenuItem icon={HelpCircle} label={t('help_faq')} sub={t('help_faq_sub')} onPress={() => router.push('/screens/faq')} />
          <Sep /><MenuItem icon={Star} label={t('rate_app')} sub={t('rate_app_sub')} onPress={() => Linking.openURL('https://play.google.com/store/apps/details?id=com.jjsimex.client')} />
          <Sep /><MenuItem icon={Megaphone} label={t('referral')} sub={t('referral_sub')} onPress={() => router.push('/screens/referral')} />
        </View>

        {/* Sign out */}
        <TouchableOpacity onPress={handleSignOut} activeOpacity={0.85}
          style={{ marginTop: 28, height: 52, backgroundColor: colors.card, borderWidth: 1, borderColor: '#EF4444', borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <LogOut size={16} color="#EF4444" />
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#EF4444' }}>{t('sign_out')}</Text>
        </TouchableOpacity>

        <Text style={{ textAlign: 'center', fontSize: 11, color: colors.textMuted, marginTop: 16 }}>JJ's IMEX v1.0.0</Text>
      </ScrollView>

      {/* Language modal */}
      <Modal visible={langModal} transparent animationType="fade" onRequestClose={() => setLangModal(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }} activeOpacity={1} onPress={() => setLangModal(false)}>
          <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 20, width: '75%', borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 16, textAlign: 'center' }}>{t('choose_language')}</Text>
            {([['fr', '🇫🇷 Français'], ['en', '🇺🇸 English']] as const).map(([code, label]) => (
              <TouchableOpacity
                key={code}
                onPress={() => { setLang(code); setLangModal(false); }}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, marginBottom: 8,
                  backgroundColor: lang === code ? 'rgba(249,115,22,0.15)' : 'transparent',
                  borderWidth: lang === code ? 1 : 0, borderColor: '#F97316',
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: lang === code ? '700' : '500', color: lang === code ? '#F97316' : colors.text }}>{label}</Text>
                {lang === code && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#F97316' }} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1 },
  header: { height: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22 },
  headerTitle: { fontSize: 24, fontWeight: '700' },
  editBtn: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  profileCard: { borderWidth: 1, borderRadius: 20, padding: 22, marginBottom: 4 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#F97316', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarText: { color: '#0D0D0D', fontWeight: '800', fontSize: 26 },
  cameraButton: { position: 'absolute', bottom: 0, right: -2, width: 24, height: 24, borderRadius: 12, backgroundColor: '#F97316', borderWidth: 2, borderColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 24, marginBottom: 10 },
  section: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14 },
});

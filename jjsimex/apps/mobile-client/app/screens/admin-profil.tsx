import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Platform, StatusBar, Alert, TextInput, Switch, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft, User, Mail, Phone, Shield, Key, LogOut,
  ChevronRight, Package, Users, Calendar, DollarSign,
  Bell, Moon, FileText, Database, UserPlus, Edit3,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

const statusBarH = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;
const ACCENT = '#22C55E';

interface AdminStats {
  packagesHandled: number;
  clientsManaged: number;
  memberSince: string;
}

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
}

export default function AdminProfil() {
  const router = useRouter();
  const { profile, signOut, refreshProfile } = useAuth();
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(profile?.full_name ?? '');
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<AdminStats>({ packagesHandled: 0, clientsManaged: 0, memberSince: '' });
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [showTeam, setShowTeam] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);

  const isSuperAdmin = profile?.role === 'super_admin';
  const isAdmin = profile?.role === 'admin' || isSuperAdmin;

  const roleLabel = isSuperAdmin ? 'Super Admin'
    : profile?.role === 'employee' ? 'Employé' : 'Admin';

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const { count: pkgCount } = await supabase
        .from('packages')
        .select('id', { count: 'exact', head: true })
        .or(`created_by.eq.${profile!.id},updated_by.eq.${profile!.id}`);

      const { count: clientCount } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'client');

      setStats({
        packagesHandled: pkgCount ?? 0,
        clientsManaged: clientCount ?? 0,
        memberSince: profile?.created_at
          ? new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
          : '—',
      });
    } catch {}
    setLoadingStats(false);
  }

  async function fetchTeam() {
    try {
      const { data } = await supabase
        .from('users')
        .select('id, full_name, email, role, created_at')
        .neq('role', 'client')
        .order('created_at', { ascending: true });
      setTeam((data ?? []) as TeamMember[]);
    } catch {}
  }

  async function handleSaveName() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await supabase.from('users').update({ full_name: name.trim() }).eq('id', profile!.id);
      await refreshProfile();
      setEditingName(false);
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
    setSaving(false);
  }

  function handleChangePassword() {
    Alert.alert('Changer le mot de passe', 'Un email de réinitialisation sera envoyé.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Envoyer', onPress: async () => {
          try {
            const { error } = await supabase.auth.resetPasswordForEmail(profile!.email);
            if (error) throw error;
            Alert.alert('Envoyé', 'Vérifiez votre email.');
          } catch (e: any) { Alert.alert('Erreur', e.message); }
        },
      },
    ]);
  }

  function handleChangeRole(member: TeamMember) {
    const roles = ['employee', 'admin', 'super_admin'].filter(r => r !== member.role);
    const roleLabels: Record<string, string> = { employee: 'Employé', admin: 'Admin', super_admin: 'Super Admin' };

    Alert.alert(
      'Changer le rôle',
      `${member.full_name} est actuellement ${roleLabels[member.role] ?? member.role}.`,
      [
        { text: 'Annuler', style: 'cancel' },
        ...roles.map(r => ({
          text: roleLabels[r] ?? r,
          onPress: async () => {
            try {
              await supabase.from('users').update({ role: r }).eq('id', member.id);
              fetchTeam();
              Alert.alert('Modifié', `${member.full_name} est maintenant ${roleLabels[r]}.`);
            } catch (e: any) { Alert.alert('Erreur', e.message); }
          },
        })),
      ]
    );
  }

  function handleLogout() {
    Alert.alert('Se déconnecter', 'Êtes-vous sûr ?', [
      { text: 'Non', style: 'cancel' },
      { text: 'Oui', style: 'destructive', onPress: signOut },
    ]);
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Mon profil</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {/* PROFILE CARD */}
        <View style={s.profileCard}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{(profile?.full_name || 'A')[0].toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            {editingName ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TextInput style={s.nameInput} value={name} onChangeText={setName} autoFocus />
                <TouchableOpacity onPress={handleSaveName} disabled={saving}>
                  <Text style={{ color: ACCENT, fontWeight: '700', fontSize: 13 }}>{saving ? '...' : 'OK'}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setEditingName(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }} activeOpacity={0.7}>
                <Text style={s.profileName}>{profile?.full_name || 'Admin'}</Text>
                <Edit3 size={12} color="#6B7280" strokeWidth={2} />
              </TouchableOpacity>
            )}
            <View style={s.roleBadge}>
              <Shield size={10} color={ACCENT} strokeWidth={2} />
              <Text style={s.roleText}>{roleLabel}</Text>
            </View>
          </View>
        </View>

        {/* STATS GRID */}
        <View style={s.statsGrid}>
          <View style={s.statItem}>
            <Package size={16} color="#3B82F6" strokeWidth={1.8} />
            <Text style={s.statValue}>{loadingStats ? '...' : stats.packagesHandled}</Text>
            <Text style={s.statLabel}>Colis traités</Text>
          </View>
          <View style={s.statItem}>
            <Users size={16} color="#22C55E" strokeWidth={1.8} />
            <Text style={s.statValue}>{loadingStats ? '...' : stats.clientsManaged}</Text>
            <Text style={s.statLabel}>Clients</Text>
          </View>
          <View style={s.statItem}>
            <Calendar size={16} color="#A855F7" strokeWidth={1.8} />
            <Text style={s.statValue}>{loadingStats ? '...' : stats.memberSince}</Text>
            <Text style={s.statLabel}>Membre depuis</Text>
          </View>
        </View>

        {/* INFORMATIONS */}
        <Text style={s.sectionTitle}>Informations</Text>
        <View style={s.infoCard}>
          <View style={s.infoRow}>
            <Mail size={16} color="#6B7280" strokeWidth={1.8} />
            <View style={{ flex: 1 }}>
              <Text style={s.infoLabel}>Email</Text>
              <Text style={s.infoValue}>{profile?.email ?? '—'}</Text>
            </View>
          </View>
          <View style={s.sep} />
          <View style={s.infoRow}>
            <Phone size={16} color="#6B7280" strokeWidth={1.8} />
            <View style={{ flex: 1 }}>
              <Text style={s.infoLabel}>Téléphone</Text>
              <Text style={s.infoValue}>{profile?.phone_whatsapp ?? '—'}</Text>
            </View>
          </View>
        </View>

        {/* SÉCURITÉ */}
        <Text style={s.sectionTitle}>Sécurité</Text>
        <TouchableOpacity style={s.menuRow} onPress={handleChangePassword} activeOpacity={0.7}>
          <View style={s.menuIcon}><Key size={18} color={ACCENT} strokeWidth={1.8} /></View>
          <Text style={s.menuLabel}>Changer le mot de passe</Text>
          <ChevronRight size={16} color="#4B5563" strokeWidth={2} />
        </TouchableOpacity>

        {/* GESTION APP (admin+) */}
        {isAdmin && (
          <>
            <Text style={s.sectionTitle}>Gestion de l'app</Text>
            <View style={s.menuGroup}>
              <TouchableOpacity style={s.menuRow} activeOpacity={0.7} onPress={() => router.push('/screens/admin-tarifs')}>
                <View style={s.menuIcon}><DollarSign size={18} color="#3B82F6" strokeWidth={1.8} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.menuLabel}>Tarifs de livraison</Text>
                  <Text style={s.menuSub}>Modifier les tarifs par destination</Text>
                </View>
                <ChevronRight size={16} color="#4B5563" strokeWidth={2} />
              </TouchableOpacity>
              <View style={s.sep} />
              <TouchableOpacity style={s.menuRow} activeOpacity={0.7} onPress={() => router.push('/screens/admin-taux')}>
                <View style={[s.menuIcon, { backgroundColor: 'rgba(34,197,94,0.1)' }]}><DollarSign size={18} color="#22C55E" strokeWidth={1.8} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.menuLabel}>Taux de change</Text>
                  <Text style={s.menuSub}>USD → HTG / DOP</Text>
                </View>
                <ChevronRight size={16} color="#4B5563" strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ÉQUIPE (super_admin) */}
        {isSuperAdmin && (
          <>
            <Text style={s.sectionTitle}>Équipe</Text>
            <TouchableOpacity
              style={s.menuRow}
              onPress={() => router.push('/screens/admin-equipe')}
              activeOpacity={0.7}
            >
              <View style={[s.menuIcon, { backgroundColor: 'rgba(168,85,247,0.1)' }]}>
                <Users size={18} color="#A855F7" strokeWidth={1.8} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.menuLabel}>Gestion équipe</Text>
                <Text style={s.menuSub}>Rôles, blocage et création de comptes</Text>
              </View>
              <ChevronRight size={16} color="#4B5563" strokeWidth={2} />
            </TouchableOpacity>
          </>
        )}

        {/* LOGOUT */}
        <View style={{ marginTop: 30 }}>
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
            <LogOut size={18} color="#EF4444" strokeWidth={1.8} />
            <Text style={s.logoutText}>Se déconnecter</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 18, paddingTop: statusBarH + 10, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#1A1A1A',
  },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', flex: 1 },

  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: '#1A1A1A', borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: '#1F1F1F',
  },
  avatar: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 24, fontWeight: '800', color: '#0D0D0D' },
  profileName: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  nameInput: {
    flex: 1, height: 34, backgroundColor: '#0D0D0D', borderRadius: 8,
    borderWidth: 1, borderColor: '#2A2A2A', color: '#FFFFFF',
    paddingHorizontal: 10, fontSize: 14,
  },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 6, backgroundColor: 'rgba(34,197,94,0.12)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, alignSelf: 'flex-start',
  },
  roleText: { fontSize: 11, fontWeight: '700', color: ACCENT },

  statsGrid: {
    flexDirection: 'row', gap: 10, marginTop: 14,
  },
  statItem: {
    flex: 1, backgroundColor: '#1A1A1A', borderRadius: 14,
    borderWidth: 1, borderColor: '#1F1F1F', padding: 14,
    alignItems: 'center', gap: 6,
  },
  statValue: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  statLabel: { fontSize: 10, color: '#6B7280', textAlign: 'center' },

  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: '#6B7280', marginTop: 24, marginBottom: 10,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },

  infoCard: {
    backgroundColor: '#1A1A1A', borderRadius: 14, borderWidth: 1, borderColor: '#1F1F1F',
    padding: 16,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 6 },
  infoLabel: { fontSize: 11, color: '#6B7280' },
  infoValue: { fontSize: 13, color: '#FFFFFF', fontWeight: '500', marginTop: 1 },
  sep: { height: 1, backgroundColor: '#222222', marginVertical: 6 },

  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#1A1A1A', borderRadius: 14, borderWidth: 1, borderColor: '#1F1F1F',
    padding: 16,
  },
  menuGroup: {
    backgroundColor: '#1A1A1A', borderRadius: 14, borderWidth: 1, borderColor: '#1F1F1F',
    overflow: 'hidden',
  },
  menuIcon: {
    width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(34,197,94,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', flex: 1 },
  menuSub: { fontSize: 11, color: '#6B7280', marginTop: 2 },

  teamBlock: {
    backgroundColor: '#1A1A1A', borderRadius: 14, borderWidth: 1, borderColor: '#1F1F1F',
    padding: 14, marginTop: 8, gap: 10,
  },
  teamMember: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  teamAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#2A2A2A',
    alignItems: 'center', justifyContent: 'center',
  },
  teamAvatarText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  teamName: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  teamEmail: { fontSize: 11, color: '#6B7280' },
  teamRoleBadge: {
    backgroundColor: 'rgba(34,197,94,0.12)', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 99,
  },
  teamRoleText: { fontSize: 10, fontWeight: '700', color: ACCENT },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, padding: 16, borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
  },
  logoutText: { fontSize: 14, fontWeight: '700', color: '#EF4444' },
});

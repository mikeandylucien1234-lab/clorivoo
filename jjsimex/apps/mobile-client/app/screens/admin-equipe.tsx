import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Platform, StatusBar, Alert, TextInput, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft, Users, UserPlus, Shield, Lock, Unlock, X, ChevronDown,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { blockUser, unblockUser } from '@jjsimex/supabase/users';

const statusBarH = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;
const ACCENT = '#22C55E';

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  employee: 'Employé',
  delivery: 'Livreur',
};

const ASSIGNABLE_ROLES = ['employee', 'admin', 'super_admin'];

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_blocked: boolean;
  created_at: string;
}

export default function AdminEquipe() {
  const router = useRouter();
  const { profile } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('employee');
  const [showRolePicker, setShowRolePicker] = useState<string | null>(null);

  const isSuperAdmin = profile?.role === 'super_admin';

  useEffect(() => {
    if (!isSuperAdmin) return;
    fetchMembers();
  }, []);

  async function fetchMembers() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, role, is_blocked, created_at')
        .neq('role', 'client')
        .order('created_at', { ascending: true });
      if (error) throw error;
      setMembers((data ?? []) as TeamMember[]);
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
    setLoading(false);
  }

  async function handleChangeRole(member: TeamMember, newRole: string) {
    if (member.id === profile!.id) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', member.id);
      if (error) throw error;
      Alert.alert('Modifié', `${member.full_name} est maintenant ${ROLE_LABELS[newRole] ?? newRole}.`);
      setShowRolePicker(null);
      fetchMembers();
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
  }

  async function handleToggleBlock(member: TeamMember) {
    if (member.id === profile!.id) return;
    const action = member.is_blocked ? 'débloquer' : 'bloquer';
    Alert.alert(
      `${member.is_blocked ? 'Débloquer' : 'Bloquer'} ${member.full_name} ?`,
      `Voulez-vous ${action} ce compte ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: member.is_blocked ? 'Débloquer' : 'Bloquer',
          style: member.is_blocked ? 'default' : 'destructive',
          onPress: async () => {
            try {
              if (member.is_blocked) {
                await unblockUser(member.id, profile!.id);
              } else {
                await blockUser(member.id, profile!.id);
              }
              fetchMembers();
            } catch (e: any) {
              Alert.alert('Erreur', e.message);
            }
          },
        },
      ]
    );
  }

  async function handleCreateAccount() {
    if (!newEmail.trim() || !newPassword.trim() || !newName.trim()) {
      Alert.alert('Erreur', 'Tous les champs sont requis.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    setCreating(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newEmail.trim(),
        password: newPassword.trim(),
        options: { data: { full_name: newName.trim() } },
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error('Erreur lors de la création du compte.');

      // Update role in users table
      const { error: updateError } = await supabase
        .from('users')
        .update({ role: newRole, full_name: newName.trim() })
        .eq('id', authData.user.id);
      if (updateError) throw updateError;

      Alert.alert('Succès', `Compte créé pour ${newName.trim()}.`);
      setNewEmail('');
      setNewPassword('');
      setNewName('');
      setNewRole('employee');
      setShowCreateForm(false);
      fetchMembers();
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
    setCreating(false);
  }

  if (!isSuperAdmin) {
    return (
      <View style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
            <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Gestion équipe</Text>
        </View>
        <View style={s.centered}>
          <Text style={s.errorText}>Accès réservé au Super Admin.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Gestion équipe</Text>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => setShowCreateForm(!showCreateForm)}
          activeOpacity={0.7}
        >
          {showCreateForm ? <X size={18} color="#FFFFFF" strokeWidth={2} /> : <UserPlus size={18} color="#FFFFFF" strokeWidth={2} />}
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={ACCENT} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          {/* CREATE FORM */}
          {showCreateForm && (
            <View style={s.createCard}>
              <Text style={s.createTitle}>+ Créer un compte admin</Text>
              <View style={s.formField}>
                <Text style={s.formLabel}>Nom complet</Text>
                <TextInput
                  style={s.input}
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="Jean Dupont"
                  placeholderTextColor="#4B5563"
                />
              </View>
              <View style={s.formField}>
                <Text style={s.formLabel}>Email</Text>
                <TextInput
                  style={s.input}
                  value={newEmail}
                  onChangeText={setNewEmail}
                  placeholder="email@exemple.com"
                  placeholderTextColor="#4B5563"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <View style={s.formField}>
                <Text style={s.formLabel}>Mot de passe temporaire</Text>
                <TextInput
                  style={s.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Min. 6 caractères"
                  placeholderTextColor="#4B5563"
                  secureTextEntry
                />
              </View>
              <View style={s.formField}>
                <Text style={s.formLabel}>Rôle</Text>
                <View style={s.rolePickerRow}>
                  {ASSIGNABLE_ROLES.map(r => (
                    <TouchableOpacity
                      key={r}
                      style={[s.roleOption, newRole === r && s.roleOptionActive]}
                      onPress={() => setNewRole(r)}
                      activeOpacity={0.7}
                    >
                      <Text style={[s.roleOptionText, newRole === r && s.roleOptionTextActive]}>
                        {ROLE_LABELS[r] ?? r}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <TouchableOpacity
                style={[s.createBtn, creating && { opacity: 0.6 }]}
                onPress={handleCreateAccount}
                disabled={creating}
                activeOpacity={0.7}
              >
                {creating ? (
                  <ActivityIndicator color="#0D0D0D" size="small" />
                ) : (
                  <Text style={s.createBtnText}>Créer le compte</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* MEMBERS LIST */}
          <Text style={s.sectionTitle}>Membres ({members.length})</Text>
          {members.map((m) => {
            const isMe = m.id === profile!.id;
            return (
              <View key={m.id} style={[s.memberCard, m.is_blocked && s.memberBlocked]}>
                <View style={s.memberTop}>
                  <View style={[s.avatar, isMe && { backgroundColor: ACCENT }]}>
                    <Text style={s.avatarText}>{(m.full_name || '?')[0].toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.memberName}>
                      {m.full_name}{isMe ? ' (vous)' : ''}{m.is_blocked ? ' [Bloqué]' : ''}
                    </Text>
                    <Text style={s.memberEmail}>{m.email}</Text>
                  </View>
                </View>

                {!isMe && (
                  <View style={s.memberActions}>
                    {/* Role selector */}
                    <TouchableOpacity
                      style={s.roleBadge}
                      onPress={() => setShowRolePicker(showRolePicker === m.id ? null : m.id)}
                      activeOpacity={0.7}
                    >
                      <Shield size={12} color={ACCENT} strokeWidth={2} />
                      <Text style={s.roleBadgeText}>{ROLE_LABELS[m.role] ?? m.role}</Text>
                      <ChevronDown size={12} color="#6B7280" strokeWidth={2} />
                    </TouchableOpacity>

                    {/* Block/Unblock */}
                    <TouchableOpacity
                      style={[s.blockBtn, m.is_blocked && s.unblockBtn]}
                      onPress={() => handleToggleBlock(m)}
                      activeOpacity={0.7}
                    >
                      {m.is_blocked ? (
                        <Unlock size={14} color="#22C55E" strokeWidth={2} />
                      ) : (
                        <Lock size={14} color="#EF4444" strokeWidth={2} />
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {/* Role picker dropdown */}
                {showRolePicker === m.id && !isMe && (
                  <View style={s.roleDropdown}>
                    {ASSIGNABLE_ROLES.filter(r => r !== m.role).map(r => (
                      <TouchableOpacity
                        key={r}
                        style={s.roleDropdownItem}
                        onPress={() => handleChangeRole(m, r)}
                        activeOpacity={0.7}
                      >
                        <Text style={s.roleDropdownText}>{ROLE_LABELS[r] ?? r}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
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
  addBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  errorText: { color: '#EF4444', fontSize: 14, textAlign: 'center' },

  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: '#6B7280', marginTop: 8, marginBottom: 12,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },

  // Create form
  createCard: {
    backgroundColor: '#1A1A1A', borderRadius: 14, borderWidth: 1, borderColor: ACCENT,
    padding: 18, marginBottom: 20,
  },
  createTitle: { fontSize: 15, fontWeight: '700', color: ACCENT, marginBottom: 16 },
  formField: { marginBottom: 14 },
  formLabel: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', marginBottom: 6 },
  input: {
    height: 42, backgroundColor: '#0D0D0D', borderRadius: 10,
    borderWidth: 1, borderColor: '#2A2A2A', color: '#FFFFFF',
    paddingHorizontal: 12, fontSize: 14,
  },
  rolePickerRow: { flexDirection: 'row', gap: 8 },
  roleOption: {
    flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1,
    borderColor: '#2A2A2A', backgroundColor: '#0D0D0D', alignItems: 'center',
  },
  roleOptionActive: { borderColor: ACCENT, backgroundColor: 'rgba(34,197,94,0.12)' },
  roleOptionText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  roleOptionTextActive: { color: ACCENT },
  createBtn: {
    backgroundColor: ACCENT, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 4,
  },
  createBtnText: { fontSize: 14, fontWeight: '700', color: '#0D0D0D' },

  // Member card
  memberCard: {
    backgroundColor: '#1A1A1A', borderRadius: 14, borderWidth: 1, borderColor: '#1F1F1F',
    padding: 16, marginBottom: 10,
  },
  memberBlocked: { borderColor: 'rgba(239,68,68,0.3)', opacity: 0.7 },
  memberTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#2A2A2A',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  memberName: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  memberEmail: { fontSize: 11, color: '#6B7280', marginTop: 2 },

  memberActions: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#222222',
  },
  roleBadge: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(34,197,94,0.12)', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10,
  },
  roleBadgeText: { fontSize: 12, fontWeight: '600', color: ACCENT, flex: 1 },
  blockBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: 'rgba(239,68,68,0.1)', alignItems: 'center', justifyContent: 'center',
  },
  unblockBtn: { backgroundColor: 'rgba(34,197,94,0.1)' },

  roleDropdown: {
    marginTop: 8, backgroundColor: '#0D0D0D', borderRadius: 10,
    borderWidth: 1, borderColor: '#2A2A2A', overflow: 'hidden',
  },
  roleDropdownItem: { paddingVertical: 12, paddingHorizontal: 16 },
  roleDropdownText: { fontSize: 13, fontWeight: '500', color: '#FFFFFF' },
});

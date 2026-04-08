import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet } from 'react-native';
import { ScreenContainer } from '../../src/components/layout';
import { Button } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { authService } from '../../src/services/auth';
import { getFirestore, doc, getDoc, updateDoc } from '@react-native-firebase/firestore';
import { COLORS } from '../../src/constants';

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const [displayName, setDisplayName] = useState('');
  const [address, setAddress] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    try {
      const userDoc = await getDoc(doc(getFirestore(), 'users', user.uid));
      if (userDoc.exists) {
        const data = userDoc.data();
        setDisplayName(data?.displayName || '');
        setAddress(data?.address || '');
      }
    } catch (err) {
      console.error('Load profile error:', err);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(getFirestore(), 'users', user.uid), {
        displayName: displayName.trim(),
        address: address.trim(),
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Save profile error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await authService.signOut();
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    loadProfile();
  };

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.header}>{'פרופיל'}</Text>

        {/* Avatar placeholder */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {displayName ? displayName.charAt(0).toUpperCase() : '?'}
            </Text>
          </View>
        </View>

        {/* Phone (read-only) */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>{'טלפון'}</Text>
          <View style={styles.fieldReadOnly}>
            <Text style={styles.fieldValue}>{user?.phoneNumber || '-'}</Text>
          </View>
        </View>

        {/* Name */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>{'שם'}</Text>
          {isEditing ? (
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              style={styles.fieldInput}
              placeholder="השם שלך"
              placeholderTextColor={COLORS.textTertiary}
            />
          ) : (
            <View style={styles.fieldReadOnly}>
              <Text style={styles.fieldValue}>{displayName || '-'}</Text>
            </View>
          )}
        </View>

        {/* Address */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>{'כתובת'}</Text>
          {isEditing ? (
            <TextInput
              value={address}
              onChangeText={setAddress}
              style={styles.fieldInput}
              placeholder="הכתובת שלך"
              placeholderTextColor={COLORS.textTertiary}
            />
          ) : (
            <View style={styles.fieldReadOnly}>
              <Text style={styles.fieldValue}>{address || 'לא הוגדר'}</Text>
            </View>
          )}
        </View>

        <View style={{ marginTop: 24, gap: 12 }}>
          {isEditing ? (
            <>
              <Button title="שמור" onPress={handleSave} isLoading={isSaving} />
              <Button title="ביטול" onPress={handleCancelEdit} variant="ghost" />
            </>
          ) : (
            <Button title="ערוך פרופיל" onPress={() => setIsEditing(true)} variant="secondary" />
          )}
        </View>
      </ScrollView>

      <Button title="התנתק" onPress={handleSignOut} variant="ghost" style={{ marginTop: 16 }} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 24,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  fieldReadOnly: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fieldValue: {
    fontSize: 16,
    color: COLORS.text,
  },
  fieldInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
});

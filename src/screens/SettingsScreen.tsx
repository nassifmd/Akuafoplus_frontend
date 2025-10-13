import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Platform,
  Linking,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Config from '../Config/config';
import { launchImageLibrary, ImageLibraryOptions } from 'react-native-image-picker';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import Icon from 'react-native-vector-icons/Feather';
import AlertPro from 'react-native-alert-pro';
import { Share } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';

type User = {
  name?: string;
  email?: string;
  role?: string;
  profilePicture?: string | null;
  promotionCode?: string;
  referralCount?: number;
  [key: string]: any;
};

type Subscription = {
  plan?: string;
  status?: string;
  endDate?: string;
  [key: string]: any;
};

const SettingsScreen = ({ navigation }: any) => {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // AlertPro state & helpers
  const alertRef = useRef<any>(null);
  const [alertOptions, setAlertOptions] = useState<{
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    showCancel?: boolean;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    title: '',
    message: '',
  });

  const openAlert = (opts: Partial<typeof alertOptions>) => {
    setAlertOptions(prev => ({
      ...prev,
      showCancel: false,
      confirmText: 'OK',
      cancelText: 'Cancel',
      ...opts,
    }));
    requestAnimationFrame(() => alertRef.current?.open());
  };

  const openConfirm = (opts: Partial<typeof alertOptions>) => {
    setAlertOptions(prev => ({
      ...prev,
      confirmText: 'Yes',
      cancelText: 'No',
      showCancel: true,
      ...opts,
    }));
    requestAnimationFrame(() => alertRef.current?.open());
  };

  const closeAlert = () => alertRef.current?.close();

  const copyReferralCode = async () => {
    if (!user?.promotionCode) {
      openAlert({ title: 'No code', message: 'You do not have a referral code yet.' });
      return;
    }
    try {
      Clipboard.setString(user.promotionCode);
      openAlert({ title: 'Copied', message: 'Referral code copied to clipboard.' });
    } catch (err) {
      openAlert({ title: 'Error', message: 'Failed to copy referral code.' });
    }
  };

  const shareReferralCode = async () => {
    if (!user?.promotionCode) {
      openAlert({ title: 'No code', message: 'You do not have a referral code yet.' });
      return;
    }
    try {
      await Share.share({
        message: `Join AkuafoPlus with my referral code: ${user.promotionCode}\nDownload the app and enter this code during registration.`,
      });
    } catch (err) {
      openAlert({ title: 'Error', message: 'Failed to share referral code.' });
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = await AsyncStorage.getItem('accessToken');
        let userRes;
        try {
          userRes = await axios.get(`${Config.API_BASE_URL}/user/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          // ensure promotion fields present
          setUser(userRes.data);
        } catch (userErr: any) {
          // If user endpoint fails, try expert endpoint
          if (userErr.response?.status === 404 || userErr.response?.status === 403) {
            const expertRes = await axios.get(`${Config.API_BASE_URL}/experts/me`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            setUser({
              name: `${expertRes.data.data.firstName} ${expertRes.data.data.lastName}`,
              email: expertRes.data.data.email,
              role: 'Expert',
              profilePicture: expertRes.data.data.profileImage,
            });
          } else {
            throw userErr;
          }
        }
        // Subscription fetch remains the same
        const subRes = await axios.get(`${Config.API_BASE_URL}/subscription/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSubscription(subRes.data);
        setImageError(false);
      } catch (err) {
        openAlert({
          title: 'Error',
          message: 'Could not load user data.',
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    setImageError(false);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [user?.profilePicture]);

  const handleEditProfile = () => navigation.navigate('EditProfileScreen', { user });
  const handleChangePassword = () => navigation.navigate('ChangePasswordScreen');
  const handleManageSubscription = () => navigation.navigate('SubscriptionScreen', { subscription });
  const handleFAQ = () => navigation.navigate('FAQScreen');
  const handleContactSupport = () => navigation.navigate('ContactSupportScreen');
  const handleLegal = () => navigation.navigate('LegalScreen');
  const handleTermsOfService = () => navigation.navigate('TermsOfServiceScreen');
  const handlePrivacyPolicy = () => navigation.navigate('PrivacyPolicyScreen');
  const handleDataUsageAgreement = () => navigation.navigate('DataUsageAgreementScreen');

  const requestStoragePermission = async () => {
    try {
      const permission = Platform.select({
        android:
          Number(Platform.Version) >= 33
            ? PERMISSIONS.ANDROID.READ_MEDIA_IMAGES
            : PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
        ios: PERMISSIONS.IOS.PHOTO_LIBRARY,
      });

      if (!permission) return false;

      const status = await check(permission);

      if (status === RESULTS.GRANTED) return true;

      if (status === RESULTS.DENIED) {
        const requestStatus = await request(permission);
        return requestStatus === RESULTS.GRANTED;
      }

      if (status === RESULTS.BLOCKED) {
        openAlert({
          title: 'Permission Required',
          message: 'Please enable photo access in Settings to upload a profile picture.',
          onConfirm: () => {
            Linking.openSettings();
            closeAlert();
          },
        });
        return false;
      }

      return false;
    } catch (err) {
      console.error('Permission error:', err);
      return false;
    }
  };

  const pickImage = async () => {
    try {
      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        openAlert({
          title: 'Permission Denied',
          message: 'You need to grant photo access to upload a profile picture.',
        });
        return;
      }

      const options: ImageLibraryOptions = {
        mediaType: 'photo',
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.7,
        includeBase64: false,
        selectionLimit: 1,
      };

      launchImageLibrary(options, async (response) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          openAlert({
            title: 'Error',
            message: response.errorMessage || 'Image picker error',
          });
          return;
        }

        const asset = response.assets?.[0];
        if (asset?.uri) {
          await uploadProfilePicture(asset.uri);
        }
      });
    } catch (err) {
      openAlert({
        title: 'Error',
        message: 'Failed to open image picker',
      });
    }
  };

  const uploadProfilePicture = async (uri: string) => {
    setUploading(true);
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const formData = new FormData();
      const filename = uri.split('/').pop();
      const ext = filename?.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeType = `image/${ext === 'heic' ? 'jpeg' : ext}`;

      formData.append('profilePicture', {
        uri: Platform.OS === 'ios' && !uri.startsWith('file://') ? `file://${uri}` : uri,
        name: filename || `profile_${Date.now()}.jpg`,
        type: mimeType,
      } as any);

      const response = await axios.post(
        `${Config.API_BASE_URL}/user/upload-profile-picture`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      const updatedUser = response.data.user;
      setUser(updatedUser);
      setImageError(false);
      openAlert({
        title: 'Success',
        message: 'Profile picture updated!',
      });
    } catch (err) {
      console.error('Upload error:', err);
      openAlert({
        title: 'Error',
        message: 'Failed to upload profile picture',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    openConfirm({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out?',
      onConfirm: async () => {
        closeAlert();
        await AsyncStorage.removeItem('accessToken');
        openAlert({
          title: 'Signed Out',
            message: 'You have been signed out successfully',
            onConfirm: () => {
              closeAlert();
              navigation.replace('LoginScreen');
            },
        });
      },
      onCancel: () => closeAlert(),
    });
  };

  const renderProfileImage = () => {
    if (imageError || !user?.profilePicture) {
      return (
        <View style={[styles.profilePic, styles.profilePicPlaceholder]}>
          <Text style={styles.placeholderText}>{user?.name?.charAt(0).toUpperCase() || 'U'}</Text>
        </View>
      );
    }

    return (
      <Image
        source={{ uri: user.profilePicture }}
        style={styles.profilePic}
        onError={() => setImageError(true)}
      />
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#388E3C" />
      </View>
    );
  }

  const renderSetting = (icon: string, label: string, onPress: () => void) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingContent}>
        <View style={styles.settingIconContainer}>
          <Icon name={icon} size={20} color="#4E342E" />
        </View>
        <Text style={styles.settingText}>{label}</Text>
        <Icon name="chevron-right" size={20} color="#D7CCC8" />
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <Animated.ScrollView 
        style={[styles.container, { opacity: fadeAnim }]}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        <View style={styles.profileSection}>
          <TouchableOpacity onPress={pickImage} disabled={uploading} activeOpacity={0.7}>
            <View style={styles.profilePicContainer}>
              {renderProfileImage()}
              <View style={styles.overlay}>
                <Icon name="camera" size={16} color="#FFF" />
              </View>
              {uploading && (
                <ActivityIndicator
                  style={styles.uploadingIndicator}
                  size="large"
                  color="#FFF"
                />
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user?.role || 'N/A'}</Text>
          </View>

          {/* Referral info */}
          <View style={{ marginTop: 12, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, color: '#6D4C41', marginBottom: 6 }}>Your referral code</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#4E342E', marginRight: 8 }}>
                {user?.promotionCode || '—'}
              </Text>
              <TouchableOpacity onPress={copyReferralCode} style={{ marginRight: 8 }}>
                <Icon name="copy" size={18} color="#388E3C" />
              </TouchableOpacity>
              <TouchableOpacity onPress={shareReferralCode}>
                <Icon name="share-2" size={18} color="#4E342E" />
              </TouchableOpacity>
            </View>

            {/* Referral progress */}
            <View style={{ width: 200, marginTop: 8 }}>
              <View style={{ height: 8, backgroundColor: '#E0E0E0', borderRadius: 8, overflow: 'hidden' }}>
                <View
                  style={{
                    height: 8,
                    backgroundColor: '#388E3C',
                    width: `${Math.min(100, ((user?.referralCount || 0) / 10) * 100)}%`,
                  }}
                />
              </View>
              <Text style={{ fontSize: 12, color: '#6D4C41', marginTop: 6 }}>
                {`${user?.referralCount || 0} / 10 referrals to upgrade`}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account Settings</Text>
          {renderSetting('user', 'Edit Profile', handleEditProfile)}
          {renderSetting('lock', 'Change Password', handleChangePassword)}
          {renderSetting('credit-card', 'Subscription', handleManageSubscription)}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Support</Text>
          {renderSetting('help-circle', 'FAQ & Help Center', handleFAQ)}
          {renderSetting('message-square', 'Contact Support', handleContactSupport)}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Legal</Text>
          {renderSetting('file-text', 'Legal Information', handleLegal)}
          {renderSetting('shield', 'Terms of Service', handleTermsOfService)}
          {renderSetting('lock', 'Privacy Policy', handlePrivacyPolicy)}
          {renderSetting('cpu', 'Data Usage Agreement', handleDataUsageAgreement)}
        </View>

        <TouchableOpacity 
          style={styles.logoutButton} 
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </Animated.ScrollView>

      <AlertPro
        ref={alertRef}
        title={alertOptions.title}
        message={alertOptions.message}
        textConfirm={alertOptions.confirmText || 'OK'}
        textCancel={alertOptions.cancelText || 'Cancel'}
        showCancel={alertOptions.showCancel}
        onConfirm={() => {
          const fn = alertOptions.onConfirm;
            fn && fn();
          if (!fn) closeAlert();
        }}
        onCancel={() => {
          alertOptions.onCancel ? alertOptions.onCancel() : closeAlert();
        }}
        customStyles={{
          mask: { backgroundColor: 'rgba(0,0,0,0.4)' },
          container: { borderRadius: 12 },
          buttonConfirm: { backgroundColor: '#388E3C' },
          buttonCancel: { backgroundColor: '#D32F2F' },
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#4E342E',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFEBE9',
  },
  profilePicContainer: { 
    position: 'relative', 
    marginBottom: 16,
  },
  profilePic: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#D7CCC8',
    backgroundColor: '#F5F5F5',
  },
  profilePicPlaceholder: { 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#D7CCC8',
  },
  placeholderText: { 
    fontSize: 36, 
    fontWeight: '600', 
    color: '#4E342E',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    backgroundColor: '#388E3C',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  uploadingIndicator: { 
    position: 'absolute', 
    top: '35%', 
    left: '35%',
  },
  name: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#4E342E',
    marginBottom: 4,
  },
  email: { 
    fontSize: 14, 
    color: '#795548', 
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: '#D7CCC8',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4E342E',
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#EFEBE9',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4E342E',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    letterSpacing: 0.5,
  },
  settingItem: {
    paddingHorizontal: 16,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  settingIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
    fontSize: 15,
    color: '#4E342E',
    fontWeight: '500',
  },
  logoutButton: {
    marginHorizontal: 16,
    marginTop: 32,
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#EFEBE9',
  },
  logoutButtonText: {
    color: '#D32F2F',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

export default SettingsScreen;
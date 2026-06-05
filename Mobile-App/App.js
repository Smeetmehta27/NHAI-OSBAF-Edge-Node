import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ActivityIndicator, TextInput, ScrollView, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

// The Edge Node API (Your Computer's IP on the Wi-Fi Network)
const API_BASE_URL = 'http://192.168.29.5:8000';

// ==========================================
// SCREEN: DASHBOARD
// ==========================================
const DashboardScreen = () => {
  const [stats, setStats] = useState({ users: 0, auths: 0, pending: 0, synced: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/dashboard`)
      .then(res => res.json())
      .then(data => {
        setStats({ users: data.total_users, auths: data.total_authentications, pending: data.pending_sync, synced: data.synced_records });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <View style={styles.screenContent}>
      {loading ? <ActivityIndicator size="large" color="#38bdf8" /> : (
        <View style={{ width: '100%' }}>
          <View style={styles.statBox}><Text style={styles.statLabel}>Total Personnel</Text><Text style={styles.statValue}>{stats.users}</Text></View>
          <View style={styles.statBox}><Text style={styles.statLabel}>Total Auths</Text><Text style={styles.statValue}>{stats.auths}</Text></View>
          <View style={[styles.statBox, { borderColor: '#facc15' }]}><Text style={styles.statLabel}>Pending Sync</Text><Text style={[styles.statValue, { color: '#facc15' }]}>{stats.pending}</Text></View>
          <View style={[styles.statBox, { borderColor: '#22c55e' }]}><Text style={styles.statLabel}>AWS Synced</Text><Text style={[styles.statValue, { color: '#22c55e' }]}>{stats.synced}</Text></View>
        </View>
      )}
    </View>
  );
};

// ==========================================
// SCREEN: SYNC CENTER
// ==========================================
const SyncScreen = () => {
  const [stats, setStats] = useState({ pending: 0, synced: 0 });
  const [syncing, setSyncing] = useState(false);

  const loadStats = () => {
    fetch(`${API_BASE_URL}/sync-stats`).then(r => r.json()).then(d => setStats(d)).catch(console.error);
  };

  useEffect(() => { loadStats(); }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch(`${API_BASE_URL}/sync`, { method: 'POST' });
      await fetch(`${API_BASE_URL}/purge`, { method: 'POST' }); // Local Vacuum
      Alert.alert("Success", "Logs synced to AWS and local storage purged (VACUUM).");
      loadStats();
    } catch (e) {
      Alert.alert("Network Error", "Edge node is currently offline.");
    }
    setSyncing(false);
  };

  return (
    <View style={styles.screenContent}>
      <Text style={{ color: '#94a3b8', fontSize: 16, marginBottom: 20 }}>NODE ID: NHAI-EDGE-01</Text>
      <View style={styles.statBox}><Text style={styles.statLabel}>Offline Logs Pending</Text><Text style={[styles.statValue, { color: '#facc15' }]}>{stats.pending}</Text></View>
      <View style={styles.statBox}><Text style={styles.statLabel}>Securely Synced</Text><Text style={[styles.statValue, { color: '#22c55e' }]}>{stats.synced}</Text></View>

      <TouchableOpacity style={[styles.btnPrimary, { marginTop: 30, opacity: stats.pending === 0 || syncing ? 0.5 : 1 }]}
        onPress={handleSync} disabled={stats.pending === 0 || syncing}>
        <Text style={styles.btnText}>{syncing ? "Syncing..." : "Simulate Network Restore"}</Text>
      </TouchableOpacity>
    </View>
  );
};

// ==========================================
// SCREEN: AUTHENTICATE
// ==========================================
const AuthenticateScreen = () => {
  const cameraRef = useRef(null);
  const [sessionId, setSessionId] = useState(null);
  const [statusMsg, setStatusMsg] = useState('Ready to Authenticate');
  const [isProcessing, setIsProcessing] = useState(false);
  const [authResult, setAuthResult] = useState(null);

  useEffect(() => {
    let interval;
    if (sessionId && !authResult) { interval = setInterval(processFrame, 800); }
    return () => clearInterval(interval);
  }, [sessionId, authResult]);

  const startAuth = async () => {
    setIsProcessing(true); setAuthResult(null); setStatusMsg('Initializing secure session...');
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/start`, { method: 'POST' });
      const data = await res.json();
      if (data.status === 'success') { setSessionId(data.session_id); setStatusMsg(`Challenge: Turn ${data.challenge}`); }
      else { setStatusMsg('Failed to start session.'); setIsProcessing(false); }
    } catch (e) { setStatusMsg('Network Error: Offline.'); setIsProcessing(false); }
  };

  const processFrame = async () => {
    if (!cameraRef.current || !sessionId) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.3, base64: true });
      const res = await fetch(`${API_BASE_URL}/api/auth/frame`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, image: `data:image/jpeg;base64,${photo.base64}` })
      });
      const result = await res.json();
      if (result.status === 'success') {
        setSessionId(null); setIsProcessing(false); setAuthResult(result.user); setStatusMsg('Authentication Complete!');
      } else if (result.status === 'failed' || result.status === 'error') {
        setSessionId(null); setIsProcessing(false); setStatusMsg(`Failed: ${result.message}`);
      } else { setStatusMsg(result.message); }
    } catch (e) { console.log(e); }
  };

  const reset = () => {
    setSessionId(null); setAuthResult(null); setStatusMsg('Ready to Authenticate'); setIsProcessing(false);
  };

  return (
    <View style={{ alignItems: 'center', width: '100%' }}>
      <View style={styles.cameraContainer}>
        <CameraView style={styles.camera} facing="front" ref={cameraRef} />
        <View style={styles.overlay} />
      </View>
      <Text style={styles.statusText}>{statusMsg}</Text>
      {isProcessing && !authResult && <ActivityIndicator size="large" color="#38bdf8" style={{ marginTop: 10 }} />}
      {authResult && (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>ACCESS GRANTED</Text>
          <Text style={{ color: 'white', fontSize: 18 }}>{authResult.name}</Text>
          <Text style={{ color: '#94a3b8' }}>Confidence: {(authResult.confidence * 100).toFixed(2)}%</Text>
        </View>
      )}
      <View style={styles.controls}>
        {!isProcessing && !authResult ? (
          <TouchableOpacity style={styles.btnPrimary} onPress={startAuth}>
            <Text style={styles.btnText}>Initiate Biometric Scan</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: '#475569' }]} onPress={reset}>
            <Text style={styles.btnText}>Cancel / Reset</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// ==========================================
// SCREEN: REGISTER
// ==========================================
const RegisterScreen = () => {
  const cameraRef = useRef(null);
  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const [statusMsg, setStatusMsg] = useState('Face the camera directly.');
  const [isProcessing, setIsProcessing] = useState(false);

  const startRegister = async () => {
    if (!userId || !name) { Alert.alert('Error', 'ID and Name required.'); return; }
    setIsProcessing(true); setStatusMsg('Extracting Biometrics...');
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.3, base64: true });

      // 1. Start
      let res = await fetch(`${API_BASE_URL}/api/register/start`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, name: name })
      });
      const startData = await res.json();

      // 2. Frame
      res = await fetch(`${API_BASE_URL}/api/register/frame`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: startData.session_id, image: `data:image/jpeg;base64,${photo.base64}` })
      });
      const frameData = await res.json();

      if (frameData.status !== "success") throw new Error(frameData.message);

      // 3. Complete
      res = await fetch(`${API_BASE_URL}/api/register/complete?session_id=${startData.session_id}`, { method: 'POST' });
      const compData = await res.json();

      if (compData.status === 'success') {
        setStatusMsg('Enrollment Successful!');
        setUserId(''); setName('');
      } else { throw new Error('Registration Failed'); }
    } catch (e) {
      setStatusMsg(`Failed: ${e.message}`);
    }
    setIsProcessing(false);
  };

  return (
    <View style={{ alignItems: 'center', width: '100%' }}>
      <TextInput style={styles.input} placeholderTextColor="#64748b" placeholder="Employee ID (e.g. EMP-101)" value={userId} onChangeText={setUserId} />
      <TextInput style={styles.input} placeholderTextColor="#64748b" placeholder="Full Name" value={name} onChangeText={setName} />
      <View style={styles.cameraContainerRect}>
        <CameraView style={styles.camera} facing="front" ref={cameraRef} />
      </View>
      <Text style={[styles.statusText, { marginTop: 10 }]}>{statusMsg}</Text>
      <TouchableOpacity style={[styles.btnPrimary, { marginTop: 10, opacity: isProcessing ? 0.5 : 1 }]} onPress={startRegister} disabled={isProcessing}>
        <Text style={styles.btnText}>{isProcessing ? "Processing..." : "Capture & Enroll"}</Text>
      </TouchableOpacity>
    </View>
  );
};

// ==========================================
// MAIN APP RENDERER
// ==========================================
export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [currentScreen, setCurrentScreen] = useState('Home');

  if (!permission) return <View style={styles.container} />;
  if (!permission.granted) {
    return (
      <View style={[styles.container, { justifyContent: 'center', padding: 20 }]}>
        <Text style={{ color: 'white', marginBottom: 20, fontSize: 18, textAlign: 'center' }}>Camera access is required for Datalake Biometrics</Text>
        <TouchableOpacity style={styles.btnPrimary} onPress={requestPermission}>
          <Text style={styles.btnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderHome = () => (
    <View style={styles.screenContent}>
      <Text style={styles.heroTitle}>Offline Secure Node</Text>
      <Text style={styles.heroSub}>Zero-Network Ready</Text>

      <View style={styles.grid}>
        <TouchableOpacity style={styles.gridCard} onPress={() => setCurrentScreen('Authenticate')}>
          <Text style={styles.cardIcon}>👤</Text>
          <Text style={styles.cardTitle}>Biometric Auth</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.gridCard} onPress={() => setCurrentScreen('Register')}>
          <Text style={styles.cardIcon}>📝</Text>
          <Text style={styles.cardTitle}>Enroll Personnel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.gridCard} onPress={() => setCurrentScreen('Dashboard')}>
          <Text style={styles.cardIcon}>📊</Text>
          <Text style={styles.cardTitle}>Live Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.gridCard} onPress={() => setCurrentScreen('Sync')}>
          <Text style={styles.cardIcon}>☁️</Text>
          <Text style={styles.cardTitle}>AWS Sync Center</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {currentScreen !== 'Home' ? (
          <TouchableOpacity style={styles.backBtn} onPress={() => setCurrentScreen('Home')}>
            <Text style={{ color: '#38bdf8', fontSize: 16, fontWeight: 'bold' }}>← Back</Text>
          </TouchableOpacity>
        ) : <View style={styles.backBtn} />}

        <Text style={styles.headerTitle}>Datalake 3.0</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollArea} keyboardShouldPersistTaps="handled">
        {currentScreen === 'Home' && renderHome()}
        {currentScreen === 'Authenticate' && <AuthenticateScreen />}
        {currentScreen === 'Register' && <RegisterScreen />}
        {currentScreen === 'Dashboard' && <DashboardScreen />}
        {currentScreen === 'Sync' && <SyncScreen />}
      </ScrollView>
    </SafeAreaView>
  );
}

// ==========================================
// STYLES
// ==========================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', paddingTop: 40, paddingBottom: 15, paddingHorizontal: 20, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#334155' },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  backBtn: { width: 60 },
  scrollArea: { flexGrow: 1, alignItems: 'center', padding: 20 },
  screenContent: { width: '100%', alignItems: 'center' },

  heroTitle: { color: '#f8fafc', fontSize: 28, fontWeight: 'bold', marginTop: 20 },
  heroSub: { color: '#38bdf8', fontSize: 16, marginBottom: 30 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', width: '100%' },
  gridCard: { width: '47%', backgroundColor: '#1e293b', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#334155', alignItems: 'center', marginBottom: 15 },
  cardIcon: { fontSize: 32, marginBottom: 10 },
  cardTitle: { color: 'white', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },

  statBox: { backgroundColor: '#1e293b', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#38bdf8', width: '100%', alignItems: 'center', marginBottom: 15 },
  statLabel: { color: '#94a3b8', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 },
  statValue: { color: '#38bdf8', fontSize: 40, fontWeight: 'bold', marginTop: 5 },

  cameraContainer: { width: 300, height: 300, borderRadius: 150, overflow: 'hidden', borderWidth: 4, borderColor: '#38bdf8', position: 'relative', marginTop: 10 },
  cameraContainerRect: { width: '100%', height: 300, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: '#38bdf8', marginTop: 10 },
  camera: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.3)' },

  input: { width: '100%', backgroundColor: '#1e293b', color: 'white', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#334155', marginBottom: 15, fontSize: 16 },

  statusText: { color: '#facc15', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginTop: 20, minHeight: 30 },
  resultBox: { marginTop: 15, padding: 15, backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 2, borderColor: '#22c55e', width: '100%', alignItems: 'center' },
  resultTitle: { color: '#22c55e', fontSize: 20, fontWeight: 'bold', marginBottom: 5 },

  controls: { marginTop: 20, width: '100%', alignItems: 'center' },
  btnPrimary: { backgroundColor: '#0284c7', paddingVertical: 16, paddingHorizontal: 30, borderRadius: 12, width: '100%', alignItems: 'center' },
  btnText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});
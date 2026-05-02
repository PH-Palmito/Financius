import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { Field } from '../components/ui';
import { env } from '../config/env';
import { supabase } from '../services/supabase';

export function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const canSubmit = email.includes('@') && password.length >= 6 && !loading;

  const submit = async () => {
    if (!supabase || !canSubmit) {
      return;
    }

    setLoading(true);
    setMessage('');

    const result =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({ email: email.trim(), password });

    setLoading(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    if (mode === 'signup' && !result.data.session) {
      setMessage('Cadastro criado. Verifique seu email para confirmar a conta.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.authShell}>
        <Text style={styles.brand}>{env.appName}</Text>
        <Text style={styles.authTitle}>
          {mode === 'signin' ? 'Entrar na carteira' : 'Criar conta'}
        </Text>
        <Text style={styles.authText}>
          Sincronize ativos, lancamentos e carteira por usuario com Supabase.
        </Text>

        <View style={styles.formCard}>
          <Field
            inputMode="text"
            label="Email"
            onChangeText={setEmail}
            placeholder="voce@email.com"
            value={email}
          />
          <Field
            inputMode="text"
            label="Senha"
            onChangeText={setPassword}
            placeholder="minimo 6 caracteres"
            secureTextEntry
            value={password}
          />

          {message ? <Text style={styles.authMessage}>{message}</Text> : null}

          <Pressable
            accessibilityRole="button"
            disabled={!canSubmit}
            onPress={submit}
            style={[styles.primaryButton, !canSubmit && styles.primaryButtonDisabled]}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? 'Aguarde...' : mode === 'signin' ? 'Entrar' : 'Cadastrar'}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => setMode((current) => (current === 'signin' ? 'signup' : 'signin'))}
            style={styles.authSwitch}
          >
            <Text style={styles.sectionAction}>
              {mode === 'signin' ? 'Criar uma conta' : 'Ja tenho conta'}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F6FA',
  },
  authShell: {
    alignSelf: 'center',
    flex: 1,
    justifyContent: 'center',
    maxWidth: 520,
    padding: 18,
    width: '100%',
  },
  brand: {
    color: '#172434',
    fontSize: 27,
    fontWeight: '900',
  },
  authTitle: {
    color: '#172434',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 18,
  },
  authText: {
    color: '#657487',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18,
    marginTop: 8,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D7E0EA',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14,
  },
  authMessage: {
    color: '#9A5A04',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
    marginBottom: 12,
    marginTop: 4,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#2868E8',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 44,
  },
  primaryButtonDisabled: {
    backgroundColor: '#AFC4EF',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  authSwitch: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    minHeight: 36,
  },
  sectionAction: {
    color: '#2868E8',
    fontSize: 13,
    fontWeight: '900',
  },
});

import React, { useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { parseTelegramAuthUrl } from '../utils/telegramAuth';

type RouteParams = {
  id?: string;
  user_id?: string;
  hash?: string;
  auth_date?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
};

export default function AuthCallbackScreen() {
  const route = useRoute();
  const { login } = useAuth();
  const { colors } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const didRun = useRef(false);

  const params = (route.params || {}) as RouteParams;

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    const doLogin = (userData: { telegramId: string; firstName: string; lastName?: string; username?: string; avatarUrl?: string }) => {
      login(userData).catch((e) => setError(e?.message || 'Ошибка входа'));
    };

    const id = params.id || params.user_id;
    const hash = params.hash;
    const authDate = params.auth_date;

    if (id && hash && authDate) {
      // #region agent log
      __DEV__ && fetch('http://127.0.0.1:7242/ingest/7f9949bb-083d-4b4a-87ed-e303213be9b4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthCallbackScreen:route.params',message:'Login from route params',data:{hasId:!!id,hasHash:!!hash,hasAuthDate:!!authDate},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
      // #endregion
      doLogin({
        telegramId: id,
        firstName: params.first_name || 'Пользователь',
        lastName: params.last_name || undefined,
        username: params.username || undefined,
        avatarUrl: params.photo_url || undefined,
      });
      return;
    }

    Linking.getInitialURL().then((url) => {
      // #region agent log
      __DEV__ && fetch('http://127.0.0.1:7242/ingest/7f9949bb-083d-4b4a-87ed-e303213be9b4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthCallbackScreen:getInitialURL',message:'getInitialURL result',data:{url:url?.slice(0,200),hasUrl:!!url},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
      // #endregion
      if (!url) {
        setError('Нет данных авторизации');
        return;
      }
      const userData = parseTelegramAuthUrl(url);
      // #region agent log
      __DEV__ && fetch('http://127.0.0.1:7242/ingest/7f9949bb-083d-4b4a-87ed-e303213be9b4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthCallbackScreen:parsed',message:'Parsed userData from URL',data:{hasUserData:!!userData},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
      // #endregion
      if (userData) {
        doLogin(userData);
      } else {
        setError('Нет данных авторизации');
      }
    });
  }, []);

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Вернитесь назад и попробуйте «Войти через Telegram» снова.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.text, { color: colors.text }]}>Вход…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
  },
  error: {
    fontSize: 16,
    textAlign: 'center',
  },
  hint: {
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
  },
});

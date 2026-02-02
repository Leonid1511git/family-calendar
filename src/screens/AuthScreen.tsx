import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Spacing, BorderRadius, FontSize, FontWeight } from '../constants/theme';
import { parseTelegramAuthUrl } from '../utils/telegramAuth';
import { CalendarPageLoader } from '../components';

import { TELEGRAM_CONFIG } from '../config/telegram';

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen() {
  const { login, isLoggingIn } = useAuth();
  const { colors, isDark } = useTheme();
  const [isLoading, setIsLoading] = useState(false);

  // При появлении экрана логина повторно проверяем deep link (на случай задержки getInitialURL)
  useFocusEffect(
    React.useCallback(() => {
      Linking.getInitialURL().then((url) => {
        if (!url) return;
        const userData = parseTelegramAuthUrl(url);
        if (userData) login(userData).catch(() => {});
      });
    }, [login])
  );

  // For development: Mock login without Telegram
  const handleMockLogin = async () => {
    setIsLoading(true);
    try {
      // #region agent log
      __DEV__ && fetch('http://127.0.0.1:7242/ingest/7f9949bb-083d-4b4a-87ed-e303213be9b4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthScreen.tsx:32',message:'handleMockLogin started',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // #region agent log
      __DEV__ && fetch('http://127.0.0.1:7242/ingest/7f9949bb-083d-4b4a-87ed-e303213be9b4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthScreen.tsx:40',message:'Creating mockUser',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      const mockUserData = {
        telegramId: `tg-${Date.now()}`,
        username: 'testuser',
        firstName: 'Тест',
        lastName: 'Пользователь',
      };
      
      // #region agent log
      __DEV__ && fetch('http://127.0.0.1:7242/ingest/7f9949bb-083d-4b4a-87ed-e303213be9b4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthScreen.tsx:49',message:'Calling login',data:{mockUserData},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      await login(mockUserData);
      
      // #region agent log
      __DEV__ && fetch('http://127.0.0.1:7242/ingest/7f9949bb-083d-4b4a-87ed-e303213be9b4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthScreen.tsx:53',message:'login completed',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
    } catch (error) {
      // #region agent log
      __DEV__ && fetch('http://127.0.0.1:7242/ingest/7f9949bb-083d-4b4a-87ed-e303213be9b4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthScreen.tsx:56',message:'login error',data:{error:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      Alert.alert('Ошибка', `Не удалось войти: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Telegram Login: открываем внешний браузер, возврат в приложение по deep link
  const handleTelegramLogin = async () => {
    if (!TELEGRAM_CONFIG.BOT_TOKEN?.trim()) {
      Alert.alert(
        'Не настроен вход через Telegram',
        'Токен бота не задан. Добавьте переменную EXPO_PUBLIC_TELEGRAM_BOT_TOKEN в EAS (Environment variables) и пересоберите приложение.'
      );
      return;
    }
    setIsLoading(true);
    try {
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'familycalendar',
        path: 'auth',
      });

      const botId = TELEGRAM_CONFIG.BOT_TOKEN.split(':')[0];
      const proxyUrl = TELEGRAM_CONFIG.AUTH_PROXY_URL;
      const authUrl = `${proxyUrl}/telegram-login.html?redirect_uri=${encodeURIComponent(
        redirectUri
      )}&bot_id=${botId}`;

      // #region agent log
      __DEV__ && fetch('http://127.0.0.1:7242/ingest/7f9949bb-083d-4b4a-87ed-e303213be9b4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthScreen.tsx:handleTelegramLogin',message:'Opening Telegram login',data:{AUTH_PROXY_URL:proxyUrl,redirectUri,authUrlLength:authUrl.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion

      // На Android release Linking.openURL иногда не открывает браузер — используем WebBrowser
      await WebBrowser.openBrowserAsync(authUrl, { createTask: true });
      // Открыт внешний браузер. После входа в Telegram пользователь попадёт на страницу
      // «Возврат в приложение» и по ссылке вернётся в приложение — обработают
      // useFocusEffect и AuthContext (getInitialURL / url event).
    } catch (error) {
      console.error('Telegram login error:', error);
      Alert.alert('Ошибка', `Не удалось открыть браузер: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.lg,
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: Spacing.xxl,
    },
    logo: {
      width: 120,
      height: 120,
      borderRadius: BorderRadius.xxl,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: Spacing.lg,
    },
    logoText: {
      fontSize: 48,
      color: colors.textInverse,
      fontWeight: FontWeight.bold,
    },
    title: {
      fontSize: FontSize.xxxl,
      fontWeight: FontWeight.bold,
      color: colors.text,
      marginBottom: Spacing.sm,
    },
    subtitle: {
      fontSize: FontSize.md,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    buttonContainer: {
      width: '100%',
      maxWidth: 320,
      gap: Spacing.md,
    },
    telegramButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0088cc',
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      borderRadius: BorderRadius.lg,
      gap: Spacing.sm,
    },
    telegramButtonText: {
      color: '#FFFFFF',
      fontSize: FontSize.md,
      fontWeight: FontWeight.semibold,
    },
    telegramHint: {
      fontSize: FontSize.sm,
      textAlign: 'center',
      marginTop: Spacing.sm,
      paddingHorizontal: Spacing.lg,
    },
    mockButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    mockButtonText: {
      color: colors.text,
      fontSize: FontSize.md,
      fontWeight: FontWeight.semibold,
    },
    infoContainer: {
      marginTop: Spacing.xl,
      alignItems: 'center',
    },
    infoText: {
      fontSize: FontSize.sm,
      color: colors.textTertiary,
      textAlign: 'center',
    },
  });

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {(isLoading || isLoggingIn) && <CalendarPageLoader fullScreen />}
      
      <View style={styles.logoContainer}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>📅</Text>
        </View>
        <Text style={styles.title}>Семейный календарь</Text>
        <Text style={styles.subtitle}>
          Планируйте события вместе{'\n'}с вашей семьёй
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.telegramButton}
          onPress={handleTelegramLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.telegramButtonText}>Войти через Telegram</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={[styles.telegramHint, { color: colors.textSecondary }]}>
          Откроется браузер. После входа вернитесь в приложение.
        </Text>

        {/* Только в режиме разработки — тестовый вход без Telegram */}
        {__DEV__ && (
          <TouchableOpacity
            style={styles.mockButton}
            onPress={handleMockLogin}
            disabled={isLoading}
          >
            <Text style={styles.mockButtonText}>Тестовый вход (Dev)</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          При входе вы присоединитесь к группе "Семья"{'\n'}
          и сможете видеть события всех участников
        </Text>
      </View>
    </View>
  );
}

# Исправление: Permission 'iam.serviceAccounts.signBlob' denied

Ошибка возникает при входе через Telegram: Cloud Function `getTelegramCustomToken` создаёт custom token через `admin.auth().createCustomToken()`, а сервисный аккаунт не имеет права подписывать токены.

## Важно: какой аккаунт правильный

**Cloud Functions выполняются от App Engine default service account**, а не от Firebase Admin SDK.

- ✅ Нужно: **`family-calendar-22abd@appspot.gserviceaccount.com`** (App Engine default)
- ❌ Не тот: `firebase-adminsdk-xxxx@family-calendar-22abd.iam.gserviceaccount.com` (это другой аккаунт)

Роль **Service Account Token Creator** нужно выдать именно **App Engine default** (`...@appspot.gserviceaccount.com`).

## Решение: выдать роль Service Account Token Creator

Сервисный аккаунт, от которого запускаются Cloud Functions — **App Engine default** (`PROJECT_ID@appspot.gserviceaccount.com`) — должен иметь роль **Service Account Token Creator** на самом себе.

### Вариант 1: через Google Cloud Console

1. Откройте [Google Cloud Console → IAM](https://console.cloud.google.com/iam-admin/iam?project=family-calendar-22abd).
2. В списке найдите **именно** сервисный аккаунт с email **`family-calendar-22abd@appspot.gserviceaccount.com`** (в столбце может быть подпись типа «App Engine default service account» или «Default compute service account»). **Не путать с** `firebase-adminsdk-...@...iam.gserviceaccount.com`.
3. Нажмите карандаш (Edit) у этой строки.
4. Нажмите **Add another role**.
5. Выберите **Service Account Token Creator**.
6. Сохраните (Save).

Если этого аккаунта нет в списке IAM, добавьте его: «Grant access» → в поле «New principals» введите `family-calendar-22abd@appspot.gserviceaccount.com` → добавьте роль **Service Account Token Creator** → Save.

### Вариант 2: через gcloud (терминал)

Установите [Google Cloud CLI](https://cloud.google.com/sdk/docs/install), войдите в аккаунт (`gcloud auth login`) и выполните:

```bash
# Проект
export PROJECT_ID=family-calendar-22abd

# Сервисный аккаунт App Engine по умолчанию (им пользуются Cloud Functions)
export SA_EMAIL="${PROJECT_ID}@appspot.gserviceaccount.com"

# Дать этому аккаунту роль Token Creator на самом себе (нужно для createCustomToken)
gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" \
  --project="$PROJECT_ID" \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/iam.serviceAccountTokenCreator"
```

После выполнения подождите 1–2 минуты и снова попробуйте вход через Telegram.

### Ссылки

- [Firebase: Create custom tokens](https://firebase.google.com/docs/auth/admin/create-custom-tokens#token_creation)
- [Troubleshooting: iam.serviceAccounts.signBlob](https://firebase.google.com/docs/auth/admin/create-custom-tokens#troubleshooting)

# Microsoft Teams連携（Azure / Microsoft Entra ID）手順書

この手順は、学生が学校アカウントでMicrosoft TeamsにOAuth接続し、Microsoft Graphから教育クラスと課題を取得するためのものです。アプリの本番デプロイや本番DB変更は、この手順だけでは実施しません。

## 1. Azureでアプリを登録

1. [Microsoft Entra admin center](https://entra.microsoft.com/) に学校テナントの管理者でログインする。
2. **Microsoft Entra ID → アプリの登録 → 新規登録**を開く。
3. 表示名を入力する（例: `Kosen Management Teams`）。
4. サポートするアカウントの種類は、学校テナントだけで使うなら **この組織のディレクトリ内のアカウントのみ**を推奨する。
5. リダイレクトURIは **Web** を選び、次の2つを登録する。

```text
http://localhost:3000/api/integrations/teams/callback
https://www.kosen-management.jp/api/integrations/teams/callback
```

ローカル用と本番用は完全一致が必要です。末尾のスラッシュの有無や `http` / `https` が異なるとOAuthで失敗します。

## 2. クライアントシークレットを作成

1. 登録したアプリの **証明書とシークレット → 新しいクライアントシークレット**を選ぶ。
2. 用途が分かる説明と有効期限を設定する。
3. 作成直後に表示される **Value** を安全な場所へ一度だけ控える。

シークレットのValueは後から再表示できません。Git、チャット、画面ログ、スクリーンショットには保存しないでください。期限前に新しいシークレットを追加し、切替後に古いものを削除します。

## 3. Microsoft Graphの委任アクセス許可を追加

**APIのアクセス許可 → アクセス許可の追加 → Microsoft Graph → 委任されたアクセス許可**から、次を追加します。

```text
User.Read
EduRoster.ReadBasic
EduAssignments.ReadBasic
```

OAuthの基本スコープとして、アプリは次も要求します。

```text
openid profile email offline_access
```

これらはログインと更新用トークンに使います。学校テナントの設定により管理者の同意が必要な場合は、**管理者の同意を与える**を実行してください。

この初期実装では、チャンネル本文の取得権限 `ChannelMessage.Read.All` は要求しません。チャンネル投稿まで対象にする場合は、別途権限・管理者同意・取得範囲の設計が必要です。

## 4. アプリの環境変数を設定

`.env.local` または本番環境の環境変数に、次を設定します。

```env
MICROSOFT_CLIENT_ID="Azureのアプリケーション（クライアント）ID"
MICROSOFT_CLIENT_SECRET="クライアントシークレットのValue"
MICROSOFT_TENANT_ID="学校テナントのディレクトリ（テナント）ID"
MICROSOFT_REDIRECT_URI="https://www.kosen-management.jp/api/integrations/teams/callback"
MICROSOFT_REDIRECT_URI_LOCAL="http://localhost:3000/api/integrations/teams/callback"
```

`MICROSOFT_TENANT_ID` は、学校テナントを限定する場合はテナントIDを設定します。複数の学校テナントを許可する設計にする場合だけ `organizations` を使います。

## 5. 動作確認

1. アプリにログインする。
2. Teams連携開始URLを開く。

```text
/api/integrations/teams/connect
```

3. 学校のMicrosoftアカウントで同意する。
4. Microsoft Graphからプロフィール、教育クラス、課題が取得されることを確認する。
5. アプリの課題一覧で、時間割に登録した教科名と一致するクラスの課題だけが表示されることを確認する。
6. 手動同期はログイン中に次を実行する。

```text
POST /api/integrations/teams/sync
```

接続状態は次で確認できます。

```text
GET /api/integrations/teams/status
```

## 6. 同期の仕様

- 学生自身の教育クラスを取得します。
- クラス名または説明が、アプリの時間割に登録されている教科名と一致したクラスだけを対象にします。
- 課題は学生本人に割り当てられたものだけを取得します。
- Teamsの課題本文とURLをアプリの補足欄へ保存します。
- 次回同期で取得されなくなったTeams課題は非表示にします。削除はしません。
- 更新用トークンはアプリ側で暗号化して保存します。
- 定期同期を有効にする場合は、`CRON_SECRET`を付けて次を呼び出します。

```text
GET /api/cron/teams-sync
```

## 7. トラブルシューティング

### `AADSTS50011` / redirect URI mismatch

Azureの登録値と、`MICROSOFT_REDIRECT_URI` の値が一文字単位で一致しているか確認します。特に本番ドメイン、パス、末尾スラッシュ、HTTP/HTTPSを確認してください。

### `consent_required` / 権限不足

学校テナントの管理者同意が必要な可能性があります。Microsoft EntraのAPIアクセス許可画面で、追加した権限と同意状態を確認します。

### クラスや課題が0件

学校アカウントでログインしているか、Teamsに教育クラスがあるか、アプリの時間割に教科名が登録されているかを確認します。個人用Microsoftアカウントでは教育APIの対象にならない場合があります。

### `invalid_grant`

更新用トークンの期限切れ、同意取り消し、シークレット期限切れなどが考えられます。Azure側のシークレットと同意状態を確認し、アプリのTeams連携を解除して再接続します。

## 8. 本番運用前チェック

- AzureのリダイレクトURIに本番URLだけでなく不要なURLが残っていない。
- クライアントシークレットをソースコードやGitに保存していない。
- `MICROSOFT_TENANT_ID` を学校テナントに固定している。
- Graph権限が必要最小限になっている。
- `CRON_SECRET` が本番とローカルで適切に分離されている。
- テストアカウントで、別教科・別クラスの課題が取り込まれないことを確認している。
- 本番デプロイ前にOAuthコールバック、同期、接続解除のログを確認できる状態にしている。

## 公式仕様

- [Microsoft identity platform OAuth 2.0 authorization code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)
- [List classes - Microsoft Graph](https://learn.microsoft.com/en-us/graph/api/educationclass-list?view=graph-rest-1.0)
- [List assignments - Microsoft Graph](https://learn.microsoft.com/en-us/graph/api/educationclass-list-assignment?view=graph-rest-1.0)
- [List channel messages - Microsoft Graph](https://learn.microsoft.com/en-us/graph/api/channel-list-messages?view=graph-rest-1.0)

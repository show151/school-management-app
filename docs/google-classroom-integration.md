# Google Classroom連携（生徒OAuth・定期同期）

本実装では、教師OAuthやPub/Subを使わず、ログイン中の生徒本人がGoogle Classroomを連携します。

```text
生徒ログイン → Google OAuth → refresh tokenを暗号化保存
             → 本人のコース・課題・お知らせを取得
             → 毎日1回の定期同期
```

## Google Cloud設定

1. Google Cloudプロジェクトを作成する。
2. Google Classroom APIを有効化する。
3. OAuth同意画面を作成する。
4. Web applicationのOAuthクライアントIDを作成する。
5. 承認済みリダイレクトURIに `https://<本番ドメイン>/api/integrations/classroom/callback` を登録する。

Pub/Sub TopicやPush Subscriptionは今回の基本フローでは不要です。既存Topicを残すことはできますが、新規Subscriptionは作成しません。

## 環境変数

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
GOOGLE_REDIRECT_URI_LOCAL
APP_ENCRYPTION_KEY
```

`APP_ENCRYPTION_KEY`は32バイトのhexまたはbase64です。refresh tokenはAES-256-GCMで暗号化して保存します。

Google Cloud ConsoleのOAuthクライアントには、次のURIを完全一致で登録します。

```text
http://localhost:3000/api/integrations/classroom/callback
https://www.kosen-management.jp/api/integrations/classroom/callback
```

## OAuthスコープ

```text
https://www.googleapis.com/auth/classroom.courses.readonly
https://www.googleapis.com/auth/classroom.coursework.me.readonly
https://www.googleapis.com/auth/classroom.announcements.readonly
https://www.googleapis.com/auth/classroom.profile.emails
```

Push通知用の`classroom.push-notifications`は要求しません。

## API

```text
GET    /api/integrations/classroom/connect
GET    /api/integrations/classroom/callback
POST   /api/integrations/classroom/sync
GET    /api/integrations/classroom/status
DELETE /api/integrations/classroom/connection
GET    /api/cron/classroom-sync
```

OAuth callbackではstateをJWTで検証し、現在のログインユーザーとOAuth開始ユーザーが一致する場合だけ接続を保存します。

## 同期処理

1. refresh tokenからaccess tokenを取得する。
2. `courses.list`で本人が所属するACTIVEコースを取得する。
3. `courses.courseWork.list`で公開済み課題を取得する。
4. `courses.courseWork.studentSubmissions.list`で本人の提出状況を取得する。
5. `courses.announcements.list`でお知らせを取得する。
6. Classroomの外部IDでTask／AnnouncementをUPSERTする。
7. `lastSyncedAt`を更新する。

課題は`userId + courseId + courseWorkId`で重複を防ぎます。お知らせは`AnnouncementRecipient`で生徒ごとの表示対象を管理し、別の生徒へ漏れないようにします。

Classroom上で提出済み（`TURNED_IN`、`RETURNED`、`STUDENT_EDITED_AFTER_TURN_IN`）の課題、およびアプリ内で完了にした課題は、同期時に一覧でも非表示にします。Classroom上で提出を取り消した課題（`RECLAIMED_BY_STUDENT`）や、アプリ内で未完了に戻した課題は再表示します。

管理者の課題一覧では、同じClassroom課題を生徒ごとのレコードとして複数表示せず、`courseId + courseWorkId`単位で1件に集約します。完了数・配布数は生徒ごとのレコードから集計し、締切変更・削除・再送信は集約された課題全体に適用されます。

## 定期同期

`.github/workflows/classroom-sync.yml`で毎日6:30（日本時間）に`/api/cron/classroom-sync`を呼び出します。`x-cron-secret`ヘッダーの値を`CRON_SECRET`と照合します。秘密情報をURLクエリには置きません。GitHub Actionsの手動実行（`workflow_dispatch`）も利用できます。

## 連携解除

`DELETE /api/integrations/classroom/connection`は現在のユーザーの接続だけを解除します。Googleのtoken revokeを試行し、DB上のrefresh tokenを無効化します。既に取り込んだ課題・お知らせは履歴として残します。

## セキュリティ

- OAuth stateを検証する。
- refresh tokenを平文保存しない。
- access tokenをブラウザへ渡さない。
- すべてのClassroom API呼び出しをサーバー側で行う。
- 接続情報・同期APIはログインユーザー自身の`userId`だけを扱う。
- Google Client Secretをクライアントへ公開しない。

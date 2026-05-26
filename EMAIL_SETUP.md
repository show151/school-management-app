# 📧 メール機能実装ガイド

このドキュメントは、学校管理アプリケーションに実装されたすべてのメール送信機能について説明しています。

## 🚀 セットアップ

### 1. Resend アカウント作成

メール機能を使うには、Resend を使用します。以下の手順でセットアップしてください：

1. [Resend](https://resend.com) にアクセス
2. アカウントを作成
3. API キーを取得
4. 送信元メールアドレスを設定

### 2. 環境変数の設定

`.env` ファイルに以下を追加します：

```env
# Resend 設定
RESEND_API_KEY="your-resend-api-key"
FROM_EMAIL="noreply@yourdomain.com"
APP_URL="http://localhost:3000"  # 本番環境では https:// で始まる URL
```

## 📨 実装済みメール機能

### 1. 📝 ユーザー登録確認メール

**対象**: 新規ユーザー登録時
**送信先**: ユーザーのメールアドレス
**機能**: 
- メールアドレス確認リンクを送信
- 24時間有効なトークンを使用
- ユーザーはメール内のリンクをクリックして確認

**API エンドポイント**:
```
POST /api/auth/register
```

**メール確認エンドポイント**:
```
GET /api/auth/verify?token={verification_token}
```

**実装ファイル**:
- `src/app/api/auth/register/route.ts`
- `src/app/api/auth/verify/route.ts`
- `src/lib/email.ts` (sendVerificationEmail)

---

### 2. 🔑 パスワードリセットメール

**対象**: ユーザーがパスワントをリセットしたい場合
**送信先**: ユーザーのメールアドレス
**機能**:
- パスワードリセットリンクを送信
- 24時間有効なトークンを使用
- ユーザーはリセットリンクから新しいパスワードを設定

**API エンドポイント - パスワードリセットリクエスト**:
```
POST /api/auth/forgot-password
Body: { "email": "user@example.com" }
```

**API エンドポイント - パスワード変更**:
```
POST /api/auth/reset-password
Body: { "token": "reset_token", "password": "NewPassword123!" }
```

**実装ファイル**:
- `src/app/api/auth/forgot-password/route.ts`
- `src/app/api/auth/reset-password/route.ts`
- `src/lib/email.ts` (sendPasswordResetEmail)

---

### 3. 🆕 新規ユーザー登録通知（管理者向け）

**対象**: 新しいユーザーが登録された時
**送信先**: 管理者のメールアドレス（ADMIN_EMAIL）
**機能**:
- ユーザー名、メールアドレス、登録日時を通知
- 管理画面へのリンクを含む

**トリガー**: ユーザー登録時（自動）

**実装ファイル**:
- `src/app/api/auth/register/route.ts`
- `src/lib/email.ts` (sendAdminNotificationEmail)

---

### 4. 📋 課題配布通知メール

**対象**: 管理者が課題を配布した時
**送信先**: すべてのユーザー
**機能**:
- 課題のタイトル、締切日を通知
- ダッシュボードへのリンクを含む
- 確認済みメールアドレスのユーザーのみに送信

**API エンドポイント**:
```
POST /api/admin/tasks
Body: {
  "subject": "数学",
  "title": "第5章 確認テスト",
  "dueDate": "2026-05-31T23:59:00Z"
}
```

**実装ファイル**:
- `src/app/api/admin/tasks/route.ts`
- `src/lib/email.ts` (sendTaskNotificationEmail)

---

### 5. 🧪 テスト情報通知メール

**対象**: 管理者がテスト情報を登録した時
**送信先**: すべてのユーザー
**機能**:
- テストの教科、範囲、実施日時を通知
- ダッシュボードへのリンクを含む
- 確認済みメールアドレスのユーザーのみに送信

**API エンドポイント**:
```
POST /api/admin/tests
Body: {
  "subject": "英語",
  "period": 4,
  "range": "Unit 1-3",
  "testDate": "2026-06-10T10:00:00Z"
}
```

**実装ファイル**:
- `src/app/api/admin/tests/route.ts`
- `src/lib/email.ts` (sendTestNotificationEmail)

---

### 6. 📢 お知らせメール

**対象**: 管理者がお知らせを投稿した時
**送信先**: すべてのユーザー
**機能**:
- タイトルと本文を通知
- ダッシュボードへのリンクを含む
- 確認済みメールアドレスのユーザーのみに送信

**API エンドポイント**:
```
POST /api/admin/announcements
Body: {
  "title": "校内テストについてのお知らせ",
  "body": "6月10日に校内テストが実施されます..."
}
```

**実装ファイル**:
- `src/app/api/admin/announcements/route.ts`
- `src/lib/email.ts` (sendAnnouncementEmail)

---

## 🔒 セキュリティ機能

### 1. トークン管理
- **検証トークン有効期限**: 24時間
- **リセットトークン有効期限**: 24時間
- **トークン形式**: 64文字の16進数（crypto.randomBytes(32)）

### 2. レート制限
- **登録**: 1時間に10回
- **ログイン**: 1時間に10回
- **パスワードリセット**: 1時間に5回

### 3. メール確認チェック
- ユーザーはメール確認まで**ログインできません**
- ログイン時にメール確認ステータスをチェック
- 未確認の場合は詳細なエラーメッセージを表示

### 4. 情報漏洩防止
- パスワードリセット時、ユーザー存在状況を隠す
- エラーメッセージは最小限に抑える
- 詳細ログはサーバー側に記録

---

## 📁 ファイル構成

### 新規追加ファイル

```
src/
├── lib/
│   ├── email.ts              # メール送信関数
│   ├── token.ts              # トークン管理
│   └── security.ts           # 既存（拡張）
├── app/api/auth/
│   ├── verify/
│   │   └── route.ts          # メール確認エンドポイント
│   ├── forgot-password/
│   │   └── route.ts          # パスワードリセット要求
│   ├── reset-password/
│   │   └── route.ts          # パスワード変更
│   ├── register/route.ts     # 既存（拡張）
│   └── login/route.ts        # 既存（拡張）
└── app/api/admin/
    ├── tests/
    │   └── route.ts          # テスト情報管理
    ├── tasks/route.ts        # 既存（拡張）
    └── announcements/route.ts # 既存（拡張）
```

### 更新ファイル

- `prisma/schema.prisma` - User モデルに email 関連フィールド追加
- `.env` - Resend 設定追加
- `package.json` - resend パッケージ追加

---

## 🧪 テスト方法

### 1. 新規ユーザー登録テスト
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "テストユーザー",
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'
```

### 2. メール確認テスト
```bash
curl "http://localhost:3000/api/auth/verify?token={verification_token}"
```

### 3. パスワードリセット要求
```bash
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

### 4. パスワードリセット
```bash
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "{reset_token}",
    "password": "NewPassword123!"
  }'
```

### 5. 課題配布テスト
```bash
curl -X POST http://localhost:3000/api/admin/tasks \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_token={admin_token}" \
  -d '{
    "subject": "数学",
    "title": "確認テスト",
    "dueDate": "2026-05-31T23:59:00Z"
  }'
```

---

## 🚨 トラブルシューティング

### メールが送信されない場合

1. **Resend API キーが正しいか確認**
   ```bash
   echo $RESEND_API_KEY
   ```

2. **送信元メールアドレスが設定されているか確認**
   - Resend ダッシュボードで確認
   - `.env` の FROM_EMAIL が正しいか確認

3. **ログを確認**
   ```bash
   # コンソール出力を確認
   npm run dev
   ```

4. **本番環境では HTTPS を使用**
   - `process.env.NODE_ENV === 'production'` 時に secure フラグが自動設定

### トークンが期限切れの場合

- 検証トークン: 24時間有効
- リセットトークン: 24時間有効
- 期限切れの場合は新たにリセットをリクエストする必要があります

### メール確認なしでログインできる場合

- ミドルウェアで `emailVerified` フラグをチェック
- キャッシュをクリアして再度試してください

---

## 📚 参考資料

- [Resend ドキュメント](https://resend.com/docs)
- [Node.js crypto モジュール](https://nodejs.org/api/crypto.html)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

---

## ✅ デプロイチェックリスト

本番環境にデプロイする前に以下を確認してください：

- [ ] `RESEND_API_KEY` を本番環境に設定
- [ ] `FROM_EMAIL` を本番ドメインのメールに変更
- [ ] `APP_URL` を本番 URL に変更 (https://)
- [ ] `NODE_ENV=production` に設定
- [ ] メール送信テストを実施
- [ ] SSL/TLS 証明書が有効
- [ ] ログ監視を設定
- [ ] メール送信失敗時の対応計画を立案

---

最終更新: 2026年5月26日

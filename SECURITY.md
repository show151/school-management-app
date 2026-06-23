# セキュリティ実装ガイド

このドキュメントは、学校管理アプリケーションに実装されたセキュリティ対策をまとめたものです。

## 📋 実装済みセキュリティ対策

### 1. 🔒 パスワード管理

- **bcrypt ハッシュ化**: salt round = 10
  - ファイル: `src/app/api/auth/register/route.ts`
  - ファイル: `src/app/api/auth/login/route.ts`
- **パスワードリセットトークンのハッシュ化**: SHA-256 で保存し、平文を DB に残さない
  - ファイル: `src/app/api/auth/forgot-password/route.ts`
  - ファイル: `src/app/api/auth/reset-password/route.ts`
- **パスワード強度要件**:
  - 8〜64文字
  - 大文字、小文字、数字、記号をそれぞれ1文字以上含む
  - バリデーション関数: `src/lib/security.ts` の `validatePassword()`

### 2. 🍪 Cookie セキュリティ

すべての認証 Cookie に以下の属性を設定:

```typescript
response.cookies.set('auth_token', token, {
  httpOnly: true,        // XSS 対策: JS からアクセス不可
  secure: true,          // HTTPS のみ（本番環境）
  sameSite: 'strict',    // CSRF 対策: クロスサイトリクエスト防止
  maxAge: 3600,          // 有効期限: 1時間
  path: '/',
});
```

### 3. 🎟️ JWT トークン管理

- **トークン有効期限**:
  - 通常ユーザー: 1時間
  - 管理者: 8時間
- **期限切れ処理**: `middleware.ts` で自動検出・削除
- **署名アルゴリズム**: HS256（HMAC-SHA256）
- **秘密鍵**: `JWT_SECRET` 環境変数

### 4. 📝 入力値バリデーション

すべての入力値に厳密なバリデーションを実装:

| 項目 | 検証内容 | ファイル |
|------|--------|--------|
| メール | RFC形式、254文字以下 | `src/lib/security.ts` |
| パスワード | 強度チェック | `src/lib/security.ts` |
| 名前 | 1〜100文字、XSS防止 | `src/lib/security.ts` |

### 5. ⏱️ レート制限（ブルートフォース攻撃対策）

IP アドレスベースのレート制限を実装し、`REDIS_URL` がある場合は Redis を優先して使います。

| エンドポイント | 制限 | ウィンドウ |
|-------------|------|---------|
| `/api/auth/register` | 1時間に10回 | 60分 |
| `/api/auth/login` | 1時間に10回 | 60分 |
| `/api/admin/auth/login` | 1時間に5回 | 60分 |
| `/api/auth/forgot-password` | 1時間に5回 | 60分 |

実装ファイル: `src/lib/rate-limit.ts`, `src/lib/redis-rate-limit.ts`

### 6. 🛡️ セキュリティヘッダー

`next.config.ts` で以下のヘッダーを設定:

| ヘッダー | 説明 | 値 |
|--------|------|-----|
| **CSP** | XSS 対策 | `default-src 'self'` など |
| **X-Frame-Options** | クリックジャッキング対策 | `DENY` |
| **X-Content-Type-Options** | MIME sniffing 対策 | `nosniff` |
| **X-XSS-Protection** | XSS 保護機能有効化 | `1; mode=block` |
| **Referrer-Policy** | リファラー制限 | `strict-origin-when-cross-origin` |
| **Permissions-Policy** | ブラウザ機能制限 | `camera=(), microphone=()` |
| **Strict-Transport-Security** | HTTPS 強制 | `max-age=31536000` |

### 7. 🚨 エラーメッセージ

- **情報漏洩防止**: ログイン/登録エラーは具体的な理由を隠す
- **デバッグログ**: サーバーコンソールに詳細情報を記録

### 8. 🔐 認証・認可（Middleware）

`middleware.ts` で実装:

- トークン検証（Edge Runtime で高速化）
- 保護されたルートへのアクセス制御
- 期限切れトークンの自動削除
- 管理者・ユーザー別アクセス制御
- 管理者向け IP ホワイトリスト（`ADMIN_IP_WHITELIST`）

### 9. 💾 データベース保護

- **Prisma**: パラメータ化クエリで SQL インジェクション対策
- **ユーザー分離**: クエリは常にユーザー ID で filter
- **パスワード非公開**: API 応答にパスワードを含めない
- **監査ログ**: `AuditLog` テーブルに認証・設定変更・管理者操作を記録

### 10. 🧾 監査ログ

以下の操作を監査ログとして記録しています。

- ユーザー登録
- ログイン / ログアウト
- パスワード変更
- パスワードリセット要求 / 完了
- 管理者ログイン / ログアウト
- 管理者によるユーザー削除
- 管理者による出席番号更新

### 11. 🚀 本番環境での追加対策

以下はアプリ内部だけでは完結しないため、インフラや運用で追加する対策です。

- [x] HTTPS/TLS の有効化（Cookie の `secure` と HSTS は自動、配信基盤側で HTTPS を有効化する）
- [x] Redis を使用したレート制限（`REDIS_URL` がある場合に自動切り替え）
- [ ] WAF（Web Application Firewall）の導入
- [x] 監査ログの記録
- [x] セッションタイムアウト時の自動ログアウト
- [ ] 2段階認証（2FA）の実装
- [x] パスワードリセット機能の安全な実装
- [x] IP ホワイトリスト（管理者向け）
- [ ] 定期的なセキュリティ監査
- [ ] OWASP Top 10 への対応確認

## 🔍 チェックリスト

### 開発時
- [x] パスワードを bcrypt でハッシュ化
- [x] Cookie に httpOnly を設定
- [x] CSRF トークン対策（SameSite）
- [x] CSP ヘッダーを設定
- [x] 入力値バリデーション
- [x] レート制限
- [x] トークン期限管理
- [x] エラーメッセージの最小化

### デプロイ前
- [x] `NODE_ENV=production` を設定する（Cookie の `secure` と HSTS の有効化条件）
- [ ] 配信基盤側で HTTPS/TLS を有効にする
- [x] `.env` ファイルが `.gitignore` に含まれている
- [x] `JWT_SECRET` を強力な値に設定する
- [x] `DATABASE_URL` を本番用 DB に設定する
- [x] `RESEND_API_KEY` と `FROM_EMAIL` を設定する
- [x] `APP_URL` を本番サイト URL に設定する
- [x] `CRON_SECRET` を GitHub Actions の secret と一致させる
- [x] `ADMIN_EMAIL` と `ADMIN_PASSWORD` を本番用の安全な値に設定する（env ベース管理者を使う場合）
- [x] データベースバックアップのエクスポート機能
- [x] ログ監視設定
- [ ] インシデント対応計画
- [ ] `REDIS_URL` の設定（レート制限強化を使う場合）
- [x] `ADMIN_IP_WHITELIST` の設定（管理者を特定 IP に制限する場合）

### 12. 💾 バックアップとデータ保護

管理画面からの手動バックアップに加えて、定期的な自動バックアップを実装しています。

- **手動エクスポート**
  - API: `src/app/api/admin/backup/route.ts`
  - 取得対象: `User`, `AuditLog`, `Lesson`, `Task`, `Test`, `Subject`, `DailyLink`, `Announcement`, `AnnouncementRead`
  - 形式: `application/json` のダウンロードファイル
  - 権限制御: 管理者ログイン済みのみ

- **自動バックアップ (Cron)**
  - API: `src/app/api/cron/backup/route.ts`
  - 実行方法: `.github/workflows/backup.yml` による定期実行 (GitHub Actions)
  - 認証保護: `CRON_SECRET` トークンによる検証

### 13. ⚙️ 定期処理（Cron Job）の保護

データベースのメンテナンスなどのバッチ処理は、外部から不正に実行されないよう保護されています。

- **保護メカニズム**: リクエストヘッダー `Authorization: Bearer <CRON_SECRET>` による検証
- **主なバッチ処理**:
  - `src/app/api/cron/task-reminder/route.ts` (課題リマインド通知)
  - `src/app/api/cron/task-cleanup/route.ts` (過去の課題クリーンアップ)
  - `src/app/api/cron/backup/route.ts` (データベース自動バックアップ)

## 参考リンク

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [bcrypt npm パッケージ](https://www.npmjs.com/package/bcrypt)
- [jose - JWT 処理（Edge Runtime 対応）](https://github.com/panva/jose)
- [Next.js セキュリティベストプラクティス](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [メール機能ガイド](./EMAIL_SETUP.md) - Resend を使用したメール送信機能

---

最終更新: 2026年6月23日

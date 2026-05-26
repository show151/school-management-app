# セキュリティ実装ガイド

このドキュメントは、学校管理アプリケーションに実装されたセキュリティ対策をまとめたものです。

## 📋 実装済みセキュリティ対策

### 1. 🔒 パスワード管理

- **bcrypt ハッシュ化**: salt round = 10
  - ファイル: `src/app/api/auth/register/route.ts`
  - ファイル: `src/app/api/auth/login/route.ts`
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

IP アドレスベースのレート制限を実装:

| エンドポイント | 制限 | ウィンドウ |
|-------------|------|---------|
| `/api/auth/register` | 1時間に10回 | 60分 |
| `/api/auth/login` | 1時間に10回 | 60分 |
| `/api/admin/auth/login` | 1時間に5回 | 60分 |

実装ファイル: `src/lib/rate-limit.ts`

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

### 9. 💾 データベース保護

- **Prisma**: パラメータ化クエリで SQL インジェクション対策
- **ユーザー分離**: クエリは常にユーザー ID で filter
- **パスワード非公開**: API 応答にパスワードを含めない

### 10. 🚀 本番環境での追加対策

以下は本番環境でさらに推奨される対策:

- [ ] HTTPS/TLS の有効化（環境変数 `NODE_ENV=production` で自動）
- [ ] Redis を使用したレート制限（現在はインメモリ）
- [ ] WAF（Web Application Firewall）の導入
- [ ] 監査ログの記録
- [ ] セッションタイムアウト時の自動ログアウト
- [ ] 2段階認証（2FA）の実装
- [ ] パスワードリセット機能の安全な実装
- [ ] IP ホワイトリスト（管理者向け）
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
- [ ] `NODE_ENV=production` 設定
- [ ] `.env` ファイルが `.gitignore` に含まれている
- [ ] HTTPS が有効
- [ ] `JWT_SECRET` を強力な値に設定
- [ ] `ADMIN_PASSWORD` を強力な値に設定
- [ ] データベースバックアップ設定
- [ ] ログ監視設定
- [ ] インシデント対応計画

## 参考リンク

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [bcrypt npm パッケージ](https://www.npmjs.com/package/bcrypt)
- [jose - JWT 処理（Edge Runtime 対応）](https://github.com/panva/jose)
- [Next.js セキュリティベストプラクティス](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [メール機能ガイド](./EMAIL_SETUP.md) - Resend を使用したメール送信機能

---

最終更新: 2026年5月26日

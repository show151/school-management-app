# 高専生活サポートアプリ

- アプリサイト: [https://www.kosen-management.jp](https://www.kosen-management.jp)
- 制作時間: 30時間30分

課題・時間割・連絡・テスト情報をまとめて管理する Next.js アプリです。生徒はダッシュボードで日々の情報を確認でき、管理者はユーザー・教科・課題・テスト・連絡を一元的に運用できます。

## 🚀 アピールポイント・創意工夫した箇所

- **一元化された生徒向けダッシュボード**: 課題の完了チェック、締切の残り日数、時間割、未読連絡、テスト予定など、学生生活に必要な情報を1画面で完結して確認できるようにUI/UXを工夫しました。
- **柔軟な管理者向け機能**: ユーザー管理、教科登録、時間割、課題、テスト、日々の連絡を統合的に管理・操作できるダッシュボードを構築しました。
- **Markdownと安全なHTML変換の連携**: 連絡文はMarkdownで記述でき、メール送信時や画面表示時には安全なHTMLに自動変換（サニタイズ処理付き）されるように実装しました。
- **「出席番号」を活用した柔軟な絞り込み**: 学校特有の「出席番号」という概念を取り入れ、ユーザー自身が設定できるだけでなく、管理者が通知（課題・テスト・連絡）の対象範囲を絞り込むための強力なフィルターとして活用する工夫を行いました。
- **堅牢なセキュリティの追求**: 個人情報を扱う学校アプリとして、単なる機能実装に留まらず、RBAC、IP制限、レート制限、監査ログ、CSRF/XSS対策など、本番水準のセキュアな設計を徹底しました。

## セキュリティ設計

![セキュリティ構成](public/readme/security.svg)

## アプリ画面

### ログイン
![ログイン](public/readme/login.png)

### 新規登録
![新規登録](public/readme/newaccount.png)

### パスワードを忘れたとき
![パスワードを忘れたとき](public/readme/passwordreset.png)

### ダッシュボード
![ダッシュボード 1](public/readme/dashboard1.png)
![ダッシュボード 2](public/readme/dashboard2.png)
![ダッシュボード 3](public/readme/dashboard3.png)
![ダッシュボード 4](public/readme/dashboard4.png)

### 課題一覧
![課題一覧](public/readme/assignment.png)

### テストスケジュール
![テストスケジュール](public/readme/test.png)

### 連絡一覧
![連絡一覧](public/readme/announce.png)

### 設定画面
![設定画面](public/readme/setting.png)

## 主な機能

### 生徒向け

- ログイン / 新規登録 / パスワード再設定
- 出席番号の登録
- ダッシュボードで直近の予定を一覧表示
  - 時間割
  - 期限が近い課題と完了状態の切り替え
  - 未読連絡の確認と既読化
  - 近いテストの予定
- 専用ページでの詳細確認
  - 課題一覧
  - テストスケジュール
  - 連絡一覧
- 設定画面で表示名と出席番号を後から変更可能

### 管理者向け

- ユーザー管理
  - 登録済みユーザーの一覧表示
  - 出席番号の後から編集
  - ユーザー削除
- 教科管理 (科目と担当者の登録)
- 授業 / 時間割管理
- 課題管理
  - 課題の登録と削除
  - 生徒への通知送信
- テスト管理
  - テスト日程、範囲、特記事項を登録
  - 特記事項は Markdown 対応
  - 出席番号範囲を指定した通知送信
- 日々の連絡
  - お知らせ登録
  - Markdown 対応の本文をメール送信
  - テスト連絡の送信にも対応
- 日々のリンク管理
  - リモート授業やオンライン資料へのリンク共有

### 通知の特徴

- 対象ユーザーを個別選択できます。
- 出席番号の From / To を指定して通知対象を絞れます。
- テスト連絡では特記事項を含めて通知できます。
- 課題の締切が近いユーザーには cron でリマインドを送れます。

## セキュリティ設計

このアプリは、セキュリティと堅牢性を重視し、安全な設計を採用しています。

### 認証・認可およびアクセス制御
- **ロールベースのアクセス制御 (RBAC)**: 一般ユーザーと管理者を明確にロール（役割）で分離し、管理画面（`/admin`）および管理者用API（`/api/admin`）へのアクセスを管理者権限を持つアカウントのみに制限しています。
- **管理者ページへのIPアドレス制限**: 環境変数 `ADMIN_IP_WHITELIST` で許可された特定のIPアドレスからのみ管理者機能にアクセスできるように制限し、不正なアクセスを防ぎます。
- **新規登録時のメールアドレス確認機能**: 新規登録時に有効期限付きの確認用トークン（`verificationToken`）をメールで送信し、認証リンクをクリックして初めてアカウントが有効化（`emailVerified: true`）される仕組みです。
- **メールによるパスワード再設定機能**: パスワード再設定時に、一時的で安全なワンタイムトークン（`resetToken`）を発行・検証し、本人のみが安全に再設定できるようにします。
- **HttpOnly Cookie によるJWTセッション管理**: 認証トークンはブラウザ側JavaScriptからアクセスできない `HttpOnly` 属性付きの Cookie に格納し、`Secure`, `SameSite: Strict` 属性も設定することで、XSSやCSRFのリスクを最小化しています。JWTの署名・検証には `jose` を使用し、middlewareでログイン期限切れトークンを検知した際は自動で Cookie を削除します。

### 不正アクセス・攻撃対策
- **ブルートフォース攻撃対策のレート制限 (Rate Limiting)**: ログイン、新規登録、パスワード再設定の各エンドポイントにおいて、同一IPからの短時間の大量リクエストを制限します（Redisによる共有管理およびインメモリへのフォールバック対応）。
- **セキュリティ監査ログの自動記録 (Security Audit Log)**: ログインの成否、ログアウト、パスワード変更、ユーザー情報の編集・削除などのセキュリティ上重要なイベントを、実行アクター、IPアドレス、User-Agent、処理結果とともに `AuditLog` テーブルに記録します。
- **パスワードの強力なハッシュ化**: ユーザーパスワードは `bcrypt` を用いてソルト付きで安全にハッシュ化され、データベースに保存されます。
- **Stored XSS（蓄積型XSS）の防止**: マークダウン由来の HTML 文字列は、`dangerouslySetInnerHTML` で描画する前に `DOMPurify (isomorphic-dompurify)` によってサニタイズ処理を実施しています。
- **Next.js セキュリティヘッダーの設定**: `next.config.ts` で適切なセキュリティヘッダー（`Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`）を設定しています。
- **Cron用APIの保護**: 課題リマインダー等のバッチ処理エンドポイントは、`CRON_SECRET` を使ったヘッダー署名検証によって保護されています。

## 技術スタック

- Next.js 16 (App Router)
- React 19
- TypeScript
- Prisma
- PostgreSQL
- Tailwind CSS v4
- bcrypt
- jose
- Resend
- Redis 対応のレート制限

## ディレクトリの見どころ

### 生徒向け画面 (`src/app/dashboard/*`, `src/app/auth/*`)
- `src/app/page.tsx` : ログイン
- `src/app/auth/register/page.tsx` : 新規登録
- `src/app/auth/forgot-password/page.tsx` : パスワード再設定
- `src/app/dashboard/page.tsx` : 生徒ダッシュボード
- `src/app/dashboard/tasks/page.tsx` : 課題一覧
- `src/app/dashboard/tests/page.tsx` : テストスケジュール
- `src/app/dashboard/announcements/page.tsx` : 連絡一覧
- `src/app/dashboard/settings/page.tsx` : 設定画面

### 管理者向け画面 (`src/app/admin/*`)
- `src/app/admin/page.tsx` : 管理メニュー
- `src/app/admin/users/page.tsx` : ユーザー管理
- `src/app/admin/subjects/page.tsx` : 教科管理
- `src/app/admin/lessons/page.tsx` : 授業/時間割管理
- `src/app/admin/tasks/page.tsx` : 課題管理
- `src/app/admin/tests/page.tsx` : テスト管理
- `src/app/admin/announcements/page.tsx` : 日々の連絡
- `src/app/admin/daily-links/page.tsx` : 日々のリンク

### API・バッチ処理 (`src/app/api/*`, `.github/workflows/*`)
- `src/app/api/auth/*` : 認証 API
- `src/app/api/admin/*` : 管理者 API
- `src/app/api/cron/task-reminder/route.ts` : 課題リマインド cron
- `src/app/api/cron/task-cleanup/route.ts` : 過去の課題クリーンアップ cron
- `src/app/api/cron/backup/route.ts` : データベースバックアップ cron
- `.github/workflows/task-cleanup.yml` : 課題クリーンアップの定期実行 (GitHub Actions)
- `.github/workflows/backup.yml` : データベースバックアップの定期実行 (GitHub Actions)

### 共通処理 (`src/lib/*`)
- `src/lib/email.ts` : メール送信処理
- `src/lib/markdown.ts` : Markdown → HTML 変換
- `src/lib/security.ts` : 入力検証とサニタイズ処理

## 開発方法

### 必要条件

- Node.js
- PostgreSQL

### インストール

```bash
npm install
```

### 開発サーバー

```bash
npm run dev
```

### 本番ビルド

```bash
npm run build
```

### Lint

```bash
npm run lint
```

## 環境変数

最低限、以下を設定してください。

```bash
DATABASE_URL="postgresql://..."
JWT_SECRET="your_jwt_secret_here"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="change-me"
RESEND_API_KEY=""
FROM_EMAIL="onboarding@example.com"
APP_URL="http://localhost:3000"
CRON_SECRET="your_shared_cron_secret"
```

## 💡 実装における工夫・こだわった点（技術面）

- **Edge Runtime との互換性**: JWTの署名・検証には軽量な `jose` ライブラリを採用し、Next.js の Middleware (Edge Runtime) 上で高速かつ安全に動作するよう工夫しています。
- **段階的なアカウント有効化**: セキュリティ向上のため、新規登録時に即座にログインさせるのではなく、検証用トークンをメール送信してアドレスの所有確認を行うフローを実装しました。
- **Redisとインメモリのハイブリッド・レート制限**: ブルートフォース攻撃対策として、Redisが利用可能な環境ではRedisで一元管理し、そうでない環境ではインメモリで動作するフォールバック機構を実装し、インフラ環境に依存しない堅牢性を持たせました。
- **データのバックアップと定期実行**: GitHub Actions の Cron 機能と Next.js の API Routes を組み合わせ、`CRON_SECRET` で保護されたエンドポイントを定期的に叩くことで、データベースの自動バックアップや期限切れ課題の自動クリーンアップを実現しています。
- **出席番号システムの柔軟性**: 出席番号は新規登録時に入力可能で、後から設定画面で変更できる仕様にしつつ、管理者側からも調整可能にすることで、学年更新時の運用負荷を下げる設計にしています。

## 確認済み

- `npm run build` でビルド確認済み

## ライセンス

必要に応じて追記してください。

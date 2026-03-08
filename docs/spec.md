# nicolens 仕様書

## 概要

ニコニコ動画のSnapshot検索API v2を用いた、公式よりも軽量な動画検索Webサイト。

## ターゲットユーザー

- **一般視聴者**: 動画を素早く探したいカジュアルユーザー
- **ヘビーユーザー**: 公式検索に不満があり、高度なフィルタや高速検索を求めるパワーユーザー

## 「軽量」の定義

- **表示速度**: ページの読み込み・レンダリングが高速
- **UIのシンプルさ**: 余計な要素がなく、検索と結果表示に特化
- **データ通信量の削減**: 必要なデータだけを取得

## 機能一覧

### 1. 検索機能

- キーワード検索（AND/OR/NOT対応）
- タグ完全一致検索
- ソート機能（再生数、投稿日、コメント数、マイリスト数、いいね数 / 昇順・降順）

### 2. 検索フィルタ

APIがサポートする全フィルタを実装:

- 再生数範囲（viewCounter）
- 投稿日範囲（startTime）
- 動画の長さ（lengthSeconds）
- ジャンル選択（genre）
- コメント数範囲（commentCounter）
- マイリスト数範囲（mylistCounter）
- いいね数範囲（likeCounter）

### 3. 検索結果表示

- **表示モード切替**: グリッド表示（カード形式）/ リスト表示（コンパクト横並び）をトグルで切替可能。選択はlocalStorageに保存
- **表示件数変更**: 25件 / 50件 / 100件 から選択可能
- **検索結果件数の強調表示**: 総ヒット数をツールバーに目立つ形で表示
- **キーワードハイライト**: 検索キーワードに一致するタイトル・タグ部分を黄色でハイライト表示（AND/OR/NOT構文を考慮）
- 表示項目: サムネイル、タイトル、再生数、コメント数、マイリスト数、いいね数、投稿日、動画の長さ、タグ、ジャンル、最新コメント
- 従来型ページネーション
- デフォルト表示件数: 50件

### 4. URL共有

- 検索条件をクエリパラメータに反映
- URLで検索結果を共有・ブックマーク可能

### 5. 検索履歴

- localStorageに検索履歴を保存
- 履歴からの再検索

### 6. テーマ

- ダーク・ライト両対応（shadcnのテーマ機能）
- システム設定に連動 + 手動切替

## 認証

- **不要**: 認証なしで全機能公開
- ユーザー固有の保存機能はlocalStorageで対応

## データベース

- **DB不要**
- 将来的に必要になった場合にPostgreSQLを使用

## UI/UX

### ページ構成

| ページ | パス | 内容 |
|--------|------|------|
| トップ | `/` | 中央に検索バー（Google風） |
| 検索結果 | `/search?q=...` | 検索バー + フィルタ + カードグリッド |

### レスポンシブ

- PC主体で設計しつつモバイルも使える

### 動画への遷移

- タイトルクリックで `https://nico.ms/{contentId}` を新しいタブで開く

## API通信

- **サーバーサイドプロキシ**: Next.js Route Handlers経由
  - レート制限の制御
  - クライアントIPの隠蔽
  - レスポンスのキャッシュ（インメモリ）

### 取得フィールド

contentId, title, description, userId, viewCounter, mylistCounter, likeCounter, lengthSeconds, thumbnailUrl, startTime, lastResBody, commentCounter, lastCommentTime, categoryTags, tags, genre

## エラーハンドリング

- APIエラーの種類に応じた詳細メッセージ
  - 400: 検索条件のエラー
  - 500: サーバーエラー（リトライ案内）
  - 503: メンテナンス中の案内

## 技術スタック

- **フレームワーク**: Next.js (App Router)
- **ディレクトリ構成**: FSD (Feature-Sliced Design)
- **UIライブラリ**: shadcn/ui
- **言語**: TypeScript (tsgo)
- **Linter**: oxlint
- **パッケージマネージャー**: pnpm
- **モノレポ**: Turborepo
- **Dead code検出**: knip
- **デプロイ先**: 未定

## モノレポ構成

```
nicolens/
├── apps/
│   └── web/          # Next.js アプリ（FSD構成）
├── packages/
│   └── tsconfig/     # 共有TypeScript設定
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

- `apps/web`: メインのNext.jsアプリケーション。FSDディレクトリ構成で実装
- `packages/tsconfig`: 共有のtsconfig設定
- 将来的にパッケージを追加する際のスケーラビリティを確保

## ブランディング

- サイト名: **nicolens**（暫定、変更可能）

## API仕様概要

- エンドポイント: `https://snapshot.search.nicovideo.jp/api/v2/snapshot/video/contents/search`
- バージョン確認: `https://snapshot.search.nicovideo.jp/api/v2/snapshot/version`
- データ更新: 毎日AM5:00（JST）
- 制限: _limit最大100件、_offset最大100,000
- 詳細: `docs/snapshot-api.md` 参照

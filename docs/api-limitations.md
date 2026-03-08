# Snapshot API の制限事項

## 複数フィールドでのソート（非対応）

### 結論

Snapshot API v2 の `_sort` パラメータは **単一フィールドのみ対応** しているため、複数条件でのソート（例：「再生数で降順、同じ再生数なら投稿日で昇順」）は実装しない。

### 調査内容（2026-03-08）

- 公式ドキュメント（https://site.nicovideo.jp/search-api-docs/snapshot）を確認。`_sort` は「ソートの方向の記号とフィールド名を連結したもの」で単一値を受け取る仕様
- 既存のクライアントライブラリ（Python: NicoApiClient, Ruby: niconico_search, PHP: kawax/niconico 等）全てが単一フィールドソートのみ実装
- カンマ区切りやパイプ区切り等で複数フィールドを渡せるような仕様・実例は見つからなかった

### 検討した代替案と却下理由

| 方法 | 仕組み | 却下理由 |
|------|--------|----------|
| ページ内クライアントソート | API結果（最大100件）をブラウザで再ソート | ページ内でしかソートされないため実質無意味 |
| 全件取得+サーバーソート | サーバーで全結果を取得→マルチソート→キャッシュ | 1検索あたり10〜1000リクエストがAPIに発生。「節度ある利用」に反する。初回ロード10秒〜数分 |
| 複合スコア計算 | フィールドを正規化して重み付き合計 | 正規化の基準が不明確。UXが複雑 |

### 参考リンク

- https://site.nicovideo.jp/search-api-docs/snapshot
- https://github.com/Javakky/NicoApiClient
- https://zenn.dev/javakky/articles/3f9cd733554846
- https://iwag.github.io/search-nicovideo-rb/search_api.html

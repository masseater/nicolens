# ニコニコ動画 非公式API一覧

> 出典: https://qiita.com/anmoti/items/a55b16ae0c21faf63b41
> 取得日: 2026-03-08

## 注意

ここに載っているAPIの大半は公表されていないAPIです。自己責任で使用してください。
ニコニコ動画のサーバーに負担がかからないよう、リクエストは最小限にとどめ、UserAgentを適切に指定すること。

## 共通ヘッダー

```
X-Frontend-Id: 2
X-Frontend-Version: 9.46
X-Niconico-Language: ja-jp
X-Client-Os-Type: others
```

## 認証

ニコニコでは `user_session` をアカウント認証に使用。
形式: `user_session=user_session_<userid>_<token>`

## ActionTrackID

コメント取得等に必要。形式: `<10文字英数字>_<UnixTime>`

---

## www.nicovideo.jp

### api/watch/v3 & api/watch/v3_guest

動画情報取得。

- `GET https://www.nicovideo.jp/api/watch/v3/<videoID>` (ログイン必須)
- `GET https://www.nicovideo.jp/api/watch/v3_guest/<videoID>` (ゲスト用)

必須ヘッダー: `X-Frontend-Id`, `X-Frontend-Version`
必須パラメータ: `actionTrackId`

---

## nvapi.nicovideo.jp

### v1/hello

アプリ更新確認。

- `GET https://nvapi.nicovideo.jp/v1/hello`

必須ヘッダー: `X-Frontend-Id`, `X-Frontend-Version`（小数点必須）
パラメータ: `osVersion`

### v2/videos/{id}/tags

動画のタグ一覧取得（v1は404、v2に移行）。

- `GET https://nvapi.nicovideo.jp/v2/videos/<videoID>/tags`

必須ヘッダー: `X-Frontend-Id`, `X-Frontend-Version`, `X-Tag-Edit-Key`

### v1/ranking/teiban/featured-keys/{featuredKey}/trend-tags

定番ランキングのトレンドタグ取得。

- `GET https://nvapi.nicovideo.jp/v1/ranking/teiban/featured-keys/{featuredKey}/trend-tags`

---

## account.nicovideo.jp

### login/redirector

メール/パスワードログイン。

### api/public/v2/user.json

アカウント個人情報取得。

### api/v1/register/account_passport

ゲストアカウント作成（暗号署名使用）。

---

## snapshot.search.nicovideo.jp (公開API)

### api/v2/snapshot/video/contents/search

動画検索。詳細は snapshot-api.md 参照。

### api/v2/snapshot/version

スナップショットの最終更新日時取得。

---

## dcdn.cdn.nimg.jp

### nicovideo/old-ranking/

過去のランキングデータ取得。

---

## タグサジェストAPIについて

2026年3月時点で、タグサジェスト（タグ補完/オートコンプリート）専用のAPIエンドポイントは
Web上の公開情報からは特定できていない。

ニコニコ動画にはサジェスト機能が存在する（検索バー、タグ編集欄）が、
そのエンドポイントは非公開で、ブラウザのDevToolsで実際にリクエストを観察する必要がある。

参考:
- https://github.com/niconicolibs/api
- https://blog.nicovideo.jp/niconews/ni061608.html (タグ編集サジェスト機能追加告知)
- https://blog.nicovideo.jp/niconews/ni043879.html (検索サジェスト機能追加告知)

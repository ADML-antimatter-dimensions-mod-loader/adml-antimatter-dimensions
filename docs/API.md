# ADML API v1.1 リファレンス

Antimatter Dimensions MOD Loader（ADML）のプラグインAPI仕様書です。本書はAPIだけを扱います。導入手順は [`GUIDE.md`](./GUIDE.md)、manifestと配布形式は [`MANIFEST.md`](./MANIFEST.md)、保存統合は [`SAVE.md`](./SAVE.md)、安全性は [`SECURITY.md`](./SECURITY.md) を参照してください。

> **APIの入口:** プラグインの `constructor(api)` に渡されるプラグイン専用APIオブジェクトです。ゲームページ上のグローバルローダーは小文字の `window.adml` です。`window.ADML` を前提にしないでください。

## 1. 最小プラグイン形式

ZIPの中に `manifest.json` と、manifestの `main` で指定したJavaScriptファイルを置きます。エントリーファイルは `Plugin` クラス、または `createPlugin` 関数を提供してください。

```js
class Plugin {
  constructor(api) {
    this.api = api;
  }

  async onload() {
    this.api.notify("Plugin enabled");
  }

  async onunload() {
    this.api.notify("Plugin disabled");
  }
}
```

| エントリー | 型 | 必須 | 説明 |
|---|---|---:|---|
| `Plugin` | class | いずれか必須 | `new Plugin(api)` で生成されるクラスです。 |
| `createPlugin` | function | いずれか必須 | `api` を受け取り、プラグインインスタンスを返す関数です。 |
| `constructor(api)` | function | 推奨 | APIオブジェクトを保持します。 |
| `onload()` | function or Promise<void> | 任意 | 有効化時に呼ばれます。 |
| `onunload()` | function or Promise<void> | 任意 | 無効化・削除時に呼ばれます。 |

## 2. API一覧

| 名前 | 型 | 説明 |
|---|---|---|
| `api.patch` | function | ゲームオブジェクトのメソッドをラップします。 |
| `api.addStyle` | function | プラグイン専用スコープ付きCSSを追加します。 |
| `api.storage` | object | プラグイン単位の設定・進行データを保存します。 |
| `api.on` | function | ADMLイベントを購読します。 |
| `api.onGameLoad` | function | ゲームのロード完了時に処理を実行します。 |
| `api.notify` | function | ゲーム画面に通知を表示します。 |
| `api.updateUI` | function | ゲームUIの更新を要求します。 |
| `api.injectData` | function | 公開データオブジェクトへデータを追加・更新します。 |
| `api.registerTab` | function | カスタムタブの登録通知を行います。 |
| `api.mods` | object | インストール済みMODを参照します。 |
| `api.endgame` | object | エンドゲーム用レイヤーとリソースを扱います。 |
| `api.github` | object | 固定Topic `adml-plugin` の検索・インストールを行います。 |
| `api.forge` | object | 派生MODのmanifest作成とZIP出力を行います。 |
| `api.i18n` | object | 言語パックを登録・有効化します。 |
| `api.language` | object | `api.i18n` の簡易エイリアスです。 |
| `api.player` | getter | ゲームの `window.player` を参照します。 |
| `api.currency` | getter | ゲームの `window.Currency` を参照します。 |
| `api.db` | getter | ゲームの `window.GameDatabase` を参照します。 |
| `api.dc` | getter | ゲームの `window.DC` を参照します。 |

## 3. パッチAPI

### `api.patch(target, method, wrapper)`

| 引数 | 型 | 説明 |
|---|---|---|
| `target` | object | メソッドを持つ対象オブジェクトです。 |
| `method` | string | 差し替えるメソッド名です。 |
| `wrapper` | function | `original` と元の引数を受け取るラッパーです。 |

戻り値は解除関数です。プラグインが無効化されるとADMLも自動的に解除します。

```js
const stopPatch = api.patch(GameDatabase, "get", (original, ...args) => {
  const result = original(...args);
  return result;
});

stopPatch();
```

元のメソッドの契約を壊す変更や、存在しない対象へのパッチは避けてください。同じメソッドを複数MODが変更する場合は、manifestの依存関係で読み込み順を明示してください。

## 4. スタイルAPI

### `api.addStyle(css)`

| 引数 | 型 | 戻り値 | 説明 |
|---|---|---|---|
| `css` | string | HTMLStyleElement | プラグイン専用スコープを付与して `document.head` に追加します。 |

```js
api.addStyle(`
  .my-panel { color: #d7f9ff; border: 1px solid #4dd0e1; }
`);
```

`body` と `:root` はプラグイン用スコープへ変換されます。グローバルなCSSリセットや他MODの要素を意図せず変更するセレクターは避けてください。

## 5. ストレージAPI

### `api.storage.get(key)` / `api.storage.set(key, value)`

| メソッド | 引数 | 戻り値 | 説明 |
|---|---|---|---|
| `get(key)` | `key: string` | `any` or `undefined` | 現在のプラグイン専用ストレージから値を取得します。 |
| `set(key, value)` | `key: string`, JSON-compatible | `void` | 値を保存し、ADMLの永続化処理を呼び出します。 |

```js
const count = Number(api.storage.get("count") || 0);
api.storage.set("count", count + 1);
```

ストレージはプラグインIDごとに分離されます。関数、DOMノード、循環参照、巨大なバイナリなどJSON化できない値は保存しないでください。

## 6. イベント・UI API

### `api.on(event, callback)`

| 引数 | 型 | 説明 |
|---|---|---|
| `event` | string | ADMLイベント名です。標準イベントには `localeChanged` があります。 |
| `callback` | function(data) | イベント発生時に呼び出されます。 |

戻り値はありません。プラグイン無効化時には、そのプラグインが登録したリスナーが自動解除されます。

### `api.onGameLoad(callback)`

DOMがすでにロード済みなら即時に呼び出し、ロード前なら `window` の `load` イベントに一度だけ登録します。

### `api.notify(message)` / `api.updateUI()`

| メソッド | 引数 | 説明 |
|---|---|---|
| `notify(message)` | `message: string` | ADML通知トーストを表示します。 |
| `updateUI()` | なし | 利用可能なゲームUI更新処理を呼び出します。 |

### `api.injectData(path, data)`

| 引数 | 型 | 戻り値 | 説明 |
|---|---|---|---|
| `path` | string |  | `GameDatabase.someArray` のようなドット区切りのパスです。 |
| `data` | any | boolean | 配列には追加し、オブジェクトにはマージします。対象が存在しない場合は `false` です。 |

```js
api.injectData("GameDatabase.tabs", {
  id: "my-tab",
  label: "My Tab"
});
```

### `api.registerTab(config)`

| 引数 | 型 | 戻り値 | 説明 |
|---|---|---|---|
| `config` | object | `undefined` | `config.id` と `config.label` を持つタブ構成を登録します。 |

現在の統合ローダーでは登録通知を行うアダプターAPIです。実際の画面描画を行うゲーム側のタブデータ追加には、`injectData` とゲームの公開データ構造を組み合わせてください。

## 7. インストール済みMOD API

### `api.mods.list()` / `api.mods.get(pluginId)`

| メソッド | 引数 | 戻り値 | 説明 |
|---|---|---|---|
| `list()` | なし | Array<object> | インストール済みMODのmanifest情報一覧を返します。プラグインコードは一覧から除外されます。 |
| `get(pluginId)` | `pluginId: string` | object or `undefined` | 指定MODのmanifest、ファイル一覧、保存データ、コードを返します。 |

`get()` は開発用途向けです。取得したコードを安全と判定するAPIではありません。

## 8. エンドゲームAPI

### `api.endgame.registerLayer(config)`

| 引数 | 型 | 説明 |
|---|---|---|
| `config.id` | string | レイヤーIDです。 |
| `config.label` | string | UI表示名です。 |
| `config.description` | string | 説明文です。 |
| `config.resource` | object | 初期値・表示名などのリソース定義です。 |

### `api.endgame.listLayers()` / `getResource(resourceId)` / `addResource(resourceId, amount)`

| メソッド | 引数 | 戻り値 | 説明 |
|---|---|---|---|
| `listLayers()` | なし | Array<object> | 登録済みエンドゲームレイヤーを返します。 |
| `getResource(resourceId)` | `resourceId: string` | object or `undefined` | リソース定義と現在値を返します。 |
| `addResource(resourceId, amount)` | `resourceId: string`, `amount: number` | object or `false` | カスタムリソースへ量を加算し、永続化します。 |

## 9. GitHubカタログAPI

### `api.github.search(topic)`

GitHub APIを使って、公式Topic **`adml-plugin`** のリポジトリを検索します。トピックは変更できません。異なる値を指定するとエラーになります。

| 引数 | 型 | 戻り値 | 説明 |
|---|---|---|---|
| `topic` | string | Promise<object> | 省略時は `adml-plugin` を使います。 |

### `api.github.install(fullName)` / `api.github.topics.official`

| API | 型 | 説明 |
|---|---|---|
| `install(fullName)` | function | `owner/repository` を受け取り、root.json優先のインストール経路を呼び出します。 |
| `topics.official` | string | 常に `adml-plugin` を返します。 |

## 10. MOD Forge API

| API | 引数 | 戻り値 | 説明 |
|---|---|---|---|
| `api.forge.getParent(pluginId)` | `pluginId: string` | object or `undefined` | 派生元にするインストール済みMODを取得します。 |
| `api.forge.createManifest(overrides, parentId)` | object, `string?` | object | 既定manifestへ上書き値を適用し、必要なら `parent` を設定します。 |
| `api.forge.exportZip(manifest, code)` | object, string | Promise<Blob> | manifestとplugin.jsをZIPにして返します。 |

```js
const manifest = api.forge.createManifest({
  id: "my.derived.mod",
  name: "My Derived Mod",
  version: "1.0.0",
  apiVersion: "v1.1"
}, "parent.mod.id");
const blob = await api.forge.exportZip(manifest, code);
```

## 11. 多言語化API

### `api.i18n`

| API | 引数 | 戻り値 | 説明 |
|---|---|---|---|
| `registerPack(locale, entries)` | string, object | void | 原文と翻訳文の辞書を登録します。 |
| `setLocale(locale)` | string | void | 辞書を有効化し、既存・動的DOMを翻訳します。 |
| `disable()` | なし | void | 翻訳を解除して原文へ戻します。 |
| `getLocale()` | なし | string or `null` | 現在のロケールを返します。 |
| `translate(value)` | string | string | 完全一致または部分置換で翻訳します。 |
| `replace(root)` | Node? | void | 指定ルートのテキスト・属性を翻訳します。 |
| `observe(root)` | Node? | void | 動的に追加されたDOMを監視します。 |

### `api.language`

`language.register(locale, entries)`、`enable(locale)`、`disable()`、`translate(value)` を提供する簡易エイリアスです。

## 12. ゲーム参照getter

| getter | 実体 | 注意 |
|---|---|---|
| `api.player` | `window.player` | ゲーム進行データです。直接の破壊的変更は避けてください。 |
| `api.currency` | `window.Currency` | 通貨定義への参照です。 |
| `api.db` | `window.GameDatabase` | ゲームデータベースへの参照です。 |
| `api.dc` | `window.DC` | ゲーム定数への参照です。 |

## 13. manifest.json API v1.1

API v1.1のmanifestは、APIレベルと依存・互換性メタデータを明示します。

```json
{
  "manifestVersion": 1,
  "id": "example.mod",
  "name": "Example MOD",
  "version": "1.2.0",
  "apiVersion": "v1.1",
  "author": "Example Developer",
  "description": "API v1.1 sample",
  "main": "plugin.js",
  "dependencies": {
    "base.mod": ">=1.0.0 <2.0.0"
  },
  "compatibility": {
    "minAdmlVersion": "2.2.0",
    "gameVersion": ">=1.0.0"
  }
}
```

| フィールド | 型 | 必須 | 説明 |
|---|---|---:|---|
| `manifestVersion` | number | 推奨 | manifest形式の世代です。現在は `1` です。 |
| `id` | string | 必須 | 一意なプラグインIDです。 |
| `name` | string | 必須 | 表示名です。 |
| `version` | string | 必須 | SemVer形式のプラグインバージョンです。 |
| `apiVersion` | string | 必須 | 推奨値は `v1.1` です。旧 `1` / `v1` は互換モードです。 |
| `author` | string | 推奨 | 作者名です。 |
| `description` | string | 推奨 | カタログ・検査画面の説明文です。 |
| `main` | string | 推奨 | 実行するJSファイルです。既定値は `plugin.js` です。 |
| `dependencies` | object | 任意 | `pluginId: versionRange` の依存関係マップです。 |
| `compatibility` | object | 任意 | ADML・ゲームバージョンの互換性条件です。 |
| `parent` | string | 任意 | MOD Forgeで作成した派生元IDです。 |
| `type` | string | 任意 | `language-pack`、`theme`、`patch`、`endgame` 等の分類です。 |

依存関係と互換性の正式な検証がローダー側で提供されていないバージョンでは、これらは宣言メタデータとして扱われます。プラグイン側で自己検証を行い、ローダーが対応している場合は有効化前の検証結果を尊重してください。循環依存、存在しない依存、互換性不明のゲーム改変は安全側へ倒して無効化します。

## 14. セーブ・ロード統合

ADMLのインストール済みMOD・有効化状態・プラグインストレージは、ゲーム側の標準セーブ統合で扱われます。標準セーブの詳しい形式、インポート警告、ファイル入出力は [`SAVE.md`](./SAVE.md) を参照してください。

## 15. APIエラーと安全性

| エラー状況 | 推奨処理 |
|---|---|
| `plugin.js` がない | インストールを中止します。 |
| `Plugin` / `createPlugin` がない | 有効化を中止します。 |
| 依存MODがない | 依存MODを先に導入するまで有効化しません。 |
| API・ADML互換性不一致 | 有効化せず必要バージョンを表示します。 |
| GitHub取得が403/404 | root.jsonまたは直接アーカイブ経路へ切り替えます。 |
| 未信頼のコード | `INSPECT` で確認し、明示的に有効化するまで実行しません。 |

プラグインはゲームと同じページ上でJavaScriptを実行します。ADML APIは整理・解除・保存を支援しますが、悪意あるコードを完全なサンドボックスへ隔離するものではありません。安全性の詳細は [`SECURITY.md`](./SECURITY.md) を参照してください。

## 16. グローバルランタイムAPI（`window.adml`）

ゲームのロード完了後、ローダーインスタンスは `window.adml` に公開されます。プラグイン作者は原則として `constructor(api)` のAPIを使用し、ここに記載するランタイム操作は統合UIや開発ツールから呼び出してください。

| メソッド | 引数 | 戻り値 | 説明 |
|---|---|---|---|
| `window.adml.init()` | なし | `Promise<void>` | ローダーを初期化し、保存済みMODを復元します。 |
| `window.adml.openManager()` | なし | `void` | MOD Managerを開きます。 |
| `window.adml.openHelp()` | なし | `void` | ゲーム内の利用ガイドを開きます。 |
| `window.adml.openCatalog()` | なし | `void` | GitHub Catalogを開きます。Topicは `adml-plugin` に固定されています。 |
| `window.adml.installFile(file)` | `File` | `Promise<void>` | ローカルZIPを読み込んで検査可能な状態でインストールします。 |
| `window.adml.installUrl(url)` | `string` | `Promise<void>` | URLからZIPまたは配布カタログを取得してインストールします。 |
| `window.adml.installZip(buffer, sourceName)` | `ArrayBuffer`, `Blob`, `Uint8Array` | `Promise<void>` | ZIPデータを展開してmanifestとplugin.jsを登録します。 |
| `window.adml.installGithubRepo(fullName)` | `owner/repository` | `Promise<void>` | root.jsonを優先してGitHubプラグインを取得します。 |
| `window.adml.installGithubSource(fullName, branch)` | `owner/repository`, `string?` | `Promise<void>` | 指定ブランチのソースアーカイブを取得します。既定ブランチは `main` です。 |
| `window.adml.load(mod)` | インストール済みMOD | `Promise<void>` | 指定MODを実行します。通常はManagerのENABLEから呼び出されます。 |
| `window.adml.toggle(id)` | `pluginId: string` | `Promise<void>` | MODの有効・無効を切り替えます。 |
| `window.adml.unload(id)` | `pluginId: string` | `Promise<void>` | MODを停止して登録済みパッチ・スタイル・イベントを解除します。 |
| `window.adml.remove(id)` | `pluginId: string` | `void` | MODを停止し、インストール済みデータから削除します。 |
| `window.adml.openForge()` | なし | `void` | MOD Forgeを開きます。 |
| `window.adml.exportForgeZip()` | なし | `Promise<void>` | Forgeの入力内容からZIPを生成してダウンロードします。 |
| `window.adml.endgameRegisterLayer(config)` | `object` | `object` | エンドゲームレイヤーを登録します。 |
| `window.adml.endgameListLayers()` | なし | `Array<object>` | 登録済みレイヤーを返します。 |
| `window.adml.endgameGetResource(id)` | `resourceId: string` | `object or undefined` | カスタムリソースを取得します。 |
| `window.adml.endgameAddResource(id, amount)` | `resourceId: string`, `number` | `object or false` | カスタムリソースへ加算します。 |
| `window.adml.i18nDisable()` | なし | `void` | 内部の言語パックを解除します。 |
| `window.adml.i18nTranslate(value)` | `string` | `string` | 現在の辞書で文字列を翻訳します。 |
| `window.adml.i18nReplace(root)` | `Node` | `void` | 指定ノード配下を翻訳します。 |
| `window.adml.i18nObserve(root)` | `Node?` | `void` | 動的DOMの翻訳監視を開始します。 |

`constructor`、`read`、`persist`、`injectStyles`、`mountButton`、`ensureJSZip`、`renderList`、`resetForgeTemplate`、`loadForgeParent`、`cleanup`、`emit`、`toast` は実装上の内部処理です。外部MODから直接呼び出すことは推奨しません。

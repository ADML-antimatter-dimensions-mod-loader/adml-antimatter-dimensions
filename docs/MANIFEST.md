# ADML manifest.json と配布形式

この文書では、ADMLプラグインZIPの構成、manifest.jsonの各フィールド、`root.json` カタログで配布する際の注意点を説明します。APIの呼び出し仕様は [`API.md`](./API.md)、導入手順は [`GUIDE.md`](./GUIDE.md) を参照してください。

## ZIPの標準構成

```text
example-mod.zip
├── manifest.json
├── plugin.js
├── README.md
└── assets/
    └── icon.svg
```

`manifest.json` と `plugin.js` は必須です。`main` を変更する場合は、そのファイルがZIP内に存在し、ローダーが解決できる相対パスであることを確認してください。配布ZIPには秘密鍵、アクセストークン、`node_modules`、ビルド前の不要な作業ファイルを含めないでください。

## manifest.jsonの例

```json
{
  "manifestVersion": 1,
  "id": "example.mod",
  "name": "Example MOD",
  "version": "1.2.0",
  "apiVersion": "v1.1",
  "author": "Example Developer",
  "description": "A small ADML API v1.1 example.",
  "main": "plugin.js",
  "type": "patch",
  "dependencies": {
    "base.mod": ">=1.0.0 <2.0.0"
  },
  "compatibility": {
    "minAdmlVersion": "2.2.0",
    "gameVersion": ">=1.0.0"
  }
}
```

| フィールド | 必須 | 型 | 説明 |
|---|---:|---|---|
| `manifestVersion` | 推奨 | number | manifest形式の世代です。現在は `1` です。 |
| `id` | 必須 | string | 一意なIDです。小文字、数字、`.`、`-`、`_` を推奨します。 |
| `name` | 必須 | string | UI・カタログに表示される名前です。 |
| `version` | 必須 | string | SemVer形式のリリースバージョンです。 |
| `apiVersion` | 必須 | string | API互換レベルです。新規MODは `v1.1` を指定します。 |
| `author` | 推奨 | string | 作者名またはチーム名です。 |
| `description` | 推奨 | string | カタログと検査画面に表示される説明です。 |
| `main` | 推奨 | string | 実行ファイルです。既定値は `plugin.js` です。 |
| `type` | 任意 | string | `theme`、`patch`、`language-pack`、`endgame` などの分類です。 |
| `dependencies` | 任意 | object | 依存MODのIDとバージョン範囲です。 |
| `compatibility` | 任意 | object | ADMLとゲーム本体の互換性条件です。 |
| `parent` | 任意 | string | MOD Forgeで作成した派生元MODのIDです。 |

## dependencies

`dependencies` は `pluginId: versionRange` のオブジェクトです。依存MODのID、バージョン範囲、必要なAPIレベルを明示してください。依存先が存在しない場合、循環している場合、またはバージョン範囲を満たさない場合、プラグインは有効化を中止するのが安全です。

## compatibility

`compatibility.minAdmlVersion` は必要なローダーの最低バージョン、`compatibility.gameVersion` はゲーム本体の対応範囲を表します。ゲーム本体のバージョン表記が利用できない場合は、対象コミットやリリース名を `description` に明記してください。

## root.json

root.jsonは、GitHub APIのレート制限やRelease APIの404を避けるための静的カタログです。ビルド時に最新ZIPと過去バージョンの履歴を追記し、Raw URLまたはGitHub Pagesから取得できるようにします。カタログの各エントリには、少なくともID、表示名、バージョン、説明、ZIPのURL、manifestの要約を含めてください。

```json
{
  "schemaVersion": 1,
  "plugin": {
    "id": "example.mod",
    "name": "Example MOD",
    "latest": "1.2.0",
    "description": "A small ADML plugin."
  },
  "versions": [
    {
      "version": "1.2.0",
      "download": "./dist/example.mod-1.2.0.zip",
      "manifest": "./dist/example.mod-1.2.0.manifest.json"
    }
  ]
}
```

同じバージョンを重複登録せず、ZIPとmanifestのパスが実際に取得できることをCIで検証してください。

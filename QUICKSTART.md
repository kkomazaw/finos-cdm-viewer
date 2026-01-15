# 🚀 クイックスタートガイド

## すぐに試す（3ステップ）

### 1️⃣ 拡張機能を起動

VS Codeで `F5` キーを押す
→ 新しいウィンドウ（Extension Development Host）が開きます

### 2️⃣ テストフォルダを開く

新しいウィンドウで:
```
ファイル → フォルダーを開く
→ /Users/kkomazaw/Development/finos-cdm-viewer/test/fixtures
```

### 3️⃣ CDM Explorerを確認

左サイドバーの「エクスプローラー」内に **CDM Explorer** セクションが表示されます:

```
📦 CDM Explorer
└── 📦 cdm.sample.test
    ├── 🔷 Address
    ├── 🔷 Employee
    ├── 🔷 Person
    │   ├── firstName: string (1..1)
    │   ├── lastName: string (1..1)
    │   ├── age: int (0..1)
    │   ├── emails: string (0..*)
    │   └── address: Address (0..1)
    ├── 🔶 Country
    └── 🔶 Department
```

## 💡 基本操作

| 操作 | 方法 |
|------|------|
| 型の定義を開く | 型名（例: `Person`）をクリック |
| フィールドを見る | 型名の左の▶を展開 |
| 手動更新 | CDM Explorer右上の🔄アイコン |
| コマンド実行 | Cmd+Shift+P → "CDM" で検索 |

## 🌐 実際のFINOS CDMでテスト

1. **CDMをクローン**:
   ```bash
   cd ~/Development
   git clone https://github.com/finos/common-domain-model.git
   ```

2. **Extension Development Hostで開く**:
   ```
   ファイル → フォルダーを開く
   → ~/Development/common-domain-model
   ```

3. **Rosettaファイルの場所**:
   - エクスプローラーで `rosetta-source/src/main/rosetta/` を開く
   - 約150個の `.rosetta` ファイルが表示されます

4. **CDM Explorerを確認**:
   - 20以上のネームスペースが表示されます:
     - `cdm.base.datetime`
     - `cdm.base.math`
     - `cdm.event`
     - `cdm.product`
     - など

## 🔧 トラブルシューティング

### CDM Explorerが表示されない場合:

1. `.rosetta` ファイルをVS Codeで開く
2. `Cmd+Shift+P`（Macの場合）
3. "CDM: Refresh Explorer" を実行

### デバッグコンソールを確認:

元のVS Codeウィンドウ（開発中）で:
- `表示` → `デバッグコンソール`
- エラーログを確認

### 拡張機能を再起動:

1. Extension Development Hostウィンドウを閉じる
2. 元のウィンドウで `F5` を再度押す

## 📊 表示される情報

### Type（型）の場合:
- 継承関係（`extends`）
- フィールド一覧
  - フィールド名
  - 型
  - カーディナリティ（1..1, 0..1, 0..* など）
- 条件（バリデーションルール）

### Enum（列挙型）の場合:
- 値一覧
- 表示名（displayName）
- 説明文

## 🎯 次のステップ

1. `test/fixtures/sample.rosetta`を編集して保存
   → CDM Explorerが自動更新されることを確認

2. 新しい`.rosetta`ファイルを作成
   → 自動的にインデックスされることを確認

3. 実際のFINOS CDMで複雑な型を探索
   → 例: `cdm.product` 配下の金融商品定義

## 📝 サンプルファイルの内容

`test/fixtures/sample.rosetta`には以下が含まれています:

- **3つのType**:
  - `Person`: 基本的な人物情報
  - `Address`: 住所情報
  - `Employee`: Personを継承した従業員情報

- **2つのEnum**:
  - `Country`: 国コード
  - `Department`: 部署

これらを参考に、独自のRosettaモデルを作成してテストできます！

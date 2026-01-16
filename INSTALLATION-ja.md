# FINOS CDM Viewer インストール手順

このドキュメントでは、FINOS CDM Viewer拡張機能をVS Codeにインストールする方法を説明します。

## 推奨インストール方法

### 手順1: VSIXファイルの準備

既にビルド済みの `finos-cdm-viewer-1.0.0.vsix` ファイルがプロジェクトディレクトリにあります。

もし、自分でビルドする場合は以下を実行してください：

```bash
cd /Users/kkomazaw/Development/finos-cdm-viewer
npm install -g @vscode/vsce
npm run compile
vsce package
```

これで `finos-cdm-viewer-1.0.0.vsix` ファイルが作成されます（サイズ: 約71KB）。

### 手順2: VS Codeへのインストール

#### 方法A: VS Code UIを使用（推奨）

1. VS Codeを開く
2. 拡張機能ビュー（Extensions）を開く
   - macOS: `Cmd+Shift+X`
   - Windows/Linux: `Ctrl+Shift+X`
3. 拡張機能ビューの右上にある `...` メニューをクリック
4. 「VSIXからのインストール...」(Install from VSIX...) を選択
5. `finos-cdm-viewer-1.0.0.vsix` ファイルを選択
6. インストールが完了したら、VS Codeを再読み込み

#### 方法B: コマンドラインを使用

ターミナルで以下のコマンドを実行：

```bash
code --install-extension finos-cdm-viewer-1.0.0.vsix
```

### 手順3: インストールの確認

1. VS Codeを再起動
2. 拡張機能ビュー（Extensions）を開く
3. インストール済み拡張機能のリストに「FINOS CDM Viewer」が表示されることを確認

## 使い方

### 1. Rosettaファイルを開く

FINOS CDMリポジトリまたは任意の`.rosetta`ファイルを含むワークスペースを開きます：

```bash
# FINOS CDMリポジトリをクローン（まだの場合）
git clone https://github.com/finos/common-domain-model.git
cd common-domain-model

# VS Codeで開く
code .
```

### 2. CDM Explorerの表示

`.rosetta` ファイルが検出されると、エクスプローラーサイドバーに「CDM Explorer」ビューが自動的に表示されます。

### 3. 利用可能な機能

拡張機能をインストールすると、以下の機能が利用できます：

#### ナビゲーション機能
- **CDM Explorer**: 階層的なツリービューでCDMの型と列挙型を閲覧
- **Go to Definition (F12)**: 型や列挙型の定義へジャンプ
- **Find All References (Shift+F12)**: 型や列挙型の全使用箇所を検索
- **ホバー情報**: 型や列挙型にマウスを合わせて詳細情報を表示

#### 編集機能
- **コード補完 (Ctrl+Space / Cmd+Space)**: 型、列挙型、キーワード、メタデータの補完
- **シンボルの名前変更 (F2)**: ワークスペース全体で型や列挙型を安全に名前変更
- **リアルタイム検証**: 未定義の型、循環継承、無効なカーディナリティなどをエラー表示

#### 可視化機能
- **型グラフ (CDM: Show Type Graph)**: Mermaid.jsを使った型関係の対話的なグラフ表示
- **検索とフィルター (CDM: Search Types and Enums)**: あいまい検索と高度なフィルタリング
- **エクスポート (CDM: Export to JSON/Mermaid/GraphViz)**:
  - JSON形式で完全な型定義をエクスポート
  - Mermaid形式でドキュメント用ダイアグラムを生成
  - GraphViz DOT形式でプロフェッショナルなグラフを作成

### 4. コマンドパレットから機能を実行

`Cmd+Shift+P` (macOS) または `Ctrl+Shift+P` (Windows/Linux) でコマンドパレットを開き、以下を実行できます：

- `CDM: Refresh Explorer` - CDM Explorerを手動更新
- `CDM: Show Type Graph` - 型グラフを表示
- `CDM: Search Types and Enums` - 型と列挙型を検索
- `CDM: Export to JSON/Mermaid/GraphViz` - エクスポート

## トラブルシューティング

### 拡張機能が表示されない

1. VS Codeを完全に再起動
2. 拡張機能ビューで「FINOS CDM Viewer」が有効になっているか確認
3. `.rosetta`ファイルがワークスペースに存在するか確認

### CDM Explorerが表示されない

- `.rosetta` ファイルを含むフォルダをワークスペースとして開いているか確認
- コマンドパレットから「CDM: Refresh Explorer」を実行

### エラーが表示される

- VS Codeのバージョンが 1.85.0 以上であることを確認
- 出力パネル（Output）で「FINOS CDM Viewer」チャンネルのログを確認

## アンインストール

1. 拡張機能ビュー（Extensions）を開く
2. 「FINOS CDM Viewer」を見つける
3. 歯車アイコンをクリック
4. 「アンインストール」を選択

## 開発モードでの実行（開発者向け）

拡張機能の開発や変更を行う場合：

```bash
# リポジトリをクローン
git clone https://github.com/kkomazaw/finos-cdm-viewer.git
cd finos-cdm-viewer

# 依存関係をインストール
npm install

# コンパイル
npm run compile

# VS Codeでプロジェクトを開く
code .

# F5キーを押して拡張機能開発ホストを起動
```

## サポート

問題や質問がある場合は、GitHubリポジトリで issue を作成してください：
https://github.com/kkomazaw/finos-cdm-viewer/issues

## ライセンス

Apache License 2.0

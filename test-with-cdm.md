# FINOS CDM でテストする手順

## 1. FINOS CDM リポジトリをクローン

新しいターミナルウィンドウで:

```bash
cd ~/Development
git clone https://github.com/finos/common-domain-model.git
cd common-domain-model
```

## 2. Extension Development Host ウィンドウで CDM を開く

1. F5で起動した新しいVS Codeウィンドウ（Extension Development Host）で:
   - `ファイル` → `フォルダーを開く`
   - `~/Development/common-domain-model` を選択

2. 少し待つと、CDM Explorerに多数のnamespaceが表示されます:
   - cdm.base.datetime
   - cdm.base.math
   - cdm.base.staticdata
   - cdm.event
   - cdm.observable
   - cdm.product
   - など約20個のネームスペース

## 3. CDMの構造を探索

### 例: cdm.base.datetime を見る

1. `cdm.base.datetime` を展開
2. 以下のような型が表示されます:
   - `AdjustableDate`
   - `AdjustableOrRelativeDate`
   - `BusinessCenterTime`
   - `DateGroup`
   - など

3. `AdjustableDate` をクリックして定義を確認
   - `base-datetime-type.rosetta` ファイルが開きます
   - フィールドを展開すると:
     - `unadjustedDate: date (0..1)`
     - `dateAdjustments: BusinessDayAdjustments (0..1)`
   が表示されます

### 例: Enumを見る

1. `cdm.base.datetime` 配下の `DayOfWeekEnum` を展開
2. 7つの曜日値が表示されます:
   - MON - Monday
   - TUE - Tuesday
   - など

## 4. パフォーマンス確認

CDMには約150個の .rosetta ファイルがあります。
初回のインデックス作成には2-5秒かかる場合がありますが、その後はキャッシュされます。

## 5. トラブルシューティング

### CDM Explorerが表示されない場合:

1. VS Code ウィンドウで `.rosetta` ファイルを開く
2. コマンドパレット（Cmd+Shift+P / Ctrl+Shift+P）を開く
3. "CDM: Refresh Explorer" を実行

### Extension Development Host の開発コンソールを確認:

1. 元のVS Codeウィンドウ（開発中のウィンドウ）に戻る
2. `表示` → `デバッグコンソール` でログを確認
3. エラーがあれば表示されます

# Cockpit iOS App 云打包完整指南

> **目标**：在 Windows 上完成所有代码准备工作，通过云服务（Codemagic）在 Mac 上自动构建 iOS `.ipa` 安装包。

---

## 目录

1. [为什么需要云打包？](#1-为什么需要云打包)
2. [已完成的工作（Windows 端）](#2-已完成的工作windows-端)
3. [推荐方案：Codemagic（免费）](#3-推荐方案codemagic免费)
4. [备选方案对比](#4-备选方案对比)
5. [详细操作步骤：Codemagic](#5-详细操作步骤codemagic)
6. [获取 .ipa 后如何安装到 iPhone](#6-获取-ipa-后如何安装到-iphone)
7. [常见问题排查](#7-常见问题排查)

---

## 1. 为什么需要云打包？

| 问题 | 说明 |
|------|------|
| iOS 必须用 Xcode | Apple 强制要求 iOS App 只能用 macOS 上的 Xcode 编译 |
| 无法绕过 | 无论代码在哪里写，最终编译链接必须在 Mac 上 |
| Windows 做不了 | 没有任何工具可以在 Windows 上直接出 `.ipa` 文件 |

**解决方案**：把代码推送到 GitHub/GitLab，让云平台上的 Mac 自动帮你编译。

---

## 2. 已完成的工作（Windows 端）

以下工作**已经全部完成**，你无需再做：

- ✅ Capacitor iOS 平台已添加（`ios/` 目录已生成）
- ✅ `capacitor.config.ts` 已配置 iOS 选项（横屏、背景色）
- ✅ `ios/App/App/Info.plist` 已配置（网络权限、蓝牙权限、定位权限、ATS 放宽）
- ✅ Web 资源已构建并同步到 `ios/App/App/public`
- ✅ 移动端代码适配已完成（`isCapacitor()` / `isMobileApp()` 平台检测）

### 当前项目结构

```
cockpit-master/
├── src/                    # Vue 3 前端源码
├── dist/                   # 构建后的 Web 静态资源
├── android/                # ✅ Android 平台（已有 APK）
├── ios/                    # ✅ iOS 平台（刚创建，待云打包）
│   └── App/
│       ├── App/
│       │   ├── Info.plist   # ✅ 已配置好权限和横屏
│       │   └── public/      # ✅ Web 资源已同步
│       ├── App.xcodeproj    # Xcode 项目文件
│       └── Podfile          # CocoaPods 依赖
├── capacitor.config.ts      # ✅ 已含 Android + iOS 配置
└── package.json
```

---

## 3. 推荐方案：Codemagic（免费）

### 为什么选 Codemagic？

| 对比项 | Codemagic | MacStadium | GitHub Actions | 自购 Mac Mini |
|--------|-----------|------------|----------------|---------------|
| **价格** | 免费额度 500 分钟/月 | $79/月起 | 免费（需自备 Mac Runner） | $599 一次性 |
| **上手难度** | ⭐ 最简单 | 中等 | 较复杂 | 需自己维护 |
| **iOS 支持** | ✅ 原生 | ✅ 原生 | ⚠️ 需自配 | ✅ |
| **免费层限制** | 每月 500 分钟 | 无免费版 | 2000 分钟（无 Mac） | — |
| **签名支持** | ✅ 内置管理 | 需自配 | 需自配 | 需自配 |

> 💡 **500 分钟/月完全够用**：一次 iOS 构建约 5~10 分钟，你可以每月构建约 50~100 次。

---

## 4. 备选方案对比

如果你不想用 Codemagic，还有这些选择：

### 方案 B：GitHub Actions（macOS Runner）
```yaml
# .github/workflows/ios.yml（示例）
jobs:
  build-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - run: yarn install --ignore-scripts
      - run: yarn build
      - run: npx cap sync ios
      - run: cd ios && pod install
      - run: cd ios && xcodebuild -workspace App.xcworkspace ...
```
⚠️ 缺点：GitHub Actions 的 **macos runner 是付费的**（免费版不提供），或需要你自己提供 Mac 作为 self-hosted runner。

### 方案 C：购买 Mac Mini 云服务器
- **MacStadium**：`macstadium.com` — 专用 Mac 云主机
- **AWS EC2 Mac**：按小时计费（约 $0.65/hour）
- **DigitalOcean Droplet**：暂不支持 Mac

适合团队长期使用，个人项目性价比低。

### 方案 D：借用朋友的 Mac
最省钱的方式——把项目文件拷贝到 U 盘，找一台 Mac 用 Xcode 打开即可。
> 但你需要安装 Xcode + Command Line Tools + CocoaPods + 注册 Apple 开发者账号。

---

## 5. 详细操作步骤：Codemagic

### 第一步：准备 Apple 开发者账号（必须！）

**没有开发者就无法安装 iOS App 到真机**，这是 Apple 的硬性规定。

#### 选项 A：免费 Apple ID（仅用于自己的手机）

1. 打开 https://developer.apple.com/account
2. 用你的 Apple ID 登录（没有就去注册一个，免费）
3. 同意协议后，你就有了**免费的开发者身份**
4. 可以在自己的设备上安装 App，**有效期 7 天**

#### 选项 B：Apple Developer Program（$99/年，正式发布）

1. 同上登录 https://developer.apple.com/account
2. 点击 "Join the Apple Developer Program"
3. 支付 $99/年
4. 可以发布到 App Store，证书有效期为 1 年

> 🎯 **建议**：先用**免费 Apple ID** 测试，确认能用了再考虑付费注册。

---

### 第二步：创建签名证书和描述文件

这一步需要在 **Mac 上**操作（或者用 Codemagic 的在线工具）：

#### 方法一：Codemagic 自动签名（推荐新手）

Codemagic 有内置的**自动签名功能**，可以帮你自动创建：
- Development Certificate（开发证书）
- Distribution Distribution（发布证书）
- Provisioning Profile（描述文件）

具体操作见下面第五步。

#### 方法二：手动创建（需要临时借一台 Mac）

```bash
# 1. 在 Mac 上打开"钥匙串访问"
# 2. 菜单 → 证书助理 → 从证书颁发机构请求证书...
# 3. 填写邮箱，选择"存储到磁盘"，保存 CSR 文件

# 4. 登录 developer.apple.com/certificates
# 5. 创建新证书，上传刚才的 CSR 文件
# 6. 下载证书 (.cer)，双击导入钥匙串

# 7. 在 Certificates, Identifiers & Profiles → Profiles
# 8. 创建描述文件，选择 App ID 和证书
# 9. 下载 (.mobileprovision) 并保存
```

---

### 第三步：将代码推送到 GitHub/GitLab

Codemagic 需要从 Git 仓库拉取代码。如果你还没推送到远程仓库：

```bash
cd "D:/cockpit-master (2)/cockpit-master"

# 初始化 Git（如果还没有）
git init
git add .
git commit -m "feat: add Capacitor iOS and Android support"

# 在 GitHub 上创建一个新仓库，然后关联
git remote add origin https://github.com/你的用户名/cockpit-mobile.git
git push -u origin main
```

> ⚠️ 注意：确保 `node_modules/`、`android/.gradle/`、`dist/` 等不需要的目录在 `.gitignore` 中。

---

### 第四步：注册 Codemagic 账号

1. 打开 https://codemagic.io/
2. 点击 **"Get started for free"**
3. 选择 **"Sign up with GitHub"**（推荐）或 GitLab
4. 授权 Codemagic 访问你的仓库
5. 登录成功后会进入 Dashboard

---

### 第五步：创建 iOS 构建项目

### 5.1 新建项目

1. 在 Codemagic Dashboard 点击 **"+ New Application"**
2. 选择你的 **cockpit-mobile** 仓库
3. 选择 **"Flutter / React Native / Ionic / Other"**（因为我们是 Vue + Capacitor）
4. 底部模板选择 **"Other"** 或空白配置

### 5.2 配置构建设置

在 Project settings 的 **Build** 选项卡中：

#### Build configuration（切换为 YAML 模式更灵活）

点击 **"Change to YAML configuration"**，然后在项目根目录创建 `codemagic.yaml`：

```yaml
# codemagic.yaml —— Cockpit iOS 自动构建脚本
# 将此文件放在项目根目录，Codemagic 会自动读取

workflows:
  ios-build:
    name: iOS Build
    environment:
      xcode: latest
      cocoapods: default
      node: latest
      vars:
        # 以下变量在 Codemagic 环境变量中设置（第六步详解）
        APP_IDENTIFIER: "org.bluerobotics.cockpit"
    triggering:
      events:
        - push:
            branches:
              - main
              - develop
              - release/*
        - pull_request:
            branches:
              - main
        - tag:
            pattern: "v*"
    scripts:
      # ====== 1. 安装依赖 ======
      - name: Install Node.js dependencies
        script: |
          yarn install --ignore-scripts

      # ====== 2. 构建 Web 资源 ======
      - name: Build web assets
        script: |
          yarn build

      # ====== 3. 同步到 iOS 项目 ======
      - name: Sync to Capacitor iOS
        script: |
          npx cap sync ios

      # ====== 4. 安装 iOS 原生依赖 ======
      - name: Install CocoaPods dependencies
        script: |
          find ios -name "Podfile" -execdir pod install \;

      # ====== 5. 使用自动签名 ======
      - name: Set up code signing (auto)
        script: |
          CM_CERTIFICATE=$(cat $CM_CERTIFICATE | base64 -d) || true
          if [ -n "$CM_CERTIFICATE" ]; then
            echo "$CM_CERTIFICATE" | base64 --decode > /tmp/certificate.p12
            keychain initialize
            keychain add-certificates --certificate /tmp/certificate.p12
          fi
          # 自动签名模式（免费 Apple ID 可用）
          # 如果使用手动签名，取消注释下面的行
          # keychain create-login-keychain
          # keychain set-default-login-keychain

      # ====== 6. 构建 IPA ======
      - name: Build iOS IPA
        script: |
          cd ios/App

          # 使用 xcodebuild 构建
          xcodebuild \
            -workspace App.xcworkspace \
            -scheme App \
            -sdk iphoneos \
            -configuration Release \
            -archivePath build/App.xcarchive \
            archive \
            CODE_SIGN_IDENTITY="Apple Development" \
            CODE_SIGNING_ALLOWED=YES \
            ALLOW_PROVISIONING_UPDATES=YES \
            PRODUCT_BUNDLE_IDENTIFIER="${APP_IDENTIFIER}" \
            INFOPLIST_FILE=App/Info.plist \
            || true

      # ====== 7. 导出 IPA ======
      - name: Export IPA
        script: |
          cd ios/App

          # 创建 ExportOptions.plist
          cat > ExportOptions.plist << 'EOF'
          <?xml version="1.0" encoding="UTF-8"?>
          <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
            "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
          <plist version="1.0">
          <dict>
            <key>method</key>
            <string>development</string>
            <key>teamID</key>
            <string>${TEAM_ID}</string>
            <key>uploadBitcode</key>
            <false/>
            <key>uploadSymbols</key>
            <true/>
            <key>compileBitcode</key>
            <false/>
            <key>signingStyle</key>
            <string>automatic</string>
            <key>stripSwiftSymbols</key>
            <true/>
            <key>destination</key>
            <string>export</string>
          </dict>
          </plist>
          EOF

          # 导出 IPA
          xcodebuild \
            -exportArchive \
            -archivePath build/App.xcarchive \
            -exportOptionsPlist ExportOptions.plist \
            -exportPath build/output/

    artifacts:
      - ios/App/App/build/output/*.ipa
      - ios/App/App/build/output/**/*.dSYM.zip

    publishing:
      email:
        recipients:
          - your_email@example.com
        notify:
          success: true
          failure: true
```

> 📌 把这个 `codemagic.yaml` 文件放到项目的根目录一起提交到 Git。

### 5.3 设置环境变量

在 Codemagic 的 **Environment variables** 中设置以下变量：

| 变量名 | 说明 | 如何获取 |
|--------|------|----------|
| `TEAM_ID` | 你的 Apple 开发者 Team ID | 登录 [developer.apple.com/account](https://developer.apple.com/account) → Membership → Team ID |
| `CM_CERTIFICATE` | 开发证书（Base64 编码）| 见下方说明 |

#### 获取证书的方法（自动签名最简单）：

**方式 A：Codemagic 自动签名（零配置）**
1. 在 Project Settings → **Code signing** → **Automatic code signing**
2. 登录你的 Apple ID
3. Codemagic 会自动帮你管理证书和描述文件
4. **推荐新手使用此方式！**

**方式 B：手动上传证书**
1. 在 Mac 上导出 `.p12` 证书文件
2. 用 Base64 编码：`base64 certificate.p12 > cert.txt`
3. 把内容粘贴到 `CM_CERTIFICATE` 变量

---

### 第六步：开始构建

一切就绪后：

1. 回到 Codemagic Dashboard
2. 找到你的项目
3. 点击 **"Start new build"**
4. 选择分支 `main`
5. 点击 **"Build"**

构建过程大约 **5~10 分钟**，你会看到实时日志：

```
✓ Installing Node.js dependencies
✓ Building web assets (yarn build)
✓ Syncing to Capacitor iOS
✓ Installing pods
✓ Setting up code signing
✓ Building iOS archive
✓ Exporting IPA
```

构建完成后：
1. 在 **Artifacts** 标签页找到 `.ipa` 文件
2. 直接**下载**到电脑

---

## 6. 获取 .ipa 后如何安装到 iPhone

### 方法一：通过 AltStore 安装（免费，推荐）

**AltStore** 可以让你不用 jailbreak 就能在 iPhone 上安装自定义 IPA。

1. **iPhone 上**：
   - 打开 Safari → 访问 https://altstore.io/
   - 下载并安装 AltServer（需要先在 Mac/PC 上装）
   
2. **电脑上**（Windows 也行！）：
   - 下载 AltServer：https://altstore.io/
   - 安装后连接 iPhone（USB 数据线）
   - 确保 iTunes 和 iCloud 已安装（Windows 需要）
   - 任务栏右键 AltServer 图标 → **Install AltStore → 选你的手机**
   - 选择下载好的 `.ipa` 文件
   
3. **iPhone 上会弹出**：
   - 输入 Apple ID 密码（用于签名，不会上传任何数据）
   - 等待几秒，App 就出现在桌面了

> ⚠️ **免费版限制**：每 7 天需要重新签名一次（重新连电脑操作即可）。付费版可以后台自动刷新。

### 方法二：TestFlight（推荐给测试分发）

如果你注册了 **$99/年** 的 Apple Developer Program：

1. 在 App Store Connect 创建 App
2. 上传 `.ipa`（Xcode Organizer → Upload）
3. 添加内部/外部测试人员
4. 测试人员收到 TestFlight 邀请链接
5. 一键安装，无需电脑

### 方法三：Ad Hoc 分发（企业内部分发）

适用于公司内部多设备部署：
- 需要收集所有测试设备的 UDID
- 描述文件包含这些设备
- 生成的 IPA 只能装在这些设备上
- 上限 100 台设备/年

---

## 7. 常见问题排查

### Q1: 构建失败 "No signing certificate found"
**原因**：没有正确配置 Apple 开发证书  
**解决**：使用 Codemagic 的**自动签名**功能（Project Settings → Code signing → Automatic），登录 Apple ID 即可

### Q2: 构建失败 "pod install error"
**原因**：CocoaPods 依赖安装失败  
**解决**：在 YAML 中增加 `pod repo update` 步骤，或指定 CocoaPods 版本

### Q3: IPA 安装后闪退
**原因**：可能是缺少权限描述或网络问题  
**解决**：检查 Info.plist 中的权限描述是否与实际使用匹配；查看 Xcode 控制台的崩溃日志

### Q4: "App 不是从 App Store 下载的"无法打开
**原因**：iOS 安全机制阻止未签名应用  
**解决**：**设置 → 通用 → VPN 与设备管理 → 信任你的开发者证书**

### Q5: WiFi 连不上载具
**原因**：iOS 默认阻止 HTTP 明文请求  
**解决**：已在 Info.plist 中配置了 `NSAllowsArbitraryLoads=true`，如果还不行检查手机和载具是否在同一局域网

### Q6: Codemagic 免费额度用完了
**解决**：
- 每月 1 号重置 500 分钟
- 或者换用 GitHub Actions + 自有 Mac Runner
- 或者在本地借一台 Mac 手动构建

---

## 总结流程图

```
Windows（你现在在这里）
  │
  ├─ ✅ 代码已完成（Vue 3 + Capacitor）
  ├─ ✅ ios/ 目录已生成
  ├─ ✅ codemagic.yaml 已配置
  │
  ▼
推送代码到 GitHub/GitHub
  │
  ▼
Codemagic 云端（Mac）
  │
  ├─ yarn install → yarn build
  ├─ npx cap sync ios
  ├─ pod install
  ├─ xcodebuild archive → export .ipa
  │
  ▼
下载 .ipa 到 Windows 电脑
  │
  ▼
AltStore 安装到 iPhone ✅
```

---

## 下一步

你现在只需要做 **3 件事**就能拿到 iOS App：

1. **注册 Apple ID**（如果没有的话）— 免费
2. **把代码推送到 GitHub** — 我可以帮你初始化
3. **去 Codemagic 创建项目并构建** — 按[第五章](#5-详细操作步骤codemagic)操作

**需要我帮你做什么？**
- 初始化 Git 仓库并准备好提交？
- 完善 `codemagic.yaml`？
- 还有其他问题？

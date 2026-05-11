# DEPLOYMENT.md — Tryon Collector 生产部署

> 局域网内单机部署。systemd 托管 uvicorn，开机自启 + 崩溃自重启 + 日志走 journald。
> 本文档假设部署机是 Linux + systemd，root 可用。

---

## 0. 部署架构

```
┌─────────────────────────────────────────────┐
│  systemd: tryon-collector.service           │
│  └── uv run uvicorn app.main:app :8082      │
│       ├── /api/*          → routers         │
│       ├── /health         → liveness        │
│       └── /{any}          → SPA (frontend/dist) │
└─────────────────────────────────────────────┘

设计师浏览器 ──http──>  http://<部署机 IP>:8082/
```

- 单端口 HTTP（局域网内部，无需 HTTPS）
- 前端静态资源由 `frontend/dist/` 经 uvicorn 直接 serve
- API 同源，无 CORS 跨域问题

---

## 1. 首次部署

### 1.1 准备代码

```bash
cd /opt/workspace/yongli/tryon-collector
git pull
make install          # 一次性装 frontend (pnpm) + backend (uv) 依赖
make build            # 构建 frontend/dist/
```

### 1.2 安装 systemd unit

```bash
# 把项目内的 unit 文件 link 到系统位置（用 link 而不是 cp，方便后续改动同步）
ln -s /opt/workspace/yongli/tryon-collector/deploy/tryon-collector.service \
      /etc/systemd/system/tryon-collector.service

systemctl daemon-reload
systemctl enable tryon-collector       # 开机自启
systemctl start tryon-collector
```

### 1.3 验证

```bash
systemctl status tryon-collector       # active (running) 即成功
curl http://127.0.0.1:8082/health      # {"status":"ok","mode":"live"}

# 看日志
journalctl -u tryon-collector -f       # -f 跟随；-n 100 看最近 100 行
```

设计师们访问 `http://<部署机 IP>:8082/`，首次会弹花名输入框。

---

## 2. 更新版本（最常用）

```bash
cd /opt/workspace/yongli/tryon-collector
git pull

# 装新依赖（仅当 package.json / pyproject.toml 有变化时需要）
make install

# 重新构建前端（任何前端代码变化都要重做）
make build

# 重启服务
systemctl restart tryon-collector

# 看一眼是否启动成功
systemctl status tryon-collector
journalctl -u tryon-collector -n 30
```

`make build` 输出到 `frontend/dist/`，uvicorn 重启后就 serve 新版静态资源。

> **不需要 `daemon-reload`** — 除非你改了 `tryon-collector.service` 文件本身。改了的话先 `systemctl daemon-reload` 再 `restart`。

---

## 3. 常用运维命令

```bash
# 启停 / 重启
systemctl start tryon-collector
systemctl stop tryon-collector
systemctl restart tryon-collector

# 查看状态（包含最近几行日志）
systemctl status tryon-collector

# 跟随日志（实时）
journalctl -u tryon-collector -f

# 查看最近日志
journalctl -u tryon-collector -n 200 --no-pager
journalctl -u tryon-collector --since "1 hour ago"
journalctl -u tryon-collector --since today

# 开机自启 / 关闭自启
systemctl enable tryon-collector
systemctl disable tryon-collector

# 看监听端口确认服务在跑
ss -tlnp | grep :8082
```

---

## 4. 改端口 / 改环境变量

systemd unit 把端口和环境变量写在 `deploy/tryon-collector.service`：

```ini
ExecStart=/root/.local/bin/uv run uvicorn app.main:app --host 0.0.0.0 --port 8082
Environment="TRYON_DISK_LIMIT_GB=10"
```

要改：

```bash
vi /opt/workspace/yongli/tryon-collector/deploy/tryon-collector.service
systemctl daemon-reload
systemctl restart tryon-collector
```

支持的环境变量见 backend 代码：
- `STORAGE_ROOT` — 存储根目录（默认 `storage`）
- `IMG_DC_ROOT` — dispatcher symlink 目标（默认 `img-dc`）
- `MASK_THRESHOLD` — mask 二值化阈值（默认 30）
- `TRYON_DISK_LIMIT_GB` — 磁盘水位（默认 10）

---

## 5. 故障排查

| 症状 | 排查 |
|---|---|
| `systemctl start` 后立刻 `failed` | `journalctl -u tryon-collector -n 50` 看 stack trace |
| 端口冲突 `Address already in use` | `ss -tlnp \| grep :8082` 找占用进程；改 unit 里的端口 |
| 前端白屏 | `ls /opt/workspace/yongli/tryon-collector/frontend/dist/` 是否存在；不存在重跑 `make build` |
| 提交报 503 "存储空间已达上限" | `du -sh storage/` 超过 `TRYON_DISK_LIMIT_GB`；清 `storage/raw_ingestion/` 或调大阈值 |
| 改了 unit 文件但没生效 | 忘了 `systemctl daemon-reload` |
| `uv: command not found` | 确认 `/root/.local/bin/uv` 存在；不存在调整 unit 里 `ExecStart` 和 `PATH` 的 uv 绝对路径 |

---

## 6. 备选：nohup 模式（不用 systemd）

不想用 systemd 时的最小可用方案：

```bash
cd /opt/workspace/yongli/tryon-collector
nohup ./scripts/run.sh > tryon.log 2>&1 &
echo $! > tryon.pid

# 重启
kill $(cat tryon.pid) && nohup ./scripts/run.sh > tryon.log 2>&1 & echo $! > tryon.pid

# 停服
kill $(cat tryon.pid)
```

`scripts/run.sh` 内部包含 `make install` + `make build` + 起 uvicorn，每次重启都会重装依赖和重新构建（30-60 秒）。

**推荐用 systemd**：crash 自重启、开机自启、日志统一。

---

## 7. 与 dev 模式的边界

| 维度 | dev (`make dev`) | 生产 (systemd) |
|---|---|---|
| 启动方式 | 手工 `make dev` | `systemctl start tryon-collector` |
| 进程数 | 2（uvicorn + vite dev）| 1（uvicorn）|
| 端口 | :8003 + :5180 | :8082 |
| 协议 | HTTPS（自签）| HTTP |
| 前端 | Vite dev（HMR、未压缩）| 静态 build（压缩、code split）|
| API 路由 | Vite proxy `/api → :8003` | uvicorn 同源 serve |
| secure context | ✅ HTTPS | ❌ HTTP（fallback `uuid()` 兜住）|
| 谁用 | 开发者本机 | 局域网设计师 |

**不要让设计师用 `make dev`** — HMR 会让正在上传的设计师丢数据，dev 模式性能也差几倍。

#!/bin/bash
# =============================================================================
# Скрипт автоматического переноса и деплоя Backend API на сервер
# Сервер: 100.71.166.18 (Tailscale) / 192.168.1.80 (Local LAN)
# Пользователь: xinatory
# Порт SSH: 6767
# Пароль: 111qqq111
# =============================================================================

set -e

SERVER_USER="xinatory"
SERVER_PORT="6767"
SERVER_PASS="zaq12wsxcde3"
REMOTE_DIR="/home/xinatory/electro-dnevnik-backend"

# Определение доступного адреса для SSH (LAN или Tailscale)
if nc -z -G 2 192.168.1.80 "$SERVER_PORT" 2>/dev/null; then
    SERVER_IP="192.168.1.80"
elif nc -z -G 2 100.71.166.18 "$SERVER_PORT" 2>/dev/null; then
    SERVER_IP="100.71.166.18"
else
    SERVER_IP="192.168.1.80"
fi

echo "=== [1/4] Подготовка к деплою на сервер: $SERVER_USER@$SERVER_IP:$SERVER_PORT ==="

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# Быстрая проверка типов перед отправкой
echo "=== [2/4] Проверка целостности исходного кода ==="
npx tsc --noEmit

echo "=== [3/4] Упаковка и синхронизация файлов на сервер ==="

# Создание архива без node_modules и .git
ARCHIVE_PATH="/tmp/dnevnik-backend-deploy.tar.gz"
tar --exclude='node_modules' \
    --exclude='.git' \
    --exclude='.next/cache' \
    -czf "$ARCHIVE_PATH" .

echo "Архив сформирован: $ARCHIVE_PATH"

# Передача на сервер
echo "Передача архива на $SERVER_IP:$SERVER_PORT..."
python3 - <<EOF
import os, select, sys, time, pty

cmd = ['scp', '-P', '$SERVER_PORT', '-o', 'StrictHostKeyChecking=no', '$ARCHIVE_PATH', '$SERVER_USER@$SERVER_IP:/tmp/dnevnik-backend.tar.gz']
pid, fd = pty.fork()
if pid == 0:
    os.execvp('scp', cmd)
else:
    output = b''
    while True:
        r, _, _ = select.select([fd], [], [], 15)
        if not r:
            break
        try:
            data = os.read(fd, 1024)
            if not data:
                break
            output += data
            if b'password:' in output.lower():
                time.sleep(0.3)
                os.write(fd, b'$SERVER_PASS\n')
        except OSError:
            break
    os.close(fd)
    _, status = os.waitpid(pid, 0)
    if status != 0:
        print("Ошибка передачи по SCP. Статус:", status)
        sys.exit(1)
EOF

echo "=== [4/4] Запуск сервиса на сервере через Docker Compose ==="
python3 - <<EOF
import os, select, sys, time, pty

remote_cmd = (
    "mkdir -p $REMOTE_DIR && "
    "tar -xzf /tmp/dnevnik-backend.tar.gz -C $REMOTE_DIR && "
    "cd $REMOTE_DIR && "
    "docker compose down || true && "
    "docker compose up -d --build && "
    "echo 'Backend API успешно запущен!' && "
    "sleep 3 && "
    "curl -s http://localhost:3000/api/eschools/test || true"
)

cmd = ['ssh', '-p', '$SERVER_PORT', '-o', 'StrictHostKeyChecking=no', '$SERVER_USER@$SERVER_IP', remote_cmd]
pid, fd = pty.fork()
if pid == 0:
    os.execvp('ssh', cmd)
else:
    output = b''
    last_data_time = time.time()
    while True:
        r, _, _ = select.select([fd], [], [], 2)
        if r:
            try:
                data = os.read(fd, 4096)
                if not data:
                    break
                sys.stdout.write(data.decode('utf-8', errors='replace'))
                sys.stdout.flush()
                output += data
                last_data_time = time.time()
                if b'password:' in data.lower():
                    time.sleep(0.3)
                    os.write(fd, b'$SERVER_PASS\n')
            except OSError:
                break
        else:
            # Check if process is still running
            res = os.waitpid(pid, os.WNOHANG)
            if res != (0, 0):
                break
            if time.time() - last_data_time > 300:
                print("Таймаут выполнения команды на сервере (300с)")
                break
    os.close(fd)
    _, status = os.waitpid(pid, 0)
    if status != 0:
        print("Ошибка запуска на сервере. Код завершения:", status)
        sys.exit(1)
EOF

echo "=== Деплой бэкенда завершен ==="

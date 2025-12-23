# Redis Installation & Setup Guide for Ubuntu Droplet

## Step 1: SSH into your Ubuntu droplet

```bash
ssh root@YOUR_DROPLET_IP
```

## Step 2: Install Redis

```bash
# Update package manager
sudo apt update

# Install Redis server
sudo apt install -y redis-server

# Verify installation
redis-cli --version
```

## Step 3: Start Redis service

```bash
# Start Redis
sudo systemctl start redis-server

# Enable auto-start on boot
sudo systemctl enable redis-server

# Check status
sudo systemctl status redis-server
```

## Step 4: Test Redis connection

```bash
# Connect to Redis CLI
redis-cli

# Test command
ping
# Should return: PONG
```

## Step 5: Configure Redis (Optional but recommended)

```bash
# Edit Redis config
sudo nano /etc/redis/redis.conf

# Find and set these values:
# maxmemory 256mb              # Memory limit
# maxmemory-policy allkeys-lru # Eviction policy
# requirepass your_password    # Set password (optional)

# Save and exit: Ctrl+X, Y, Enter
```

Then restart:
```bash
sudo systemctl restart redis-server
```

## Step 6: Verify Redis is working

```bash
redis-cli ping
# Should return: PONG
```

## Troubleshooting

**If Redis won't start:**
```bash
sudo redis-server /etc/redis/redis.conf
```

**Check logs:**
```bash
sudo tail -f /var/log/redis/redis-server.log
```

**Check if port 6379 is open:**
```bash
sudo netstat -tlnp | grep redis
```

---

## Next Steps:
Once Redis is running, I'll create Flask caching integration for:
- ✅ Category list caching
- ✅ Stats endpoint caching  
- ✅ Query result caching
- ✅ Session data caching

This will give you **10-50x performance boost** on repeated queries!

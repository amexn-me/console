#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# Navigate to application directory
cd /var/www/flick-console

# Maintenance mode
echo "🔧 Enabling maintenance mode..."
php artisan down || true

# Pull latest code
echo "📥 Pulling latest code from main branch..."
git pull origin main

# Install/update Composer dependencies
echo "📦 Installing Composer dependencies..."
composer install --no-dev --optimize-autoloader --no-interaction

# Install/update npm dependencies and build assets
echo "🎨 Building frontend assets..."
npm ci
npm run build

# Clear and cache config
echo "⚙️  Clearing and caching configuration..."
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

# Run database migrations
echo "🗄️  Running database migrations..."
php artisan migrate --force

# Optimize application
echo "⚡ Optimizing application..."
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# Set proper permissions
echo "🔐 Setting permissions..."
sudo chown -R www-data:www-data storage bootstrap/cache
chmod -R 775 storage bootstrap/cache

# Restart PHP-FPM for opcache refresh
echo "♻️  Restarting PHP-FPM..."
sudo systemctl restart php8.3-fpm

# Disable maintenance mode
echo "✅ Disabling maintenance mode..."
php artisan up

echo "🎉 Deployment completed successfully!"


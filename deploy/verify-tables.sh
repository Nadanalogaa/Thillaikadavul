#!/bin/bash
# Verify PostgreSQL Tables Script
# Run this in Portainer console: sh /tmp/verify-tables.sh

echo "========================================="
echo "PostgreSQL Tables Verification"
echo "========================================="
echo ""

# List all tables
echo "📊 All Tables:"
psql -U nadanaloga_user -d nadanaloga -c "\dt"

echo ""
echo "👥 Total Users:"
psql -U nadanaloga_user -d nadanaloga -c "SELECT COUNT(*) FROM users;"

echo ""
echo "📚 Total Courses:"
psql -U nadanaloga_user -d nadanaloga -c "SELECT COUNT(*) FROM courses;"

echo ""
echo "👨‍🎓 Latest Students:"
psql -U nadanaloga_user -d nadanaloga -c "SELECT name, email, created_at FROM users WHERE role = 'Student' ORDER BY created_at DESC LIMIT 5;"

echo ""
echo "========================================="
echo "✅ Verification Complete!"
echo "========================================="

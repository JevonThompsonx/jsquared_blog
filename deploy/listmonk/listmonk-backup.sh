#!/bin/sh
set -eu
mkdir -p /var/backups/listmonk
docker exec listmonk_db pg_dump -U listmonk -Fc listmonk > "/var/backups/listmonk/listmonk-$(date +%F).dump"
find /var/backups/listmonk -type f -name 'listmonk-*.dump' -mtime +14 -delete

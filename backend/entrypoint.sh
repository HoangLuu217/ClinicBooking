#!/bin/sh
# Build DATABASE_URL from Railway environment variables
export DATABASE_URL="jdbc:postgresql://${PGHOST}:${PGPORT}/${PGDATABASE}?sslmode=require"
export DB_USERNAME="${PGUSER}"
export DB_PASSWORD="${PGPASSWORD}"

# Run the application
exec java -Xmx512m -Xms256m -XX:+UseContainerSupport -jar app.jar


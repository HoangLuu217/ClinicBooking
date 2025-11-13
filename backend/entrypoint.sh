#!/bin/sh
# Build DATABASE_URL from Railway environment variables if not already set
if [ -z "$DATABASE_URL" ] || [ "$DATABASE_URL" = "jdbc:postgresql://:/?sslmode=require" ] || [ "$DATABASE_URL" = "jdbc:postgresql://\${PGHOST}:\${PGPORT}/\${PGDATABASE}?sslmode=require" ]; then
    if [ -n "$PGHOST" ] && [ -n "$PGPORT" ] && [ -n "$PGDATABASE" ]; then
        export DATABASE_URL="jdbc:postgresql://${PGHOST}:${PGPORT}/${PGDATABASE}?sslmode=require"
    else
        echo "ERROR: PGHOST, PGPORT, or PGDATABASE not set!"
        exit 1
    fi
fi

# Set DB_USERNAME and DB_PASSWORD if not already set
if [ -z "$DB_USERNAME" ] && [ -n "$PGUSER" ]; then
    export DB_USERNAME="${PGUSER}"
fi

if [ -z "$DB_PASSWORD" ] && [ -n "$PGPASSWORD" ]; then
    export DB_PASSWORD="${PGPASSWORD}"
fi

# Debug: Print DATABASE_URL (without password)
echo "DATABASE_URL set to: jdbc:postgresql://${PGHOST:-unknown}:${PGPORT:-unknown}/${PGDATABASE:-unknown}"

# Run the application
exec java -Xmx512m -Xms256m -XX:+UseContainerSupport -jar app.jar


#!/bin/bash

# Setup script for applying Supabase migrations
# This script helps apply the teaching_assistants table migrations to fix the error:
# "ERROR: 42P01: relation 'teaching_assistants' does not exist"

set -e

echo "============================================"
echo "Campus Guard - Database Migration Setup"
echo "============================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}Error: Supabase CLI is not installed.${NC}"
    echo ""
    echo "Please install it using one of these methods:"
    echo ""
    echo "  macOS/Linux:"
    echo "    brew install supabase/tap/supabase"
    echo ""
    echo "  Linux (manual):"
    echo "    curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar -xz"
    echo "    sudo mv supabase /usr/local/bin/"
    echo ""
    echo "  Windows:"
    echo "    scoop install supabase"
    echo ""
    echo "For more options, visit: https://github.com/supabase/cli#install-the-cli"
    exit 1
fi

echo -e "${GREEN}✓ Supabase CLI is installed ($(supabase --version))${NC}"
echo ""

# Check if config.toml exists
if [ ! -f "supabase/config.toml" ]; then
    echo -e "${RED}Error: supabase/config.toml not found${NC}"
    echo "Please run this script from the root of the campus-guard repository."
    exit 1
fi

# Get project ref from config
PROJECT_REF=$(grep 'project_id' supabase/config.toml | cut -d'"' -f2)

if [ -z "$PROJECT_REF" ]; then
    echo -e "${RED}Error: Could not find project_id in supabase/config.toml${NC}"
    exit 1
fi

echo -e "Project ID: ${YELLOW}${PROJECT_REF}${NC}"
echo ""

# Check if already linked
if supabase status 2>/dev/null | grep -q "supabase/config.toml"; then
    echo -e "${GREEN}✓ Project is already linked${NC}"
else
    echo "Linking to Supabase project..."
    echo ""
    echo -e "${YELLOW}Note: You will be prompted to login to Supabase if not already authenticated.${NC}"
    echo ""
    
    # Try to link the project
    if supabase link --project-ref "$PROJECT_REF"; then
        echo -e "${GREEN}✓ Successfully linked to project${NC}"
    else
        echo -e "${RED}Error: Failed to link project${NC}"
        echo ""
        echo "Please ensure you have:"
        echo "  1. Logged in to Supabase CLI: supabase login"
        echo "  2. Access to the project: $PROJECT_REF"
        exit 1
    fi
fi

echo ""
echo "============================================"
echo "Applying Migrations"
echo "============================================"
echo ""

# List migrations to be applied
echo "The following migrations will be applied:"
echo ""
for migration in supabase/migrations/*.sql; do
    echo "  • $(basename "$migration")"
done
echo ""

# Confirm before proceeding
read -p "Do you want to proceed? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled."
    exit 0
fi

echo ""
echo "Pushing migrations to database..."
echo ""

# Push migrations
if supabase db push; then
    echo ""
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}✓ Migrations applied successfully!${NC}"
    echo -e "${GREEN}============================================${NC}"
    echo ""
    echo "The following tables have been created:"
    echo "  • courses"
    echo "  • teaching_assistants"
    echo "  • course_assignments"
    echo ""
    echo "Sample courses have been added."
    echo "Row Level Security (RLS) policies have been configured."
    echo ""
    echo "Next steps:"
    echo "  1. TAs can now register at /ta/signup"
    echo "  2. TAs can login at /ta/login"
    echo "  3. Admins can assign TAs to courses"
    echo ""
else
    echo ""
    echo -e "${RED}Error: Failed to apply migrations${NC}"
    echo ""
    echo "Common issues:"
    echo "  1. Database connection issues"
    echo "  2. Insufficient permissions"
    echo "  3. Migrations already applied"
    echo ""
    echo "Try running: supabase db push --dry-run"
    echo "to see what would be applied without actually applying it."
    exit 1
fi

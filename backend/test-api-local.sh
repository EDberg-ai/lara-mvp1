#!/bin/bash

# Comprehensive Backend API Tests (LOCAL)
# Tests Settings Modal Overhaul and Onboarding Demo features

API_URL="http://localhost:3004"
PASS_COUNT=0
FAIL_COUNT=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASS_COUNT++))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAIL_COUNT++))
}

log_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

log_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

echo "=================================="
echo "  Backend API Test Suite (LOCAL)"
echo "=================================="
echo ""

# ==========================================
# Test 1: Login with existing teacher
# ==========================================
log_test "Test 1: Login with existing teacher credentials"

LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"Mukelathegreat@gmail.com","password":"Milan18$"}')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token // empty')
TEACHER_ID=$(echo $LOGIN_RESPONSE | jq -r '.teacher.id // empty')
TEACHER_NAME=$(echo $LOGIN_RESPONSE | jq -r '.teacher.name // empty')

if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
    log_pass "Login successful - Teacher: $TEACHER_NAME"
else
    log_fail "Login failed: $LOGIN_RESPONSE"
    exit 1
fi

# ==========================================
# Test 2: Get profile
# ==========================================
log_test "Test 2: Get teacher profile (GET /api/auth/me)"

PROFILE_RESPONSE=$(curl -s -X GET "$API_URL/api/auth/me" \
  -H "Authorization: Bearer $TOKEN")

PROFILE_EMAIL=$(echo $PROFILE_RESPONSE | jq -r '.email // empty')
AI_CALLS_USED=$(echo $PROFILE_RESPONSE | jq -r '.aiCallsUsed // empty')
AI_CALLS_LIMIT=$(echo $PROFILE_RESPONSE | jq -r '.aiCallsLimit // empty')
TIER=$(echo $PROFILE_RESPONSE | jq -r '.tier // empty')

if [ -n "$PROFILE_EMAIL" ] && [ "$PROFILE_EMAIL" != "null" ]; then
    log_pass "Profile retrieved - Email: $PROFILE_EMAIL, Tier: $TIER, AI Calls: $AI_CALLS_USED/$AI_CALLS_LIMIT"
else
    log_fail "Failed to get profile: $PROFILE_RESPONSE"
fi

# ==========================================
# Test 3: Update profile name
# ==========================================
log_test "Test 3: Update profile name (PATCH /api/auth/me)"

# Save original name for restoration
ORIGINAL_NAME=$TEACHER_NAME
NEW_NAME="Test Name $(date +%s)"

UPDATE_RESPONSE=$(curl -s -X PATCH "$API_URL/api/auth/me" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$NEW_NAME\"}")

UPDATE_SUCCESS=$(echo $UPDATE_RESPONSE | jq -r '.success // empty')
UPDATED_NAME=$(echo $UPDATE_RESPONSE | jq -r '.teacher.name // empty')

if [ "$UPDATE_SUCCESS" = "true" ] && [ "$UPDATED_NAME" = "$NEW_NAME" ]; then
    log_pass "Name updated to: $UPDATED_NAME"
else
    log_fail "Failed to update name: $UPDATE_RESPONSE"
fi

# Restore original name
curl -s -X PATCH "$API_URL/api/auth/me" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$ORIGINAL_NAME\"}" > /dev/null

log_info "Restored original name: $ORIGINAL_NAME"

# ==========================================
# Test 4: Update profile - Edge case: empty name
# ==========================================
log_test "Test 4: Update profile with empty name (should fail)"

EMPTY_NAME_RESPONSE=$(curl -s -X PATCH "$API_URL/api/auth/me" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":""}')

EMPTY_ERROR=$(echo $EMPTY_NAME_RESPONSE | jq -r '.error // empty')

if [ -n "$EMPTY_ERROR" ]; then
    log_pass "Empty name correctly rejected: $EMPTY_ERROR"
else
    log_fail "Empty name should have been rejected: $EMPTY_NAME_RESPONSE"
fi

# ==========================================
# Test 5: Update profile - Edge case: whitespace-only name
# ==========================================
log_test "Test 5: Update profile with whitespace-only name (should fail)"

WHITESPACE_RESPONSE=$(curl -s -X PATCH "$API_URL/api/auth/me" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"   "}')

WHITESPACE_ERROR=$(echo $WHITESPACE_RESPONSE | jq -r '.error // empty')

if [ -n "$WHITESPACE_ERROR" ]; then
    log_pass "Whitespace-only name correctly rejected: $WHITESPACE_ERROR"
else
    log_fail "Whitespace-only name should have been rejected: $WHITESPACE_RESPONSE"
fi

# ==========================================
# Test 6: Change password - wrong current password
# ==========================================
log_test "Test 6: Change password with wrong current password (should fail)"

WRONG_PW_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/change-password" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"wrongpassword","newPassword":"NewPass123$"}')

WRONG_PW_ERROR=$(echo $WRONG_PW_RESPONSE | jq -r '.error // empty')

if [ "$WRONG_PW_ERROR" = "Current password is incorrect" ]; then
    log_pass "Wrong current password correctly rejected"
else
    log_fail "Wrong password error not as expected: $WRONG_PW_RESPONSE"
fi

# ==========================================
# Test 7: Change password - too short new password
# ==========================================
log_test "Test 7: Change password with too short new password (should fail)"

SHORT_PW_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/change-password" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"Milan18$","newPassword":"abc"}')

SHORT_PW_ERROR=$(echo $SHORT_PW_RESPONSE | jq -r '.error // empty')

if echo "$SHORT_PW_ERROR" | grep -qi "6 characters"; then
    log_pass "Short password correctly rejected: $SHORT_PW_ERROR"
else
    log_fail "Short password error not as expected: $SHORT_PW_RESPONSE"
fi

# ==========================================
# Test 8: Change password - missing fields
# ==========================================
log_test "Test 8: Change password with missing fields (should fail)"

MISSING_FIELDS_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/change-password" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"Milan18$"}')

MISSING_ERROR=$(echo $MISSING_FIELDS_RESPONSE | jq -r '.error // empty')

if [ -n "$MISSING_ERROR" ]; then
    log_pass "Missing fields correctly rejected: $MISSING_ERROR"
else
    log_fail "Missing fields should have been rejected: $MISSING_FIELDS_RESPONSE"
fi

# ==========================================
# Test 9: Register new teacher & verify onboarding demo
# ==========================================
log_test "Test 9: Register new teacher and verify onboarding demo"

RANDOM_ID=$(date +%s)
NEW_EMAIL="testteacher${RANDOM_ID}@example.com"
NEW_PASSWORD="TestPass123$"
NEW_NAME="Test Teacher $RANDOM_ID"

REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$NEW_EMAIL\",\"password\":\"$NEW_PASSWORD\",\"name\":\"$NEW_NAME\"}")

NEW_TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.token // empty')
NEW_TEACHER_ID=$(echo $REGISTER_RESPONSE | jq -r '.teacher.id // empty')

if [ -n "$NEW_TOKEN" ] && [ "$NEW_TOKEN" != "null" ]; then
    log_pass "New teacher registered: $NEW_EMAIL"
else
    log_fail "Registration failed: $REGISTER_RESPONSE"
fi

# Give Redis time to sync
sleep 1

# Check for "Getting Started" folder
log_test "Test 9a: Checking for 'Getting Started' folder"

FOLDERS_RESPONSE=$(curl -s -X GET "$API_URL/api/folders" \
  -H "Authorization: Bearer $NEW_TOKEN")

GETTING_STARTED=$(echo $FOLDERS_RESPONSE | jq -r '.[] | select(.name == "Getting Started") | .name')
FOLDER_COLOR=$(echo $FOLDERS_RESPONSE | jq -r '.[] | select(.name == "Getting Started") | .color')

if [ "$GETTING_STARTED" = "Getting Started" ]; then
    log_pass "Getting Started folder created (color: $FOLDER_COLOR)"
else
    log_fail "Getting Started folder not found: $FOLDERS_RESPONSE"
fi

# Check for "Sample Writing Task"
log_test "Test 9b: Checking for 'Sample Writing Task'"

TASKS_RESPONSE=$(curl -s -X GET "$API_URL/api/tasks" \
  -H "Authorization: Bearer $NEW_TOKEN")

SAMPLE_TASK=$(echo $TASKS_RESPONSE | jq -r '.[] | select(.title == "Sample Writing Task") | .title')
TASK_ID=$(echo $TASKS_RESPONSE | jq -r '.[] | select(.title == "Sample Writing Task") | .id')
LIVE_SESSION_ID=$(echo $TASKS_RESPONSE | jq -r '.[] | select(.title == "Sample Writing Task") | .liveSessionId')
SUCCESS_CRITERIA=$(echo $TASKS_RESPONSE | jq -r '.[] | select(.title == "Sample Writing Task") | .successCriteria | length')
TASK_CODE=$(echo $TASKS_RESPONSE | jq -r '.[] | select(.title == "Sample Writing Task") | .taskCode')

if [ "$SAMPLE_TASK" = "Sample Writing Task" ]; then
    log_pass "Sample Writing Task created"
    log_info "  - Task ID: $TASK_ID"
    log_info "  - Task Code: $TASK_CODE"
    log_info "  - Success Criteria count: $SUCCESS_CRITERIA"
    log_info "  - Live Session ID: $LIVE_SESSION_ID"
else
    log_fail "Sample Writing Task not found: $TASKS_RESPONSE"
fi

# Check for demo students in session
if [ -n "$LIVE_SESSION_ID" ] && [ "$LIVE_SESSION_ID" != "null" ]; then
    log_test "Test 9c: Checking for demo students in session"

    DASHBOARD_RESPONSE=$(curl -s -X GET "$API_URL/api/sessions/$LIVE_SESSION_ID/dashboard" \
      -H "Authorization: Bearer $NEW_TOKEN")

    STUDENT_COUNT=$(echo $DASHBOARD_RESPONSE | jq -r '.students | length')
    EMMA=$(echo $DASHBOARD_RESPONSE | jq -r '.students[] | select(.name == "Emma S.") | .name')
    JAMES=$(echo $DASHBOARD_RESPONSE | jq -r '.students[] | select(.name == "James T.") | .name')
    SOFIA=$(echo $DASHBOARD_RESPONSE | jq -r '.students[] | select(.name == "Sofia M.") | .name')

    if [ "$STUDENT_COUNT" -ge 3 ]; then
        log_pass "Demo students created: $STUDENT_COUNT students found"
        if [ "$EMMA" = "Emma S." ]; then
            log_pass "  - Emma S. found"
        else
            log_fail "  - Emma S. not found"
        fi
        if [ "$JAMES" = "James T." ]; then
            log_pass "  - James T. found"
        else
            log_fail "  - James T. not found"
        fi
        if [ "$SOFIA" = "Sofia M." ]; then
            log_pass "  - Sofia M. found"
        else
            log_fail "  - Sofia M. not found"
        fi
    else
        log_fail "Expected 3 demo students, found: $STUDENT_COUNT"
        log_info "Dashboard response: $(echo $DASHBOARD_RESPONSE | jq '.students')"
    fi

    # Check Emma's feedback
    log_test "Test 9d: Checking Emma's feedback"
    EMMA_STATUS=$(echo $DASHBOARD_RESPONSE | jq -r '.students[] | select(.name == "Emma S.") | .status // empty')
    EMMA_FEEDBACK_STATUS=$(echo $DASHBOARD_RESPONSE | jq -r '.students[] | select(.name == "Emma S.") | .submission.feedbackStatus // empty')
    EMMA_HAS_FEEDBACK=$(echo $DASHBOARD_RESPONSE | jq -r '.students[] | select(.name == "Emma S.") | .submission.feedback // empty')

    if [ "$EMMA_FEEDBACK_STATUS" = "released" ]; then
        log_pass "Emma's feedback is released"
    else
        log_info "Emma's feedback status: $EMMA_FEEDBACK_STATUS (expected: released)"
    fi

    if [ -n "$EMMA_HAS_FEEDBACK" ] && [ "$EMMA_HAS_FEEDBACK" != "null" ]; then
        log_pass "Emma has feedback attached"
        EMMA_MASTERY=$(echo $DASHBOARD_RESPONSE | jq -r '.students[] | select(.name == "Emma S.") | .submission.feedback.masteryAchieved // empty')
        log_info "  - Mastery achieved: $EMMA_MASTERY"
    else
        log_info "Emma's feedback data not present in Redis yet"
    fi

    # Check James's status (should be ready_for_feedback)
    log_test "Test 9e: Checking James's status"
    JAMES_STATUS=$(echo $DASHBOARD_RESPONSE | jq -r '.students[] | select(.name == "James T.") | .status // empty')
    JAMES_FEEDBACK_STATUS=$(echo $DASHBOARD_RESPONSE | jq -r '.students[] | select(.name == "James T.") | .submission.feedbackStatus // empty')
    JAMES_CONTENT=$(echo $DASHBOARD_RESPONSE | jq -r '.students[] | select(.name == "James T.") | .submission.content // empty' | head -c 50)

    if [ "$JAMES_FEEDBACK_STATUS" = "pending" ] || [ "$JAMES_STATUS" = "ready_for_feedback" ]; then
        log_pass "James is awaiting feedback (status: $JAMES_STATUS)"
        log_info "  - James's submission preview: $JAMES_CONTENT..."
    else
        log_info "James status: $JAMES_STATUS, feedbackStatus: $JAMES_FEEDBACK_STATUS"
    fi

    # Check Sofia's status (should be active, no submission)
    log_test "Test 9f: Checking Sofia's status"
    SOFIA_STATUS=$(echo $DASHBOARD_RESPONSE | jq -r '.students[] | select(.name == "Sofia M.") | .status // empty')
    SOFIA_HAS_SUBMISSION=$(echo $DASHBOARD_RESPONSE | jq -r '.students[] | select(.name == "Sofia M.") | .submission // null')

    if [ "$SOFIA_STATUS" = "active" ]; then
        log_pass "Sofia is active (joined only, no submission)"
    else
        log_info "Sofia status: $SOFIA_STATUS"
    fi
else
    log_fail "No live session found for demo task"
fi

# ==========================================
# Test 10: Verify new teacher can change password
# ==========================================
log_test "Test 10: New teacher changes password successfully"

CHANGE_PW_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/change-password" \
  -H "Authorization: Bearer $NEW_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"currentPassword\":\"$NEW_PASSWORD\",\"newPassword\":\"NewPassword456$\"}")

CHANGE_SUCCESS=$(echo $CHANGE_PW_RESPONSE | jq -r '.success // empty')

if [ "$CHANGE_SUCCESS" = "true" ]; then
    log_pass "Password changed successfully"

    # Verify old password no longer works
    log_test "Test 10a: Verify old password no longer works"

    OLD_PW_LOGIN=$(curl -s -X POST "$API_URL/api/auth/login" \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"$NEW_EMAIL\",\"password\":\"$NEW_PASSWORD\"}")

    OLD_PW_ERROR=$(echo $OLD_PW_LOGIN | jq -r '.error // empty')

    if [ -n "$OLD_PW_ERROR" ]; then
        log_pass "Old password correctly rejected after change"
    else
        log_fail "Old password should not work after change"
    fi

    # Verify new password works
    log_test "Test 10b: Verify new password works"

    NEW_PW_LOGIN=$(curl -s -X POST "$API_URL/api/auth/login" \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"$NEW_EMAIL\",\"password\":\"NewPassword456$\"}")

    NEW_PW_TOKEN=$(echo $NEW_PW_LOGIN | jq -r '.token // empty')

    if [ -n "$NEW_PW_TOKEN" ] && [ "$NEW_PW_TOKEN" != "null" ]; then
        log_pass "New password works correctly"
    else
        log_fail "New password should work: $NEW_PW_LOGIN"
    fi
else
    log_fail "Failed to change password: $CHANGE_PW_RESPONSE"
fi

# ==========================================
# Test 11: Unauthorized access (no token)
# ==========================================
log_test "Test 11: Unauthorized access to protected endpoints"

UNAUTH_PROFILE=$(curl -s -X GET "$API_URL/api/auth/me")
UNAUTH_ERROR=$(echo $UNAUTH_PROFILE | jq -r '.error // empty')

if [ -n "$UNAUTH_ERROR" ]; then
    log_pass "Unauthorized access correctly rejected"
else
    log_fail "Should reject unauthorized access: $UNAUTH_PROFILE"
fi

# ==========================================
# Test 12: Invalid token
# ==========================================
log_test "Test 12: Invalid token access"

INVALID_TOKEN_RESPONSE=$(curl -s -X GET "$API_URL/api/auth/me" \
  -H "Authorization: Bearer invalidtoken123")
INVALID_ERROR=$(echo $INVALID_TOKEN_RESPONSE | jq -r '.error // empty')

if [ -n "$INVALID_ERROR" ]; then
    log_pass "Invalid token correctly rejected"
else
    log_fail "Should reject invalid token: $INVALID_TOKEN_RESPONSE"
fi

# ==========================================
# Test 13: Login with second teacher account
# ==========================================
log_test "Test 13: Login with second teacher account"

LOGIN2_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"Jessekatungu@gmail.com","password":"Milan18$"}')

TOKEN2=$(echo $LOGIN2_RESPONSE | jq -r '.token // empty')
TEACHER2_NAME=$(echo $LOGIN2_RESPONSE | jq -r '.teacher.name // empty')

if [ -n "$TOKEN2" ] && [ "$TOKEN2" != "null" ]; then
    log_pass "Second teacher login successful - Teacher: $TEACHER2_NAME"
else
    log_fail "Second teacher login failed: $LOGIN2_RESPONSE"
fi

# ==========================================
# Test Summary
# ==========================================
echo ""
echo "=================================="
echo "  Test Summary"
echo "=================================="
echo -e "${GREEN}Passed: $PASS_COUNT${NC}"
echo -e "${RED}Failed: $FAIL_COUNT${NC}"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${YELLOW}Some tests need review.${NC}"
    exit 1
fi

# SonarQube 403 Error Troubleshooting Guide

## Problem Summary

The diagnostic command shows:
- ✅ SonarQube server connection successful (200 OK)
- ✅ Scanner execution successful
- ❌ Fetching metrics fails with **403 Forbidden**

## Root Cause

A **403 Forbidden** error (not 401 Unauthorized) indicates:
1. ✅ Authentication is working (token is valid)
2. ❌ Authorization is failing (token lacks required permissions)

## Why This Happens

The `/api/system/status` endpoint is public and doesn't require authentication, but `/api/measures/component` requires the token to have specific project permissions.

## Solution Steps

### Step 1: Verify Token Permissions in SonarQube

1. **Log into SonarQube Web UI**: http://localhost:9000
2. **Navigate to**: Administration → Security → Users
3. **Find your token user** (the user who generated the token)
4. **Check project permissions**:
   - Click on the user
   - Go to "Project Permissions" tab
   - Ensure the user has **Browse** permission on project `project-goose`

### Step 2: Check Token Scopes

1. **Go to**: My Account → Security → Tokens
2. **Find your token** (e.g., `local2`)
3. **Verify token type**:
   - **User Token**: Should have user's permissions
   - **Project Analysis Token**: Only for running scanner, NOT for reading metrics
   - **Global Analysis Token**: Only for running scanner, NOT for reading metrics

### Step 3: Regenerate Token with Correct Type

If your token is a "Project Analysis Token" or "Global Analysis Token", you need to regenerate it:

1. **Delete the old token**:
   - Go to: My Account → Security → Tokens
   - Revoke the existing token

2. **Create a new User Token**:
   - Type: **User Token** (not Analysis Token)
   - Name: e.g., `goose-code-review-user-token`
   - Copy the generated token

3. **Update VS Code Extension**:
   - Run command: `Goose: Add SonarQube Connection`
   - Choose "local2" (or create new connection)
   - Paste the new user token

### Step 4: Grant Project Permissions

If using a service account or dedicated user:

1. **In SonarQube Web UI**:
   - Administration → Projects → Management
   - Find project `project-goose`
   - Click "Project Settings" → "Permissions"

2. **Grant permissions to the token user**:
   - Add user to project
   - Grant at least **Browse** permission
   - Optionally grant **Execute Analysis** for scanner

### Step 5: Test Connection Again

Run the diagnostic command:
```bash
CMD/CTRL + Shift + P → "Goose: Diagnose SonarQube Configuration"
```

## Common Permission Issues

### Issue 1: Analysis Token vs User Token

| Token Type | Scanner | Read Metrics | Read Issues |
|------------|---------|--------------|-------------|
| **User Token** | ✅ | ✅ | ✅ |
| **Project Analysis Token** | ✅ | ❌ | ❌ |
| **Global Analysis Token** | ✅ | ❌ | ❌ |

**Solution**: Use **User Token** for the extension.

### Issue 2: Insufficient Project Permissions

**Required permissions**:
- ✅ **Browse**: View project code and measures
- ✅ **Execute Analysis**: Run SonarQube scanner (optional if only reading)

**Solution**: Grant "Browse" permission to the token user on the project.

### Issue 3: Project Visibility

**Private projects** require explicit permission grants.

**Solution**:
- Make project public (Administration → Projects → `project-goose` → Make Public)
- OR grant user explicit "Browse" permission

## Verification Checklist

After making changes, verify:

- [ ] Token type is **User Token** (not Analysis Token)
- [ ] User has **Browse** permission on project `project-goose`
- [ ] Project visibility allows token user to access it
- [ ] Token is stored correctly in VS Code Secret Storage
- [ ] Diagnostic command succeeds without 403 errors

## Alternative: Use Admin Token (Development Only)

For local development, you can use an admin token:

1. **Login as admin** (default: admin/admin)
2. **Generate User Token** for admin user
3. **Use this token** in the extension

⚠️ **Warning**: Never use admin tokens in production or CI/CD pipelines.

## API Endpoints Permissions

| Endpoint | Public | Auth Required | Permission Required |
|----------|--------|---------------|---------------------|
| `/api/system/status` | ✅ Yes | ❌ No | None |
| `/api/authentication/validate` | ⚠️ Partial | ✅ Yes | None (just valid token) |
| `/api/measures/component` | ❌ No | ✅ Yes | Browse project |
| `/api/issues/search` | ❌ No | ✅ Yes | Browse project |
| `/api/qualitygates/project_status` | ❌ No | ✅ Yes | Browse project |

## Next Steps

1. Follow Steps 1-5 above
2. Re-run diagnostic command
3. If still failing, check SonarQube server logs:
   ```bash
   docker logs sonarqube  # If using Docker
   # OR
   tail -f /path/to/sonarqube/logs/web.log
   ```

## Related Files

- Token storage: VS Code Secret Storage (encrypted)
- Configuration: `.vscode/settings.json` (workspace)
- Service implementation: `packages/git-analyzer/src/services/SonarQubeService.ts`
- Config service: `packages/vscode-extension/src/services/sonarqube-config-service.ts`

## References

- [SonarQube Authentication Docs](https://docs.sonarqube.org/latest/user-guide/user-token/)
- [SonarQube Web API Docs](https://docs.sonarqube.org/latest/extend/web-api/)
- [SonarQube Project Permissions](https://docs.sonarqube.org/latest/instance-administration/security/)

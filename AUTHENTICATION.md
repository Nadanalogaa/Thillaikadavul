# Authentication System Documentation

## Overview
The Nadanaloga application uses **Session-Based Authentication** with **PostgreSQL Session Store** for all users (Students, Teachers, and Admins).

---

## Authentication Type: Session-Based Authentication

### What is Session-Based Authentication?

Session-based authentication is a traditional, server-side authentication method where:
1. User credentials are verified on the server
2. Server creates a session and stores it in a database
3. Server sends a session cookie to the browser
4. Browser automatically sends the cookie with every request
5. Server validates the session on each request

---

## Architecture Components

### 1. **Password Hashing - bcrypt**
```javascript
const bcrypt = require('bcryptjs');
```

**Purpose:** Securely hash and verify passwords

**How it works:**
- **Registration:** Password is hashed with bcrypt (salt rounds: 10) before storing in database
- **Login:** User's password is compared with stored hash using `bcrypt.compare()`
- **Security:** Even if database is compromised, passwords cannot be reversed

**Example:**
```javascript
// Registration
const hashedPassword = await bcrypt.hash('userPassword123', 10);
// Stored: $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy

// Login verification
const isMatch = await bcrypt.compare('userPassword123', hashedPassword);
// Returns: true if passwords match, false otherwise
```

---

### 2. **Session Management - express-session + connect-pg-simple**

```javascript
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
```

**Configuration:** (server.js lines 350-364)
```javascript
app.use(session({
    secret: process.env.SESSION_SECRET || 'a-secure-secret-key',
    resave: false,
    saveUninitialized: false,
    store: new pgSession({
        pool: pool,              // PostgreSQL connection pool
        tableName: 'session'     // Sessions stored in 'session' table
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24,  // 1 day (24 hours)
        httpOnly: true,                // Cookie not accessible via JavaScript
        secure: process.env.NODE_ENV === 'production',  // HTTPS only in production
        sameSite: 'lax'                // CSRF protection
    }
}));
```

**Session Storage:**
- Sessions are stored in PostgreSQL database in the `session` table
- Each session contains: session ID, user data, expiration time
- Sessions persist even if server restarts (database-backed)

---

## Authentication Flow

### Registration Flow

```
User fills registration form
        ↓
Frontend: POST /api/register
        {
          "name": "John Doe",
          "email": "john@example.com",
          "password": "myPassword123",
          "role": "Student"
        }
        ↓
Backend: server.js (line 408)
        ↓
1. Check if email already exists
        ↓
2. Hash password with bcrypt (10 salt rounds)
   hashedPassword = await bcrypt.hash(password, 10)
        ↓
3. Insert into users table with hashed password
        ↓
4. Return parsed user object (no password)
        ↓
Frontend: Receive user object
        {
          "id": 123,
          "name": "John Doe",
          "email": "john@example.com",
          "role": "Student",
          "courses": [],
          "course_expertise": []
        }
```

---

### Login Flow

```
User enters email and password
        ↓
Frontend: POST /api/login
        {
          "email": "john@example.com",
          "password": "myPassword123"
        }
        ↓
Backend: server.js (line 453)
        ↓
1. Find user by email in database
        ↓
2. Verify password with bcrypt
   isMatch = await bcrypt.compare(password, user.password)
        ↓
3. If password matches:
   - Parse JSON fields (courses, course_expertise)
   - Remove password from user object
   - Store user in session: req.session.user = parsedUser
   - Session saved to PostgreSQL 'session' table
        ↓
4. Send session cookie to browser
   Cookie: connect.sid=s%3A... (encrypted session ID)
        ↓
5. Return parsed user object
        ↓
Frontend: Store user in localStorage + receive cookie
        ↓
User is now authenticated!
```

---

### Authenticated Request Flow

```
User makes a request (e.g., GET /api/batches)
        ↓
Browser automatically sends session cookie
Cookie: connect.sid=s%3A...
        ↓
Backend: express-session middleware
        ↓
1. Read session ID from cookie
        ↓
2. Query PostgreSQL 'session' table
        ↓
3. Retrieve session data
        {
          "user": {
            "id": 123,
            "name": "John Doe",
            "email": "john@example.com",
            "role": "Student"
          }
        }
        ↓
4. Attach user to request: req.session.user
        ↓
Backend: ensureAuthenticated middleware checks req.session.user
        ↓
If user exists: Allow request
If user missing: Return 401 Unauthorized
```

---

### Logout Flow

```
User clicks logout
        ↓
Frontend: POST /api/logout
        ↓
Backend: server.js (line 479)
        ↓
1. Destroy session in database
   req.session.destroy()
        ↓
2. Clear session cookie
   res.clearCookie('connect.sid')
        ↓
3. Return success
        ↓
Frontend: Clear localStorage
        ↓
User is logged out!
```

---

## Security Features

### 1. **Password Security**
- ✅ Passwords hashed with bcrypt (industry standard)
- ✅ Salt rounds: 10 (good balance of security and performance)
- ✅ Passwords never stored in plain text
- ✅ Passwords never sent in responses

### 2. **Session Security**
- ✅ Session ID is cryptographically random
- ✅ Session stored server-side (PostgreSQL)
- ✅ Only session ID sent to client (not user data)
- ✅ HttpOnly cookie (not accessible via JavaScript, prevents XSS)
- ✅ Secure flag in production (HTTPS only)
- ✅ SameSite: 'lax' (prevents CSRF attacks)
- ✅ Session expires after 24 hours

### 3. **Database Security**
- ✅ Sessions stored in PostgreSQL (persistent, secure)
- ✅ Connection uses credentials (username/password)
- ✅ No SQL injection (parameterized queries)

### 4. **API Security**
- ✅ CORS configured (only allowed origins)
- ✅ Authentication middleware (ensureAuthenticated)
- ✅ Role-based access control (ensureAdmin)

---

## Middleware Functions

### ensureAuthenticated
```javascript
const ensureAuthenticated = (req, res, next) => {
    if (req.session.user) return next();
    res.status(401).json({ message: 'Unauthorized' });
};
```
**Purpose:** Check if user is logged in
**Used for:** Any protected route

### ensureAdmin
```javascript
const ensureAdmin = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ message: 'Unauthorized: You must be logged in to perform this action.' });
    }
    if (req.session.user.role === 'Admin') {
        return next();
    }
    return res.status(403).json({ message: 'Forbidden: Admin access required.' });
};
```
**Purpose:** Check if user is logged in AND is an Admin
**Used for:** Admin-only routes (user management, etc.)

---

## Session Storage (PostgreSQL)

### Session Table Structure
```sql
CREATE TABLE "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  PRIMARY KEY ("sid")
);
```

### Example Session Data
```json
{
  "cookie": {
    "originalMaxAge": 86400000,
    "expires": "2026-01-23T10:30:00.000Z",
    "httpOnly": true,
    "path": "/",
    "sameSite": "lax"
  },
  "user": {
    "id": 123,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "Student",
    "courses": ["Bharatanatyam", "Vocal"],
    "course_expertise": []
  }
}
```

---

## Comparison: Session vs JWT

### Why Session-Based (Current)?

**Advantages:**
✅ Server-side storage (more secure)
✅ Easy to invalidate sessions (logout works instantly)
✅ Can store more data without increasing cookie size
✅ Automatic session expiration in database
✅ No token refresh complexity

**Disadvantages:**
❌ Requires database lookup on each request
❌ Not ideal for distributed systems (without sticky sessions)
❌ Requires database-backed session store

### JWT Alternative (Not Used)

**Advantages:**
✅ Stateless (no database lookup needed)
✅ Works well in distributed/microservices architecture
✅ Can be used across different domains

**Disadvantages:**
❌ Cannot be invalidated (logout doesn't work until expiry)
❌ Token stored in localStorage (vulnerable to XSS)
❌ Token sent in every request (larger payloads)
❌ Requires refresh token mechanism

---

## Current Implementation

**Authentication Type:** Session-Based Authentication
**Password Hashing:** bcrypt (10 salt rounds)
**Session Store:** PostgreSQL (connect-pg-simple)
**Session Duration:** 24 hours
**Cookie Security:** HttpOnly, SameSite=lax, Secure in production
**Applies to:** All users (Students, Teachers, Admins)

---

## Testing Authentication

### Test Student Login
```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@example.com","password":"password123"}' \
  -c cookies.txt

# Then use session cookie for authenticated request
curl -X GET http://localhost:3000/api/batches \
  -b cookies.txt
```

### Test Admin Login
```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@nadanaloga.com","password":"admin123"}' \
  -c cookies.txt

# Admin-only endpoint
curl -X GET http://localhost:3000/api/users \
  -b cookies.txt
```

---

## Summary

**For Students and Teachers:**
- Same authentication system as Admin
- Credentials verified with bcrypt
- Session stored in PostgreSQL
- Session cookie lasts 24 hours
- Secure, industry-standard approach
- No tokens, no JWT complexity
- Simple, secure, and reliable

**Security Level:** ⭐⭐⭐⭐⭐ (5/5)
- Password hashing: ✅
- HttpOnly cookies: ✅
- CSRF protection: ✅
- XSS protection: ✅
- Session expiration: ✅
- Secure in production: ✅

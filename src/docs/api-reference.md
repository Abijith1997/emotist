# API Reference

The Emotist backend API provides secure endpoints for user management, appointment booking, payments, and messaging. All API request and response bodies are formatted as JSON.

---

## Global Headers

Unless specified otherwise, authentication is required for all requests. Add the following headers to your API calls:

```http
Content-Type: application/json
Authorization: Bearer <your_jwt_token>
```

---

## Authentication Endpoints

### Login Therapist

Authenticates a therapist and returns a JWT token.

- **URL**: `/api/v1/auth/login`
- **Method**: `POST`
- **Authentication Required**: No

#### Request Body
```json
{
  "email": "therapist@example.com",
  "password": "securepassword123"
}
```

#### Response Body (`200 OK`)
```json
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6...",
    "therapist": {
      "id": "t_98231",
      "firstName": "Jane",
      "lastName": "Doe",
      "email": "therapist@example.com",
      "specialty": "Cognitive Behavioral Therapy"
    }
  }
}
```

---

## Appointments Endpoints

### List Appointments

Retrieves a list of appointments for the authenticated therapist.

- **URL**: `/api/v1/appointments`
- **Method**: `GET`
- **Authentication Required**: Yes
- **Query Parameters**:
  - `status`: Filter by status (`pending`, `confirmed`, `completed`, `cancelled`).
  - `limit`: Number of items to return (default: `20`).

#### Response Body (`200 OK`)
```json
{
  "status": "success",
  "results": 2,
  "data": {
    "appointments": [
      {
        "id": "apt_103",
        "clientName": "John Smith",
        "scheduledTime": "2026-06-18T14:00:00Z",
        "durationMinutes": 50,
        "status": "confirmed",
        "type": "video"
      },
      {
        "id": "apt_104",
        "clientName": "Sarah Connor",
        "scheduledTime": "2026-06-19T10:00:00Z",
        "durationMinutes": 50,
        "status": "pending",
        "type": "in-person"
      }
    ]
  }
}
```

### Create Appointment

Schedules a new session with a client.

- **URL**: `/api/v1/appointments`
- **Method**: `POST`
- **Authentication Required**: Yes

#### Request Body
```json
{
  "clientId": "c_2041",
  "scheduledTime": "2026-06-22T09:00:00Z",
  "durationMinutes": 50,
  "type": "video"
}
```

#### Response Body (`21Created`)
```json
{
  "status": "success",
  "data": {
    "appointment": {
      "id": "apt_105",
      "clientId": "c_2041",
      "scheduledTime": "2026-06-22T09:00:00Z",
      "durationMinutes": 50,
      "type": "video",
      "status": "pending"
    }
  }
}
```

---

## Error Handling

When an error occurs, the API returns a standard structured JSON error block alongside an appropriate HTTP status code:

```json
{
  "status": "error",
  "statusCode": 400,
  "message": "Validation failed: 'scheduledTime' must be a future ISO date string."
}
```

### Common HTTP Status Codes
- **`400 Bad Request`**: The request payload is malformed or invalid.
- **`401 Unauthorized`**: Missing or invalid `Authorization` bearer token.
- **`403 Forbidden`**: Authenticated user does not have permissions to perform this action.
- **`404 Not Found`**: The requested resource could not be found.
- **`500 Internal Error`**: An unexpected server-side error occurred.

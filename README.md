
# Postgres CRUD API with Swagger Documentation

This project provides a fully functional CRUD (Create, Read, Update, Delete) API for interacting with a PostgreSQL database. It includes detailed Swagger documentation and implements robust validation, error handling, pagination, and advanced features such as session-based authentication and login attempt logging.

---

## **Features**
- CRUD operations for managing data in a PostgreSQL database.
- Input validation with `express-validator`.
- Swagger UI for interactive API documentation with custom favicon and title.
- Basic authentication for Swagger with session management.
- Login attempt logging, including timestamps, usernames, and passwords.
- Pagination support for `GET` operations.
- Secure error handling to prevent sensitive data leaks.
- Automatic session expiration after inactivity.

---

## **Table of Contents**
1. [Setup Prerequisites](#setup-prerequisites)
2. [Setting Up PostgreSQL](#setting-up-postgresql)
3. [Project Setup](#project-setup)
4. [Running the Application](#running-the-application)
5. [API Endpoints](#api-endpoints)
6. [Swagger Documentation](#swagger-documentation)
7. [Authentication for Swagger](#authentication-for-swagger)
8. [File Structure](#file-structure)
9. [Security Practices](#security-practices)
10. [Contributing](#contributing)

---

## **Setup Prerequisites**

1. **Node.js**: Install [Node.js](https://nodejs.org/).
2. **PostgreSQL**: Install [PostgreSQL](https://www.postgresql.org/).
3. **Git**: Install Git for version control.
4. **npm**: Ensure `npm` (Node Package Manager) is installed with Node.js.

---

## **Setting Up PostgreSQL**

### Step 1: Install PostgreSQL
Install PostgreSQL on your system or server:
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

### Step 2: Start PostgreSQL
Ensure the PostgreSQL service is running:
```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Step 3: Create a Database
1. Log into the PostgreSQL shell:
   ```bash
   sudo -u postgres psql
   ```
2. Create a new database:
   ```sql
   CREATE DATABASE growth;
   ```
3. Exit the shell:
   ```sql
   \q
   ```

### Step 4: Configure PostgreSQL for Remote Access
Edit the PostgreSQL configuration file to allow external connections:
```bash
sudo nano /etc/postgresql/<version>/main/postgresql.conf
```
Uncomment and set the following:
```
listen_addresses = '*'
```

Update `pg_hba.conf` to allow connections:
```bash
sudo nano /etc/postgresql/<version>/main/pg_hba.conf
```
Add the following line:
```
host    all             all             0.0.0.0/0               md5
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

---

## **Project Setup**

### Step 1: Clone the Repository
Clone the project repository:
```bash
git clone https://github.com/Ritwik-28/data-setup.git
cd data-setup
```

### Step 2: Install Dependencies
Install the required Node.js packages:
```bash
npm install
```

### Step 3: Configure Environment Variables
1. Create a `.env` file in the project root:
   ```bash
   nano .env
   ```
2. Add the following environment variables:
   ```plaintext
   DB_USER=postgres
   DB_PASSWORD=<your_postgres_password>
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=growth
   PORT=5000
   SESSION_SECRET=<your_strong_secret_key>
   ```

### Step 4: Add Authentication
1. Create a `users.json` file in the project root for Swagger authentication:
   ```json
   {
       "admin": "password123",
       "user1": "user1password"
   }
   ```
2. Add `users.json` to `.gitignore`:
   ```plaintext
   users.json
   ```

---

## **Running the Application**

1. Start the server:
   ```bash
   node index.js
   ```
2. The server will run on `http://localhost:5000`.

---

## **API Endpoints**

### 1. **Create Item**
- **Endpoint**: `POST /api/items`
- **Request Body**:
  ```json
  {
      "name": "Item Name",
      "value": "Item Value"
  }
  ```
- **Response**:
  ```json
  {
      "id": 1,
      "name": "Item Name",
      "value": "Item Value"
  }
  ```

### 2. **Retrieve All Items**
- **Endpoint**: `GET /api/items?page=1&limit=10`
- **Response**:
  ```json
  {
      "totalItems": 100,
      "currentPage": 1,
      "totalPages": 10,
      "data": [
          {
              "id": 1,
              "name": "Item Name",
              "value": "Item Value"
          }
      ]
  }
  ```

### 3. **Update Item**
- **Endpoint**: `PUT /api/items/{id}`
- **Request Body**:
  ```json
  {
      "name": "Updated Name",
      "value": "Updated Value"
  }
  ```
- **Response**:
  ```json
  {
      "id": 1,
      "name": "Updated Name",
      "value": "Updated Value"
  }
  ```

### 4. **Delete Item**
- **Endpoint**: `DELETE /api/items/{id}`
- **Response**: Status `204 No Content`

---

## **Swagger Documentation**

Swagger UI is available at:
```
http://localhost:5000/api-docs
```
Use the credentials from `users.json` to log in.

---

## **Authentication for Swagger**

- **Username and Password**: Stored in `users.json`.
- **Security**: `users.json` is ignored in `.gitignore` to prevent exposure in the repository.
- **Session Management**: Sessions expire after 10 minutes of inactivity.

---

## **File Structure**

```
backend/
+-- db/
¦   +-- pool.js              # Database connection pool
+-- routes/
¦   +-- crud.js              # CRUD API routes with Swagger annotations
+-- public/
¦   +-- login.html           # Custom login UI
+-- logs/
¦   +-- login_attempts.log   # Contains logs of login attempts
+-- users.json               # Credentials for Swagger authentication (ignored by Git)
+-- .env                     # Environment variables
+-- .gitignore               # Excludes sensitive files from Git
+-- index.js                 # Main server file
+-- package.json             # Dependencies and scripts
```

---

## **Security Practices**

1. **Secure Environment Variables**:
   - Use `.env` for storing database credentials and session secrets.
   - Ensure `.env` is in `.gitignore`.

2. **Authentication**:
   - Protect Swagger UI with session-based authentication.
   - Log all login attempts (success and failure).

3. **Error Handling**:
   - Log internal errors to the server console.
   - Send generic error messages to the client.

4. **Pagination**:
   - Use pagination for `GET` requests to prevent large dataset overloading.

5. **Rate Limiting**:
   - Protect against DDoS attacks by applying rate limiting to login and API endpoints.

---

## **Contributing**

1. Fork the repository.
2. Create a feature branch:
   ```bash
   git checkout -b feature-name
   ```
3. Commit your changes:
   ```bash
   git commit -m "Add a new feature"
   ```
4. Push to the branch:
   ```bash
   git push origin feature-name
   ```
5. Open a pull request.

---

## **License**

This project is licensed under the MIT License. See the `LICENSE` file for details.

---

## **Acknowledgements**
- [Express.js](https://expressjs.com/)
- [PostgreSQL](https://www.postgresql.org/)
- [Swagger UI](https://swagger.io/tools/swagger-ui/)
- [express-validator](https://express-validator.github.io/docs/)
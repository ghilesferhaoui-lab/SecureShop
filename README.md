# SecureShop - Secure E-Commerce Microservices Platform
## Workshop 3: DevSecOps Case Study

A complete microservices e-commerce platform designed to demonstrate DevSecOps practices and security scanning in CI/CD pipelines.

---

## 📋 System Architecture

SecureShop consists of **6 microservices** orchestrated with Docker Compose, behind an **Nginx API Gateway**:

| Service | Port | Language | Responsibility |
|---------|------|----------|-----------------|
| **User Service** | 8001 | Python | Authentication, JWT issuance, user profiles |
| **Product Service** | 8002 | Node.js | Product catalog, search, categories |
| **Order Service** | 8003 | Node.js | Cart management, order lifecycle |
| **Payment Service** | 8004 | Node.js | Payment processing, transaction records |
| **Notification Service** | 8005 | Python | Email/SMS dispatch via message queue |
| **Inventory Service** | 8006 | Node.js | Stock levels, reservations, releases |
| **API Gateway** | 80/443 | Nginx | JWT auth, rate limiting, routing |

---

## 🏗️ Infrastructure

- **Container Runtime:** Docker
- **Orchestration:** Docker Compose (local development)
- **Message Broker:** RabbitMQ (async communication)
- **Databases:** PostgreSQL (one per service)
- **CI/CD:** GitHub Actions
- **API Communication:** REST over HTTP + async via RabbitMQ

---

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose (v20.10+)
- Git
- Node.js 18+ (for local development)
- Python 3.11+ (for local development)

### Setup

1. **Clone the repository:**
```bash
git clone https://github.com/yourusername/SecureShop.git
cd SecureShop
```

2. **Create environment file:**
```bash
cp .env.example .env
# Edit .env with your values (SMTP credentials, secrets, etc.)
```

3. **Start all services:**
```bash
docker-compose up -d
```

4. **Verify services are running:**
```bash
docker-compose ps
```

5. **Check API Gateway:**
```bash
curl http://localhost/health
```

### Services URLs (behind Nginx Gateway)
- **User Service:** `http://localhost/api/users` (auth required)
- **Product Service:** `http://localhost/api/products`
- **Order Service:** `http://localhost/api/orders` (auth required)
- **Payment Service:** `http://localhost/api/payments` (auth required)
- **Notification Service:** `http://localhost/api/notifications` (auth required)
- **Inventory Service:** `http://localhost/api/inventory` (auth required)
- **RabbitMQ Management:** `http://localhost:15672` (guest/guest)

---

## 🔒 Security Features

Each service implements:
- ✅ **Helmet.js** - HTTP security headers
- ✅ **Rate Limiting** - 100 req/min per IP (stricter for payment: 50/min)
- ✅ **JWT Authentication** - Token validation middleware
- ✅ **Input Validation** - Required field checks
- ✅ **Error Handling** - Safe error messages (no sensitive data leaks)
- ✅ **Logging** - Structured logging for audit trails
- ✅ **Health Checks** - Liveness probes for container orchestration

---

## 📦 Service Architecture

### User Service (Python)
```
services/user-service/
├── app.py              # Flask application
├── requirements.txt    # Python dependencies
├── Dockerfile         # Container image
└── user-db           # PostgreSQL database
```

**Endpoints:**
- `POST /api/users/register` - User registration
- `POST /api/users/login` - User login (returns JWT)
- `GET /api/users/:userId` - Get user profile
- `PUT /api/users/:userId` - Update profile
- `GET /health` - Health check

### Product Service (Node.js)
```
services/product-service/
├── index.js           # Express application
├── package.json      # Node.js dependencies
├── Dockerfile        # Container image
└── product-db       # PostgreSQL database
```

**Endpoints:**
- `GET /api/products` - List all products
- `GET /api/products/:productId` - Get product details
- `POST /api/products` - Create product (admin)
- `PUT /api/products/:productId` - Update product (admin)
- `GET /health` - Health check

### Order Service (Node.js)
**Endpoints:**
- `POST /api/cart` - Create shopping cart
- `GET /api/cart/:cartId` - Get cart
- `POST /api/cart/:cartId/items` - Add items to cart
- `POST /api/orders` - Create order from cart
- `GET /api/orders/:orderId` - Get order details
- `GET /api/orders` - List all orders

### Payment Service (Node.js)
**Endpoints:**
- `POST /api/payments` - Process payment
- `GET /api/payments/:transactionId` - Get transaction details
- `GET /api/payments/order/:orderId` - List order transactions

### Inventory Service (Node.js)
**Endpoints:**
- `GET /api/inventory/:productId` - Check stock
- `POST /api/inventory/reserve` - Reserve stock
- `POST /api/inventory/release` - Release reservation

### Notification Service (Python)
**Endpoints:**
- `POST /api/notifications` - Send notification
- `GET /api/notifications/:id` - Get notification status
- `GET /api/notifications` - List all notifications

---

## 🔐 DevSecOps Pipeline (CI/CD)

The `.github/workflows/devsecops.yml` workflow implements:

### Required Scans:
1. **SAST (Static Application Security Testing)**
   - Semgrep OSS - multi-language code analysis
   - Bandit - Python security issues
   - SonarQube - comprehensive code quality

2. **SCA (Software Composition Analysis)**
   - OWASP DependencyCheck - CVE detection in dependencies
   - Trivy - Vulnerability scanning

3. **Secrets Detection**
   - Gitleaks - hardcoded secrets in git history
   - TruffleHog - entropy-based secret scanning

### Optional Scans:
4. **Container Image Scanning**
   - Trivy - OS packages + app dependencies in images
   - Grype - 2nd opinion scanning

5. **DAST (Dynamic Application Security Testing)**
   - OWASP ZAP - running app penetration testing

6. **IaC Scanning**
   - Checkov - Dockerfile, docker-compose, Kubernetes misconfigurations

7. **Secrets Management**
   - HashiCorp Vault (dev mode) - runtime secrets

8. **SBOM Generation**
   - Syft - Software Bill of Materials (CycloneDX/SPDX)

---

## 📊 Security Reports

All findings are aggregated in GitHub's Security Tab:
- **Code Scanning:** SAST results from all tools
- **Dependabot Alerts:** SCA findings
- **Secret Scanning:** Detected hardcoded secrets
- **Security Overview:** Risk dashboard

---

## 🧪 Testing

### Unit Tests
```bash
# Run tests for individual services
cd services/user-service
npm test  # or python -m pytest for Python services
```

### Integration Tests
```bash
# Services are designed to work together via docker-compose
docker-compose up
# Run integration test suite
npm run test:integration
```

### Security Tests
```bash
# SAST scanning (local)
semgrep --config=p/owasp-top-ten . --json

# Secret scanning
gitleaks detect --verbose

# Dependency checking
trivy fs .
```

---

## 🐛 Troubleshooting

### Service won't start
```bash
# Check logs
docker-compose logs service-name

# Verify port isn't in use
netstat -tulpn | grep :8001
```

### Database connection errors
```bash
# Verify database is running
docker-compose ps

# Check environment variables in .env
grep DB_ .env
```

### RabbitMQ issues
```bash
# Access management console
open http://localhost:15672
# Default: guest/guest

# Check queue status
docker exec rabbitmq rabbitmqctl list_queues
```

---

## 📝 Environment Variables

See `.env.example` for all available variables. Critical ones:

| Variable | Purpose | Default | ⚠️ |
|----------|---------|---------|-----|
| `JWT_SECRET` | JWT signing key | dev-key | Change in production |
| `DB_PASSWORD` | Database password | changeme | Change in production |
| `PAYMENT_API_KEY` | Payment gateway API | test-key | Change in production |
| `SMTP_PASSWORD` | Email service password | - | Set for notifications |

---

## 📚 Documentation

- [System Architecture Diagram](docs/architecture.md)
- [API Specifications](docs/api-spec.md)
- [Threat Model](docs/threat-model.md)
- [Security Hardening Guide](docs/security-guide.md)
- [DevSecOps Workflow](docs/devsecops.md)

---

## 🤝 Contributing

1. Follow the security checklist before committing:
   - [ ] Run `npm audit` / `pip check`
   - [ ] Run SAST locally: `semgrep . --json`
   - [ ] Check for secrets: `gitleaks detect`
   - [ ] No hardcoded passwords/API keys

2. All PRs trigger automated security scans in CI/CD

3. Security findings must be resolved before merge

---

## 📄 License

[Your License Here - MIT recommended]

---

## 👥 Authors

- Workshop: DevSecOps Case Study
- Participant: [Your Name]

---

## 🔗 Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Semgrep Rules](https://semgrep.dev/r)
- [Docker Security Best Practices](https://docs.docker.com/develop/security-best-practices/)
- [Kubernetes Security](https://kubernetes.io/docs/concepts/security/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

---

**Last Updated:** April 27, 2026
**Status:** ✅ Step 1 - Repository Structure Complete
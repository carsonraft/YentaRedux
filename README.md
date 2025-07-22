# Yenta AI Matchmaker

AI-powered B2B matchmaking platform connecting AI vendors with enterprise prospects ready for implementation.

## 🚀 Features

- **GPT-4 Conversational Intake**: Replaces manual qualification interviews
- **AI Readiness Scoring**: 0-100 scoring with HOT/WARM/COOL/COLD categories  
- **Smart Vendor Matching**: AI-powered vendor-prospect pairing
- **MDF Integration**: AWS Marketing Development Fund tracking and compliance
- **Payment Processing**: Stripe integration for meeting fees
- **Admin Dashboard**: Manual matching oversight and analytics

## 🏗️ Architecture

### Backend (Node.js)
- Express.js API with PostgreSQL database
- JWT authentication and role-based access
- OpenAI GPT-4 integration (no custom ML models)
- Stripe payment processing
- Comprehensive audit logging

### Frontend (React)
- TypeScript + Tailwind CSS
- Real-time chat interface for prospect intake
- Responsive design for mobile and desktop
- Admin dashboard for matching management

### Database Schema
- Users, Vendors, Prospects tables
- Conversation tracking with AI analysis
- Meeting and payment management
- MDF allocation and transaction tracking

## 🛠️ Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- OpenAI API key
- Stripe account

### Installation

1. **Clone and install dependencies**
```bash
git clone https://github.com/carsonraft/Yenta.git
cd Yenta
npm run install:all
```

2. **Setup environment variables**
```bash
cp server/.env.example server/.env
# Edit server/.env with your API keys
```

3. **Initialize database**
```bash
cd server
npm run db:create
```

4. **Start development servers**
```bash
# From project root
npm run dev
```

This starts:
- Backend API: http://localhost:3001
- Frontend: http://localhost:3000

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://localhost:5432/yenta_db
DB_USER=postgres
DB_PASSWORD=your_password

# Authentication  
JWT_SECRET=your_jwt_secret_here

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
```

## 📊 Core Workflows

### 1. Prospect Intake
1. Anonymous prospect starts conversation
2. GPT-4 conducts qualification interview
3. AI extracts project details and scores readiness
4. Results stored for admin review

### 2. Vendor Matching  
1. Admin reviews qualified prospects (score > 60)
2. System suggests vendor matches using GPT-4
3. Admin creates meetings with match reasoning
4. Payment processing via Stripe

### 3. MDF Tracking
1. Vendors register MDF allocations (AWS/GCP/Azure)
2. Meetings automatically deduct from allocation
3. Compliance reports generated for cloud providers
4. Real-time budget tracking and alerts

## 🧠 AI Features

All AI functionality powered by OpenAI GPT-4 (no custom models):

### Conversational Intake
```javascript
// Natural language project description
// Dynamic follow-up questions
// Multi-turn conversation handling
// Context preservation across exchanges
```

### Readiness Scoring
```javascript
// Budget Reality (0-25 points)
// Use Case Clarity (0-25 points)  
// Timeline Urgency (0-25 points)
// Technical Readiness (0-25 points)
// Total: 0-100 with category assignment
```

### Vendor Matching
```javascript
// Semantic capability matching
// Industry experience weighting
// Budget and timeline compatibility
// Cultural fit assessment
```

## 📱 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Prospects  
- `POST /api/prospects/start` - Start conversation
- `POST /api/prospects/chat/:sessionId` - Continue chat
- `POST /api/prospects/complete/:sessionId` - Score readiness

### Vendors
- `GET /api/vendors/profile` - Get vendor profile  
- `POST /api/vendors/profile` - Update profile
- `GET /api/vendors/meetings` - Get vendor meetings

### Admin
- `GET /api/admin/prospects` - List prospects by score
- `POST /api/admin/prospects/:id/matches` - Get vendor matches
- `POST /api/admin/meetings` - Create meeting

### MDF
- `GET /api/mdf/allocations` - Get MDF allocations
- `POST /api/mdf/transactions` - Create transaction
- `GET /api/mdf/reports/:id` - Generate compliance report

### Payments
- `POST /api/payments/create-payment-intent` - Stripe payment
- `POST /api/payments/webhook` - Stripe webhooks

## 🎯 Key Differentiators

### vs. Existing Platforms
- **95% automation** vs manual processes
- **AI-specific qualification** vs generic B2B matching  
- **MDF integration** vs separate budget tracking
- **Implementation partners** vs tools-only matching

### Technical Advantages  
- **No custom ML models** - 100% GPT-4 powered
- **Explainable AI** - Clear reasoning for scores/matches
- **Real-time adaptation** - Prompt updates vs model retraining
- **Cost effective** - $200/month vs $20K+ ML infrastructure

## 📈 MVP Metrics

**Success Criteria (30 days):**
- 5 vendors onboarded with MDF budgets
- 20 prospects qualified through AI system
- 10 meetings scheduled with 70%+ vendor satisfaction
- 1 vendor requests additional MDF allocation

**Target Performance:**
- AI readiness scoring accuracy: >80% vs manual review
- Prospect qualification time: <5 minutes vs 45-minute interviews
- Match relevance score: >7/10 vendor rating
- MDF utilization increase: >30% vs current platforms

## 🔄 Development Workflow

### Git Strategy
- `main` - Production ready code
- Feature branches for new development
- Commit messages include feature scope and impact

### Deployment
- Single EC2 instance for MVP
- PostgreSQL RDS for production data
- CloudFront CDN for React app
- GitHub Actions for CI/CD (planned)

### Version Control
All major features committed with detailed messages:
```bash
git commit -m "Add GPT-4 readiness scoring

- Implement 4-factor scoring rubric
- Add conversation analysis pipeline  
- Store detailed score breakdown
- Enable admin review workflow"
```

## 📚 Documentation

- [30-Day MVP Architecture](./30_day_mvp_architecture.md) - Detailed technical plan
- [GPT-4 Prompts System](./gpt4_prompts_system.md) - All AI prompts and logic
- [Database Schema](./server/db/schema.sql) - Complete database design

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📞 Support

For questions or issues:
- Create GitHub issue for bugs/features
- Check documentation for setup help
- Review API endpoints for integration

---

**Built with ❤️ and GPT-4**  
*No custom ML models were harmed in the making of this platform*
# Bitcoin Price Guessing Game

A real-time Bitcoin price prediction game built with Next.js, where users compete to guess whether BTC price will go up or down within a 1-minute window.

**Live Site**: https://ecloud-btc.devwithian.com/

## (A) Tech Stack

- **Framework**: Next.js 15+ with App Router and TypeScript
- **Authentication**: Clerk for user management (sign up, sign in, profile management)
- **Database**: DrizzleORM with PostgreSQL
- **Styling**: Tailwind CSS 4 + Shadcn UI
- **Code Quality**: ESLint, Prettier, Commitlint for conventional commits
- **BTC Price Data**: CoinGecko Free API
- **CI/CD**: GitHub Actions with Slack notifications
- **Testing**: Unit tests for critical functions (price calculations, game logic, time synchronization)

### Current Hosting

- **Infrastructure**: AWS EC2 (Free Tier)
- **Database**: AWS RDS PostgreSQL (Free Tier)
- **Process Manager**: PM2 running main Next.js server + 2 background workers
  - Worker 1: Live BTC price polling
  - Worker 2: Resolving active guesses
- **Reverse Proxy**: Nginx

### Production-Ready Improvements

For larger user base or professional deployment:

- **Scaling**: Move to AWS ECS/EKS with auto-scaling groups
- **Database**: Upgrade RDS with read replicas and Multi-AZ deployment
- **Caching**: Add Redis/ElastiCache for session management and rate limiting
- **API**: Upgrade to paid CoinGecko plan for higher rate limits and reliability
- **Monitoring**: CloudWatch for metrics, Sentry for error tracking
- **Load Balancing**: Application Load Balancer for traffic distribution
- **Real-Time Data Streaming**: Replace polling-based approach with WebSocket connections to cryptocurrency exchanges
  - Sub-second price updates for more precise game mechanics
  - Reduced API rate limit concerns
  - Lower latency for time-critical operations
  - More accurate price snapshots at exact game intervals

## (B) Product & Business Considerations

### Time-Critical Operations

The game prioritizes **highly accurate time synchronization** to ensure:

- Precise 1-minute countdown windows
- Accurate price capture at exact intervals
- Synchronized game state across all clients
- Consistent results calculation

This ensures no user has an unfair advantage and maintains trust in the game mechanics.

### Data Transparency

The app provides a **real-time price chart** displaying Bitcoin's recent price history. This allows users to:

- Make informed predictions based on price trends
- Understand market movements before placing their guess
- Build confidence in the game's fairness through visible data

This transparency improves user engagement and trust in the game mechanics.

### Future Enhancements

Features to improve user engagement and retention:

- **Leaderboards**: Daily and weekly rankings to encourage competition and repeat visits
- **Streak Tracking**: Reward consecutive correct predictions to incentivize daily participation
- **Social Sharing**: Allow users to share their winning streaks and stats on social media

## (C) Technical Assumptions

- **Price Data Staleness**: BTC price data is considered stale after 2 minutes of no updates
- **Polling Interval**: Background worker polls CoinGecko API every 10 seconds (within free tier limits)
- **Game Resolution**: Active guesses are resolved within 5 seconds after the 1-minute window closes (handles cases where users close their browser before results are shown)
- **Score Protection**: User scores cannot go below 0; incorrect guesses on zero-score accounts will keep the score at 0

## (D) Getting Started

```shell
npm install

# First time setup: Run database migrations
npm run db:migrate

npm run dev
```

Open http://localhost:3000 to play the game.

## (E) Environment Variables

```shell
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_pub_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Database
DATABASE_URL=your_database_url
```

---

Made for [Assignment Project]

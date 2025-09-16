# SignFast

A simple, minimal electronic signature solution built with Next.js and shadcn/ui.

## Features

- ✅ User registration and authentication
- ✅ Document upload (PDF, DOC, DOCX)
- ✅ Send documents for electronic signature via email
- ✅ Public signing page for recipients
- ✅ Email notifications for document sharing and completion
- ✅ Dashboard to track document status and signatures
- ✅ Secure token-based signing links
- ✅ Local file storage (easily configurable for cloud storage)

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI**: shadcn/ui, Tailwind CSS
- **Authentication**: NextAuth.js
- **Database**: SQLite with Prisma ORM
- **Email**: Nodemailer with SMTP
- **File Storage**: Local filesystem (configurable for S3)

## Quick Start

### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd docusign-alternative
npm install
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```env
# Database
# For development (SQLite)
DATABASE_URL="file:./dev.db"

# For production (PostgreSQL - Vercel Postgres)
# Vercel automatically provides these environment variables:
# DATABASE_PRISMA_DATABASE_URL="postgresql://username:password@host:port/database?schema=public&pgbouncer=true&connect_timeout=15"
# DATABASE_DATABASE_URL="postgresql://username:password@host:port/database?schema=public"
# DATABASE_POSTGRES_URL="postgresql://username:password@host:port/database?schema=public"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Email Configuration (Gmail example)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-app-password"

# Stripe Configuration
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Optional: AWS S3 Configuration
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="your-bucket-name"
```

### 3. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Create and migrate database
npx prisma db push
```

### 4. Run the Application

```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

## Usage

### 1. User Registration

- Visit the homepage and click "Get Started Free"
- Create an account with your email and password
- Sign in to access your dashboard

### 2. Upload Documents

- Click "Upload Document" in your dashboard
- Select a PDF, DOC, or DOCX file
- Add a document title
- The document will appear in your dashboard

### 3. Send for Signature

- Click "Send" next to any document
- Enter the signer's email address
- Optionally add the signer's name
- The signer will receive an email with a secure signing link

### 4. Sign Documents

- Recipients click the link in their email
- They enter their name and click "Sign Document"
- All parties receive email notifications when signing is complete

## Project Structure

```
├── app/
│   ├── api/                    # API routes
│   │   ├── auth/              # Authentication endpoints
│   │   ├── documents/         # Document management
│   │   └── sign/              # Signing endpoints
│   ├── auth/                  # Authentication pages
│   ├── dashboard/             # User dashboard
│   ├── sign/                  # Public signing pages
│   └── uploads/               # File serving
├── components/                # React components
│   ├── ui/                   # shadcn/ui components
│   └── ...                   # Custom components
├── lib/                      # Utility functions
│   ├── auth.ts              # NextAuth configuration
│   ├── email.ts             # Email utilities
│   └── utils.ts             # General utilities
├── prisma/
│   └── schema.prisma        # Database schema
└── uploads/                 # Local file storage
```

## Database Schema

The application uses the following main entities:

- **User**: Account information and authentication
- **Document**: Uploaded documents with metadata
- **Signature**: Signature requests and completion status

## Email Configuration

### Gmail Setup

1. Enable 2-factor authentication on your Gmail account
2. Generate an "App Password" for this application
3. Use the app password in the `EMAIL_PASS` environment variable

### Other SMTP Providers

Update the email configuration in `.env` to match your SMTP provider's settings.

## File Storage

### Local Storage (Default)

Files are stored in the `uploads/` directory. This is suitable for development and small deployments.

### Cloud Storage (Production)

To use AWS S3 or similar cloud storage:

1. Update the upload API (`app/api/documents/upload/route.ts`)
2. Replace local file operations with cloud storage SDK calls
3. Update file URLs to point to cloud storage

### AWS S3 Configuration

Set the following environment variables in `.env.local` (and in your deployment provider):

```
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
# Optional: If using CloudFront or custom CDN domain in front of S3
ASSET_BASE_URL=https://cdn.example.com
```

- Uploads are stored under keys like `documents/<userId>/<fileName>` and `uploads/signed/<fileName>`.
- Generated URLs will use `ASSET_BASE_URL` when set; otherwise, they default to the S3 public URL format.
- Objects are uploaded with `ACL=private`. You can serve via signed URLs or through a CDN origin with appropriate permissions.

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. **Set up Vercel Postgres:**
   - In your Vercel dashboard, go to the Storage tab
   - Create a new Postgres database
   - Vercel will automatically provide these environment variables:
     - `DATABASE_PRISMA_DATABASE_URL` (optimized for Prisma)
     - `DATABASE_DATABASE_URL` (direct connection)
     - `DATABASE_POSTGRES_URL` (standard PostgreSQL)
4. **Add other required environment variables in Vercel dashboard:**
   - `NEXTAUTH_URL`: Your production domain
   - `NEXTAUTH_SECRET`: A secure random string
   - All other required environment variables
5. **Deploy and run migrations:**
   ```bash
   # After deployment, run this to set up the database schema
   npx prisma db push
   ```

### Other Platforms

The application can be deployed to any platform that supports Next.js:

- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## Security Considerations

- All signing links use secure, unique tokens
- Passwords are hashed using bcrypt
- File uploads are validated for type and size
- Email addresses are validated before sending

## Development

### Adding New Features

1. Update the database schema in `prisma/schema.prisma`
2. Run `npx prisma db push` to apply changes
3. Update TypeScript types as needed
4. Implement the feature following the existing patterns

### Database Management

```bash
# View database in Prisma Studio
npx prisma studio

# Reset database
npx prisma db push --force-reset

# Generate new migration
npx prisma migrate dev --name your-migration-name
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Support

For questions or issues, please open a GitHub issue or contact the maintainers.

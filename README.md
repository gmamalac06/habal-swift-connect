# Habal-Habal Swift Connect

A comprehensive ride-hailing platform designed specifically for habal-habal motorcycle transportation in Cotabato City, Philippines.

## 🚗 About the Application

Habal-Habal Swift Connect is a modern web application that connects commuters with habal-habal drivers, providing a safe, efficient, and transparent transportation service. The platform serves three main user types:

- **Commuters** - Book rides, track trips, make payments, and rate drivers
- **Drivers** - Accept ride requests, manage availability, track earnings, and receive ratings
- **Admins** - Oversee operations, approve drivers, manage pricing, and monitor system performance

## ✨ Key Features

### For Commuters
- **Easy Booking** - Simple ride booking with pickup and drop-off locations
- **Real-time Tracking** - Live map integration to track rides
- **Fare Estimation** - Transparent pricing with upfront fare calculation
- **Multiple Payment Options** - GCash, PayMaya, and Cash on Delivery
- **Driver Ratings** - Rate and review drivers after trips
- **Trip History** - Complete history of all rides taken

### For Drivers
- **Driver Application System** - Submit documents for verification and approval
- **Ride Management** - Accept, decline, or complete ride requests
- **Availability Toggle** - Control when to receive ride requests
- **Earnings Dashboard** - Track daily, weekly, and monthly earnings
- **Document Management** - Upload and manage vehicle registration documents

### For Administrators
- **Driver Verification** - Review and approve driver applications
- **User Management** - Manage commuter, driver, and admin accounts
- **Pricing Control** - Set base fares, per-kilometer rates, and surge pricing
- **Analytics Dashboard** - Monitor system performance and usage statistics
- **Payment Oversight** - Track and manage all platform transactions

## 🛠 Technology Stack

### Frontend
- **React 18** - Modern user interface framework
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first styling framework
- **Shadcn/ui** - Beautiful and accessible UI components
- **React Router** - Client-side routing
- **React Query** - Server state management

### Backend & Database
- **Supabase** - Backend-as-a-Service platform
- **PostgreSQL** - Relational database
- **Row Level Security (RLS)** - Database-level security
- **Real-time Subscriptions** - Live data updates

### Additional Services
- **Authentication** - Secure user authentication via Supabase Auth
- **File Storage** - Document and image storage via Supabase Storage
- **Email Service** - Automated email notifications

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or later)
- npm or yarn package manager
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/gmamalac06/habal-swift-connect.git
   cd habal-swift-connect
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy the example environment file
   cp .env.example .env.local
   
   # Add your Supabase credentials
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:8080` to view the application.

### Database Setup

The application uses Supabase as the backend. Database migrations are included in the `supabase/migrations/` directory. To set up the database:

1. Create a new Supabase project
2. Run the migrations in order
3. Configure Row Level Security policies
4. Set up storage buckets for document uploads

## 📱 User Roles & Access

### Commuter Account
- Sign up with email and password
- Book rides and make payments
- View trip history and receipts
- Rate and review drivers

### Driver Account
- Apply with vehicle documents (OR/CR)
- Wait for admin approval
- Accept ride requests when approved
- Manage earnings and availability

### Admin Account
- Full system access and control
- Approve/reject driver applications
- Manage users and pricing
- View system analytics

## 🔐 Security Features

- **Authentication** - Secure email/password authentication
- **Authorization** - Role-based access control
- **Data Protection** - Row Level Security on all database tables
- **Document Verification** - Secure upload and verification of driver documents
- **Payment Security** - Secure handling of payment information

## 🌟 Core Functionality

### Ride Booking Process
1. Commuter enters pickup and drop-off locations
2. System calculates fare based on distance and current pricing
3. Ride request sent to available drivers
4. Driver accepts the request
5. Real-time tracking during the trip
6. Payment processing upon completion
7. Rating and review system

### Driver Onboarding
1. Driver submits application with personal details
2. Upload vehicle documents (OR/CR)
3. Admin reviews and verifies documents
4. Approval/rejection notification
5. Access to driver dashboard upon approval

## 📊 Business Features

- **Dynamic Pricing** - Configurable base fares and surge multipliers
- **Commission System** - Platform fee structure
- **Analytics** - Comprehensive reporting and insights
- **Payment Processing** - Multiple payment gateway integration
- **Notification System** - SMS and email notifications

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 📞 Support

For support or questions about the Habal-Habal Swift Connect platform, please contact the development team.

---

**Built with ❤️ for the Cotabato City community**
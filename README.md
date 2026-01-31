# DailyOpenCourt - Setup and Installation Guide

A full-stack web application for managing Open Court Applications with Django backend and React frontend.

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Python 3.8+** (Python 3.10 or higher recommended)
- **Node.js 16+** and **npm** (Node.js 18 or higher recommended)
- **Git** (to clone the repository)
- **pip** (Python package manager)

## 🚀 Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/AsadUllah-11/DailyOpenCourt-WithoutPush.git
cd DailyOpenCourt-WithoutPush
```

---

## 🔧 Backend Setup (Django)

### 2. Navigate to Backend Directory

```bash
cd backend
```

### 3. Create Python Virtual Environment

**On Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**On macOS/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 4. Install Backend Dependencies

```bash
pip install django djangorestframework djangorestframework-simplejwt django-cors-headers openpyxl pillow
```

**Key Dependencies:**
- `django` - Web framework
- `djangorestframework` - REST API framework
- `djangorestframework-simplejwt` - JWT authentication
- `django-cors-headers` - CORS support for frontend communication
- `openpyxl` - Excel file processing
- `pillow` - Image/file handling

### 5. Apply Database Migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

### 6. Create Superuser (Admin Account)

```bash
python manage.py createsuperuser
```

Follow the prompts to set:
- Username
- Email (optional)
- Password

### 7. Create Media Directories

```bash
mkdir -p media/video_feedback media/video_responses media/documents
```

**On Windows:**
```bash
mkdir media\video_feedback media\video_responses media\documents
```

### 8. Run Backend Development Server

```bash
python manage.py runserver
```

✅ Backend should now be running at: **http://localhost:8000**

**To verify backend is working:**
- Admin panel: http://localhost:8000/admin
- API endpoint: http://localhost:8000/api/

---

## 🎨 Frontend Setup (React)

### 9. Open New Terminal and Navigate to Frontend Directory

```bash
cd frontend
```

*Note: Keep the backend server running in the previous terminal*

### 10. Install Frontend Dependencies

```bash
npm install
```

**Key Dependencies (automatically installed):**
- `react` & `react-dom` - Core React libraries
- `react-router-dom` - Routing
- `axios` - HTTP client for API calls
- `@tanstack/react-query` - Data fetching and caching
- `recharts` - Charts and data visualization
- `lucide-react` - Icons
- `xlsx` - Excel file handling

### 11. Start Frontend Development Server

```bash
npm start
```

✅ Frontend should automatically open at: **http://localhost:3000**

If it doesn't open automatically, manually navigate to http://localhost:3000 in your browser.

---

## 🔐 First Time Login

### Default Admin Credentials:

Use the superuser account you created in **Step 6**.

### Creating Additional Users:

1. Go to Django Admin: http://localhost:8000/admin
2. Log in with superuser credentials
3. Navigate to **Users** → **Add User**
4. Fill in details:
   - **Username**: staff username
   - **Password**: set password
   - **Role**: Choose `ADMIN` or `STAFF`
   - **Police Station**: Assign police station (for STAFF role)
   - **Division**: Assign division

---

## 📊 Loading Sample Data (Optional)

### Load Excel Data:

If you have an Excel file with application data:

1. Place your Excel file in the `backend/` directory
2. Edit `backend/load_excel_data.py` and update the file path at the bottom
3. Run:
```bash
python load_excel_data.py
```

### Load Video Feedback:

If you have video files for feedback:

1. Create a folder with video files
2. Edit `backend/load_videos.py` and update the folder path at the bottom
3. Run:
```bash
python load_videos.py
```

---

## 🌐 API Configuration

### Backend API Base URL:

The frontend connects to the backend at `http://localhost:8000/api/`

If you need to change this:
1. Look for API configuration in `frontend/src/` directory
2. Update the base URL in the axios or API configuration file

---

## 📁 Project Structure

```
DailyOpenCourt-WithoutPush/
│
├── backend/                    # Django Backend
│   ├── backend/               # Django project settings
│   │   ├── settings.py       # Main settings
│   │   ├── urls.py           # URL routing
│   │   └── wsgi.py           # WSGI config
│   ├── core/                 # Main Django app
│   │   ├── models.py         # Database models
│   │   ├── views.py          # API views
│   │   ├── serializers.py    # DRF serializers
│   │   ├── urls.py           # App URLs
│   │   └── admin.py          # Admin configuration
│   ├── media/                # Uploaded files
│   ├── manage.py             # Django management script
│   ├── load_excel_data.py    # Excel data loader
│   └── load_videos.py        # Video feedback loader
│
└── frontend/                  # React Frontend
    ├── public/               # Static files
    ├── src/                  # React source code
    │   ├── components/       # React components
    │   ├── pages/            # Page components
    │   └── App.js            # Main app component
    ├── package.json          # NPM dependencies
    └── README.md             # React documentation
```

---

## 🛠��� Common Commands

### Backend Commands:

```bash
# Activate virtual environment (Windows)
venv\Scripts\activate

# Activate virtual environment (macOS/Linux)
source venv/bin/activate

# Run development server
python manage.py runserver

# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Access Django shell
python manage.py shell
```

### Frontend Commands:

```bash
# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test

# Install new package
npm install <package-name>
```

---

## 🔧 Troubleshooting

### Backend Issues:

**Error: "No module named 'django'"**
- Solution: Activate virtual environment and install dependencies
```bash
venv\Scripts\activate  # Windows
pip install django
```

**Error: "Port 8000 is already in use"**
- Solution: Run on different port
```bash
python manage.py runserver 8001
```

**Database errors:**
- Solution: Delete `db.sqlite3` and rerun migrations
```bash
del db.sqlite3  # Windows
rm db.sqlite3   # macOS/Linux
python manage.py migrate
```

### Frontend Issues:

**Error: "npm command not found"**
- Solution: Install Node.js from https://nodejs.org/

**Error: "Port 3000 already in use"**
- Solution: Kill the process or use different port
```bash
# Set different port (add to package.json scripts or use environment variable)
PORT=3001 npm start  # macOS/Linux
set PORT=3001 && npm start  # Windows
```

**Dependencies installation fails:**
- Solution: Clear cache and reinstall
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

---

## 📝 Features

- 🔐 **JWT Authentication** - Secure login system
- 📊 **Dashboard** - Statistics and analytics
- 📋 **Application Management** - CRUD operations for court applications
- 🎥 **Video Feedback** - Video upload and review system
- 👥 **Staff Management** - Multi-user support with role-based access
- 📈 **Data Visualization** - Charts and graphs using Recharts
- 📤 **Excel Import/Export** - Bulk data operations
- 🔍 **Filtering & Search** - Advanced data filtering

---

## 👥 User Roles

### ADMIN Role:
- Full access to all applications across all divisions
- Can create/edit/delete staff users
- View dashboard statistics
- Manage video feedback

### STAFF Role:
- Access limited to assigned police station
- View and update applications for their station
- Submit video feedback
- View station-specific statistics

---

## 🚀 Production Deployment

For production deployment:

### Backend:
1. Set `DEBUG = False` in `backend/backend/settings.py`
2. Configure `ALLOWED_HOSTS`
3. Set up proper database (PostgreSQL recommended)
4. Use gunicorn or uWSGI as WSGI server
5. Configure static/media file serving

### Frontend:
1. Run `npm run build` to create optimized production build
2. Serve the `build/` directory using Nginx or Apache
3. Configure environment variables for API endpoints

---

## 📞 Support

For issues or questions:
- Check the [GitHub repository](https://github.com/AsadUllah-11/DailyOpenCourt-WithoutPush)
- Review error messages in browser console and terminal
- Ensure all dependencies are properly installed

---

## ✅ Quick Start Checklist

- [ ] Clone repository
- [ ] Install Python 3.8+ and Node.js 16+
- [ ] Set up backend virtual environment
- [ ] Install backend dependencies
- [ ] Run database migrations
- [ ] Create superuser account
- [ ] Create media directories
- [ ] Start backend server (http://localhost:8000)
- [ ] Install frontend dependencies
- [ ] Start frontend server (http://localhost:3000)
- [ ] Log in with superuser credentials
- [ ] Create additional users via admin panel (if needed)

---

**Happy Coding! 🎉**
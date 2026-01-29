from rest_framework import viewsets, status
from rest_framework.decorators import api_view, action, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, get_user_model
from django.db.models import Count, Q
from django.utils.dateparse import parse_date
import openpyxl
# Add this to the existing imports at the top
from django.contrib.auth.hashers import make_password
from rest_framework.exceptions import ValidationError

from datetime import datetime

from .models import OpenCourtApplication
from .serializers import (
    UserSerializer, 
    OpenCourtApplicationSerializer,
    ApplicationStatsSerializer,
    CategoryStatsSerializer,
    PoliceStationStatsSerializer
)

User = get_user_model()


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """Login endpoint"""
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not username or not password:
        return Response(
            {'error': 'Please provide both username and password'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    user = authenticate(username=username, password=password)
    
    if user:
        refresh = RefreshToken.for_user(user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': UserSerializer(user).data
        })
    
    return Response(
        {'error': 'Invalid credentials'},
        status=status.HTTP_401_UNAUTHORIZED
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Logout endpoint"""
    try:
        refresh_token = request.data.get('refresh')
        token = RefreshToken(refresh_token)
        token.blacklist()
        return Response({'message': 'Successfully logged out'})
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user(request):
    """Get current logged in user"""
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


class OpenCourtApplicationViewSet(viewsets.ModelViewSet):
    """ViewSet for Open Court Applications"""
    queryset = OpenCourtApplication.objects.all()
    serializer_class = OpenCourtApplicationSerializer
    permission_classes = [IsAuthenticated]
    
    # ⚡ DISABLE PAGINATION
    pagination_class = None
    
    def get_queryset(self):
        """Filter applications based on user role - FIXED"""
        queryset = OpenCourtApplication.objects.all()
        user = self.request.user
        
        # 🔍 DEBUG: Print user and query info
        print(f"\n{'='*80}")
        print(f"🔍 API REQUEST from user: {user.username}")
        print(f"   Role: {user.role}")
        print(f"   Police Station: '{user.police_station}'")
        print(f"   Total apps in DB: {OpenCourtApplication.objects.count()}")
        
        # 🆕 FIXED: Staff filtering with case-insensitive matching
        if user.role == 'STAFF':
            if user.police_station:
                user_ps_clean = user.police_station.strip()
                
                # Show all police stations for debugging
                all_ps = list(OpenCourtApplication.objects.values_list('police_station', flat=True).distinct())
                print(f"\n📋 All Police Stations in DB ({len(all_ps)}):")
                for ps in all_ps[:10]:
                    count = OpenCourtApplication.objects.filter(police_station=ps).count()
                    print(f"   - '{ps}' ({count} apps)")
                
                # Apply case-insensitive filter
                queryset = queryset.filter(police_station__iexact=user_ps_clean)
                
                print(f"\n🔎 Filtering for staff: '{user_ps_clean}'")
                print(f"   Matched applications: {queryset.count()}")
                
                if queryset.count() == 0:
                    print(f"\n⚠️⚠️⚠️ WARNING: NO APPLICATIONS FOUND! ⚠️⚠️⚠️")
                    print(f"   Staff's police_station '{user_ps_clean}' doesn't match any data")
                    print(f"   Fix: Update user's police_station to match one of the above")
            else:
                print(f"\n⚠️ Staff user has NO police_station assigned - returning empty")
                queryset = queryset.none()
        else:
            print(f"\n👤 Admin user - showing all {queryset.count()} applications")
        
        # Apply additional filters
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
            print(f"   Status filter: {status_param} → {queryset.count()} apps")
        
        ps_param = self.request.query_params.get('police_station')
        if ps_param:
            queryset = queryset.filter(police_station=ps_param)
            print(f"   PS filter: {ps_param} → {queryset.count()} apps")
        
        category_param = self.request.query_params.get('category')
        if category_param:
            queryset = queryset.filter(category=category_param)
            print(f"   Category filter: {category_param} → {queryset.count()} apps")
        
        # Date filters
        from_date = self.request.query_params.get('from_date')
        if from_date:
            try:
                parsed_from_date = parse_date(from_date)
                if parsed_from_date:
                    queryset = queryset.filter(date__gte=parsed_from_date)
                    print(f"   From date: {parsed_from_date} → {queryset.count()} apps")
            except Exception as e:
                print(f"   ⚠️ Error parsing from_date: {e}")
        
        to_date = self.request.query_params.get('to_date')
        if to_date:
            try:
                parsed_to_date = parse_date(to_date)
                if parsed_to_date:
                    queryset = queryset.filter(date__lte=parsed_to_date)
                    print(f"   To date: {parsed_to_date} → {queryset.count()} apps")
            except Exception as e:
                print(f"   ⚠️ Error parsing to_date: {e}")
        
        # Search
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(dairy_no__icontains=search) |
                Q(contact__icontains=search) |
                Q(sr_no__icontains=str(search))
            )
            print(f"   Search: {search} → {queryset.count()} apps")
        
        # Order by primary key for consistent ordering
        queryset = queryset.order_by('-created_at')
        
        print(f"\n✅ FINAL: Returning {queryset.count()} applications")
        print(f"{'='*80}\n")
        
        return queryset

    def list(self, request, *args, **kwargs):
        """Return full data without pagination"""
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def perform_create(self, serializer):
        """Set created_by to current user"""
        serializer.save(created_by=self.request.user)
    
    def perform_update(self, serializer):
        """Update application"""
        serializer.save()
    
    def perform_destroy(self, instance):
        """Delete application"""
        instance.delete()
    
    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Update application status"""
        application = self.get_object()
        new_status = request.data.get('status')
        
        if new_status not in ['PENDING', 'HEARD', 'REFERRED', 'CLOSED']:
            return Response(
                {'error': 'Invalid status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        application.status = new_status
        application.save()
        
        serializer = self.get_serializer(application)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def update_feedback(self, request, pk=None):
        """Update application feedback"""
        application = self.get_object()
        feedback = request.data.get('feedback')
        remarks = request.data.get('remarks', '')
        
        if feedback not in ['POSITIVE', 'NEGATIVE', 'PENDING']:
            return Response(
                {'error': 'Invalid feedback'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        application.feedback = feedback
        if remarks:
            application.remarks = remarks
        application.save()
        
        serializer = self.get_serializer(application)
        return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_excel(request):
    """Upload and parse Excel file"""
    if 'file' not in request.FILES:
        return Response(
            {'error': 'No file provided'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    excel_file = request.FILES['file']
    
    if not excel_file.name.endswith(('.xlsx', '.xls')):
        return Response(
            {'error': 'File must be Excel format (.xlsx or .xls)'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        workbook = openpyxl.load_workbook(excel_file)
        sheet = workbook.active
        
        created_count = 0
        updated_count = 0
        errors = []
        
        for row_num, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
            try:
                sr_no = row[0]
                if not sr_no:
                    continue
                
                date_value = row[5]
                if isinstance(date_value, datetime):
                    date_value = date_value.date()
                elif isinstance(date_value, str):
                    date_value = parse_date(date_value)
                
                days_value = row[12]
                if days_value and str(days_value).isdigit():
                    days_value = int(days_value)
                else:
                    days_value = None
                
                application_data = {
                    'dairy_no': row[1] or '',
                    'name': row[2] or '',
                    'contact': str(row[3]) if row[3] else '',
                    'marked_to': row[4] or '',
                    'date': date_value,
                    'marked_by': row[6] or '',
                    'timeline': row[7] or '',
                    'police_station': row[8] or '',
                    'division': row[9] or '',
                    'category': row[10] or '',
                    'status': 'PENDING',
                    'days': days_value,
                    'feedback': 'PENDING',
                    'dairy_ps': row[14] if len(row) > 14 else '',
                }
                
                application, created = OpenCourtApplication.objects.update_or_create(
                    sr_no=sr_no,
                    defaults=application_data
                )
                
                if created:
                    application.created_by = request.user
                    application.save()
                    created_count += 1
                else:
                    updated_count += 1
                    
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")
        
        return Response({
            'message': 'Excel file processed successfully',
            'created': created_count,
            'updated': updated_count,
            'errors': errors
        })
        
    except Exception as e:
        return Response(
            {'error': f'Error processing file: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """Get dashboard statistics"""
    user = request.user
    queryset = OpenCourtApplication.objects.all()
    
    # Apply same filtering as get_queryset
    if user.role == 'STAFF' and user.police_station:
        user_ps_clean = user.police_station.strip()
        queryset = queryset.filter(police_station__iexact=user_ps_clean)
        print(f"📊 Dashboard for staff '{user.username}': {queryset.count()} applications")
    
    stats = {
        'total_applications': queryset.count(),
        'pending': queryset.filter(status='PENDING').count(),
        'heard': queryset.filter(status='HEARD').count(),
        'referred': queryset.filter(status='REFERRED').count(),
        'closed': queryset.filter(status='CLOSED').count(),
        'positive_feedback': queryset.filter(feedback='POSITIVE').count(),
        'negative_feedback': queryset.filter(feedback='NEGATIVE').count(),
    }
    
    category_stats = list(
        queryset.values('category')
        .annotate(count=Count('id'))
        .order_by('-count')[:10]
    )
    
    ps_stats = []
    if user.role == 'ADMIN':
        ps_stats = list(
            OpenCourtApplication.objects.values('police_station')
            .annotate(
                count=Count('id'),
                pending=Count('id', filter=Q(status='PENDING')),
                heard=Count('id', filter=Q(status='HEARD'))
            )
            .order_by('-count')[:10]
        )
    
    division_stats = list(
        queryset.values('division')
        .annotate(count=Count('id'))
        .order_by('-count')
    )
    
    return Response({
        'overall_stats': stats,
        'category_stats': category_stats,
        'police_station_stats': ps_stats,
        'division_stats': division_stats,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def police_stations(request):
    """Get list of all police stations"""
    stations = OpenCourtApplication.objects.values_list('police_station', flat=True).distinct()
    return Response(list(stations))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def categories(request):
    """Get list of all categories"""
    cats = OpenCourtApplication.objects.values_list('category', flat=True).distinct()
    return Response(list(cats))

# Add these new endpoints at the end of the file (around line 370)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def staff_management(request):
    """Staff Management - List all staff or create new staff (ADMIN only)"""
    
    # Only ADMIN can access
    if request.user.role != 'ADMIN':
        return Response(
            {'error': 'Only administrators can manage staff'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    if request.method == 'GET':
        # Get all staff users
        staff_users = User.objects.filter(role='STAFF').order_by('-date_joined')
        serializer = UserSerializer(staff_users, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        # Create new staff user
        try:
            data = request.data
            
            # Validate required fields
            if not data.get('username'):
                return Response({'error': 'Username is required'}, status=status.HTTP_400_BAD_REQUEST)
            if not data.get('password'):
                return Response({'error': 'Password is required'}, status=status.HTTP_400_BAD_REQUEST)
            if not data.get('police_station'):
                return Response({'error': 'Police station is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if username already exists
            if User.objects.filter(username=data['username']).exists():
                return Response({'error': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Create user
            user = User.objects.create(
                username=data['username'],
                email=data.get('email', ''),
                first_name=data.get('first_name', ''),
                last_name=data.get('last_name', ''),
                role='STAFF',
                phone=data.get('phone', ''),
                police_station=data.get('police_station', ''),
                division=data.get('division', ''),
                password=make_password(data['password'])  # Hash the password
            )
            
            serializer = UserSerializer(user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def staff_detail(request, user_id):
    """Staff Detail - Get, Update or Delete specific staff (ADMIN only)"""
    
    # Only ADMIN can access
    if request.user.role != 'ADMIN':
        return Response(
            {'error': 'Only administrators can manage staff'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        staff_user = User.objects.get(id=user_id, role='STAFF')
    except User.DoesNotExist:
        return Response({'error': 'Staff not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        serializer = UserSerializer(staff_user)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        # Update staff user
        try:
            data = request.data
            
            # Check if username is being changed and if it already exists
            if data.get('username') and data['username'] != staff_user.username:
                if User.objects.filter(username=data['username']).exists():
                    return Response({'error': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Update fields
            staff_user.username = data.get('username', staff_user.username)
            staff_user.email = data.get('email', staff_user.email)
            staff_user.first_name = data.get('first_name', staff_user.first_name)
            staff_user.last_name = data.get('last_name', staff_user.last_name)
            staff_user.phone = data.get('phone', staff_user.phone)
            staff_user.police_station = data.get('police_station', staff_user.police_station)
            staff_user.division = data.get('division', staff_user.division)
            
            # Update password if provided
            if data.get('password'):
                staff_user.password = make_password(data['password'])
            
            staff_user.save()
            
            serializer = UserSerializer(staff_user)
            return Response(serializer.data)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        # Delete staff user
        staff_user.delete()
        return Response({'message': 'Staff deleted successfully'}, status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def divisions_list(request):
    """Get list of all divisions (unique)"""
    divisions = OpenCourtApplication.objects.values_list('division', flat=True).distinct().exclude(division='')
    return Response(sorted(list(set(divisions))))
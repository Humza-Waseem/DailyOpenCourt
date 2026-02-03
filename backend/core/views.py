# backend/core/views.py

from rest_framework import viewsets, status, filters
from rest_framework.decorators import api_view, action, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.pagination import PageNumberPagination
from django.contrib.auth import authenticate, get_user_model
from django.db.models import Count, Q
from django.utils.dateparse import parse_date
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from datetime import datetime
import openpyxl
from django_filters import rest_framework as django_filters

from .models import OpenCourtApplication, VideoFeedback
from .serializers import (
    UserSerializer, 
    OpenCourtApplicationSerializer,
    VideoFeedbackSerializer,
)

User = get_user_model()


# ⚡ CUSTOM PAGINATION CLASS
class StandardResultsPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 1000


# ⚡ ADVANCED FILTER CLASS FOR APPLICATIONS
class OpenCourtApplicationFilter(django_filters.FilterSet):
    """Advanced filtering with search capability"""
    search = django_filters.CharFilter(method='search_filter', label='Search')
    police_station = django_filters.CharFilter(field_name='police_station', lookup_expr='iexact')
    division = django_filters.CharFilter(field_name='division', lookup_expr='iexact')
    category = django_filters.CharFilter(field_name='category', lookup_expr='iexact')
    status = django_filters.ChoiceFilter(choices=OpenCourtApplication.STATUS_CHOICES)
    feedback = django_filters.ChoiceFilter(choices=OpenCourtApplication.FEEDBACK_CHOICES)
    from_date = django_filters.DateFilter(field_name='date', lookup_expr='gte')
    to_date = django_filters.DateFilter(field_name='date', lookup_expr='lte')
    marked_to = django_filters.CharFilter(field_name='marked_to', lookup_expr='icontains')
    
    def search_filter(self, queryset, name, value):
        """Multi-field search"""
        return queryset.filter(
            Q(name__icontains=value) |
            Q(dairy_no__icontains=value) |
            Q(contact__icontains=value) |
            Q(sr_no__icontains=value)
        )
    
    class Meta:
        model = OpenCourtApplication
        fields = ['police_station', 'division', 'category', 'status', 'feedback', 'marked_to']


# =====================================================
# AUTH VIEWS
# =====================================================

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


# =====================================================
# ⚡ OPTIMIZED APPLICATION VIEWSET
# =====================================================

# =====================================================
# ⚡ OPTIMIZED APPLICATION VIEWSET
# =====================================================

class OpenCourtApplicationViewSet(viewsets.ModelViewSet):
    """OPTIMIZED ViewSet with Pagination, Filtering, and Search"""
    
    # ⚡ CRITICAL: Define queryset at class level
    queryset = OpenCourtApplication.objects.select_related('created_by').all()
    serializer_class = OpenCourtApplicationSerializer
    permission_classes = [IsAuthenticated]
    
    # ⚡ ENABLE PAGINATION (CRITICAL FOR PERFORMANCE)
    pagination_class = StandardResultsPagination
    
    # ⚡ ENABLE FILTERING AND ORDERING
    filterset_class = OpenCourtApplicationFilter
    filter_backends = [
        django_filters.DjangoFilterBackend,
        filters.OrderingFilter,
        filters.SearchFilter
    ]
    
    # ⚡ ALLOW ORDERING BY THESE FIELDS
    ordering_fields = ['sr_no', 'created_at', 'date', 'name', 'status', 'police_station']
    ordering = ['-created_at']  # Default ordering
    
    # ⚡ SEARCH FIELDS
    search_fields = ['name', 'dairy_no', 'contact', 'sr_no']
    
    def get_queryset(self):
        """Optimized queryset with select_related and role-based filtering"""
        # ⚡ Use select_related to reduce database queries
        queryset = OpenCourtApplication.objects.select_related('created_by').all()
        user = self.request.user
        
        # Role-based filtering
        if user.role == 'STAFF' and user.police_station:
            queryset = queryset.filter(police_station__iexact=user.police_station.strip())
        
        return queryset
    
    def perform_create(self, serializer):
        """Set created_by to current user"""
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        """Update application status"""
        application = self.get_object()
        new_status = request.data.get('status')
        
        if new_status not in dict(OpenCourtApplication.STATUS_CHOICES):
            return Response(
                {'error': 'Invalid status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        application.status = new_status
        application.save(update_fields=['status', 'updated_at'])
        
        serializer = self.get_serializer(application)
        return Response(serializer.data)
    
    @action(detail=True, methods=['patch'])
    def update_feedback(self, request, pk=None):
        """Update application feedback"""
        application = self.get_object()
        feedback = request.data.get('feedback')
        remarks = request.data.get('remarks', '')
        
        if feedback not in dict(OpenCourtApplication.FEEDBACK_CHOICES):
            return Response(
                {'error': 'Invalid feedback'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        application.feedback = feedback
        if remarks:
            application.remarks = remarks
        application.save(update_fields=['feedback', 'remarks', 'updated_at'])
        
        serializer = self.get_serializer(application)
        return Response(serializer.data)
# =====================================================
# EXCEL UPLOAD
# =====================================================

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


# =====================================================
# DASHBOARD & STATS
# =====================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """Get dashboard statistics - Optimized with aggregation"""
    user = request.user
    queryset = OpenCourtApplication.objects.all()
    
    if user.role == 'STAFF' and user.police_station:
        queryset = queryset.filter(police_station__iexact=user.police_station.strip())
    
    # ⚡ Use aggregation for better performance
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


# =====================================================
# METADATA ENDPOINTS
# =====================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def police_stations(request):
    """Get list of all police stations"""
    stations = OpenCourtApplication.objects.values_list('police_station', flat=True).distinct().order_by('police_station')
    return Response(list(stations))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def categories(request):
    """Get list of all categories"""
    cats = OpenCourtApplication.objects.values_list('category', flat=True).distinct().order_by('category')
    return Response(list(cats))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def divisions_list(request):
    """Get list of all divisions"""
    divisions = OpenCourtApplication.objects.values_list('division', flat=True).distinct().exclude(division='').order_by('division')
    return Response(list(divisions))


# =====================================================
# STAFF MANAGEMENT
# =====================================================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def staff_management(request):
    """Staff Management - ADMIN only"""
    if request.user.role != 'ADMIN':
        return Response(
            {'error': 'Only administrators can manage staff'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    if request.method == 'GET':
        staff_users = User.objects.filter(role='STAFF').order_by('-date_joined')
        serializer = UserSerializer(staff_users, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        try:
            data = request.data
            
            if not data.get('username'):
                return Response({'error': 'Username is required'}, status=status.HTTP_400_BAD_REQUEST)
            if not data.get('password'):
                return Response({'error': 'Password is required'}, status=status.HTTP_400_BAD_REQUEST)
            if not data.get('police_station'):
                return Response({'error': 'Police station is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            if User.objects.filter(username=data['username']).exists():
                return Response({'error': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)
            
            user = User.objects.create(
                username=data['username'],
                email=data.get('email', ''),
                first_name=data.get('first_name', ''),
                last_name=data.get('last_name', ''),
                role='STAFF',
                phone=data.get('phone', ''),
                police_station=data.get('police_station', ''),
                division=data.get('division', ''),
                password=make_password(data['password'])
            )
            
            serializer = UserSerializer(user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def staff_detail(request, user_id):
    """Staff Detail - ADMIN only"""
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
        try:
            data = request.data
            
            if data.get('username') and data['username'] != staff_user.username:
                if User.objects.filter(username=data['username']).exists():
                    return Response({'error': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)
            
            staff_user.username = data.get('username', staff_user.username)
            staff_user.email = data.get('email', staff_user.email)
            staff_user.first_name = data.get('first_name', staff_user.first_name)
            staff_user.last_name = data.get('last_name', staff_user.last_name)
            staff_user.phone = data.get('phone', staff_user.phone)
            staff_user.police_station = data.get('police_station', staff_user.police_station)
            staff_user.division = data.get('division', staff_user.division)
            
            if data.get('password'):
                staff_user.password = make_password(data['password'])
            
            staff_user.save()
            
            serializer = UserSerializer(staff_user)
            return Response(serializer.data)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        staff_user.delete()
        return Response({'message': 'Staff deleted successfully'}, status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_applications(request):
    """Export all applications matching filters - NO PAGINATION"""
    user = request.user
    
    # Start with all applications
    queryset = OpenCourtApplication.objects.select_related('created_by').all()
    
    # Apply role-based filtering
    if user.role == 'STAFF' and user.police_station:
        queryset = queryset.filter(police_station__iexact=user.police_station.strip())
    
    # Apply filters from request
    search = request.query_params.get('search')
    if search:
        queryset = queryset.filter(
            Q(name__icontains=search) |
            Q(dairy_no__icontains=search) |
            Q(contact__icontains=search) |
            Q(sr_no__icontains=search)
        )
    
    status_param = request.query_params.get('status')
    if status_param:
        queryset = queryset.filter(status=status_param)
    
    police_station = request.query_params.get('police_station')
    if police_station:
        queryset = queryset.filter(police_station__iexact=police_station)
    
    category = request.query_params.get('category')
    if category:
        queryset = queryset.filter(category__iexact=category)
    
    feedback = request.query_params.get('feedback')
    if feedback:
        queryset = queryset.filter(feedback=feedback)
    
    from_date = request.query_params.get('from_date')
    if from_date:
        try:
            parsed_from_date = parse_date(from_date)
            if parsed_from_date:
                queryset = queryset.filter(date__gte=parsed_from_date)
        except:
            pass
    
    to_date = request.query_params.get('to_date')
    if to_date:
        try:
            parsed_to_date = parse_date(to_date)
            if parsed_to_date:
                queryset = queryset.filter(date__lte=parsed_to_date)
        except:
            pass
    
    # Apply ordering
    ordering = request.query_params.get('ordering', '-created_at')
    queryset = queryset.order_by(ordering)
    
    # Serialize ALL data (no pagination)
    serializer = OpenCourtApplicationSerializer(queryset, many=True)
    
    return Response({
        'count': queryset.count(),
        'results': serializer.data
    })
# =====================================================
# VIDEO FEEDBACK
# =====================================================

class VideoFeedbackViewSet(viewsets.ModelViewSet):
    """Video Feedback - Admin only"""
    queryset = VideoFeedback.objects.all()
    serializer_class = VideoFeedbackSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Only admins can access"""
        if self.request.user.role != 'ADMIN':
            return VideoFeedback.objects.none()
        return VideoFeedback.objects.all()
    
    @action(detail=True, methods=['post'])
    def submit_feedback(self, request, pk=None):
        """Submit feedback on video"""
        if request.user.role != 'ADMIN':
            return Response(
                {'error': 'Admin access required'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        video = self.get_object()
        feedback_type = request.data.get('feedback')
        remarks = request.data.get('remarks', '')
        
        if feedback_type not in ['LIKE', 'DISLIKE']:
            return Response(
                {'error': 'Invalid feedback. Must be LIKE or DISLIKE'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        video.admin_feedback = feedback_type
        video.admin_remarks = remarks
        video.reviewed_by = request.user
        video.reviewed_at = timezone.now()
        video.save()
        
        serializer = self.get_serializer(video)
        return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def video_feedback_stats(request):
    """Get video feedback statistics"""
    if request.user.role != 'ADMIN':
        return Response({'total': 0, 'pending': 0, 'liked': 0, 'disliked': 0})
    
    total = VideoFeedback.objects.count()
    pending = VideoFeedback.objects.filter(admin_feedback='PENDING').count()
    liked = VideoFeedback.objects.filter(admin_feedback='LIKE').count()
    disliked = VideoFeedback.objects.filter(admin_feedback='DISLIKE').count()
    
    return Response({
        'total': total,
        'pending': pending,
        'liked': liked,
        'disliked': disliked
    })
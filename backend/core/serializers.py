from rest_framework import serializers
from django.contrib.auth import get_user_model
from . models import OpenCourtApplication

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'phone', 'police_station', 'division', 'first_name', 'last_name']
        read_only_fields = ['id']


class OpenCourtApplicationSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = OpenCourtApplication
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'created_by']


class ApplicationStatsSerializer(serializers. Serializer):
    total_applications = serializers.IntegerField()
    pending = serializers.IntegerField()
    heard = serializers.IntegerField()
    referred = serializers.IntegerField()
    closed = serializers.IntegerField()
    positive_feedback = serializers.IntegerField()
    negative_feedback = serializers.IntegerField()


class CategoryStatsSerializer(serializers.Serializer):
    category = serializers.CharField()
    count = serializers.IntegerField()


class PoliceStationStatsSerializer(serializers.Serializer):
    police_station = serializers.CharField()
    count = serializers.IntegerField()
    pending = serializers.IntegerField()
    heard = serializers.IntegerField()
from rest_framework import serializers
from django.contrib.auth import get_user_model
from companies.models import Company
from reports.models import (
    Questionnaire, Question, Report, Answer,
    ReportingPeriod, Recommendation
)

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    companyId = serializers.SerializerMethodField()
    companyName = serializers.SerializerMethodField()
    isBlocked = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'role', 'companyId', 'companyName', 'isBlocked', 'date_joined', 'last_login']

    def get_name(self, obj):
        return obj.get_full_name() or obj.email

    def get_role(self, obj):
        role_map = {'admin': 'administrator', 'respondent': 'respondent', 'viewer': 'viewer'}
        return role_map.get(obj.role, 'viewer')

    def get_companyId(self, obj):
        return obj.company_id

    def get_companyName(self, obj):
        return obj.company.name if obj.company else None

    def get_isBlocked(self, obj):
        return not obj.is_active


class UserListSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    company = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    lastLogin = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'role', 'company', 'status', 'lastLogin', 'date_joined']

    def get_name(self, obj):
        return obj.get_full_name() or obj.email

    def get_role(self, obj):
        role_map = {'admin': 'administrator', 'respondent': 'respondent', 'viewer': 'viewer'}
        return role_map.get(obj.role, 'viewer')

    def get_company(self, obj):
        return obj.company.name if obj.company else None

    def get_status(self, obj):
        return 'active' if obj.is_active else 'blocked'

    def get_lastLogin(self, obj):
        return obj.last_login.date().isoformat() if obj.last_login else None

class UserCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'role']


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)
    name = serializers.CharField()
    role = serializers.ChoiceField(choices=['administrator', 'respondent', 'viewer'])

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('Email already registered.')
        return value

    def create(self, validated_data):
        parts = validated_data['name'].split(' ', 2)
        role_map = {'administrator': 'admin', 'respondent': 'respondent', 'viewer': 'viewer'}
        return User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=parts[0] if len(parts) > 0 else '',
            last_name=parts[1]  if len(parts) > 1 else '',
            middle_name=parts[2] if len(parts) > 2 else '',
            role=role_map.get(validated_data['role'], 'viewer'),
        )


class CompanySerializer(serializers.ModelSerializer):
    activeReports = serializers.SerializerMethodField()
    avgScore = serializers.SerializerMethodField()
    industryLabel = serializers.SerializerMethodField()
    regionLabel = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = [
            'id', 'name', 'org_type', 'region', 'regionLabel',
            'industry', 'industryLabel',
            'description', 'website', 'is_active', 'created_at',
            'activeReports', 'avgScore',
        ]

    def get_activeReports(self, obj):
        return obj.reports.filter(status__in=['draft', 'submitted']).count()

    def get_avgScore(self, obj):
        reports = obj.reports.filter(total_score__isnull=False)
        if not reports.exists():
            return None
        total = sum(r.total_score for r in reports)
        return round(total / reports.count(), 1)
    
    def get_industryLabel(self, obj):
        return obj.get_industry_display()

    def get_regionLabel(self, obj):
        return obj.get_region_display()


class CompanyWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ['name', 'org_type', 'region', 'industry', 'description', 'website', 'is_active']


class QuestionSerializer(serializers.ModelSerializer):
    effectiveFormula = serializers.SerializerMethodField()
    
    class Meta:
        model  = Question
        fields = ['id', 'category', 'text', 'question_type',
                  'options', 'max_score', 'weight', 'order', 'is_required',
                  'score_formula', 'scale_max', 'effectiveFormula']

    def get_effectiveFormula(self, obj):
        return obj.get_effective_formula()


class QuestionnaireSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)
    questionCount = serializers.SerializerMethodField()
    countE = serializers.SerializerMethodField()
    countS = serializers.SerializerMethodField()
    countG = serializers.SerializerMethodField()

    class Meta:
        model  = Questionnaire
        fields = ['id', 'title', 'description', 'year', 'is_active', 'created_at',
                  'weight_e', 'weight_s', 'weight_g',
                  'questions', 'questionCount', 'countE', 'countS', 'countG']

    def get_questionCount(self, obj):
        return obj.questions.count()
    
    def get_countE(self, obj):
        return obj.questions.filter(category='E').count()

    def get_countS(self, obj):
        return obj.questions.filter(category='S').count()

    def get_countG(self, obj):
        return obj.questions.filter(category='G').count()


class QuestionnaireListSerializer(serializers.ModelSerializer):
    questionCount = serializers.SerializerMethodField()
    countE = serializers.SerializerMethodField()
    countS = serializers.SerializerMethodField()
    countG = serializers.SerializerMethodField()

    class Meta:
        model  = Questionnaire
        fields = ['id', 'title', 'description', 'year', 'is_active', 'created_at',
                  'weight_e', 'weight_s', 'weight_g',
                  'questionCount', 'countE', 'countS', 'countG']

    def get_questionCount(self, obj):
        return obj.questions.count()
    
    def get_countE(self, obj):
        return obj.questions.filter(category='E').count()

    def get_countS(self, obj):
        return obj.questions.filter(category='S').count()

    def get_countG(self, obj):
        return obj.questions.filter(category='G').count()


class ReportingPeriodSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportingPeriod
        fields = ['id', 'name', 'year', 'quarter', 'start_date', 'end_date', 'is_active']


class AnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Answer
        fields = ['id', 'question', 'text_value', 'number_value', 'choice_value', 'score']


class ReportSerializer(serializers.ModelSerializer):
    companyName = serializers.SerializerMethodField()
    companyIndustry = serializers.SerializerMethodField()
    companyIndustryLabel = serializers.SerializerMethodField()
    companyRegion = serializers.SerializerMethodField()
    companyRegionLabel = serializers.SerializerMethodField()
    respondentName = serializers.SerializerMethodField()
    periodName = serializers.SerializerMethodField()
    questionnaireName = serializers.SerializerMethodField()
    eScore = serializers.FloatField(source='score_e', read_only=True)
    sScore = serializers.FloatField(source='score_s', read_only=True)
    gScore = serializers.FloatField(source='score_g', read_only=True)

    class Meta:
        model = Report
        fields = [
            'id', 'status', 'created_at', 'updated_at', 'submitted_at',
            'company', 'companyName', 'companyIndustry', 'companyIndustryLabel',
            'companyRegion', 'companyRegionLabel',
            'respondent', 'respondentName',
            'questionnaire', 'questionnaireName',
            'period', 'periodName',
            'eScore', 'sScore', 'gScore', 'total_score',
        ]

    def get_companyName(self, obj):
        return obj.company.name if obj.company else None

    def get_companyIndustry(self, obj):
        return obj.company.industry if obj.company else None

    def get_companyIndustryLabel(self, obj):
        return obj.company.get_industry_display() if obj.company else None

    def get_companyRegion(self, obj):
        return obj.company.region if obj.company else None

    def get_companyRegionLabel(self, obj):
        return obj.company.get_region_display() if obj.company else None

    def get_respondentName(self, obj):
        return obj.respondent.get_full_name() if obj.respondent else None

    def get_periodName(self, obj):
        return obj.period.name if obj.period else None

    def get_questionnaireName(self, obj):
        return obj.questionnaire.title if obj.questionnaire else None


class ReportCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = ['company', 'questionnaire', 'period']

    def create(self, validated_data):
        user = self.context['request'].user
        return Report.objects.create(respondent=user, **validated_data)
